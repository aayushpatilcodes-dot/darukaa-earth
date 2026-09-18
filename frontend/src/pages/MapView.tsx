import { AlertCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getErrorMessage } from "../api/client";
import { listAllSites, listProjects } from "../api/endpoints";
import { SitesMap } from "../components/SitesMap";
import type { Project, Site } from "../types";

const PROJECT_COLORS = ["#1a7f4b", "#b98a2f", "#3a6ea5", "#7c4dbd", "#c1503e", "#1f9d99"];

function colorForProject(projectId: string): string {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = (hash * 31 + projectId.charCodeAt(i)) >>> 0;
  }
  return PROJECT_COLORS[hash % PROJECT_COLORS.length];
}

export function MapView() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    setLoadError(null);
    Promise.all([listAllSites(), listProjects()])
      .then(([siteData, projectData]) => {
        setSites(siteData);
        setProjects(projectData);
      })
      .catch((err) => setLoadError(getErrorMessage(err, "Could not load sites.")))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  const filteredSites = useMemo(
    () => (projectFilter === "all" ? sites : sites.filter((s) => s.project_id === projectFilter)),
    [sites, projectFilter],
  );

  const getSiteColor = useCallback((site: Site) => colorForProject(site.project_id), []);

  const legend = useMemo(
    () =>
      projectFilter === "all" && projects.length > 1
        ? projects
            .filter((p) => sites.some((s) => s.project_id === p.id))
            .map((p) => ({ color: colorForProject(p.id), label: p.name }))
        : [],
    [projects, sites, projectFilter],
  );

  return (
    <div className="map-page">
      <div className="map-toolbar">
        <strong>All sites</strong>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="all">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
      {loadError ? (
        <div className="empty-state error-state">
          <AlertCircle size={28} />
          <p>{loadError}</p>
          <button type="button" className="btn btn-primary" onClick={load}>
            Retry
          </button>
        </div>
      ) : (
        !isLoading && (
          <div style={{ position: "relative", flex: 1 }}>
            <div className="map-hint">
              Click a shaded site to view its analytics. {filteredSites.length} site
              {filteredSites.length === 1 ? "" : "s"} shown.
            </div>
            <SitesMap
              sites={filteredSites}
              onSiteClick={(siteId) => navigate(`/sites/${siteId}`)}
              getSiteColor={getSiteColor}
              legend={legend}
            />
          </div>
        )
      )}
    </div>
  );
}
