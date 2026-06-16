"""Open-Meteo weather integration (free, no key)."""
import httpx
from datetime import datetime, timedelta
from typing import List, Dict


WMO_CODE_MAP = {
    0: ("Clear sky", "sun"),
    1: ("Mainly clear", "sun"),
    2: ("Partly cloudy", "cloud-sun"),
    3: ("Overcast", "cloud"),
    45: ("Fog", "cloud-fog"),
    48: ("Depositing rime fog", "cloud-fog"),
    51: ("Light drizzle", "cloud-drizzle"),
    53: ("Moderate drizzle", "cloud-drizzle"),
    55: ("Dense drizzle", "cloud-drizzle"),
    61: ("Slight rain", "cloud-rain"),
    63: ("Moderate rain", "cloud-rain"),
    65: ("Heavy rain", "cloud-rain"),
    71: ("Slight snow", "snowflake"),
    73: ("Moderate snow", "snowflake"),
    75: ("Heavy snow", "snowflake"),
    80: ("Rain showers", "cloud-rain"),
    81: ("Heavy showers", "cloud-rain"),
    82: ("Violent showers", "cloud-rain"),
    95: ("Thunderstorm", "cloud-lightning"),
    96: ("Thunder w/ hail", "cloud-lightning"),
    99: ("Heavy thunder", "cloud-lightning"),
}


async def geocode(place: str) -> Dict | None:
    url = "https://geocoding-api.open-meteo.com/v1/search"
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(url, params={"name": place, "count": 1, "language": "en"})
        r.raise_for_status()
        data = r.json()
        if not data.get("results"):
            return None
        res = data["results"][0]
        return {
            "latitude": res["latitude"],
            "longitude": res["longitude"],
            "country": res.get("country", ""),
            "name": res.get("name", place),
        }


async def get_forecast(destination: str, start_date: str, end_date: str) -> List[Dict]:
    """Return list of {date, condition, temperature, icon, suggestion}."""
    geo = await geocode(destination)
    if not geo:
        return []

    today = datetime.utcnow().date()
    sd = datetime.strptime(start_date, "%Y-%m-%d").date()
    ed = datetime.strptime(end_date, "%Y-%m-%d").date()

    # Open-Meteo forecast supports up to 16 days. If trip is far future, fall back to climatology endpoint.
    if (sd - today).days > 14 or (ed - today).days > 14:
        return await _climate_forecast(geo, sd, ed)

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": geo["latitude"],
        "longitude": geo["longitude"],
        "daily": "weather_code,temperature_2m_max,temperature_2m_min",
        "timezone": "auto",
        "start_date": start_date,
        "end_date": end_date,
    }
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get(url, params=params)
        r.raise_for_status()
        d = r.json().get("daily", {})

    out = []
    dates = d.get("time", [])
    codes = d.get("weather_code", [])
    tmax = d.get("temperature_2m_max", [])
    tmin = d.get("temperature_2m_min", [])
    for i, date in enumerate(dates):
        code = codes[i] if i < len(codes) else 0
        cond, icon = WMO_CODE_MAP.get(code, ("Unknown", "cloud"))
        out.append({
            "date": date,
            "condition": cond,
            "temperature": f"{int(tmin[i])}°–{int(tmax[i])}°C",
            "icon": icon,
            "suggestion": _suggest(cond),
        })
    return out


async def _climate_forecast(geo, sd, ed) -> List[Dict]:
    """For trips beyond 16d, use historical avg via archive API for same dates last year."""
    last_year_sd = sd.replace(year=sd.year - 1).isoformat()
    last_year_ed = ed.replace(year=ed.year - 1).isoformat()
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": geo["latitude"],
        "longitude": geo["longitude"],
        "daily": "weather_code,temperature_2m_max,temperature_2m_min",
        "timezone": "auto",
        "start_date": last_year_sd,
        "end_date": last_year_ed,
    }
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.get(url, params=params)
            r.raise_for_status()
            d = r.json().get("daily", {})
    except Exception:
        return []
    out = []
    dates = d.get("time", [])
    codes = d.get("weather_code", [])
    tmax = d.get("temperature_2m_max", [])
    tmin = d.get("temperature_2m_min", [])
    # Re-map to actual trip dates
    actual_dates = [(sd + timedelta(days=i)).isoformat() for i in range((ed - sd).days + 1)]
    for i, date in enumerate(actual_dates):
        if i >= len(codes):
            break
        code = codes[i] or 0
        cond, icon = WMO_CODE_MAP.get(code, ("Mild", "cloud-sun"))
        out.append({
            "date": date,
            "condition": f"{cond} (historical avg)",
            "temperature": f"{int(tmin[i])}°–{int(tmax[i])}°C",
            "icon": icon,
            "suggestion": _suggest(cond),
        })
    return out


def _suggest(condition: str) -> str:
    c = condition.lower()
    if "rain" in c or "drizzle" in c or "thunder" in c:
        return "Carry an umbrella; prefer indoor attractions, museums or cafés."
    if "snow" in c:
        return "Layer up warm clothing; great for hot drinks & cozy evenings."
    if "clear" in c or "sun" in c:
        return "Perfect for outdoor sightseeing; carry sunscreen & water."
    if "cloud" in c or "overcast" in c:
        return "Comfortable for long walks and photography."
    if "fog" in c:
        return "Reduced visibility; start mornings late and drive cautiously."
    return "Plan a balanced mix of indoor and outdoor activities."
