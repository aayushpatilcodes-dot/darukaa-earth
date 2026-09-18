import { Link } from "react-router-dom";

import type { Project } from "../types";

const TYPE_LABELS: Record<Project["project_type"], string> = {
  carbon: "Carbon",
  biodiversity: "Biodiversity",
  mixed: "Carbon + Biodiversity",
};

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link to={`/projects/${project.id}`} className="project-card">
      <h3>{project.name}</h3>
      <p>{project.description || "No description provided."}</p>
      <div className="project-card-meta">
        <span className="badge">{TYPE_LABELS[project.project_type]}</span>
        <span className="badge badge-outline">
          {project.site_count} {project.site_count === 1 ? "site" : "sites"}
        </span>
      </div>
    </Link>
  );
}
