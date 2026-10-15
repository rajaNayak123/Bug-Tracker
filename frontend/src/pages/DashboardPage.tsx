import React, { useState, useEffect, useMemo } from 'react';
import { bugApi } from '../api/client';
import { Bug } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Plus, Search, Image as ImageIcon, Inbox, AlertCircle, RefreshCw } from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (page: string, bugId?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchBugs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await bugApi.listBugs({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery || undefined,
      });
      setBugs(res.data.bugs);
    } catch (err: any) {
      setError(err.message || 'Failed to load bugs from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBugs();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBugs();
  };

  const stats = useMemo(() => {
    const total = bugs.length;
    const open = bugs.filter((b) => b.status === 'open').length;
    const inProgress = bugs.filter((b) => b.status === 'in-progress').length;
    const closed = bugs.filter((b) => b.status === 'closed').length;
    return { total, open, inProgress, closed };
  }, [bugs]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Issue Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            Track and resolve software bugs with secure S3 attachments.
          </p>
        </div>
        <button
          id="dashboard-new-bug-btn"
          type="button"
          className="btn btn-primary"
          onClick={() => onNavigate('create')}
        >
          <Plus size={16} />
          <span>Report New Bug</span>
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Assigned</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Open Issues</span>
          <span className="stat-value" style={{ color: '#60a5fa' }}>{stats.open}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">In Progress</span>
          <span className="stat-value" style={{ color: '#fbbf24' }}>{stats.inProgress}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Closed / Resolved</span>
          <span className="stat-value" style={{ color: '#34d399' }}>{stats.closed}</span>
        </div>
      </div>
      <div className="filter-bar">
        <div className="filter-pills" role="tablist">
          {(['all', 'open', 'in-progress', 'closed'] as const).map((st) => (
            <button
              key={st}
              id={`filter-pill-${st}`}
              type="button"
              className={`filter-pill ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'all' ? 'All Issues' : st === 'in-progress' ? 'In Progress' : st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', maxWidth: '340px', width: '100%' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              id="search-bugs-input"
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
              placeholder="Search by title or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary" title="Search">
            <RefreshCw size={14} />
          </button>
        </form>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto', width: '2rem', height: '2rem', borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
          <p>Loading issue tracker records...</p>
        </div>
      ) : bugs.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
            <Inbox size={48} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No issues found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
            {statusFilter !== 'all'
              ? `There are currently no bugs marked as "${statusFilter}". Try switching filters or search terms.`
              : 'You have not reported any bugs yet. Get started by clicking the button below.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate('create')}
          >
            <Plus size={16} />
            <span>Create First Bug</span>
          </button>
        </div>
      ) : (
        <div className="bug-list" id="bugs-container">
          {bugs.map((bug) => (
            <div
              key={bug.id}
              id={`bug-card-${bug.id}`}
              className="bug-card"
              onClick={() => onNavigate('detail', bug.id)}
            >
              <div className="bug-card-main">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <h3 className="bug-card-title">{bug.title}</h3>
                  {bug.imageKey && (
                    <span title="Screenshot attached" style={{ color: 'var(--accent-info)', display: 'inline-flex' }}>
                      <ImageIcon size={16} />
                    </span>
                  )}
                </div>
                <p className="bug-card-desc">{bug.description}</p>
                <div className="bug-card-meta">
                  <span>ID: <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{bug.id.slice(-6)}</code></span>
                  <span>•</span>
                  <span>Created {new Date(bug.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                <SeverityBadge severity={bug.severity} />
                <StatusBadge status={bug.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
