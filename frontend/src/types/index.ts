export type ProjectType = "carbon" | "biodiversity" | "mixed";

export type MetricType = "ndvi" | "carbon_stock_tco2e" | "biodiversity_index" | "canopy_cover_pct";

export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  project_type: ProjectType;
  owner_id: string;
  created_at: string;
  updated_at: string;
  site_count: number;
}

export interface Site {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  geometry: GeoJSONPolygon;
  area_hectares: number | null;
  created_at: string;
}

export interface ProjectDetail extends Project {
  sites: Site[];
}

export interface SiteMetric {
  id: string;
  metric_type: MetricType;
  recorded_on: string;
  value: number;
}

export interface SiteWithMetrics extends Site {
  metrics: SiteMetric[];
}
