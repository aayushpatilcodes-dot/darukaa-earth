import { useEffect, useState } from "react";

import { listProjects } from "../api/endpoints";
import { NewProjectModal } from "../components/NewProjectModal";
import { ProjectCard } from "../components/ProjectCard";
import type { Project } from "../types";

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    listProjects()
      .then(setProjects)
      .finally(() => setIsLoading(false));
  }, []);

  function handleCreated(project: Project) {
    setProjects((prev) => [project, ...prev]);
    setIsModalOpen(false);
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Projects</h1>
        <button type="button" className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + New project
        </button>
      </div>

      {isLoading ? (
        <p>Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <p>No projects yet. Create your first carbon or biodiversity project to get started.</p>
          <button type="button" className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + New project
          </button>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {isModalOpen && (
        <NewProjectModal onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
