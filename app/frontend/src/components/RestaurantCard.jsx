import { Star, MapPin, ArrowSquareOut } from "@phosphor-icons/react";
import { RESTAURANT_IMG, RESTAURANT_PREMIUM_IMG } from "@/lib/images";

export default function RestaurantCard({ restaurant, index }) {
  const img = index % 2 === 0 ? RESTAURANT_IMG : RESTAURANT_PREMIUM_IMG;
  return (
    <div
      data-testid={`restaurant-card-${index}`}
      className="tg-card !p-0 overflow-hidden hover:-translate-y-1"
    >
      <div className="relative h-36">
        <img src={img} alt={restaurant.name} className="w-full h-full object-cover" />
      </div>
      <div className="p-5">
        <h3 className="font-display font-medium text-lg text-[#1A2F24]">{restaurant.name}</h3>
        <div className="mt-1 text-xs uppercase tracking-widest font-bold text-[#85B09A]">
          {restaurant.cuisine}
        </div>
        <div className="mt-2 flex items-center gap-3 text-sm text-[#5C6B62]">
          {restaurant.rating && (
            <span className="inline-flex items-center gap-1">
              <Star size={14} weight="fill" color="#E8A365" /> {restaurant.rating}
            </span>
          )}
          {restaurant.price_range && <span>{restaurant.price_range}</span>}
        </div>
        {restaurant.area && (
          <div className="mt-2 text-sm text-[#5C6B62] inline-flex items-center gap-1">
            <MapPin size={14} /> {restaurant.area}
          </div>
        )}
        {restaurant.best_dishes?.length > 0 && (
          <div className="mt-3">
            <div className="label-eyebrow mb-1">must try</div>
            <div className="text-sm text-[#1A2F24]">{restaurant.best_dishes.join(" · ")}</div>
          </div>
        )}
        <a
          href={restaurant.map_link}
          target="_blank"
          rel="noreferrer"
          data-testid={`restaurant-map-link-${index}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#E27D60] hover:text-[#C86B50]"
        >
          View on Maps <ArrowSquareOut size={14} />
        </a>
      </div>
    </div>
  );
}
