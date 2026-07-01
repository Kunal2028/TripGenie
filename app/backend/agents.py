"""TripGenie multi-agent orchestration."""
from __future__ import annotations
import json
import re
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Callable, Awaitable

from urllib.parse import quote_plus

from schemas import TripRequest
from weather import get_forecast
from llm_provider import chat_complete, search_web
from google_places import place_photos_for_queries

logger = logging.getLogger(__name__)


def gmaps_link(query: str) -> str:
    return f"https://www.google.com/maps/search/?api=1&query={quote_plus(query)}"


def gsearch_link(query: str) -> str:
    return f"https://www.google.com/search?q={quote_plus(query)}"


def _extract_json(text: str) -> Any:
    """Robustly extract first JSON value from text (handles markdown fences, prose around it)."""
    text = (text or "").strip()
    # Strip markdown code fences first
    m = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if m:
        text = m.group(1).strip()

    # Find earliest { or [
    starts = [i for i in [text.find("{"), text.find("[")] if i >= 0]
    if not starts:
        raise json.JSONDecodeError("No JSON found", text, 0)
    start = min(starts)
    snippet = text[start:]
    decoder = json.JSONDecoder()
    try:
        obj, _ = decoder.raw_decode(snippet)
        return obj
    except json.JSONDecodeError:
        # Try fixing trailing commas
        fixed = re.sub(r",(\s*[}\]])", r"\1", snippet)
        obj, _ = decoder.raw_decode(fixed)
        return obj


async def call_llm(system: str, user: str, session_id: str) -> str:
    return await chat_complete(system, user, session_id)


async def llm_json(system: str, user: str, session_id: str) -> Any:
    raw = await call_llm(
        system + "\n\nIMPORTANT: Reply ONLY with one valid JSON value. No prose, no markdown fences, no commentary before or after.",
        user,
        session_id,
    )
    try:
        return _extract_json(raw)
    except Exception as e:
        logger.warning(f"JSON parse failed: {e}; raw preview: {raw[:300]}")
        raise


# ---------------- Agents ----------------

async def destination_research_agent(req: TripRequest, sid: str) -> Dict:
    sys = (
        "You are a seasoned travel researcher with deep knowledge of global destinations. "
        "Return realistic, factual information only. Avoid inventing names."
    )
    search_results = await search_web(
        f"{req.destination} travel guide neighborhoods attractions safety restaurants",
        max_results=5,
    )
    search_context = "\n".join(
        f"- {r.get('title')}: {r.get('content')} Source: {r.get('url')}" for r in search_results
    ) or "No external search context available."
    prompt = f"""Provide research for a trip to {req.destination} from {req.source}.
Travel style: {req.travel_style}. Interests: {', '.join(req.interests) or 'general'}.

Use this search context when helpful, but do not cite fake sources:
{search_context}

Return JSON with keys:
- overview (2-3 sentence intro)
- best_areas_to_stay (list of 3-5 real neighborhoods/areas, each: name, why)
- top_attractions (list of 6-10 real famous attractions/places, each: name, description)
- hidden_gems (list of 3-5 lesser-known real places, each: name, description)
- local_culture (2-3 sentences)
- visa_notes (1 sentence, generic if unsure)
- safety_tips (list of 4-6 short tips)
"""
    return await llm_json(sys, prompt, sid)


async def hotel_agent(req: TripRequest, research: Dict, sid: str) -> List[Dict]:
    sys = (
        "You are a hotel expert. Suggest REAL, well-known hotels that exist in the destination. "
        "Do not invent fictional hotel names. If unsure of exact pricing, give realistic estimated ranges."
    )
    areas = [a.get("name", "") for a in research.get("best_areas_to_stay", [])][:5]
    prompt = f"""Suggest 6 real hotels in {req.destination} for {req.travelers} travelers, travel style: {req.travel_style}, budget: {req.budget} {req.currency} total.
Preferred areas (if applicable): {', '.join(areas)}.
Return 2 budget, 2 mid-range, 2 premium options.

Return JSON array, each item:
{{
  "name": "real hotel name",
  "tier": "budget|mid-range|premium",
  "area": "neighborhood",
  "price_range": "estimated price per night, e.g., '$80-120/night'",
  "rating": "e.g., '4.3/5'",
  "amenities": ["wifi", "pool", ...],
  "distance_from_attractions": "e.g., '10 min walk to Old Town'"
}}
Only output the JSON array."""
    arr = await llm_json(sys, prompt, sid)
    if not isinstance(arr, list):
        arr = arr.get("hotels", []) if isinstance(arr, dict) else []
    for h in arr:
        h["search_link"] = gsearch_link(f"{h.get('name','')} {req.destination} hotel")
        tier = h.get("tier", "mid-range")
        h["image_category"] = {
            "budget": "hotel_card_mid",
            "mid-range": "hotel_card_mid",
            "premium": "hotel_card_premium",
        }.get(tier, "hotel_card_mid")
    return arr


