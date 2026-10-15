import React, { useState, useEffect } from 'react';
import { bugApi } from '../api/client';
import { Bug, BugSeverity, BugStatus } from '../types';
import { ImageUploader } from '../components/ImageUploader';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

interface EditBugPageProps {
  bugId: string;
  onNavigate: (page: string, bugId?: string) => void;
}

export const EditBugPage: React.FC<EditBugPageProps> = ({ bugId, onNavigate }) => {
  const [bug, setBug] = useState<Bug | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<BugSeverity>('med');
  const [status, setStatus] = useState<BugStatus>('open');
  const [imageKey, setImageKey] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBug = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await bugApi.getBug(bugId);
        const b = res.data.bug;
        setBug(b);
        setTitle(b.title);
        setDescription(b.description);
        setSeverity(b.severity);
        setStatus(b.status);
        setImageKey(b.imageKey || null);
      } catch (err: any) {
        setError(err.message || 'Failed to load bug for editing');
      } finally {
        setLoading(false);
      }
    };

    fetchBug();
  }, [bugId]);

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
      await bugApi.updateBug(bugId, {
        title: title.trim(),
        description: description.trim(),
        severity,
        status,
        imageKey, 
      });

      onNavigate('detail', bugId);
    } catch (err: any) {
      setError(err.message || 'Failed to update bug.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto', width: '2rem', height: '2rem', borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
        <p>Loading bug data...</p>
      </div>
    );
  }

  if (error && !bug) {
    return (
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ marginBottom: '1.25rem', paddingLeft: 0 }}
          onClick={() => onNavigate('dashboard')}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ color: 'var(--accent-danger)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
            <AlertCircle size={40} />
          </div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Unable to edit bug</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => onNavigate('dashboard')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      <button
        type="button"
        id="edit-back-btn"
        className="btn btn-ghost"
        style={{ marginBottom: '1.25rem', paddingLeft: 0 }}
        onClick={() => onNavigate('detail', bugId)}
      >
        <ArrowLeft size={16} />
        <span>Cancel and Back to Detail</span>
      </button>

      <div className="card">
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Edit Bug</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
          Update fields or replace screenshot attachment. Old S3 objects are automatically cleaned up.
        </p>

        {error && (
          <div className="alert alert-error" id="edit-bug-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-bug-title">Bug Title *</label>
            <input
              id="edit-bug-title"
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-bug-severity">Severity Level *</label>
              <select
                id="edit-bug-severity"
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
              <label className="form-label" htmlFor="edit-bug-status">Status *</label>
              <select
                id="edit-bug-status"
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
            <label className="form-label" htmlFor="edit-bug-description">Description & Repro Steps *</label>
            <textarea
              id="edit-bug-description"
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <ImageUploader
            currentImageUrl={bug?.imageUrl}
            currentImageKey={bug?.imageKey}
            onImageUploaded={(key) => setImageKey(key)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
            <button
              type="button"
              id="edit-cancel-btn"
              className="btn btn-secondary"
              onClick={() => onNavigate('detail', bugId)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="edit-submit-btn"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" style={{ width: '1rem', height: '1rem' }}></span>
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Update Bug</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
