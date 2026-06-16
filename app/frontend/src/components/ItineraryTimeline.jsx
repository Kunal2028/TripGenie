import { Sun, MoonStars, Coffee, ForkKnife, Car } from "@phosphor-icons/react";

export default function ItineraryTimeline({ days = [] }) {
  if (!days.length) return null;
  return (
    <div data-testid="itinerary-timeline" className="relative pl-12">
      <div className="timeline-rail" />
      <div className="space-y-6">
        {days.map((d, i) => (
          <div key={i} data-testid={`itinerary-day-${d.day}`} className="relative">
            <span className="timeline-node" style={{ top: 28 }} />
            <div className="tg-card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <span className="label-eyebrow">Day {d.day} · {d.date}</span>
                  <h3 className="font-display text-xl sm:text-2xl text-[#1A2F24] mt-1">
                    {d.title || `Day ${d.day}`}
                  </h3>
                  {d.weather_note && (
                    <p className="text-xs text-[#85B09A] font-medium mt-1">{d.weather_note}</p>
                  )}
                </div>
                {d.estimated_cost && (
                  <span
                    data-testid={`day-cost-${d.day}`}
                    className="rounded-full bg-[#1A2F24] text-white text-xs font-medium px-3 py-1.5"
                  >
                    {d.estimated_cost}
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Block icon={<Coffee size={18} color="#E27D60" weight="duotone" />} label="Morning" text={d.morning} />
                <Block icon={<Sun size={18} color="#E27D60" weight="duotone" />} label="Afternoon" text={d.afternoon} />
                <Block icon={<MoonStars size={18} color="#E27D60" weight="duotone" />} label="Evening" text={d.evening} />
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Block icon={<ForkKnife size={18} color="#85B09A" weight="duotone" />} label="Food" text={d.food} />
                <Block icon={<Car size={18} color="#85B09A" weight="duotone" />} label="Transport" text={d.transport} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Block({ icon, label, text }) {
  if (!text) return null;
  return (
    <div className="rounded-xl bg-[#f9f8f6] p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="label-eyebrow">{label}</span>
      </div>
      <p className="text-sm text-[#1A2F24] leading-relaxed">{text}</p>
    </div>
  );
}
