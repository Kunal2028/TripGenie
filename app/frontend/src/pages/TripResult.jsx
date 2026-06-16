import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowSquareOut,
  CalendarBlank,
  CheckCircle,
  MapPin,
  SuitcaseRolling,
  Users,
  Wallet,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { getPlacePhotos, getTrip } from "@/lib/api";
import { HERO_IMG } from "@/lib/images";
import WeatherStrip from "@/components/WeatherStrip";
import HotelCard from "@/components/HotelCard";
import RestaurantCard from "@/components/RestaurantCard";
import TransportCard from "@/components/TransportCard";
import BudgetChart from "@/components/BudgetChart";
import ItineraryTimeline from "@/components/ItineraryTimeline";

export default function TripResult() {
  const { id } = useParams();
  const nav = useNavigate();
  const [trip, setTrip] = useState(null);
  const [placePhotos, setPlacePhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getTrip(id);
        if (!active) return;
        if (data.status && data.status !== "completed") {
          nav(`/planning/${id}`);
          return;
        }
        setTrip(data);
        setPlacePhotos((data.place_images || []).filter((photo) => photo.photo_url));
      } catch (e) {
        if (active) {
          setError("Could not load this trip.");
          toast.error("Could not load this trip");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id, nav]);

  useEffect(() => {
    if (!trip || placePhotos.length > 0) return;
    const destination = trip.trip_summary?.destination || trip.request?.destination || "";
    const itineraryQueries = (trip.day_wise_itinerary || [])
      .slice(0, 6)
      .map((day) => `${day.title || day.morning || destination} ${destination} travel attraction`);
    const queries = itineraryQueries.length
      ? itineraryQueries
      : [
          `${destination} famous travel attraction`,
          `${destination} landmark`,
          `${destination} tourism`,
        ];

    let active = true;
    async function loadPhotos() {
      try {
        setPhotosLoading(true);
        const photos = await getPlacePhotos(queries);
        if (active) setPlacePhotos(photos.filter((photo) => photo.photo_url));
      } catch (e) {
        if (active) setPlacePhotos([]);
      } finally {
        if (active) setPhotosLoading(false);
      }
    }
    loadPhotos();
    return () => {
      active = false;
    };
  }, [trip, placePhotos.length]);

  const summary = trip?.trip_summary || {};
  const request = trip?.request || {};
  const destination = summary.destination || request.destination || "Your destination";
  const heroImage = trip?.hero_image?.photo_url || trip?.place_images?.find((photo) => photo.photo_url)?.photo_url || HERO_IMG;
  const quickFacts = useMemo(
    () => [
      { icon: CalendarBlank, label: "Dates", value: summary.dates || `${request.start_date || ""} to ${request.end_date || ""}` },
      { icon: Users, label: "Travelers", value: summary.travelers || request.travelers },
      { icon: Wallet, label: "Budget", value: summary.budget || `${request.budget || ""} ${request.currency || ""}` },
      { icon: SuitcaseRolling, label: "Style", value: summary.travel_style || request.travel_style },
    ].filter((item) => item.value),
    [summary, request],
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20" data-testid="trip-loading">
        <div className="tg-card animate-pulse h-64" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20" data-testid="trip-error">
        <div className="tg-card">
          <div className="label-eyebrow mb-2">trip unavailable</div>
          <h1 className="font-display text-3xl text-[#1A2F24]">We could not find this plan.</h1>
          <Link to="/" className="btn-primary inline-flex mt-6">Plan a new trip</Link>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="trip-result-page">
      <section className="relative min-h-[460px] overflow-hidden bg-[#1A2F24]">
        <img
          src={heroImage}
          alt={trip?.hero_image?.place_name || destination}
          className="absolute inset-0 h-full w-full object-cover object-center scale-[1.01] opacity-95"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f9f8f6]/95 via-[#f9f8f6]/78 to-[#f9f8f6]/18" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#f9f8f6]" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-12 pb-14">
          <button
            type="button"
            onClick={() => nav("/")}
            className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-[#1A2F24] backdrop-blur shadow-[0_10px_25px_rgba(26,47,36,0.10)]"
            data-testid="back-to-plan-button"
          >
            <ArrowLeft size={16} /> New plan
          </button>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-16 max-w-2xl rounded-2xl border border-white/70 bg-white/72 p-6 sm:p-8 backdrop-blur-xl shadow-[0_24px_70px_rgba(26,47,36,0.12)]"
          >
            <div className="label-eyebrow mb-3">your trip plan</div>
            <h1 className="font-display font-bold text-4xl sm:text-6xl text-[#1A2F24] tracking-tighter leading-[1.02]">
              {destination}
            </h1>
            {trip.destination_overview && (
              <p className="mt-5 text-[#355244] text-base sm:text-lg leading-relaxed max-w-2xl">
                {trip.destination_overview}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 lg:px-10 pb-24 -mt-12 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickFacts.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="tg-card !p-4" data-testid={`trip-fact-${item.label.toLowerCase()}`}>
                    <Icon size={22} color="#E27D60" weight="duotone" />
                    <div className="label-eyebrow mt-3">{item.label}</div>
                    <div className="font-display font-medium text-[#1A2F24] mt-1 capitalize">{item.value}</div>
                  </div>
                );
              })}
            </div>

            <Section title="Weather" eyebrow="forecast">
              <WeatherStrip days={trip.weather_forecast || []} />
            </Section>

            <Section title="Day-by-day itinerary" eyebrow="the route">
              <ItineraryTimeline days={trip.day_wise_itinerary || []} />
            </Section>

            <Section title="Place images" eyebrow="visual preview">
              {placePhotos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="place-image-gallery">
                  {placePhotos.map((photo, i) => (
                    <figure key={`${photo.query}-${i}`} className="tg-card !p-0 overflow-hidden">
                      <img
                        src={photo.photo_url}
                        alt={photo.place_name || photo.query}
                        className="h-48 w-full object-cover"
                        data-testid={`place-image-${i}`}
                      />
                      <figcaption className="p-4">
                        <div className="label-eyebrow">Google Places</div>
                        <div className="font-display font-medium text-[#1A2F24] mt-1">
                          {photo.place_name || photo.query}
                        </div>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : photosLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="place-images-loading">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="tg-card !p-0 overflow-hidden">
                      <div className="h-48 bg-[#eef0ec] animate-pulse" />
                      <div className="p-4">
                        <div className="h-3 w-24 bg-[#eef0ec] rounded animate-pulse" />
                        <div className="h-5 w-36 bg-[#eef0ec] rounded animate-pulse mt-3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="tg-card !p-0 overflow-hidden" data-testid="place-images-empty">
                  <img src={HERO_IMG} alt={destination} className="h-56 w-full object-cover" />
                  <div className="p-4">
                    <div className="label-eyebrow">visual preview</div>
                    <div className="font-display font-medium text-[#1A2F24] mt-1">
                      {destination}
                    </div>
                  </div>
                </div>
              )}
            </Section>

            <Section title="Hotels" eyebrow="stay options">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(trip.hotel_options || []).map((hotel, i) => (
                  <HotelCard key={`${hotel.name}-${i}`} hotel={hotel} index={i} />
                ))}
              </div>
              {!trip.hotel_options?.length && <Empty text="No hotel options were returned." />}
            </Section>

            <Section title="Restaurants" eyebrow="food stops">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(trip.restaurants || []).map((restaurant, i) => (
                  <RestaurantCard key={`${restaurant.name}-${i}`} restaurant={restaurant} index={i} />
                ))}
              </div>
              {!trip.restaurants?.length && <Empty text="No restaurant options were returned." />}
            </Section>
          </section>

          <aside className="lg:col-span-4 space-y-6">
            <BudgetChart breakdown={trip.budget_breakdown} />

            <div className="tg-card" data-testid="transport-section">
              <div className="label-eyebrow">getting there</div>
              <h2 className="font-display text-2xl text-[#1A2F24] mt-1">Transport</h2>
              <div className="mt-4 space-y-3">
                {(trip.transport_options || []).map((option, i) => (
                  <TransportCard key={`${option.mode}-${i}`} option={option} index={i} />
                ))}
                {!trip.transport_options?.length && <Empty text="No transport options were returned." />}
              </div>
            </div>

            <TipList title="Local tips" items={trip.local_tips} testId="local-tips" />
            <TipList title="Packing" items={trip.packing_suggestions} testId="packing-suggestions" />
            <TipList title="Safety notes" items={trip.safety_notes} testId="safety-notes" />

            <div className="tg-card" data-testid="booking-links">
              <div className="label-eyebrow">quick links</div>
              <div className="mt-4 space-y-2">
                {Object.entries(trip.booking_links || {}).map(([label, url]) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl bg-[#f9f8f6] px-4 py-3 text-sm font-medium capitalize text-[#1A2F24] hover:text-[#E27D60]"
                    data-testid={`booking-link-${label}`}
                  >
                    {label}
                    <ArrowSquareOut size={16} />
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {trip.final_recommendation && (
          <div className="tg-card mt-6 flex gap-4" data-testid="final-recommendation">
            <CheckCircle size={28} weight="duotone" color="#6B8E23" className="shrink-0 mt-1" />
            <p className="text-[#1A2F24] leading-relaxed">{trip.final_recommendation}</p>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({ eyebrow, title, children }) {
  return (
    <section>
      <div className="label-eyebrow mb-2">{eyebrow}</div>
      <h2 className="font-display text-2xl sm:text-3xl text-[#1A2F24] mb-5">{title}</h2>
      {children}
    </section>
  );
}

function TipList({ title, items = [], testId }) {
  if (!items.length) return null;
  return (
    <div className="tg-card" data-testid={testId}>
      <div className="label-eyebrow">{title}</div>
      <ul className="mt-4 space-y-3">
        {items.slice(0, 10).map((item, i) => (
          <li key={i} className="flex gap-3 text-sm text-[#1A2F24] leading-relaxed">
            <MapPin size={16} color="#85B09A" weight="duotone" className="shrink-0 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Empty({ text }) {
  return <div className="rounded-xl bg-white/70 border border-[#e5e4e2] p-4 text-sm text-[#5C6B62]">{text}</div>;
}
