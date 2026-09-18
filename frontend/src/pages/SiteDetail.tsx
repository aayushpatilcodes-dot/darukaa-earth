import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getSite } from "../api/endpoints";
import { MetricsChart } from "../components/MetricsChart";
import { SitesMap } from "../components/SitesMap";
import type { MetricType, SiteWithMetrics } from "../types";

const METRIC_TYPES: MetricType[] = [
  "ndvi",
  "carbon_stock_tco2e",
  "biodiversity_index",
  "canopy_cover_pct",
];

function latestValue(site: SiteWithMetrics, metricType: MetricType): number | null {
  const points = site.metrics
    .filter((m) => m.metric_type === metricType)
    .sort((a, b) => b.recorded_on.localeCompare(a.recorded_on));
  return points[0]?.value ?? null;
}

export function SiteDetail() {
  const { siteId } = useParams<{ siteId: string }>();
  const [site, setSite] = useState<SiteWithMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!siteId) return;
    getSite(siteId)
      .then(setSite)
      .finally(() => setIsLoading(false));
  }, [siteId]);

  if (isLoading) return <div className="page-container">Loading…</div>;
  if (!site) return <div className="page-container">Site not found.</div>;

  return (
    <div className="page-container">
      <Link to={`/projects/${site.project_id}`} className="back-link">
        ← Back to project
      </Link>

      <div className="site-header">
        <div>
          <h1 style={{ margin: 0 }}>{site.name}</h1>
          {site.description && (
            <p style={{ color: "var(--color-text-muted)" }}>{site.description}</p>
          )}
        </div>
        <span className="badge">{site.area_hectares?.toFixed(2)} ha</span>
      </div>

      <div style={{ height: 320, marginBottom: "2rem" }}>
        <SitesMap sites={[site]} focusSiteId={site.id} />
      </div>

      <div className="stat-row">
        {METRIC_TYPES.map((metricType) => {
          const value = latestValue(site, metricType);
          return (
            <div key={metricType} className="stat-tile">
              <div className="label">{metricType.replace(/_/g, " ")}</div>
              <div className="value">{value !== null ? value.toFixed(2) : "—"}</div>
            </div>
          );
        })}
      </div>

      <div className="section-title">
        <h2>Performance over time</h2>
      </div>

      {METRIC_TYPES.map((metricType) => (
        <MetricsChart key={metricType} metricType={metricType} metrics={site.metrics} />
      ))}
    </div>
  );
}
