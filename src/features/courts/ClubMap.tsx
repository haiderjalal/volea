"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import type { Club } from "@/lib/types";

interface Props {
  clubs: Club[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  me?: { lat: number; lng: number } | null;
  className?: string;
}

/**
 * Plain Leaflet rather than react-leaflet: the map is imperative anyway, and
 * this keeps it out of the SSR path without a dynamic-import dance.
 */
export function ClubMap({ clubs, selectedId, onSelect, me, className }: Props) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const onSelectRef = useRef(onSelect);

  // Kept in a ref so a new handler identity never tears the map down.
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    if (!nodeRef.current || mapRef.current || clubs.length === 0) return;

    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !nodeRef.current) return;

      const map = L.map(nodeRef.current, {
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      const pin = (club: Club) =>
        L.divIcon({
          className: "",
          html: `<span class="flex h-9 w-9 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full border-2 border-court-950 bg-teal-500 text-[11px] font-bold text-court-950 shadow-lg">${
            club.price_per_hour_cents > 0
              ? Math.round(club.price_per_hour_cents / 100)
              : "•"
          }</span>`,
          iconSize: [36, 36],
        });

      for (const club of clubs) {
        const marker = L.marker([club.lat, club.lng], {
          icon: pin(club),
          title: club.name,
          alt: club.name,
        })
          .addTo(map)
          .bindPopup(
            `<strong>${club.name}</strong><br/><span style="color:#8AA5A2">${club.address ?? club.city}</span>`,
          )
          .on("click", () => onSelectRef.current?.(club.id));
        markersRef.current[club.id] = marker;
      }

      if (me) {
        L.circleMarker([me.lat, me.lng], {
          radius: 7,
          color: "#D7FF3E",
          fillColor: "#D7FF3E",
          fillOpacity: 0.9,
          weight: 2,
        })
          .addTo(map)
          .bindPopup("You are here");
      }

      const bounds = L.latLngBounds(
        clubs.map((c) => [c.lat, c.lng] as [number, number]),
      );
      if (me) bounds.extend([me.lat, me.lng]);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: clubs.length === 1 ? 15 : 13 });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, [clubs, me]);

  // Selecting a club in the list pans the map and opens its popup.
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const marker = markersRef.current[selectedId];
    if (!marker) return;
    mapRef.current.panTo(marker.getLatLng(), { animate: true });
    marker.openPopup();
  }, [selectedId]);

  return (
    <div
      ref={nodeRef}
      className={className}
      role="application"
      aria-label="Map of padel clubs"
    />
  );
}
