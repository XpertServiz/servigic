"use client";

// Map of the filtered set: one pin per lead / pro, coloured by status, with the zone outlines for orientation.
import { useEffect, useRef } from "react";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";

export interface Pin {
  lat: number;
  lng: number;
  color: string;
  label: string;
}

export function PinMap({ pins, zones, center = [24.8607, 67.0011] }: { pins: Pin[]; zones: [number, number][][]; center?: [number, number] }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: LeafletNS.Map | null = null;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default as unknown as typeof LeafletNS;
      if (cancelled || !el.current) return;
      map = L.map(el.current).setView(center, 11);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
      for (const ring of zones) L.polygon(ring, { color: "#22c55e", weight: 2, fillOpacity: 0.07 }).addTo(map);
      const pts: [number, number][] = [];
      for (const p of pins) {
        L.circleMarker([p.lat, p.lng], { radius: 6, color: "#0a0b0f", weight: 1, fillColor: p.color, fillOpacity: 0.9 }).bindPopup(p.label).addTo(map);
        pts.push([p.lat, p.lng]);
      }
      if (pts.length) map.fitBounds(pts, { padding: [30, 30], maxZoom: 14 });
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [pins, zones, center]);
  return <div ref={el} className="h-[460px] w-full overflow-hidden rounded-[14px] border border-border-subtle" />;
}
