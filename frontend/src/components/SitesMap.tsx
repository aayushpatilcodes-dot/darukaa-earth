import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";

import type { GeoJSONPolygon, Site } from "../types";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

const SITE_SOURCE_ID = "darukaa-sites";
const SITE_FILL_LAYER_ID = "darukaa-sites-fill";
const SITE_LINE_LAYER_ID = "darukaa-sites-line";

interface Props {
  sites: Site[];
  drawable?: boolean;
  onSiteClick?: (siteId: string) => void;
  onPolygonDrawn?: (geometry: GeoJSONPolygon) => void;
  focusSiteId?: string;
}

function sitesToFeatureCollection(sites: Site[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: sites.map((site) => ({
      type: "Feature",
      id: site.id,
      geometry: site.geometry,
      properties: { id: site.id, name: site.name },
    })),
  };
}

export function SitesMap({ sites, drawable, onSiteClick, onPolygonDrawn, focusSiteId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    if (!mapboxgl.accessToken) {
      return;
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [78.04, 30.065],
      zoom: 11,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

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

    map.on("load", () => {
      map.addSource(SITE_SOURCE_ID, {
        type: "geojson",
        data: sitesToFeatureCollection(sites),
      });
      map.addLayer({
        id: SITE_FILL_LAYER_ID,
        type: "fill",
        source: SITE_SOURCE_ID,
        paint: { "fill-color": "#1a7f4b", "fill-opacity": 0.35 },
      });
      map.addLayer({
        id: SITE_LINE_LAYER_ID,
        type: "line",
        source: SITE_SOURCE_ID,
        paint: { "line-color": "#1a7f4b", "line-width": 2 },
      });

      if (onSiteClick) {
        map.on("click", SITE_FILL_LAYER_ID, (e) => {
          const id = e.features?.[0]?.properties?.id;
          if (id) onSiteClick(id);
        });
        map.on("mouseenter", SITE_FILL_LAYER_ID, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", SITE_FILL_LAYER_ID, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      fitToSites(map, sites);
    });

    return () => {
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
      source.setData(sitesToFeatureCollection(sites));
      if (!focusSiteId) fitToSites(map, sites);
    }
  }, [sites, focusSiteId]);

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

  if (!mapboxgl.accessToken) {
    return (
      <div className="map-hint" style={{ position: "static", maxWidth: "none" }}>
        A Mapbox access token is required to display the map. Set <code>VITE_MAPBOX_TOKEN</code> in
        your frontend <code>.env</code> file — see the README for instructions on getting a free
        token from mapbox.com.
      </div>
    );
  }

  return <div ref={containerRef} className="map-container" />;
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
