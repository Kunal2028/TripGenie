import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog } from "@phosphor-icons/react";

const ICON_MAP = {
  sun: Sun,
  "cloud-sun": Sun,
  cloud: Cloud,
  "cloud-drizzle": CloudRain,
  "cloud-rain": CloudRain,
  "cloud-lightning": CloudLightning,
  "cloud-fog": CloudFog,
  snowflake: CloudSnow,
};

export default function WeatherStrip({ days = [] }) {
  if (!days.length) return null;
  return (
    <div data-testid="weather-strip" className="overflow-x-auto scrollbar-hide -mx-6 lg:-mx-10 px-6 lg:px-10">
      <div className="flex gap-3 min-w-max pb-2">
        {days.map((d, i) => {
          const Icon = ICON_MAP[d.icon] || Cloud;
          return (
            <div
              key={i}
              data-testid={`weather-day-${i}`}
              className="tg-card !p-4 min-w-[180px] flex flex-col gap-2"
            >
              <div className="label-eyebrow">{d.date}</div>
              <div className="flex items-center justify-between">
                <Icon size={28} weight="duotone" color="#E27D60" />
                <span className="font-display font-bold text-lg text-[#1A2F24]">
                  {d.temperature}
                </span>
              </div>
              <div className="text-sm font-medium text-[#1A2F24]">{d.condition}</div>
              <div className="text-xs text-[#5C6B62] leading-snug">{d.suggestion}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
