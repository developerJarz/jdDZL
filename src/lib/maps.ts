import type { Store } from "@/types";

/** Google Maps link for a store (coordinates when known, otherwise the address). */
export function mapsUrl(s: Pick<Store, "lat" | "lng" | "address">) {
  return s.lat && s.lng ? `https://www.google.com/maps?q=${s.lat},${s.lng}` : `https://www.google.com/maps/search/${encodeURIComponent(s.address)}`;
}
