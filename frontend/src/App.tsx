import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { CreateBugPage } from './pages/CreateBugPage';
import { BugDetailPage } from './pages/BugDetailPage';
import { EditBugPage } from './pages/EditBugPage';

type Page = 'dashboard' | 'create' | 'detail' | 'edit';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedBugId, setSelectedBugId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash.replace('#', '') || '/';
      if (hash.startsWith('/bugs/new')) {
        setCurrentPage('create');
        setSelectedBugId(undefined);
      } else if (hash.startsWith('/bugs/') && hash.endsWith('/edit')) {
        const id = hash.split('/')[2];
        setCurrentPage('edit');
        setSelectedBugId(id);
      } else if (hash.startsWith('/bugs/')) {
        const id = hash.split('/')[2];
        setCurrentPage('detail');
        setSelectedBugId(id);
      } else {
        setCurrentPage('dashboard');
        setSelectedBugId(undefined);
      }
    };

    window.addEventListener('hashchange', handleLocationChange);
    handleLocationChange();

    return () => window.removeEventListener('hashchange', handleLocationChange);
  }, []);

  const navigateTo = (page: string, bugId?: string) => {
    if (page === 'create') {
      window.location.hash = '/bugs/new';
      setCurrentPage('create');
      setSelectedBugId(undefined);
    } else if (page === 'edit' && bugId) {
      window.location.hash = `/bugs/${bugId}/edit`;
      setCurrentPage('edit');
      setSelectedBugId(bugId);
    } else if (page === 'detail' && bugId) {
      window.location.hash = `/bugs/${bugId}`;
      setCurrentPage('detail');
      setSelectedBugId(bugId);
    } else {
      window.location.hash = '/';
      setCurrentPage('dashboard');
      setSelectedBugId(undefined);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
      }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem', borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <AuthPage />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar onNavigate={navigateTo} currentPage={currentPage} />
      <main className="main-content">
        {currentPage === 'dashboard' && <DashboardPage onNavigate={navigateTo} />}
        {currentPage === 'create' && <CreateBugPage onNavigate={navigateTo} />}
        {currentPage === 'detail' && selectedBugId && (
          <BugDetailPage bugId={selectedBugId} onNavigate={navigateTo} />
        )}
        {currentPage === 'edit' && selectedBugId && (
          <EditBugPage bugId={selectedBugId} onNavigate={navigateTo} />
        )}
      </main>
    </div>
  );
};

export default App;
