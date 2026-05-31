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
  /** Delivery person's live position (green pulsing dot) */
  coords: DeliveryCoords;
  /** Buyer's shared position (blue pin) */
  buyerCoords?: DeliveryCoords | null;
  destinationLabel?: string;
  /** Height class e.g. "h-64" */
  height?: string;
}

/**
 * Interactive Leaflet map — no API key required (OpenStreetMap tiles).
 * Shows a green pulsing dot for the delivery person and a blue pin for the buyer.
 * Must be loaded with `dynamic(..., { ssr: false })`.
 */
export function DeliveryMap({ coords, buyerCoords, destinationLabel, height = "h-64" }: DeliveryMapProps) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<import("leaflet").Map | null>(null);
  const deliveryMarker  = useRef<import("leaflet").Marker | null>(null);
  const buyerMarkerRef  = useRef<import("leaflet").Marker | null>(null);

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
        center:          [coords.lat, coords.lng],
        zoom:            16,
        zoomControl:     true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom:     19,
      }).addTo(map);

      // ── Delivery person — green pulsing dot ──
      const deliveryIcon = L.divIcon({
        html: `
          <div style="
            width:20px;height:20px;
            background:#72CC23;
            border:3px solid white;
            border-radius:50%;
            box-shadow:0 0 0 4px rgba(114,204,35,0.30);
            animation:cm-pulse 2s ease-in-out infinite;
          "></div>
          <style>
            @keyframes cm-pulse{
              0%,100%{box-shadow:0 0 0 4px rgba(114,204,35,0.30)}
              50%{box-shadow:0 0 0 10px rgba(114,204,35,0.10)}
            }
          </style>`,
        className: "",
        iconSize:   [20, 20],
        iconAnchor: [10, 10],
      });

      const dMarker = L.marker([coords.lat, coords.lng], { icon: deliveryIcon })
        .addTo(map)
        .bindPopup("🛵 Delivery person");
      deliveryMarker.current = dMarker;

      // ── Buyer — blue teardrop pin ──
      if (buyerCoords) {
        const buyerIcon = L.divIcon({
          html: `
            <div style="
              width:20px;height:20px;
              background:#3B82F6;
              border:3px solid white;
              border-radius:50% 50% 50% 0;
              transform:rotate(-45deg);
              box-shadow:0 2px 6px rgba(59,130,246,0.50);
            "></div>`,
          className: "",
          iconSize:   [20, 20],
          iconAnchor: [10, 20],
        });

        const bMarker = L.marker([buyerCoords.lat, buyerCoords.lng], { icon: buyerIcon })
          .addTo(map)
          .bindPopup(`📍 ${destinationLabel ?? "Buyer location"}`);
        buyerMarkerRef.current = bMarker;

        // Fit both pins on the map
        const bounds = L.latLngBounds(
          [coords.lat,       coords.lng],
          [buyerCoords.lat,  buyerCoords.lng],
        );
        map.fitBounds(bounds, { padding: [40, 40] });
      }

      mapRef.current = map;
    })();

    return () => {
      mapRef.current?.remove();
      mapRef.current       = null;
      deliveryMarker.current = null;
      buyerMarkerRef.current  = null;
    };
  }, []); // eslint-disable-line

  // Move delivery person marker on coords change
  useEffect(() => {
    if (!deliveryMarker.current || !mapRef.current) return;
    const latlng: [number, number] = [coords.lat, coords.lng];
    deliveryMarker.current.setLatLng(latlng);
    if (!buyerMarkerRef.current) {
      mapRef.current.setView(latlng, mapRef.current.getZoom(), { animate: true, duration: 1 });
    }
  }, [coords.lat, coords.lng]);

  // Update buyer marker when buyerCoords change
  useEffect(() => {
    if (!mapRef.current) return;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (buyerCoords) {
        const latlng: [number, number] = [buyerCoords.lat, buyerCoords.lng];
        if (buyerMarkerRef.current) {
          buyerMarkerRef.current.setLatLng(latlng);
        } else {
          const buyerIcon = L.divIcon({
            html: `<div style="width:20px;height:20px;background:#3B82F6;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(59,130,246,0.50)"></div>`,
            className: "",
            iconSize:   [20, 20],
            iconAnchor: [10, 20],
          });
          buyerMarkerRef.current = L.marker(latlng, { icon: buyerIcon })
            .addTo(mapRef.current!)
            .bindPopup(`📍 ${destinationLabel ?? "Buyer location"}`);
        }
        // Re-fit both pins
        const bounds = L.latLngBounds(
          [coords.lat, coords.lng],
          latlng,
        );
        mapRef.current?.fitBounds(bounds, { padding: [40, 40] });
      }
    })();
  }, [buyerCoords?.lat, buyerCoords?.lng]); // eslint-disable-line

  return (
    <div ref={containerRef} className={`w-full overflow-hidden rounded-2xl ${height}`} style={{ minHeight: 200 }}>
      {/* Legend */}
      <div
        style={{
          position: "absolute", bottom: 8, left: 8, zIndex: 1000,
          display: "flex", gap: 8, padding: "4px 10px",
          background: "rgba(255,255,255,0.92)", borderRadius: 12,
          backdropFilter: "blur(4px)", fontSize: 11, fontWeight: 600, color: "#334155",
          boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
        }}
      >
        <span style={{ color: "#16A34A" }}>● Delivery</span>
        {buyerCoords && <span style={{ color: "#3B82F6" }}>◆ You</span>}
      </div>
    </div>
  );
}
