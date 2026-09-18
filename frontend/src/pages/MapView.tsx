import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { listAllSites, listProjects } from "../api/endpoints";
import { SitesMap } from "../components/SitesMap";
import type { Project, Site } from "../types";

export function MapView() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([listAllSites(), listProjects()])
      .then(([siteData, projectData]) => {
        setSites(siteData);
        setProjects(projectData);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filteredSites = useMemo(
    () => (projectFilter === "all" ? sites : sites.filter((s) => s.project_id === projectFilter)),
    [sites, projectFilter],
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
      {!isLoading && (
        <div style={{ position: "relative", flex: 1 }}>
          <div className="map-hint">
            Click a shaded site to view its analytics. {filteredSites.length} site
            {filteredSites.length === 1 ? "" : "s"} shown.
          </div>
          <SitesMap sites={filteredSites} onSiteClick={(siteId) => navigate(`/sites/${siteId}`)} />
        </div>
      )}
    </div>
  );
}
