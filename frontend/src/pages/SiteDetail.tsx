import { AlertCircle, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { getErrorMessage } from "../api/client";
import { deleteSite, getSite } from "../api/endpoints";
import { EditSiteModal } from "../components/EditSiteModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { MetricsChart } from "../components/MetricsChart";
import { SitesMap } from "../components/SitesMap";
import type { MetricType, Site, SiteWithMetrics } from "../types";

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
  const navigate = useNavigate();
  const [site, setSite] = useState<SiteWithMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingBusy, setIsDeletingBusy] = useState(false);

  function load() {
    if (!siteId) return;
    setIsLoading(true);
    setLoadError(null);
    getSite(siteId)
      .then(setSite)
      .catch((err) => setLoadError(getErrorMessage(err, "Could not load this site.")))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [siteId]);

  function handleSaved(updated: Site) {
    setSite((prev) => (prev ? { ...prev, ...updated } : prev));
    setIsEditing(false);
    toast.success("Site updated");
  }

  async function handleConfirmDelete() {
    if (!site) return;
    setIsDeletingBusy(true);
    try {
      await deleteSite(site.id);
      toast.success("Site deleted");
      navigate(`/projects/${site.project_id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete this site."));
      setIsDeletingBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="skeleton skeleton-title" style={{ width: "40%" }} />
        <div className="skeleton" style={{ height: 320, marginTop: "1.5rem" }} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-container">
        <div className="empty-state error-state">
          <AlertCircle size={28} />
          <p>{loadError}</p>
          <button type="button" className="btn btn-primary" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!site) return <div className="page-container">Site not found.</div>;

  return (
    <div className="page-container">
      <Link to={`/projects/${site.project_id}`} className="back-link">
        <ArrowLeft size={14} /> Back to project
      </Link>

      <div className="site-header">
        <div>
          <h1 style={{ margin: 0 }}>{site.name}</h1>
          {site.description && (
            <p style={{ color: "var(--color-text-muted)" }}>{site.description}</p>
          )}
        </div>
        <div className="page-header-actions">
          <span className="badge">{site.area_hectares?.toFixed(2)} ha</span>
          <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(true)}>
            <Pencil size={15} /> Edit
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-danger-text"
            onClick={() => setIsDeleting(true)}
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
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

      {isEditing && (
        <EditSiteModal site={site} onClose={() => setIsEditing(false)} onSaved={handleSaved} />
      )}

      {isDeleting && (
        <ConfirmDialog
          title="Delete site"
          message={`Delete "${site.name}"? Its monitoring history will be lost.`}
          confirmLabel="Delete site"
          isBusy={isDeletingBusy}
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsDeleting(false)}
        />
      )}
    </div>
  );
}
