import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bug, Plus, LogOut, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  onNavigate: (page: string, bugId?: string) => void;
  currentPage: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentPage }) => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div
          id="nav-brand"
          className="brand-link"
          onClick={() => onNavigate('dashboard')}
        >
          <div className="brand-icon">
            <Bug size={18} />
          </div>
          <span>Bug Tracker Lite</span>
        </div>

        {isAuthenticated && (
          <div className="nav-actions">
            <div className="user-badge" id="user-profile-badge">
              <UserIcon size={14} />
              <span>{user?.name || user?.email}</span>
            </div>

            <button
              id="nav-create-bug-btn"
              type="button"
              className={`btn ${currentPage === 'create' ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => onNavigate('create')}
            >
              <Plus size={16} />
              <span>New Bug</span>
            </button>

            <button
              id="nav-logout-btn"
              type="button"
              className="btn btn-ghost"
              onClick={logout}
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
