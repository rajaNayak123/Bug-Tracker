import React, { useState, useEffect } from 'react';
import { bugApi } from '../api/client';
import { Bug } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { DeleteModal } from '../components/DeleteModal';
import { ArrowLeft, Edit3, Trash2, Calendar, Clock, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface BugDetailPageProps {
  bugId: string;
  onNavigate: (page: string, bugId?: string) => void;
}

export const BugDetailPage: React.FC<BugDetailPageProps> = ({ bugId, onNavigate }) => {
  const [bug, setBug] = useState<Bug | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    const fetchBug = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await bugApi.getBug(bugId);
        setBug(res.data.bug);
      } catch (err: any) {
        if (err.statusCode === 403) {
          setError('Access Denied: You do not have permission to view this issue (Ownership check failed).');
        } else if (err.statusCode === 404) {
          setError('Issue Not Found: The requested bug does not exist or may have been deleted.');
        } else {
          setError(err.message || 'Failed to load bug details.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBug();
  }, [bugId]);

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await bugApi.deleteBug(bugId);
      setIsDeleteModalOpen(false);
      onNavigate('dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to delete bug. Please try again.');
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto', width: '2rem', height: '2rem', borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
        <p>Loading bug details...</p>
      </div>
    );
  }

  if (error || !bug) {
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
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Unable to display bug</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate('dashboard')}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <button
          type="button"
          id="detail-back-btn"
          className="btn btn-ghost"
          style={{ paddingLeft: 0 }}
          onClick={() => onNavigate('dashboard')}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            id="detail-edit-btn"
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate('edit', bug.id)}
          >
            <Edit3 size={16} />
            <span>Edit</span>
          </button>
          <button
            id="detail-delete-btn"
            type="button"
            className="btn btn-danger"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
          <h1 id="detail-bug-title" style={{ fontSize: '1.65rem', lineHeight: '1.3' }}>{bug.title}</h1>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <SeverityBadge severity={bug.severity} />
            <StatusBadge status={bug.status} />
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '1.5rem',
          paddingBottom: '1.25rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Calendar size={14} />
            <span>Created: {new Date(bug.createdAt).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Clock size={14} />
            <span>Updated: {new Date(bug.updatedAt).toLocaleString()}</span>
          </div>
          <div>
            <span>ID: <code style={{ fontFamily: 'var(--font-mono)' }}>{bug.id}</code></span>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.9375rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Description & Reproduction Details
          </h3>
          <div
            id="detail-bug-description"
            style={{
              whiteSpace: 'pre-wrap',
              color: 'var(--text-primary)',
              lineHeight: '1.7',
              backgroundColor: 'var(--bg-input)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
            }}
          >
            {bug.description}
          </div>
        </div>

        {bug.imageUrl ? (
          <div>
            <h3 style={{ fontSize: '0.9375rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ImageIcon size={16} /> Attached S3 Screenshot (Private Pre-signed URL)
            </h3>
            <div style={{
              backgroundColor: '#000',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              textAlign: 'center',
              padding: '1rem',
            }}>
              <img
                id="detail-bug-image"
                src={bug.imageUrl}
                alt="Bug Screenshot attachment"
                style={{
                  maxWidth: '100%',
                  maxHeight: '500px',
                  borderRadius: 'var(--radius-sm)',
                  objectFit: 'contain',
                }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Served securely via Amazon S3 pre-signed URL with 15-minute expiration. S3 bucket remains strictly private.
            </p>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic' }}>
            No screenshot attached to this bug.
          </div>
        )}
      </div>

      <DeleteModal
        isOpen={isDeleteModalOpen}
        title={bug.title}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
