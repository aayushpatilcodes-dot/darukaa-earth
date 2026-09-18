import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { createSite, getProject } from "../api/endpoints";
import { SitesMap } from "../components/SitesMap";
import type { GeoJSONPolygon, ProjectDetail as ProjectDetailType, Site } from "../types";

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnGeometry, setDrawnGeometry] = useState<GeoJSONPolygon | null>(null);
  const [siteName, setSiteName] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    getProject(projectId)
      .then(setProject)
      .finally(() => setIsLoading(false));
  }, [projectId]);

  async function handleAddSite(event: FormEvent) {
    event.preventDefault();
    if (!projectId || !drawnGeometry) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const site: Site = await createSite(projectId, siteName, siteDescription, drawnGeometry);
      setProject((prev) => (prev ? { ...prev, sites: [...prev.sites, site] } : prev));
      setIsDrawing(false);
      setDrawnGeometry(null);
      setSiteName("");
      setSiteDescription("");
    } catch {
      setError("Could not save this site. Please check the polygon and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <div className="page-container">Loading…</div>;
  if (!project) return <div className="page-container">Project not found.</div>;

  return (
    <div className="page-container">
      <Link to="/" className="back-link">
        ← All projects
      </Link>
      <div className="page-header">
        <div>
          <h1>{project.name}</h1>
          {project.description && (
            <p style={{ color: "var(--color-text-muted)" }}>{project.description}</p>
          )}
        </div>
        {!isDrawing && (
          <button type="button" className="btn btn-primary" onClick={() => setIsDrawing(true)}>
            + Add site
          </button>
        )}
      </div>

      {isDrawing && (
        <div className="chart-card">
          <h3>Draw the site boundary</h3>
          <p style={{ color: "var(--color-text-muted)", marginTop: "-0.5rem" }}>
            Use the polygon tool (top-left of the map) to trace the site&apos;s boundary, then name
            the site below.
          </p>
          <div style={{ height: 420, position: "relative", marginBottom: "1rem" }}>
            <SitesMap sites={project.sites} drawable onPolygonDrawn={setDrawnGeometry} />
          </div>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={handleAddSite}>
            <div className="field">
              <label htmlFor="siteName">Site name</label>
              <input
                id="siteName"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                required
                placeholder="e.g. North Plot"
              />
            </div>
            <div className="field">
              <label htmlFor="siteDescription">Description</label>
              <textarea
                id="siteDescription"
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setIsDrawing(false);
                  setDrawnGeometry(null);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!drawnGeometry || !siteName || isSubmitting}
              >
                {isSubmitting ? "Saving…" : "Save site"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="section-title">
        <h2>Sites ({project.sites.length})</h2>
      </div>

      {project.sites.length === 0 ? (
        <div className="empty-state">
          <p>No sites yet. Add one by drawing its boundary on the map.</p>
        </div>
      ) : (
        <>
          <div style={{ height: 360, marginBottom: "1.5rem" }}>
            <SitesMap
              sites={project.sites}
              onSiteClick={(siteId) => navigate(`/sites/${siteId}`)}
            />
          </div>
          <div className="site-list">
            {project.sites.map((site) => (
              <Link key={site.id} to={`/sites/${site.id}`} className="site-row">
                <span>{site.name}</span>
                <span style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                  {site.area_hectares?.toFixed(2)} ha
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
