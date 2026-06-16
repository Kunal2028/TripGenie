"""Google Places photo helpers.

Uses Places API (New) server-side so the Maps API key is not exposed to the browser.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Dict, List

import httpx

logger = logging.getLogger(__name__)

TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"


def _api_key() -> str:
    return os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()


async def place_photo_for_query(query: str, max_width: int = 900) -> Dict[str, Any]:
    key = _api_key()
    if not key:
        return {"query": query, "photo_url": "", "place_name": "", "error": "Google Maps API key is not configured"}

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.photos",
    }
    payload = {"textQuery": query, "maxResultCount": 1}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            search = await client.post(TEXT_SEARCH_URL, headers=headers, json=payload)
            search.raise_for_status()
            places = search.json().get("places", [])
            if not places:
                return {"query": query, "photo_url": "", "place_name": "", "error": "No place found"}

            place = places[0]
            photos = place.get("photos") or []
            if not photos or not photos[0].get("name"):
                return {
                    "query": query,
                    "photo_url": "",
                    "place_name": (place.get("displayName") or {}).get("text", ""),
                    "error": "No photo found",
                }

            photo_name = photos[0]["name"]
            photo_url = f"https://places.googleapis.com/v1/{photo_name}/media"
            media = await client.get(
                photo_url,
                params={"maxWidthPx": max_width, "skipHttpRedirect": "true", "key": key},
            )
            media.raise_for_status()
            return {
                "query": query,
                "photo_url": media.json().get("photoUri", ""),
                "place_name": (place.get("displayName") or {}).get("text", ""),
                "error": "",
            }
    except Exception as exc:
        logger.warning("Google Places photo lookup failed for %s: %s", query, exc)
        return {"query": query, "photo_url": "", "place_name": "", "error": str(exc)}


async def place_photos_for_queries(queries: List[str], max_width: int = 900) -> List[Dict[str, Any]]:
    clean_queries = []
    seen = set()
    for query in queries:
        q = " ".join((query or "").split())
        if q and q.lower() not in seen:
            seen.add(q.lower())
            clean_queries.append(q)
    return [await place_photo_for_query(query, max_width=max_width) for query in clean_queries[:8]]
