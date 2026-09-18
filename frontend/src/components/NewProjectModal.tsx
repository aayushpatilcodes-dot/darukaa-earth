import { useState, type FormEvent } from "react";

import { createProject } from "../api/endpoints";
import type { Project, ProjectType } from "../types";

interface Props {
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export function NewProjectModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("mixed");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const project = await createProject(name, description, projectType);
      onCreated(project);
    } catch {
      setError("Could not create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>New project</h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="projectName">Project name</label>
            <input
              id="projectName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Rajaji Reforestation Initiative"
            />
          </div>
          <div className="field">
            <label htmlFor="projectDescription">Description</label>
            <textarea
              id="projectDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Briefly describe this project"
            />
          </div>
          <div className="field">
            <label htmlFor="projectType">Project type</label>
            <select
              id="projectType"
              value={projectType}
              onChange={(e) => setProjectType(e.target.value as ProjectType)}
            >
              <option value="mixed">Carbon + Biodiversity</option>
              <option value="carbon">Carbon</option>
              <option value="biodiversity">Biodiversity</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !name}>
              {isSubmitting ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
