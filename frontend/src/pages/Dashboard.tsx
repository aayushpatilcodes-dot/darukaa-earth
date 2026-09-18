import { AlertCircle, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { getErrorMessage } from "../api/client";
import { deleteProject, listProjects } from "../api/endpoints";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ProjectCard } from "../components/ProjectCard";
import { ProjectFormModal } from "../components/ProjectFormModal";
import type { Project } from "../types";

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | "new" | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function load() {
    setIsLoading(true);
    setLoadError(null);
    listProjects()
      .then(setProjects)
      .catch((err) => setLoadError(getErrorMessage(err, "Could not load your projects.")))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  function handleSaved(project: Project) {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === project.id);
      return exists ? prev.map((p) => (p.id === project.id ? project : p)) : [project, ...prev];
    });
    setEditingProject(null);
    toast.success(editingProject === "new" ? "Project created" : "Project updated");
  }

  async function handleConfirmDelete() {
    if (!deletingProject) return;
    setIsDeleting(true);
    try {
      await deleteProject(deletingProject.id);
      setProjects((prev) => prev.filter((p) => p.id !== deletingProject.id));
      toast.success("Project deleted");
      setDeletingProject(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete this project."));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Projects</h1>
        <button type="button" className="btn btn-primary" onClick={() => setEditingProject("new")}>
          <Plus size={16} /> New project
        </button>
      </div>

      {isLoading ? (
        <div className="project-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="project-card skeleton-card">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text" style={{ width: "60%" }} />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="empty-state error-state">
          <AlertCircle size={28} />
          <p>{loadError}</p>
          <button type="button" className="btn btn-primary" onClick={load}>
            Retry
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <p>No projects yet. Create your first carbon or biodiversity project to get started.</p>
          <button type="button" className="btn btn-primary" onClick={() => setEditingProject("new")}>
            <Plus size={16} /> New project
          </button>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={setEditingProject}
              onDelete={setDeletingProject}
            />
          ))}
        </div>
      )}

      {editingProject && (
        <ProjectFormModal
          project={editingProject === "new" ? undefined : editingProject}
          onClose={() => setEditingProject(null)}
          onSaved={handleSaved}
        />
      )}

      {deletingProject && (
        <ConfirmDialog
          title="Delete project"
          message={`Delete "${deletingProject.name}" and all of its sites? This cannot be undone.`}
          confirmLabel="Delete project"
          isBusy={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingProject(null)}
        />
      )}
    </div>
  );
}
