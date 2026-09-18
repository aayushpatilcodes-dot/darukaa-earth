import { AlertCircle, ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { getErrorMessage } from "../api/client";
import { createSite, deleteProject, deleteSite, getProject } from "../api/endpoints";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EditSiteModal } from "../components/EditSiteModal";
import { ProjectFormModal } from "../components/ProjectFormModal";
import { SitesMap } from "../components/SitesMap";
import type { GeoJSONPolygon, Project, ProjectDetail as ProjectDetailType, Site } from "../types";

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnGeometry, setDrawnGeometry] = useState<GeoJSONPolygon | null>(null);
  const [siteName, setSiteName] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isDeletingProjectBusy, setIsDeletingProjectBusy] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [deletingSite, setDeletingSite] = useState<Site | null>(null);
  const [isDeletingSiteBusy, setIsDeletingSiteBusy] = useState(false);

  function load() {
    if (!projectId) return;
    setIsLoading(true);
    setLoadError(null);
    getProject(projectId)
      .then(setProject)
      .catch((err) => setLoadError(getErrorMessage(err, "Could not load this project.")))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [projectId]);

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
      toast.success("Site added");
    } catch (err) {
      setError(getErrorMessage(err, "Could not save this site. Please check the polygon and try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleProjectSaved(updated: Project) {
    setProject((prev) => (prev ? { ...prev, ...updated } : prev));
    setIsEditingProject(false);
    toast.success("Project updated");
  }

  async function handleConfirmDeleteProject() {
    if (!project) return;
    setIsDeletingProjectBusy(true);
    try {
      await deleteProject(project.id);
      toast.success("Project deleted");
      navigate("/");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete this project."));
      setIsDeletingProjectBusy(false);
    }
  }

  function handleSiteSaved(updated: Site) {
    setProject((prev) =>
      prev ? { ...prev, sites: prev.sites.map((s) => (s.id === updated.id ? updated : s)) } : prev,
    );
    setEditingSite(null);
    toast.success("Site updated");
  }

  async function handleConfirmDeleteSite() {
    if (!deletingSite) return;
    setIsDeletingSiteBusy(true);
    try {
      await deleteSite(deletingSite.id);
      setProject((prev) =>
        prev ? { ...prev, sites: prev.sites.filter((s) => s.id !== deletingSite.id) } : prev,
      );
      toast.success("Site deleted");
      setDeletingSite(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete this site."));
    } finally {
      setIsDeletingSiteBusy(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="skeleton skeleton-title" style={{ width: "40%" }} />
        <div className="skeleton" style={{ height: 360, marginTop: "1.5rem" }} />
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

  if (!project) return <div className="page-container">Project not found.</div>;

  return (
    <div className="page-container">
      <Link to="/" className="back-link">
        <ArrowLeft size={14} /> All projects
      </Link>
      <div className="page-header">
        <div>
          <h1>{project.name}</h1>
          {project.description && (
            <p style={{ color: "var(--color-text-muted)" }}>{project.description}</p>
          )}
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setIsEditingProject(true)}>
            <Pencil size={15} /> Edit
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-danger-text"
            onClick={() => setIsDeletingProject(true)}
          >
            <Trash2 size={15} /> Delete
          </button>
          {!isDrawing && (
            <button type="button" className="btn btn-primary" onClick={() => setIsDrawing(true)}>
              <Plus size={16} /> Add site
            </button>
          )}
        </div>
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
                  setError(null);
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
              <div key={site.id} className="site-row">
                <Link to={`/sites/${site.id}`} className="site-row-link">
                  <span>{site.name}</span>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                    {site.area_hectares?.toFixed(2)} ha
                  </span>
                </Link>
                <div className="site-row-actions">
                  <button
                    type="button"
                    className="btn-icon"
                    aria-label={`Edit ${site.name}`}
                    onClick={() => setEditingSite(site)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon btn-icon-danger"
                    aria-label={`Delete ${site.name}`}
                    onClick={() => setDeletingSite(site)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {isEditingProject && (
        <ProjectFormModal
          project={project}
          onClose={() => setIsEditingProject(false)}
          onSaved={handleProjectSaved}
        />
      )}

      {isDeletingProject && (
        <ConfirmDialog
          title="Delete project"
          message={`Delete "${project.name}" and all of its sites? This cannot be undone.`}
          confirmLabel="Delete project"
          isBusy={isDeletingProjectBusy}
          onConfirm={handleConfirmDeleteProject}
          onCancel={() => setIsDeletingProject(false)}
        />
      )}

      {editingSite && (
        <EditSiteModal
          site={editingSite}
          onClose={() => setEditingSite(null)}
          onSaved={handleSiteSaved}
        />
      )}

      {deletingSite && (
        <ConfirmDialog
          title="Delete site"
          message={`Delete "${deletingSite.name}"? Its monitoring history will be lost.`}
          confirmLabel="Delete site"
          isBusy={isDeletingSiteBusy}
          onConfirm={handleConfirmDeleteSite}
          onCancel={() => setDeletingSite(null)}
        />
      )}
    </div>
  );
}
