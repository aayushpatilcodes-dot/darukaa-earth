import { Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import type { Project } from "../types";

const TYPE_LABELS: Record<Project["project_type"], string> = {
  carbon: "Carbon",
  biodiversity: "Biodiversity",
  mixed: "Carbon + Biodiversity",
};

interface Props {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectCard({ project, onEdit, onDelete }: Props) {
  return (
    <Link to={`/projects/${project.id}`} className="project-card">
      <div className="project-card-actions">
        <button
          type="button"
          className="btn-icon"
          aria-label={`Edit ${project.name}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit(project);
          }}
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          className="btn-icon btn-icon-danger"
          aria-label={`Delete ${project.name}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(project);
          }}
        >
          <Trash2 size={15} />
        </button>
      </div>
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
