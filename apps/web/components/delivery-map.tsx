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
  /** Delivery person's live position (green pulsing dot) — omit when only buyer location is known */
  coords?: DeliveryCoords | null;
  /** Buyer's shared position (blue pin) */
  buyerCoords?: DeliveryCoords | null;
  destinationLabel?: string;
  /** Height class e.g. "h-64" */
  height?: string;
}

export function DeliveryMap({ coords, buyerCoords, destinationLabel, height = "h-64" }: DeliveryMapProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<import("leaflet").Map | null>(null);
  const deliveryMarker = useRef<import("leaflet").Marker | null>(null);
  const buyerMarkerRef = useRef<import("leaflet").Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center = coords ?? buyerCoords;
    if (!center) return;

    void (async () => {
      const L = (await import("leaflet")).default;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center:          [center.lat, center.lng],
        zoom:            16,
        zoomControl:     true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom:     19,
      }).addTo(map);

      // ── Delivery person — green pulsing dot ──
      if (coords) {
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

        deliveryMarker.current = L.marker([coords.lat, coords.lng], { icon: deliveryIcon })
          .addTo(map)
          .bindPopup("🛵 Delivery person");
      }

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

        buyerMarkerRef.current = L.marker([buyerCoords.lat, buyerCoords.lng], { icon: buyerIcon })
          .addTo(map)
          .bindPopup(`📍 ${destinationLabel ?? "Buyer location"}`);

        if (coords) {
          // Both pins — fit the map to show both
          map.fitBounds(
            L.latLngBounds([coords.lat, coords.lng], [buyerCoords.lat, buyerCoords.lng]),
            { padding: [40, 40] },
          );
        } else {
          // Buyer-only preview — centre on their pin
          map.setView([buyerCoords.lat, buyerCoords.lng], 16);
        }
      }

      mapRef.current = map;
    })();

    return () => {
      mapRef.current?.remove();
      mapRef.current        = null;
      deliveryMarker.current  = null;
      buyerMarkerRef.current  = null;
    };
  }, []); // eslint-disable-line

  // Move delivery person marker when coords change
  useEffect(() => {
    if (!deliveryMarker.current || !mapRef.current || !coords) return;
    const latlng: [number, number] = [coords.lat, coords.lng];
    deliveryMarker.current.setLatLng(latlng);
    if (!buyerMarkerRef.current) {
      mapRef.current.setView(latlng, mapRef.current.getZoom(), { animate: true, duration: 1 });
    }
  }, [coords?.lat, coords?.lng]); // eslint-disable-line

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
        if (coords && deliveryMarker.current) {
          mapRef.current?.fitBounds(
            L.latLngBounds([coords.lat, coords.lng], latlng),
            { padding: [40, 40] },
          );
        } else {
          mapRef.current?.setView(latlng, mapRef.current.getZoom(), { animate: true, duration: 0.5 });
        }
      }
    })();
  }, [buyerCoords?.lat, buyerCoords?.lng]); // eslint-disable-line

  return (
    <div ref={containerRef} className={`w-full overflow-hidden rounded-2xl ${height}`} style={{ minHeight: 200 }}>
      <div
        style={{
          position: "absolute", bottom: 8, left: 8, zIndex: 1000,
          display: "flex", gap: 8, padding: "4px 10px",
          background: "rgba(255,255,255,0.92)", borderRadius: 12,
          backdropFilter: "blur(4px)", fontSize: 11, fontWeight: 600, color: "#334155",
          boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
        }}
      >
        {coords && <span style={{ color: "#16A34A" }}>● Delivery</span>}
        {buyerCoords && <span style={{ color: "#3B82F6" }}>◆ {coords ? "You" : "Buyer"}</span>}
      </div>
    </div>
  );
}
