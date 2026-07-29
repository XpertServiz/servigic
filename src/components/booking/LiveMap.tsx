"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const ANIMATION_MS = 1200;

function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Direction of travel (0-360°) from one lat/lng point to the next, used to
// rotate the bike marker so it visually faces the way it's moving.
function bearingBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function LiveMap({
  destLat,
  destLng,
  proLat,
  proLng,
  etaMinutes,
}: {
  destLat: number;
  destLng: number;
  proLat?: number | null;
  proLng?: number | null;
  etaMinutes?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const proMarkerRef = useRef<maplibregl.Marker | null>(null);
  const bikeElRef = useRef<HTMLDivElement | null>(null);
  const currentPosRef = useRef<[number, number] | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: [destLng, destLat],
      zoom: 13,
    });
    mapRef.current = map;

    new maplibregl.Marker({ color: "#22C55E" }).setLngLat([destLng, destLat]).addTo(map);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || proLat == null || proLng == null) return;

    if (!proMarkerRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:34px;height:34px;border-radius:50%;background:rgba(255,176,32,.18);box-shadow:0 0 0 6px rgba(255,176,32,.2);" +
        "display:flex;align-items:center;justify-content:center;font-size:20px;transition:transform 1s ease-in-out;";
      el.textContent = "🛵";
      bikeElRef.current = el;
      proMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([proLng, proLat]).addTo(map);
      currentPosRef.current = [proLng, proLat];
    } else {
      // Animate the marker sliding to its new position instead of jumping —
      // makes 15-45s polling read as "live movement" rather than teleporting.
      const from = currentPosRef.current ?? [proLng, proLat];
      const to: [number, number] = [proLng, proLat];
      const startTime = performance.now();

      // Rotate the bike to face the direction of travel between pings.
      if (from[0] !== to[0] || from[1] !== to[1]) {
        const bearing = bearingBetween(from[1], from[0], to[1], to[0]);
        if (bikeElRef.current) bikeElRef.current.style.transform = `rotate(${bearing}deg)`;
      }

      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

      function step(now: number) {
        const t = Math.min(1, (now - startTime) / ANIMATION_MS);
        const eased = easeInOutQuad(t);
        const lng = from[0] + (to[0] - from[0]) * eased;
        const lat = from[1] + (to[1] - from[1]) * eased;
        proMarkerRef.current?.setLngLat([lng, lat]);
        if (t < 1) {
          animationFrameRef.current = requestAnimationFrame(step);
        } else {
          currentPosRef.current = to;
        }
      }
      animationFrameRef.current = requestAnimationFrame(step);
    }

    const bounds = new maplibregl.LngLatBounds([destLng, destLat], [destLng, destLat]);
    bounds.extend([proLng, proLat]);
    map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
  }, [proLat, proLng, destLat, destLng]);

  return (
    <div className="relative">
      <div ref={containerRef} className="h-[280px] w-full rounded-[14px] border border-border-subtle" />
      {etaMinutes != null && (
        <div className="absolute left-3 top-3 rounded-full border border-accent/40 bg-bg/90 px-3 py-1.5 text-xs font-bold text-accent backdrop-blur-sm">
          🕒 ~{etaMinutes} min away
        </div>
      )}
    </div>
  );
}
