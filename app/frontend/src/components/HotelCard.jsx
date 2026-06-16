import { Star, MapPin, ArrowSquareOut } from "@phosphor-icons/react";
import { HOTEL_IMAGES } from "@/lib/images";

export default function HotelCard({ hotel, index }) {
  const img = HOTEL_IMAGES[hotel.tier] || HOTEL_IMAGES["mid-range"];
  return (
    <div
      data-testid={`hotel-card-${index}`}
      className="tg-card !p-0 overflow-hidden flex flex-col hover:-translate-y-1"
    >
      <div className="relative h-44">
        <img src={img} alt={hotel.name} className="w-full h-full object-cover" />
        <span className="absolute top-3 left-3 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#1A2F24]">
          {hotel.tier}
        </span>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-display font-medium text-lg text-[#1A2F24]">{hotel.name}</h3>
        <div className="mt-1 flex items-center gap-3 text-sm text-[#5C6B62]">
          {hotel.rating && (
            <span className="inline-flex items-center gap-1">
              <Star size={14} weight="fill" color="#E8A365" /> {hotel.rating}
            </span>
          )}
          {hotel.area && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} /> {hotel.area}
            </span>
          )}
        </div>
        <div className="mt-3 text-sm font-medium text-[#1A2F24]">{hotel.price_range}</div>
        {hotel.amenities?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {hotel.amenities.slice(0, 5).map((a, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#f0f5f2] text-[#5C6B62]">
                {a}
              </span>
            ))}
          </div>
        )}
        {hotel.distance_from_attractions && (
          <div className="mt-3 text-xs text-[#5C6B62] italic">{hotel.distance_from_attractions}</div>
        )}
        <a
          href={hotel.search_link}
          target="_blank"
          rel="noreferrer"
          data-testid={`hotel-search-link-${index}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#E27D60] hover:text-[#C86B50]"
        >
          Search & book <ArrowSquareOut size={14} />
        </a>
      </div>
    </div>
  );
}
