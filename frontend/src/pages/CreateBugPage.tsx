import React, { useState } from 'react';
import { bugApi } from '../api/client';
import { BugSeverity, BugStatus } from '../types';
import { ImageUploader } from '../components/ImageUploader';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

interface CreateBugPageProps {
  onNavigate: (page: string, bugId?: string) => void;
}

export const CreateBugPage: React.FC<CreateBugPageProps> = ({ onNavigate }) => {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<BugSeverity>('med');
  const [status, setStatus] = useState<BugStatus>('open');
  const [imageKey, setImageKey] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || title.trim().length < 3) {
      setError('Title must be at least 3 characters long.');
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      setError('Description must be at least 5 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await bugApi.createBug({
        title: title.trim(),
        description: description.trim(),
        severity,
        status,
        imageKey,
      });

      onNavigate('detail', res.data.bug.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create bug. Please check your network and inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      <button
        type="button"
        id="create-back-btn"
        className="btn btn-ghost"
        style={{ marginBottom: '1.25rem', paddingLeft: 0 }}
        onClick={() => onNavigate('dashboard')}
      >
        <ArrowLeft size={16} />
        <span>Back to Dashboard</span>
      </button>

      <div className="card">
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Report a New Issue</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
          Provide clear repro steps, severity level, and an optional screenshot uploaded directly to AWS S3.
        </p>

        {error && (
          <div className="alert alert-error" id="create-bug-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="bug-title">Bug Title *</label>
            <input
              id="bug-title"
              type="text"
              className="form-input"
              placeholder="e.g. Broken checkout flow when paying with PayPal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="bug-severity">Severity Level *</label>
              <select
                id="bug-severity"
                className="form-select"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as BugSeverity)}
                disabled={isSubmitting}
              >
                <option value="low">Low (Minor visual / edge case)</option>
                <option value="med">Medium (Feature degraded)</option>
                <option value="high">High (Crash / Blocker)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="bug-status">Initial Status</label>
              <select
                id="bug-status"
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as BugStatus)}
                disabled={isSubmitting}
              >
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bug-description">Description & Repro Steps *</label>
            <textarea
              id="bug-description"
              className="form-textarea"
              placeholder="Steps to reproduce:&#10;1. Navigate to /checkout&#10;2. Select PayPal&#10;3. Click Submit&#10;&#10;Expected result: ...&#10;Actual result: ..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <ImageUploader onImageUploaded={(key) => setImageKey(key)} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
            <button
              type="button"
              id="create-cancel-btn"
              className="btn btn-secondary"
              onClick={() => onNavigate('dashboard')}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="create-submit-btn"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" style={{ width: '1rem', height: '1rem' }}></span>
                  <span>Saving Issue...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Create Bug</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
