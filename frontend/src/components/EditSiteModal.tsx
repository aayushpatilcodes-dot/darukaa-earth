import { useState, type FormEvent } from "react";

import { getErrorMessage } from "../api/client";
import { updateSite } from "../api/endpoints";
import type { Site } from "../types";

interface Props {
  site: Site;
  onClose: () => void;
  onSaved: (site: Site) => void;
}

export function EditSiteModal({ site, onClose, onSaved }: Props) {
  const [name, setName] = useState(site.name);
  const [description, setDescription] = useState(site.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const saved = await updateSite(site.id, { name, description });
      onSaved(saved);
    } catch (err) {
      setError(getErrorMessage(err, "Could not save this site. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Edit site</h2>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="editSiteName">Site name</label>
            <input
              id="editSiteName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="editSiteDescription">Description</label>
            <textarea
              id="editSiteDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !name}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
