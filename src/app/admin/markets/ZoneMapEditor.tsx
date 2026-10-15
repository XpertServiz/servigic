"use client";

// Draw a service zone on a map. A zone is one or more polygons; the Customer app and the server only allow
// job posting inside them. Click the map to add corners, then "Finish area". Map tiles: OpenStreetMap.
import { plural } from "@/lib/plural";
import { useEffect, useRef, useState } from "react";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";

export type Ring = [number, number][];

export function ZoneMapEditor({ polygons, onChange, center }: { polygons: Ring[]; onChange: (p: Ring[]) => void; center: [number, number] }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const layerRef = useRef<LeafletNS.LayerGroup | null>(null);
  const leafletRef = useRef<typeof LeafletNS | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<Ring>([]);
  const drawingRef = useRef(false);
  const draftRef = useRef<Ring>([]);
  drawingRef.current = drawing;
  draftRef.current = draft;

  // Create the map once (Leaflet touches window, so it is loaded on the client only).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default as unknown as typeof LeafletNS;
      if (cancelled || !el.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(el.current, { zoomControl: true }).setView(center, polygons.length ? 11 : 11);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      map.on("click", (e: LeafletNS.LeafletMouseEvent) => {
        if (!drawingRef.current) return;
        setDraft([...draftRef.current, [e.latlng.lat, e.latlng.lng]]);
      });
      mapRef.current = map;
      redraw();
      if (polygons.length) fit();
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function redraw() {
    const L = leafletRef.current;
    const layer = layerRef.current;
    if (!L || !layer) return;
    layer.clearLayers();
    polygons.forEach((ring) => L.polygon(ring, { color: "#F5A623", weight: 2, fillOpacity: 0.18 }).addTo(layer));
    if (draftRef.current.length) {
      L.polyline([...draftRef.current], { color: "#2DD4BF", weight: 3, dashArray: "6 6" }).addTo(layer);
      draftRef.current.forEach((pt) => L.circleMarker(pt, { radius: 5, color: "#2DD4BF", fillOpacity: 1 }).addTo(layer));
    }
  }

  function fit() {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || polygons.length === 0) return;
    map.fitBounds(L.latLngBounds(polygons.flat()), { padding: [24, 24] });
  }

  useEffect(redraw, [polygons, draft]);

  function finish() {
    if (draft.length < 3) return;
    onChange([...polygons, draft]);
    setDraft([]);
    setDrawing(false);
  }

  const btn = "rounded-[8px] border border-border-subtle px-3 py-1.5 text-xs font-semibold";
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {!drawing ? (
          <button type="button" className={`${btn} bg-accent text-accent-foreground`} onClick={() => setDrawing(true)}>
            + Draw an area
          </button>
        ) : (
          <>
            <button type="button" className={`${btn} bg-secondary text-black`} onClick={finish} disabled={draft.length < 3}>
              Finish area ({draft.length} points)
            </button>
            <button type="button" className={btn} onClick={() => setDraft(draft.slice(0, -1))} disabled={draft.length === 0}>
              Undo point
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => {
                setDraft([]);
                setDrawing(false);
              }}
            >
              Cancel
            </button>
          </>
        )}
        {polygons.length > 0 && !drawing && (
          <>
            <button type="button" className={btn} onClick={fit}>
              Zoom to zone
            </button>
            <button type="button" className={`${btn} text-danger`} onClick={() => confirm("Remove the whole drawn boundary?") && onChange([])}>
              Clear all
            </button>
          </>
        )}
        <span className="text-xs text-text-muted">
          {drawing ? "Click the map to place each corner of the area." : `${plural(polygons.length, "area")} drawn${polygons.length === 0 ? " - without a boundary the city names decide" : ""}`}
        </span>
      </div>
      <div ref={el} className="h-[360px] w-full overflow-hidden rounded-[12px] border border-border-subtle" />
      {polygons.length > 0 && !drawing && (
        <ul className="mt-2 flex flex-wrap gap-2 text-xs">
          {polygons.map((ring, i) => (
            <li key={i} className="flex items-center gap-2 rounded-full border border-border-subtle px-3 py-1">
              Area {i + 1} ({ring.length} points)
              <button type="button" className="text-danger" onClick={() => onChange(polygons.filter((_, j) => j !== i))}>
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
