"""TripGenie FastAPI backend - multi-agent trip planner."""
from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import os
import logging
from pathlib import Path
from typing import Dict, Any
import traceback

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from schemas import TripRequest, TripPlan, SignupRequest, LoginRequest, PlacePhotosRequest, ChatRequest
from agents import run_pipeline
from llm_provider import chat_complete
from agents import _extract_json
from google_places import place_photos_for_queries
from auth_utils import (
    create_access_token,
    decode_access_token,
    hash_password,
    new_user,
    normalize_email,
    public_user,
    verify_password,
)

# MongoDB
mongo_url = os.environ["MONGO_URL"]
mongo_options = {"serverSelectionTimeoutMS": 8000}
if mongo_url.startswith("mongodb+srv://"):
    mongo_options["tlsCAFile"] = certifi.where()
client = AsyncIOMotorClient(mongo_url, **mongo_options)
db = client[os.environ["DB_NAME"]]
trips_col = db["trips"]
users_col = db["users"]

app = FastAPI(title="TripGenie API")
api_router = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("tripgenie")


# ----------- helpers -----------

async def _save_partial(trip_id: str, patch: Dict[str, Any]):
    await trips_col.update_one({"id": trip_id}, {"$set": patch})


async def _update_progress(trip_id: str, agent: str, status: str):
    # status: pending | running | done | error
    doc = await trips_col.find_one({"id": trip_id}, {"progress": 1})
    progress = (doc or {}).get("progress", [])
    found = False
    for p in progress:
        if p["agent"] == agent:
            p["status"] = status
            found = True
            break
    if not found:
        progress.append({"agent": agent, "status": status})
    await trips_col.update_one({"id": trip_id}, {"$set": {"progress": progress}})


async def _execute_trip(trip_id: str, req_data: Dict[str, Any]):
    try:
        req = TripRequest(**req_data)
        await trips_col.update_one({"id": trip_id}, {"$set": {"status": "running"}})

        async def upd(agent: str, status: str):
            await _update_progress(trip_id, agent, status)

        async def sp(patch: Dict[str, Any]):
            await _save_partial(trip_id, patch)

        await run_pipeline(trip_id, req, upd, sp)
        await trips_col.update_one({"id": trip_id}, {"$set": {"status": "completed"}})
    except Exception as e:
        logger.error(f"Trip {trip_id} failed: {e}\n{traceback.format_exc()}")
        await trips_col.update_one(
            {"id": trip_id},
            {"$set": {"status": "failed", "error": str(e)}},
        )


async def _current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(401, "Authentication required")
    payload = decode_access_token(credentials.credentials)
    user = await users_col.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


async def _issue_auth(user: Dict[str, Any]) -> Dict[str, Any]:
    return {"token": create_access_token(user), "user": public_user(user)}


# ----------- routes -----------

@api_router.get("/")
async def root():
    return {"message": "TripGenie API", "version": "1.0"}


@api_router.post("/auth/signup")
async def signup(req: SignupRequest):
    email = normalize_email(req.email)
    if not email or "@" not in email:
        raise HTTPException(400, "Valid email is required")
    if len(req.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    existing = await users_col.find_one({"email": email})
    if existing:
        raise HTTPException(409, "An account with this email already exists")
    user = new_user(email=email, name=req.name, provider="password")
    user["password_hash"] = hash_password(req.password)
    await users_col.insert_one(user)
    return await _issue_auth(user)


@api_router.post("/auth/login")
async def login(req: LoginRequest):
    email = normalize_email(req.email)
    user = await users_col.find_one({"email": email}, {"_id": 0})
    if not user or not user.get("password_hash") or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    return await _issue_auth(user)


@api_router.get("/auth/me")
async def me(user: Dict[str, Any] = Depends(_current_user)):
    return public_user(user)


@api_router.post("/places/photos")
async def places_photos(req: PlacePhotosRequest, user: Dict[str, Any] = Depends(_current_user)):
    """Return Google Places photo URLs for itinerary/location queries."""
    _ = user
    return await place_photos_for_queries(req.queries)


@api_router.post("/chat")
async def chat(req: ChatRequest, user: Dict[str, Any] = Depends(_current_user)):
    if not req.message.strip():
        raise HTTPException(400, "Message is required")
    trip_context = ""
    if req.trip_id:
        doc = await trips_col.find_one({"id": req.trip_id, "user_id": user["id"]}, {"_id": 0})
        if doc:
            trip_context = (
                f"Trip context: destination={((doc.get('request') or {}).get('destination') or '')}; "
                f"summary={doc.get('trip_summary', {})}; "
                f"budget={doc.get('budget_breakdown', {})}; "
                f"itinerary={doc.get('day_wise_itinerary', [])[:3]}"
            )
    system = (
        "You are TripGenie's helpful travel assistant. Answer briefly and practically. "
        "If trip context is provided, tailor the answer to that trip. Do not invent booking confirmations. "
        "Return only one valid JSON object with keys: title, summary, bullets, next_steps, note. "
        "bullets and next_steps must be arrays of short strings."
    )
    user_prompt = f"{trip_context}\n\nUser question: {req.message.strip()}"
    raw = await chat_complete(system, user_prompt, f"chat-{user['id']}", max_tokens=650, temperature=0.35)
    try:
        data = _extract_json(raw)
        return {
            "reply": data.get("summary", ""),
            "structured": {
                "title": data.get("title", "TripGenie answer"),
                "summary": data.get("summary", ""),
                "bullets": data.get("bullets", []) if isinstance(data.get("bullets", []), list) else [],
                "next_steps": data.get("next_steps", []) if isinstance(data.get("next_steps", []), list) else [],
                "note": data.get("note", ""),
            },
        }
    except Exception:
        return {
            "reply": raw,
            "structured": {
                "title": "TripGenie answer",
                "summary": raw,
                "bullets": [],
                "next_steps": [],
                "note": "",
            },
        }


@api_router.post("/trips/plan")
async def plan_trip(req: TripRequest, background: BackgroundTasks, user: Dict[str, Any] = Depends(_current_user)):
    """Create a trip plan job. Runs in background. Poll GET /api/trips/{id}."""
    plan = TripPlan(status="pending", request=req)
    doc = plan.model_dump(mode="json")
    doc["user_id"] = user["id"]
    await trips_col.insert_one(doc)
    background.add_task(_execute_trip, plan.id, req.model_dump())
    return {"id": plan.id, "status": "pending"}


@api_router.get("/trips/{trip_id}")
async def get_trip(trip_id: str, user: Dict[str, Any] = Depends(_current_user)):
    doc = await trips_col.find_one({"id": trip_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Trip not found")
    return doc


@api_router.get("/trips")
async def list_trips(user: Dict[str, Any] = Depends(_current_user)):
    cursor = trips_col.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(50)
    out = []
    async for doc in cursor:
        out.append({
            "id": doc.get("id"),
            "status": doc.get("status"),
            "trip_summary": doc.get("trip_summary", {}),
            "created_at": doc.get("created_at"),
            "destination": (doc.get("request") or {}).get("destination", ""),
            "start_date": (doc.get("request") or {}).get("start_date", ""),
            "end_date": (doc.get("request") or {}).get("end_date", ""),
        })
    return out


@api_router.delete("/trips/{trip_id}")
async def delete_trip(trip_id: str, user: Dict[str, Any] = Depends(_current_user)):
    r = await trips_col.delete_one({"id": trip_id, "user_id": user["id"]})
    return {"deleted": r.deleted_count}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
