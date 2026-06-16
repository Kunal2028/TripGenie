import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, CircleNotch, Circle } from "@phosphor-icons/react";
import { getTrip } from "@/lib/api";
import { toast } from "sonner";

const AGENTS = [
  { name: "User Understanding", blurb: "Parsing your inputs & preferences" },
  { name: "Destination Research", blurb: "Studying the destination" },
  { name: "Weather Forecast", blurb: "Pulling live forecasts" },
  { name: "Hotel Curation", blurb: "Surfacing real hotels" },
  { name: "Transport Planning", blurb: "Mapping the journey" },
  { name: "Food Discovery", blurb: "Hunting authentic eats" },
  { name: "Itinerary Building", blurb: "Stitching the day-by-day" },
  { name: "Budget Analysis", blurb: "Crunching the numbers" },
  { name: "Validation", blurb: "Sanity-checking everything" },
  { name: "Final Polish", blurb: "Tips, packing, recommendation" },
];

export default function Planning() {
  const { id } = useParams();
  const nav = useNavigate();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const t = await getTrip(id);
        if (!active) return;
        setTrip(t);
        if (t.status === "completed") {
          toast.success("Trip plan ready!");
          setTimeout(() => nav(`/trip/${id}`), 600);
          return;
        }
        if (t.status === "failed") {
          setError(t.error || "Something went wrong");
          return;
        }
        setTimeout(poll, 1500);
      } catch (e) {
        if (active) setError("Could not fetch trip status");
      }
    };
    poll();
    return () => {
      active = false;
    };
  }, [id, nav]);

  const progress = trip?.progress || [];
  const statusOf = (name) => progress.find((p) => p.agent === name)?.status || "pending";
  const completedCount = progress.filter((p) => p.status === "done").length;
  const pct = Math.round((completedCount / AGENTS.length) * 100);

  return (
    <div data-testid="planning-page" className="max-w-5xl mx-auto px-6 lg:px-10 py-16 lg:py-24">
      <div className="label-eyebrow mb-3">crafting your trip</div>
      <h1 className="font-display font-bold text-3xl sm:text-5xl text-[#1A2F24] tracking-tighter">
        Our agents are{" "}
        <span className="italic text-[#E27D60]">on it</span>.
      </h1>
      <p className="mt-4 text-[#5C6B62] max-w-xl">
        {trip?.trip_summary?.destination
          ? `Designing your ${trip.trip_summary.duration} in ${trip.trip_summary.destination}…`
          : "Sit tight — this typically takes 30 to 60 seconds."}
      </p>

      <div className="mt-8 h-1.5 rounded-full bg-white overflow-hidden" data-testid="overall-progress">
        <motion.div
          className="h-full bg-[#E27D60]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <div className="mt-2 text-sm text-[#5C6B62]">
        {completedCount} of {AGENTS.length} agents complete
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-3">
        {AGENTS.map((a, idx) => {
          const s = statusOf(a.name);
          return (
            <motion.div
              key={a.name}
              data-testid={`agent-status-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className={`tg-card !p-4 flex items-center gap-4 ${
                s === "done" ? "border-[#85B09A]" : ""
              } ${s === "running" ? "border-[#E27D60]" : ""}`}
            >
              <div className="w-10 h-10 rounded-full grid place-items-center bg-[#f9f8f6]">
                {s === "done" && (
                  <CheckCircle size={22} weight="fill" color="#6B8E23" />
                )}
                {s === "running" && (
                  <CircleNotch size={22} className="animate-spin" color="#E27D60" />
                )}
                {(s === "pending" || !s) && (
                  <Circle size={20} color="#cfd1ce" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-display font-medium text-[#1A2F24]">{a.name}</div>
                <div className="text-xs text-[#5C6B62]">{a.blurb}</div>
              </div>
              <span
                className={`label-eyebrow ${
                  s === "done" ? "text-[#6B8E23]" : s === "running" ? "text-[#E27D60]" : ""
                }`}
              >
                {s || "pending"}
              </span>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 p-4 rounded-xl bg-red-50 text-red-700 border border-red-100"
            data-testid="planning-error"
          >
            <strong>Couldn't finish:</strong> {error}
            <button
              onClick={() => nav("/")}
              className="ml-3 underline"
              data-testid="error-back-button"
            >
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
