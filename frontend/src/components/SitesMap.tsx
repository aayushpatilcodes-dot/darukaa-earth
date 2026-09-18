import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Layers } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { GeoJSONPolygon, Site } from "../types";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

const SITE_SOURCE_ID = "darukaa-sites";
const SITE_FILL_LAYER_ID = "darukaa-sites-fill";
const SITE_LINE_LAYER_ID = "darukaa-sites-line";
const DEFAULT_SITE_COLOR = "#1a7f4b";

const BASEMAPS = {
  satellite: { label: "Satellite", style: "mapbox://styles/mapbox/satellite-streets-v12" },
  streets: { label: "Streets", style: "mapbox://styles/mapbox/streets-v12" },
} as const;

type BasemapKey = keyof typeof BASEMAPS;

export interface LegendItem {
  color: string;
  label: string;
}

interface Props {
  sites: Site[];
  drawable?: boolean;
  onSiteClick?: (siteId: string) => void;
  onPolygonDrawn?: (geometry: GeoJSONPolygon) => void;
  focusSiteId?: string;
  getSiteColor?: (site: Site) => string;
  legend?: LegendItem[];
}

function sitesToFeatureCollection(
  sites: Site[],
  getSiteColor?: (site: Site) => string,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: sites.map((site) => ({
      type: "Feature",
      id: site.id,
      geometry: site.geometry,
      properties: {
        id: site.id,
        name: site.name,
        area: site.area_hectares,
        color: getSiteColor ? getSiteColor(site) : DEFAULT_SITE_COLOR,
      },
    })),
  };
}

function addSiteLayers(map: mapboxgl.Map, sites: Site[], getSiteColor?: (site: Site) => string) {
  if (map.getLayer(SITE_FILL_LAYER_ID)) map.removeLayer(SITE_FILL_LAYER_ID);
  if (map.getLayer(SITE_LINE_LAYER_ID)) map.removeLayer(SITE_LINE_LAYER_ID);
  if (map.getSource(SITE_SOURCE_ID)) map.removeSource(SITE_SOURCE_ID);

  map.addSource(SITE_SOURCE_ID, {
    type: "geojson",
    data: sitesToFeatureCollection(sites, getSiteColor),
  });
  map.addLayer({
    id: SITE_FILL_LAYER_ID,
    type: "fill",
    source: SITE_SOURCE_ID,
    paint: { "fill-color": ["get", "color"], "fill-opacity": 0.35 },
  });
  map.addLayer({
    id: SITE_LINE_LAYER_ID,
    type: "line",
    source: SITE_SOURCE_ID,
    paint: { "line-color": ["get", "color"], "line-width": 2 },
  });
}

