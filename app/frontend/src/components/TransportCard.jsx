import { ArrowSquareOut, Airplane, Train, Bus, Car } from "@phosphor-icons/react";

const ICON = { flight: Airplane, train: Train, bus: Bus, cab: Car, taxi: Car };

export default function TransportCard({ option, index }) {
  const Icon = ICON[option.mode?.toLowerCase()] || Airplane;
  return (
    <div
      data-testid={`transport-card-${index}`}
      className="tg-card flex items-center gap-4 hover:-translate-y-1"
    >
      <div className="w-12 h-12 rounded-full bg-[#1A2F24] grid place-items-center text-white shrink-0">
        <Icon size={22} weight="duotone" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="label-eyebrow">{option.mode}</div>
        <div className="font-display font-medium text-[#1A2F24]">
          {option.provider || "Various"}
        </div>
        <div className="text-sm text-[#5C6B62] mt-1">
          {option.duration} · <span className="font-medium text-[#1A2F24]">{option.estimated_price}</span>
        </div>
        {option.notes && (
          <div className="text-xs text-[#5C6B62] mt-1 line-clamp-2">{option.notes}</div>
        )}
      </div>
      <a
        href={option.booking_link}
        target="_blank"
        rel="noreferrer"
        data-testid={`transport-link-${index}`}
        className="text-[#E27D60] hover:text-[#C86B50]"
        aria-label="Search booking"
      >
        <ArrowSquareOut size={20} />
      </a>
    </div>
  );
}