async def transport_agent(req: TripRequest, sid: str) -> List[Dict]:
    sys = "You are a transport expert. Suggest realistic transport options between cities. Give estimated price ranges."
    prompt = f"""Suggest source-to-destination transport from {req.source} to {req.destination} for {req.travelers} traveler(s).
Include 3-5 realistic options across modes (flight, train, bus, cab if applicable).

Return JSON array, each item:
{{
  "mode": "flight|train|bus|cab",
  "provider": "real airline/operator name or 'Various'",
  "from": "{req.source}",
  "to": "{req.destination}",
  "duration": "e.g., '2h 30m'",
  "estimated_price": "estimated range per person, e.g., '$80-150'",
  "notes": "best for whom, frequency, tips"
}}
Only output the JSON array."""
    arr = await llm_json(sys, prompt, sid)
    if not isinstance(arr, list):
        arr = arr.get("transport", []) if isinstance(arr, dict) else []
    for t in arr:
        mode = t.get("mode", "transport")
        t["booking_link"] = gsearch_link(f"{mode} {req.source} to {req.destination} booking")
    return arr


async def food_agent(req: TripRequest, sid: str) -> List[Dict]:
    sys = "You are a food critic. Recommend REAL restaurants and cafés that exist in the destination. Don't invent names."
    prompt = f"""Recommend 6-8 real restaurants/cafés in {req.destination} suitable for {req.travel_style} travelers with budget {req.budget} {req.currency}.
Include diverse cuisines. Each must be real and reputable.

Return JSON array, each item:
{{
  "name": "real restaurant name",
  "cuisine": "e.g., 'Italian', 'Local Thai', 'Street food'",
  "price_range": "estimated, e.g., '$$' or '$15-30/person'",
  "rating": "e.g., '4.5/5'",
  "area": "neighborhood",
  "best_dishes": ["dish1", "dish2", "dish3"]
}}
Only output the JSON array."""
    arr = await llm_json(sys, prompt, sid)
    if not isinstance(arr, list):
        arr = arr.get("restaurants", []) if isinstance(arr, dict) else []
    for r in arr:
        r["map_link"] = gmaps_link(f"{r.get('name','')} {r.get('area','')} {req.destination}")
    return arr


async def itinerary_agent(req: TripRequest, research: Dict, weather: List[Dict], sid: str) -> List[Dict]:
    sys = (
        "You are an expert trip planner. Build a realistic, human-feeling day-by-day itinerary. "
        "Group nearby attractions. Don't overpack days. Be specific to the destination."
    )
    attractions = research.get("top_attractions", []) + research.get("hidden_gems", [])
    attr_names = [a.get("name", "") for a in attractions]
    sd = datetime.strptime(req.start_date, "%Y-%m-%d").date()
    ed = datetime.strptime(req.end_date, "%Y-%m-%d").date()
    days = (ed - sd).days + 1
    weather_summary = "\n".join(
        f"- {w['date']}: {w['condition']} ({w['temperature']})" for w in weather
    ) or "No weather data — assume mild conditions."

    prompt = f"""Build a {days}-day itinerary for {req.destination} from {req.start_date} to {req.end_date}.
Travelers: {req.travelers}. Style: {req.travel_style}. Interests: {', '.join(req.interests) or 'general'}.
Available attractions to draw from (use real names from this list when relevant):
{', '.join(attr_names[:25])}

Weather forecast:
{weather_summary}

Return a JSON array of {days} day objects. Each:
{{
  "day": 1,
  "date": "YYYY-MM-DD",
  "title": "Short theme of the day",
  "weather_note": "1 short line acknowledging the weather",
  "morning": "Detailed morning plan, mention specific places & estimated timing.",
  "afternoon": "Afternoon plan with places.",
  "evening": "Evening plan.",
  "food": "Lunch and dinner suggestions referencing cuisines or areas (no fake names).",
  "transport": "How to get between places (walk/metro/cab) with rough times.",
  "estimated_cost": "Approximate cost per person for the day, e.g., '$60-90'"
}}
Only output the JSON array."""
    arr = await llm_json(sys, prompt, sid)
    if not isinstance(arr, list):
        arr = arr.get("itinerary", []) if isinstance(arr, dict) else []
    # fix dates if missing
    for i, day in enumerate(arr):
        if "date" not in day or not day["date"]:
            day["date"] = (sd + timedelta(days=i)).isoformat()
        if "day" not in day:
            day["day"] = i + 1
    return arr


