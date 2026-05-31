"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { MapPin, Package, Navigation, Phone, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import useSWR from "swr";
import { useSocket } from "@/hooks/use-socket";
import { api } from "@/lib/api";
import { formatRelativeDate } from "@/lib/format";
import type { DeliveryCoords } from "@/components/delivery-map";
import type { OrderTrackingResponse } from "@/types";

const DeliveryMap = dynamic(
  () => import("@/components/delivery-map").then((m) => m.DeliveryMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-full animate-pulse rounded-2xl" style={{ background: "var(--surface-raised)" }} />
    ),
  }
);

function headingToCompass(deg: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] ?? "N";
}

export default function TrackPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const { socketRef } = useSocket();

  const { data: tracking } = useSWR(
    `tracking-${orderId}`,
    () => api.getDeliveryTracking(orderId),
    { refreshInterval: 15_000 }
  );

  const [liveCoords, setLiveCoords] = useState<DeliveryCoords | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  // Seed from initial REST response
  useEffect(() => {
    if (tracking?.tracking && !isLive) {
      setLiveCoords({
        lat: tracking.tracking.latitude,
        lng: tracking.tracking.longitude,
        heading: tracking.tracking.heading,
        speed: tracking.tracking.speed,
        updatedAt: tracking.tracking.updatedAt,
      });
      setLastUpdate(tracking.tracking.updatedAt);
    }
  }, [tracking, isLive]);

  // Subscribe to real-time socket updates
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit("join:order", orderId);

    function handleLocation(data: unknown) {
      const d = data as { lat: number; lng: number; heading?: number; speed?: number; updatedAt: string };
      setLiveCoords({ lat: d.lat, lng: d.lng, heading: d.heading, speed: d.speed, updatedAt: d.updatedAt });
      setLastUpdate(d.updatedAt);
      setIsLive(true);
    }

    socket.on("delivery:location", handleLocation);
    return () => {
      socket.emit("leave:order", orderId);
      socket.off("delivery:location", handleLocation);
    };
  }, [orderId, socketRef.current]); // eslint-disable-line

  const status   = tracking?.status ?? "Loading…";
  const isActive = status === "Out for delivery";
  const person   = tracking?.deliveryPerson;
  const address  = tracking?.deliveryAddress;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>

      {/* Header */}
      <div
        className="relative overflow-hidden py-10 text-white"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #102542 55%, #1a3a2a 100%)" }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(114,204,35,0.20), transparent 65%)" }}
        />
        <div className="container-shell">
          <p className="mb-1 text-xs font-black uppercase tracking-widest" style={{ color: "#72CC23" }}>
            Live delivery tracking
          </p>
          <h1 className="text-2xl font-black tracking-tight">
            {isActive ? "Your order is on the way" : status}
          </h1>
          {address && (
            <p className="mt-2 flex items-center gap-1.5 text-sm" style={{ color: "#94A3B8" }}>
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              Delivering to: {address}
            </p>
          )}
        </div>
      </div>

      <div className="container-shell max-w-lg py-6 space-y-4">

        {/* Map */}
        {liveCoords ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="overflow-hidden rounded-2xl"
            style={{ border: "1px solid var(--border)" }}
          >
            <DeliveryMap
              coords={liveCoords}
              destinationLabel={address ?? undefined}
              height="h-72"
            />

            {/* Stats bar below map */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--muted)" }}>
                {isLive && (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-green-500" />
                    <span className="text-green-600 font-bold">LIVE</span>
                  </span>
                )}
                {liveCoords.speed != null && liveCoords.speed > 0.5 && (
                  <span>{liveCoords.speed.toFixed(1)} km/h</span>
                )}
                {liveCoords.heading != null && (
                  <span>Heading {headingToCompass(liveCoords.heading)}</span>
                )}
                {lastUpdate && (
                  <span>Updated {formatRelativeDate(lastUpdate)}</span>
                )}
              </div>
              <a
                href={`https://www.openstreetmap.org/?mlat=${liveCoords.lat}&mlon=${liveCoords.lng}&zoom=16`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-bold hover:underline"
                style={{ color: "var(--green)" }}
              >
                <ExternalLink className="h-3 w-3" />
                Open map
              </a>
            </div>
          </motion.div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-2xl py-12 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <Navigation className="h-10 w-10" style={{ color: "var(--border)" }} />
            <p className="text-sm font-bold" style={{ color: "var(--on-surface)" }}>
              {isActive ? "Waiting for delivery person to share location…" : "No live location available"}
            </p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              This page updates automatically — no need to refresh.
            </p>
          </div>
        )}

        {/* Delivery person card */}
        {person && (
          <div
            className="flex items-center gap-4 rounded-2xl p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-base font-black text-white"
              style={{ background: "linear-gradient(135deg, #0F172A, #1a3a2a)" }}
            >
              {person.avatar?.[0]?.toUpperCase() ?? <Package className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm" style={{ color: "var(--on-surface)" }}>{person.name}</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>Delivery person</p>
            </div>
            {person.phone && (
              <a
                href={`tel:${person.phone}`}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors hover:opacity-80"
                style={{ background: "rgba(114,204,35,0.12)", color: "var(--green)" }}
                aria-label="Call delivery person"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}
          </div>
        )}

        {/* Status card */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--muted)" }}>Order status</p>
          <p className="mt-1.5 text-base font-black" style={{ color: "var(--on-surface)" }}>{status}</p>
          {address && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--muted)" }}>
              <MapPin className="h-3 w-3 shrink-0" />
              {address}
            </p>
          )}
        </div>

        <p className="text-center text-xs" style={{ color: "var(--subtle)" }}>
          Powered by{" "}
          <Link href="/" className="font-semibold hover:underline" style={{ color: "var(--green)" }}>
            Campus Marche
          </Link>
        </p>
      </div>
    </div>
  );
}
