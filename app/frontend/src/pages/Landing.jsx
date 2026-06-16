import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Calendar, Wallet, Users } from "@phosphor-icons/react";
import { planTrip } from "@/lib/api";
import { LANDING_BG } from "@/lib/images";
import { useAuth } from "@/context/AuthContext";

const TRAVEL_STYLES = [
  { id: "budget", label: "Budget" },
  { id: "luxury", label: "Luxury" },
  { id: "adventure", label: "Adventure" },
  { id: "family", label: "Family" },
  { id: "romantic", label: "Romantic" },
  { id: "workation", label: "Workation" },
];

const INTERESTS = [
  "Food",
  "Temples",
  "Beaches",
  "Mountains",
  "Shopping",
  "Nightlife",
  "Museums",
  "Nature",
  "Adventure sports",
  "Photography",
  "Local culture",
  "Wellness",
];

const today = new Date().toISOString().slice(0, 10);
const inFiveDays = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
const inTenDays = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);

export default function Landing() {
  const nav = useNavigate();
  const { signedIn } = useAuth();
  const [form, setForm] = useState({
    source: "Mumbai",
    destination: "Bali",
    start_date: inFiveDays,
    end_date: inTenDays,
    budget: 1500,
    currency: "USD",
    travelers: 2,
    travel_style: "adventure",
    interests: ["Food", "Beaches", "Nature"],
  });
  const [loading, setLoading] = useState(false);

  const toggleInterest = (i) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(i)
        ? f.interests.filter((x) => x !== i)
        : [...f.interests, i],
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.source || !form.destination) {
      toast.error("Please enter both source and destination");
      return;
    }
    if (!signedIn) {
      toast.error("Please sign in to save and generate your trip");
      nav("/auth");
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      toast.error("End date must be after start date");
      return;
    }
    setLoading(true);
    try {
      const res = await planTrip({ ...form, budget: Number(form.budget), travelers: Number(form.travelers) });
      toast.success("Your AI agents are on the case ✨");
      nav(`/planning/${res.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Could not start your trip plan. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="landing-page" className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={LANDING_BG}
            alt="Landscape"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#f9f8f6]/40 via-[#f9f8f6]/70 to-[#f9f8f6]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-14 lg:pt-20 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div className="label-eyebrow mb-4">a multi-agent trip planner</div>
            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-[#1A2F24] leading-[1.05] tracking-tighter">
              Plan a trip that feels{" "}
              <span className="italic text-[#E27D60]">hand-crafted</span>,
              <br className="hidden sm:block" />
              powered by ten AI agents.
            </h1>
            <p className="mt-6 text-lg text-[#5C6B62] max-w-xl leading-relaxed">
              Tell us where you dream of going. Our agents research the
              destination, check the weather, find real hotels & restaurants,
              and stitch a realistic day-by-day itinerary that respects your
              budget.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Form */}
      <section className="relative max-w-7xl mx-auto px-6 lg:px-10 pb-24 -mt-2">
        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          data-testid="trip-form"
          className="tg-card !p-6 sm:!p-10 shadow-[0_30px_80px_rgba(26,47,36,0.08)]"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="label-eyebrow flex items-center gap-2 mb-2">
                <MapPin size={12} weight="bold" /> From
              </div>
              <input
                type="text"
                data-testid="input-source"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="e.g., Mumbai"
              />
            </div>
            <div>
              <div className="label-eyebrow flex items-center gap-2 mb-2">
                <MapPin size={12} weight="bold" /> To
              </div>
              <input
                type="text"
                data-testid="input-destination"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                placeholder="e.g., Bali, Indonesia"
              />
            </div>
            <div>
              <div className="label-eyebrow flex items-center gap-2 mb-2">
                <Calendar size={12} weight="bold" /> Start date
              </div>
              <input
                type="date"
                data-testid="input-start-date"
                min={today}
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <div className="label-eyebrow flex items-center gap-2 mb-2">
                <Calendar size={12} weight="bold" /> End date
              </div>
              <input
                type="date"
                data-testid="input-end-date"
                min={form.start_date}
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
            <div>
              <div className="label-eyebrow flex items-center gap-2 mb-2">
                <Wallet size={12} weight="bold" /> Total budget
              </div>
              <div className="flex gap-2">
                <select
                  data-testid="select-currency"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="rounded-xl px-3 py-3 bg-[#f9f8f6] outline-none border border-transparent focus:border-[#85B09A]"
                >
                  <option>USD</option>
                  <option>EUR</option>
                  <option>INR</option>
                  <option>GBP</option>
                  <option>JPY</option>
                </select>
                <input
                  type="number"
                  data-testid="input-budget"
                  min="100"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <div className="label-eyebrow flex items-center gap-2 mb-2">
                <Users size={12} weight="bold" /> Travelers
              </div>
              <input
                type="number"
                data-testid="input-travelers"
                min="1"
                max="20"
                value={form.travelers}
                onChange={(e) => setForm({ ...form, travelers: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-8">
            <div className="label-eyebrow mb-3">Travel style</div>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_STYLES.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  data-testid={`style-${s.id}`}
                  data-active={form.travel_style === s.id}
                  onClick={() => setForm({ ...form, travel_style: s.id })}
                  className="tg-chip"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <div className="label-eyebrow mb-3">
              Interests <span className="normal-case font-normal text-[#5C6B62]">(pick a few)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <button
                  type="button"
                  key={i}
                  data-testid={`interest-${i.toLowerCase().replace(/\s+/g, "-")}`}
                  data-active={form.interests.includes(i)}
                  onClick={() => toggleInterest(i)}
                  className="tg-chip"
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <p className="text-sm text-[#5C6B62]">
              ~ 30–60s. Our 10 agents work in sequence.
            </p>
            <button
              type="submit"
              disabled={loading}
              data-testid="plan-trip-submit-button"
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? "Starting…" : "Craft my trip"}
              <ArrowRight size={18} weight="bold" />
            </button>
          </div>
        </motion.form>

        {/* Agent showcase */}
        <div className="mt-20">
          <div className="label-eyebrow mb-4">how it works</div>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-[#1A2F24] max-w-2xl">
            Ten specialised agents. One seamless plan.
          </h2>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              "Understanding",
              "Research",
              "Weather",
              "Hotels",
              "Transport",
              "Food",
              "Itinerary",
              "Budget",
              "Validation",
              "Polish",
            ].map((n, i) => (
              <div
                key={n}
                className="tg-card !p-4 flex flex-col gap-1"
                data-testid={`agent-tile-${i}`}
              >
                <span className="text-xs font-bold text-[#E27D60]">0{i + 1}</span>
                <span className="font-display font-medium">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