async def budget_agent(req: TripRequest, transport: List[Dict], hotels: List[Dict], itinerary: List[Dict], sid: str) -> Dict:
    """Estimate real trip cost from generated options, then refine with LLM if possible."""
    nights = max((datetime.strptime(req.end_date, "%Y-%m-%d") - datetime.strptime(req.start_date, "%Y-%m-%d")).days, 1)
    days = len(itinerary) or nights + 1
    travelers = max(int(req.travelers or 1), 1)

    hotel_per_night = _choose_price([h.get("price_range", "") for h in hotels], req.travel_style)
    transport_per_person = _choose_price([t.get("estimated_price", "") for t in transport], req.travel_style)
    day_cost_per_person = _sum_day_costs(itinerary)

    hotel_total = hotel_per_night * nights
    transport_total = transport_per_person * travelers
    if day_cost_per_person:
        day_total = day_cost_per_person * travelers
        food_total = round(day_total * 0.38, 2)
        activities_total = round(day_total * 0.42, 2)
        local_total = round(day_total * 0.20, 2)
    else:
        daily = await _estimate_daily_cost(req, hotels, transport, itinerary, sid)
        food_total = daily["food"] * days * travelers
        activities_total = daily["activities"] * days * travelers
        local_total = daily["local_travel"] * days * travelers

    pre_buffer = hotel_total + transport_total + food_total + activities_total + local_total
    buffer = round(max(pre_buffer * 0.08, travelers * days * 5), 2)
    total = round(pre_buffer + buffer, 2)

    return {
        "transport": round(transport_total, 2),
        "hotel": round(hotel_total, 2),
        "food": round(food_total, 2),
        "activities": round(activities_total, 2),
        "local_travel": round(local_total, 2),
        "buffer": buffer,
        "total": total,
        "currency": req.currency,
    }


def _numbers(text: str) -> List[float]:
    cleaned = (text or "").replace(",", "")
    return [float(n) for n in re.findall(r"\d+(?:\.\d+)?", cleaned)]


def _mid_price(text: str) -> float:
    nums = _numbers(text)
    if not nums:
        return 0.0
    usable = [n for n in nums if n >= 2]
    if not usable:
        return 0.0
    if len(usable) >= 2:
        return (usable[0] + usable[1]) / 2
    return usable[0]


