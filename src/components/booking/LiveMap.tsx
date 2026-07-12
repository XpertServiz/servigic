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

export function LiveMap({
  destLat,
  destLng,
  proLat,
  proLng,
}: {
  destLat: number;
  destLng: number;
  proLat?: number | null;
  proLng?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const proMarkerRef = useRef<maplibregl.Marker | null>(null);

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
        "width:16px;height:16px;border-radius:50%;background:#FFB020;box-shadow:0 0 0 6px rgba(255,176,32,.35)";
      proMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([proLng, proLat]).addTo(map);
    } else {
      proMarkerRef.current.setLngLat([proLng, proLat]);
    }

    const bounds = new maplibregl.LngLatBounds([destLng, destLat], [destLng, destLat]);
    bounds.extend([proLng, proLat]);
    map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
  }, [proLat, proLng, destLat, destLng]);

  return <div ref={containerRef} className="h-[280px] w-full rounded-[14px] border border-border-subtle" />;
}