export function SitesMap({
  sites,
  drawable,
  onSiteClick,
  onPolygonDrawn,
  focusSiteId,
  getSiteColor,
  legend,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const sitesRef = useRef(sites);
  const getSiteColorRef = useRef(getSiteColor);
  const onSiteClickRef = useRef(onSiteClick);
  const [basemap, setBasemap] = useState<BasemapKey>("satellite");
  sitesRef.current = sites;
  getSiteColorRef.current = getSiteColor;
  onSiteClickRef.current = onSiteClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (!mapboxgl.accessToken) {
      return;
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: BASEMAPS[basemap].style,
      center: [78.04, 30.065],
      zoom: 11,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Guard against mapbox measuring the container before the browser has
    // finished laying out a freshly-mounted flex/absolute wrapper (observed
    // in dynamically-shown sections like the draw-site panel).
    requestAnimationFrame(() => map.resize());

    if (drawable) {
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: { polygon: true, trash: true },
      });
      drawRef.current = draw;
      map.addControl(draw, "top-left");
      map.on("draw.create", () => {
        const data = draw.getAll();
        if (data.features.length > 0) {
          const latest = data.features[data.features.length - 1];
          if (latest.geometry.type === "Polygon") {
            draw.deleteAll();
            draw.add(latest);
            onPolygonDrawn?.(latest.geometry as GeoJSONPolygon);
          }
        }
      });
      map.on("draw.update", () => {
        const data = draw.getAll();
        const updated = data.features[0];
        if (updated?.geometry.type === "Polygon") {
          onPolygonDrawn?.(updated.geometry as GeoJSONPolygon);
        }
      });
    }

    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });

    map.on("load", () => {
      addSiteLayers(map, sitesRef.current, getSiteColorRef.current);
      fitToSites(map, sitesRef.current);
    });

    map.on("click", SITE_FILL_LAYER_ID, (e) => {
      const id = e.features?.[0]?.properties?.id;
      if (id) onSiteClickRef.current?.(id);
    });
    map.on("mouseenter", SITE_FILL_LAYER_ID, (e) => {
      map.getCanvas().style.cursor = onSiteClickRef.current ? "pointer" : "";
      const feature = e.features?.[0];
      if (!feature) return;
      const name = feature.properties?.name ?? "Site";
      const area = feature.properties?.area;
      const areaLabel = typeof area === "number" ? `${area.toFixed(2)} ha` : null;
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div class="map-popup"><strong>${escapeHtml(name)}</strong>${
            areaLabel ? `<span>${areaLabel}</span>` : ""
          }</div>`,
        )
        .addTo(map);
    });
    map.on("mousemove", SITE_FILL_LAYER_ID, (e) => {
      popup.setLngLat(e.lngLat);
    });
    map.on("mouseleave", SITE_FILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });

    return () => {
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource(SITE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(sitesToFeatureCollection(sites, getSiteColor));
      if (!focusSiteId) fitToSites(map, sites);
    }
  }, [sites, focusSiteId, getSiteColor]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusSiteId) return;
    const site = sites.find((s) => s.id === focusSiteId);
    if (site) {
      const bounds = polygonBounds(site.geometry);
      map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSiteId]);

  function handleBasemapChange(key: BasemapKey) {
    const map = mapRef.current;
    if (!map || key === basemap) return;
    setBasemap(key);
    map.once("style.load", () => {
      addSiteLayers(map, sitesRef.current, getSiteColorRef.current);
    });
    map.setStyle(BASEMAPS[key].style);
  }

  if (!mapboxgl.accessToken) {
    return (
      <div className="map-hint" style={{ position: "static", maxWidth: "none" }}>
        A Mapbox access token is required to display the map. Set <code>VITE_MAPBOX_TOKEN</code> in
        your frontend <code>.env</code> file — see the README for instructions on getting a free
        token from mapbox.com.
      </div>
    );
  }

  return (
    <div className="map-container">
      <div ref={containerRef} className="map-canvas" />
      <div className="map-basemap-toggle" role="group" aria-label="Basemap style">
        <Layers size={14} />
        {(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
          <button
            key={key}
            type="button"
            className={basemap === key ? "active" : ""}
            onClick={() => handleBasemapChange(key)}
          >
            {BASEMAPS[key].label}
          </button>
        ))}
      </div>
      {legend && legend.length > 0 && (
        <div className="map-legend">
          {legend.map((item) => (
            <div key={item.label} className="map-legend-item">
              <span className="map-legend-swatch" style={{ background: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fitToSites(map: mapboxgl.Map, sites: Site[]) {
  if (sites.length === 0) return;
  const bounds = new mapboxgl.LngLatBounds();
  sites.forEach((site) => {
    site.geometry.coordinates[0].forEach(([lng, lat]) => bounds.extend([lng, lat]));
  });
  map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
}

function polygonBounds(geometry: GeoJSONPolygon): mapboxgl.LngLatBounds {
  const bounds = new mapboxgl.LngLatBounds();
  geometry.coordinates[0].forEach(([lng, lat]) => bounds.extend([lng, lat]));
  return bounds;
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
