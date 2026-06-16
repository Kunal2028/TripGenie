"""Pydantic schemas for TripGenie multi-agent trip planner."""
from __future__ import annotations
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
import uuid


class TripRequest(BaseModel):
    source: str
    destination: str
    start_date: str  # YYYY-MM-DD
    end_date: str
    budget: float
    currency: str = "USD"
    travelers: int = 1
    travel_style: str = "budget"  # budget / luxury / adventure / family / romantic / workation
    interests: List[str] = Field(default_factory=list)


class SignupRequest(BaseModel):
    name: str = ""
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class PlacePhotosRequest(BaseModel):
    queries: List[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    message: str
    trip_id: Optional[str] = None


class ChatReply(BaseModel):
    title: str = ""
    summary: str = ""
    bullets: List[str] = Field(default_factory=list)
    next_steps: List[str] = Field(default_factory=list)
    note: str = ""


class AuthUser(BaseModel):
    id: str
    name: str = ""
    email: str
    picture: str = ""
    provider: str = "password"


class AuthResponse(BaseModel):
    token: str
    user: AuthUser


class WeatherDay(BaseModel):
    date: str
    condition: str = ""
    temperature: str = ""
    icon: str = ""
    suggestion: str = ""


class TransportOption(BaseModel):
    mode: str  # flight/train/bus/cab
    provider: str = ""
    from_: str = Field(default="", alias="from")
    to: str = ""
    duration: str = ""
    estimated_price: str = ""
    booking_link: str = ""
    notes: str = ""

    model_config = ConfigDict(populate_by_name=True)


class HotelOption(BaseModel):
    name: str
    tier: str = "mid-range"  # budget / mid-range / premium
    area: str = ""
    price_range: str = ""
    rating: str = ""
    amenities: List[str] = Field(default_factory=list)
    distance_from_attractions: str = ""
    search_link: str = ""
    image_category: str = "hotel_card_mid"


class Restaurant(BaseModel):
    name: str
    cuisine: str = ""
    price_range: str = ""
    rating: str = ""
    area: str = ""
    best_dishes: List[str] = Field(default_factory=list)
    map_link: str = ""


class ItineraryDay(BaseModel):
    day: int
    date: str
    title: str = ""
    weather_note: str = ""
    morning: str = ""
    afternoon: str = ""
    evening: str = ""
    food: str = ""
    transport: str = ""
    estimated_cost: str = ""


class BudgetBreakdown(BaseModel):
    transport: float = 0
    hotel: float = 0
    food: float = 0
    activities: float = 0
    local_travel: float = 0
    buffer: float = 0
    total: float = 0
    currency: str = "USD"


class TripPlan(BaseModel):
    """Final structured trip plan."""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"  # pending / running / completed / failed
    progress: List[Dict[str, Any]] = Field(default_factory=list)
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # request echo
    request: Optional[TripRequest] = None

    trip_summary: Dict[str, Any] = Field(default_factory=dict)
    weather_forecast: List[WeatherDay] = Field(default_factory=list)
    transport_options: List[TransportOption] = Field(default_factory=list)
    hotel_options: List[HotelOption] = Field(default_factory=list)
    restaurants: List[Restaurant] = Field(default_factory=list)
    day_wise_itinerary: List[ItineraryDay] = Field(default_factory=list)
    budget_breakdown: BudgetBreakdown = Field(default_factory=BudgetBreakdown)
    booking_links: Dict[str, str] = Field(default_factory=dict)
    hero_image: Dict[str, Any] = Field(default_factory=dict)
    place_images: List[Dict[str, Any]] = Field(default_factory=list)
    local_tips: List[str] = Field(default_factory=list)
    packing_suggestions: List[str] = Field(default_factory=list)
    safety_notes: List[str] = Field(default_factory=list)
    destination_overview: str = ""
    final_recommendation: str = ""
