import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CalendarBlank, MapPin, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { deleteTrip, listTrips } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function SavedTrips() {
  const { signedIn, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!signedIn) {
      setLoading(false);
      return;
    }
    loadTrips();
  }, [authLoading, signedIn]);

  async function loadTrips() {
    try {
      setLoading(true);
      setTrips(await listTrips());
    } catch (e) {
      toast.error("Could not load saved trips");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id) {
    try {
      await deleteTrip(id);
      setTrips((items) => items.filter((item) => item.id !== id));
      toast.success("Trip deleted");
    } catch (e) {
      toast.error("Could not delete trip");
    }
  }

  return (
    <main data-testid="saved-trips-page" className="max-w-6xl mx-auto px-6 lg:px-10 py-16 lg:py-24">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
        <div>
          <div className="label-eyebrow mb-3">saved plans</div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl text-[#1A2F24] tracking-tighter">
            Your trips
          </h1>
          <p className="mt-4 text-[#5C6B62] max-w-xl">
            Pick up a completed itinerary, check a running plan, or clear old drafts.
          </p>
        </div>
        <Link to="/" className="btn-primary inline-flex items-center gap-2 self-start sm:self-auto" data-testid="new-trip-button">
          New trip <ArrowRight size={18} weight="bold" />
        </Link>
      </div>

      {loading && (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="saved-trips-loading">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="tg-card h-40 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && trips.length === 0 && (
        <div className="tg-card mt-10 text-center py-14" data-testid="saved-trips-empty">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#f0f5f2] grid place-items-center">
            <MapPin size={24} color="#85B09A" weight="duotone" />
          </div>
          <h2 className="font-display text-2xl text-[#1A2F24] mt-4">
            {signedIn ? "No saved trips yet" : "Sign in to view saved trips"}
          </h2>
          <p className="text-[#5C6B62] mt-2">
            {signedIn ? "Create your first AI-planned itinerary from the planner." : "Your trips are private to your account."}
          </p>
        </div>
      )}

      {!loading && trips.length > 0 && (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((trip, i) => {
            const destination = trip.destination || trip.trip_summary?.destination || "Untitled trip";
            const status = trip.status || "pending";
            const target = status === "completed" ? `/trip/${trip.id}` : `/planning/${trip.id}`;
            return (
              <motion.article
                key={trip.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="tg-card"
                data-testid={`saved-trip-${i}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="label-eyebrow">{status}</span>
                    <h2 className="font-display text-2xl text-[#1A2F24] mt-1">{destination}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(trip.id)}
                    className="w-9 h-9 rounded-full grid place-items-center bg-[#f9f8f6] text-[#5C6B62] hover:text-[#D9534F]"
                    data-testid={`delete-trip-${i}`}
                    aria-label="Delete trip"
                  >
                    <Trash size={18} />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-[#5C6B62]">
                  {(trip.start_date || trip.end_date) && (
                    <div className="flex items-center gap-2">
                      <CalendarBlank size={16} color="#E27D60" />
                      <span>{trip.start_date} to {trip.end_date}</span>
                    </div>
                  )}
                  {trip.created_at && (
                    <div className="flex items-center gap-2">
                      <MapPin size={16} color="#85B09A" />
                      <span>{new Date(trip.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <Link
                  to={target}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#E27D60] hover:text-[#C86B50]"
                  data-testid={`open-trip-${i}`}
                >
                  {status === "completed" ? "Open itinerary" : "View progress"}
                  <ArrowRight size={16} weight="bold" />
                </Link>
              </motion.article>
            );
          })}
        </div>
      )}
    </main>
  );
}
