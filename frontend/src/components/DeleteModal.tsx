import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteModalProps {
  isOpen: boolean;
  title: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  title,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            padding: '0.5rem',
            borderRadius: '50%',
            display: 'flex',
          }}>
            <AlertTriangle size={24} />
          </div>
          <h3 id="modal-title" style={{ fontSize: '1.25rem' }}>Delete Bug</h3>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: '1.6' }}>
          Are you sure you want to permanently delete <strong>&quot;{title}&quot;</strong>? This will remove the issue from the database and delete any attached screenshot from Amazon S3. This action cannot be undone.
        </p>

        <div className="modal-actions">
          <button
            id="cancel-delete-btn"
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            id="confirm-delete-btn"
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="spinner" style={{ width: '1rem', height: '1rem' }}></span>
                Deleting...
              </>
            ) : (
              'Delete Bug'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
