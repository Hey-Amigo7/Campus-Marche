"use client";

import { useEffect, useRef } from "react";

export interface DeliveryCoords {
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  updatedAt?: string;
}

interface DeliveryMapProps {
  coords: DeliveryCoords;
  destinationLabel?: string;
  /** Height class e.g. "h-64" */
  height?: string;
}

/**
 * Interactive Leaflet map that shows the delivery person's moving dot.
 * Uses OpenStreetMap tiles — no API key required.
 *
 * Must be loaded with `dynamic(..., { ssr: false })` because Leaflet
 * reads `window` on import.
 */
export function DeliveryMap({ coords, destinationLabel, height = "h-64" }: DeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<import("leaflet").Map | null>(null);
  const markerRef    = useRef<import("leaflet").Marker | null>(null);

  // Bootstrap map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    void (async () => {
      const L = (await import("leaflet")).default;

      // Fix default icon path broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center:    [coords.lat, coords.lng],
        zoom:      16,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Delivery person pulsing dot
      const deliveryIcon = L.divIcon({
        html: `
          <div style="
            width:20px;height:20px;
            background:var(--green, #72CC23);
            border:3px solid white;
            border-radius:50%;
            box-shadow:0 0 0 4px rgba(114,204,35,0.30);
            animation:cm-pulse 2s ease-in-out infinite;
          "></div>
          <style>
            @keyframes cm-pulse {
              0%,100%{box-shadow:0 0 0 4px rgba(114,204,35,0.30)}
              50%{box-shadow:0 0 0 10px rgba(114,204,35,0.10)}
            }
          </style>`,
        className: "",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: deliveryIcon })
        .addTo(map)
        .bindPopup(destinationLabel ? `📍 Heading to: ${destinationLabel}` : "Delivery person");

      mapRef.current    = map;
      markerRef.current = marker;
    })();

    return () => {
      mapRef.current?.remove();
      mapRef.current    = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line

  // Move the marker whenever coords change (called by parent on socket events)
  useEffect(() => {
    if (!markerRef.current || !mapRef.current) return;
    const latlng = [coords.lat, coords.lng] as [number, number];
    markerRef.current.setLatLng(latlng);
    mapRef.current.setView(latlng, mapRef.current.getZoom(), { animate: true, duration: 1 });
  }, [coords.lat, coords.lng]);

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden rounded-2xl ${height}`}
      style={{ minHeight: 200 }}
    />
  );
}