def _choose_price(texts: List[str], style: str) -> float:
    prices = sorted([p for p in (_mid_price(text) for text in texts) if p > 0])
    if not prices:
        return 0.0
    if style == "luxury":
        return prices[min(len(prices) - 1, max(0, int(len(prices) * 0.75)))]
    if style == "budget":
        return prices[0]
    return prices[len(prices) // 2]


def _sum_day_costs(itinerary: List[Dict]) -> float:
    total = 0.0
    for day in itinerary:
        total += _mid_price(day.get("estimated_cost", ""))
    return total


async def _estimate_daily_cost(req: TripRequest, hotels: List[Dict], transport: List[Dict], itinerary: List[Dict], sid: str) -> Dict[str, float]:
    sys = "You estimate realistic travel costs. Return conservative numeric JSON only."
    prompt = f"""Estimate per-person daily in-destination spend for {req.destination}.
Currency: {req.currency}. Travel style: {req.travel_style}. Travelers: {req.travelers}.
Use these options as context:
Hotels: {json.dumps(hotels[:4], ensure_ascii=False)}
Transport: {json.dumps(transport[:4], ensure_ascii=False)}
Itinerary: {json.dumps(itinerary[:3], ensure_ascii=False)}

Return JSON object with numeric values only:
{{"food": 0, "activities": 0, "local_travel": 0}}
Do not include hotel or source-to-destination transport in these daily values."""
    try:
        data = await llm_json(sys, prompt, f"{sid}-budget")
        return {
            "food": float(data.get("food", 0) or 0),
            "activities": float(data.get("activities", 0) or 0),
            "local_travel": float(data.get("local_travel", 0) or 0),
        }
    except Exception as e:
        logger.warning(f"Daily budget estimate failed: {e}")
        fallback = {
            "budget": {"food": 18, "activities": 15, "local_travel": 8},
            "luxury": {"food": 85, "activities": 65, "local_travel": 25},
            "adventure": {"food": 30, "activities": 55, "local_travel": 15},
            "family": {"food": 28, "activities": 30, "local_travel": 12},
            "romantic": {"food": 55, "activities": 40, "local_travel": 15},
            "workation": {"food": 35, "activities": 20, "local_travel": 10},
        }
        return fallback.get(req.travel_style, fallback["budget"])


def image_queries_from_itinerary(req: TripRequest, itinerary: List[Dict]) -> List[str]:
    queries = []
    for day in itinerary[:6]:
        title = day.get("title") or ""
        morning = day.get("morning") or ""
        afternoon = day.get("afternoon") or ""
        base = title or morning[:90] or afternoon[:90] or req.destination
        queries.append(f"{base} {req.destination} travel attraction")
    if not queries:
        queries.append(f"{req.destination} famous travel attraction")
    return queries


def hero_image_query(req: TripRequest, research: Dict) -> str:
    attractions = research.get("top_attractions") or []
    for attraction in attractions:
        if isinstance(attraction, dict) and attraction.get("name"):
            name = attraction["name"]
            if req.destination.lower() in name.lower() or name.lower() in req.destination.lower():
                continue
            return f"{name} {req.destination} landmark"
    if attractions and isinstance(attractions[0], dict) and attractions[0].get("name"):
        return f"{attractions[0]['name']} {req.destination} landmark"
    return f"{req.destination} most famous landmark travel attraction"


async def final_response_agent(req: TripRequest, research: Dict, hotels: List, sid: str) -> Dict:
    """Generate tips, packing, safety, recommendation."""
    sys = "You are a thoughtful travel concierge. Be concise and practical."
    prompt = f"""For a {req.travel_style} trip to {req.destination} ({req.start_date} to {req.end_date}), {req.travelers} traveler(s), interests: {', '.join(req.interests) or 'general'}.

Return JSON:
{{
  "packing_suggestions": [8-12 short items tailored to destination & season],
  "local_tips": [5-8 short practical tips],
  "safety_notes": [4-6 short safety notes],
  "final_recommendation": "A warm, 3-4 sentence closing recommendation summarizing why this trip will be amazing."
}}
Only the JSON object."""
    data = await llm_json(sys, prompt, sid)
    return data


# ---------- Orchestrator ----------

async def run_pipeline(
    trip_id: str,
    req: TripRequest,
    update_progress: Callable[[str, str], Awaitable[None]],
    save_partial: Callable[[Dict[str, Any]], Awaitable[None]],
):
    """Run all agents sequentially with progress updates."""
    sid = f"trip-{trip_id}"

    AGENTS = [
        "User Understanding",
        "Destination Research",
        "Weather Forecast",
        "Hotel Curation",
        "Transport Planning",
        "Food Discovery",
        "Itinerary Building",
        "Budget Analysis",
        "Validation",
        "Final Polish",
    ]
    # mark all pending
    for a in AGENTS:
        await update_progress(a, "pending")

    # 1. User understanding (validation)
    await update_progress("User Understanding", "running")
    days = (datetime.strptime(req.end_date, "%Y-%m-%d") - datetime.strptime(req.start_date, "%Y-%m-%d")).days + 1
    trip_summary = {
        "source": req.source,
        "destination": req.destination,
        "dates": f"{req.start_date} to {req.end_date}",
        "duration": f"{days} days",
        "travelers": str(req.travelers),
        "budget": f"{req.budget} {req.currency}",
        "travel_style": req.travel_style,
    }
    await save_partial({"trip_summary": trip_summary})
    await update_progress("User Understanding", "done")

    # 2. Destination research
    await update_progress("Destination Research", "running")
    try:
        research = await destination_research_agent(req, sid)
    except Exception as e:
        logger.warning(f"Destination research agent failed: {e}")
        research = {
            "overview": f"A practical trip plan for {req.destination} based on your dates, style, and budget.",
            "best_areas_to_stay": [],
            "top_attractions": [],
            "hidden_gems": [],
            "safety_tips": [],
        }
    await save_partial({"destination_overview": research.get("overview", "")})
    await update_progress("Destination Research", "done")

    # 3. Weather (parallel-safe but keep sequential for progress UI)
    await update_progress("Weather Forecast", "running")
    try:
        weather = await get_forecast(req.destination, req.start_date, req.end_date)
    except Exception as e:
        logger.warning(f"Weather failed: {e}")
        weather = []
    await save_partial({"weather_forecast": weather})
    await update_progress("Weather Forecast", "done")

    # 4. Hotels
    await update_progress("Hotel Curation", "running")
    try:
        hotels = await hotel_agent(req, research, sid)
    except Exception as e:
        logger.warning(f"Hotel agent failed: {e}")
        hotels = []
    await save_partial({"hotel_options": hotels})
    await update_progress("Hotel Curation", "done")

    # 5. Transport
    await update_progress("Transport Planning", "running")
    try:
        transport = await transport_agent(req, sid)
    except Exception as e:
        logger.warning(f"Transport agent failed: {e}")
        transport = []
    await save_partial({"transport_options": transport})
    await update_progress("Transport Planning", "done")

    # 6. Food
    await update_progress("Food Discovery", "running")
    try:
        restaurants = await food_agent(req, sid)
    except Exception as e:
        logger.warning(f"Food agent failed: {e}")
        restaurants = []
    await save_partial({"restaurants": restaurants})
    await update_progress("Food Discovery", "done")

    # 7. Itinerary
    await update_progress("Itinerary Building", "running")
    try:
        itinerary = await itinerary_agent(req, research, weather, sid)
    except Exception as e:
        logger.warning(f"Itinerary agent failed: {e}")
        itinerary = []
    await save_partial({"day_wise_itinerary": itinerary})
    await update_progress("Itinerary Building", "done")

    # 7b. Visual preview images from Google Places
    if itinerary:
        try:
            hero_images = await place_photos_for_queries([hero_image_query(req, research)])
            place_images = await place_photos_for_queries(image_queries_from_itinerary(req, itinerary))
            await save_partial({
                "hero_image": hero_images[0] if hero_images else {},
                "place_images": place_images,
            })
        except Exception as e:
            logger.warning(f"Place image lookup failed: {e}")

    # 8. Budget
    await update_progress("Budget Analysis", "running")
    budget = await budget_agent(req, transport, hotels, itinerary, sid)
    await save_partial({"budget_breakdown": budget})
    await update_progress("Budget Analysis", "done")

    # 9. Validation (lightweight: ensure non-empty)
    await update_progress("Validation", "running")
    issues = []
    if not hotels: issues.append("No hotels returned")
    if not itinerary: issues.append("Itinerary empty")
    await update_progress("Validation", "done")

    # 10. Final response polish
    await update_progress("Final Polish", "running")
    try:
        polish = await final_response_agent(req, research, hotels, sid)
    except Exception as e:
        logger.warning(f"Polish agent failed: {e}")
        polish = {"packing_suggestions": [], "local_tips": [], "safety_notes": [], "final_recommendation": ""}
    booking_links = {
        "flights": gsearch_link(f"flights {req.source} to {req.destination}"),
        "hotels": gsearch_link(f"hotels in {req.destination}"),
        "experiences": gsearch_link(f"things to do in {req.destination}"),
    }
    await save_partial({
        "packing_suggestions": polish.get("packing_suggestions", []),
        "local_tips": polish.get("local_tips", []) + ([f"Note: {i}" for i in issues] if issues else []),
        "safety_notes": polish.get("safety_notes", []) + research.get("safety_tips", []),
        "final_recommendation": polish.get("final_recommendation", ""),
        "booking_links": booking_links,
    })
    await update_progress("Final Polish", "done")
