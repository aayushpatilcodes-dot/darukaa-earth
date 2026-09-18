import { AlertTriangle } from "lucide-react";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  isDanger?: boolean;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  isDanger = true,
  isBusy = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          {isDanger && (
            <span className="confirm-dialog-icon">
              <AlertTriangle size={20} />
            </span>
          )}
          <h2>{title}</h2>
        </div>
        <p className="confirm-dialog-message">{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isBusy}>
            Cancel
          </button>
          <button
            type="button"
            className={isDanger ? "btn btn-danger" : "btn btn-primary"}
            onClick={onConfirm}
            disabled={isBusy}
          >
            {isBusy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
