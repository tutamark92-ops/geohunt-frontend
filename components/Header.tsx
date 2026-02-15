/**
 * Header Component — the app's navigation bar.
 * Renders differently on mobile vs desktop:
 *   - Mobile: compact top bar + sticky bottom tab navigation
 *   - Desktop: full horizontal nav with text labels and logout button
 * The admin tab only shows if the user has admin privileges.
 */

import React from 'react';
import { Trophy, UserCircle, Compass, Map as MapIcon, Settings, LogOut, MessageSquare } from 'lucide-react';

/** Props for the Header component */
interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  username: string;
  isAdmin?: boolean;
  onLogout?: () => void;
}

/**
 * Main navigation header with responsive mobile/desktop layouts.
 * @param {string}   activeTab  - Currently active tab identifier
 * @param {Function} setActiveTab - Callback to switch tabs
 * @param {string}   username   - The logged-in player's display name
 * @param {boolean}  isAdmin    - Whether to show the Admin tab
 * @param {Function} onLogout   - Callback to log the user out
 */
export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, username, isAdmin, onLogout }) => {
  return (
    <>
      {/* Mobile Header - Compact top bar */}
      <header className="mobile-header sm:hidden">
        <div className="flex items-center gap-3" onClick={() => setActiveTab('map')}>
          <div className="w-10 h-10 bg-[var(--game-green)] rounded-xl flex items-center justify-center" style={{ boxShadow: '0 3px 0 var(--game-green-dark)' }}>
            <Compass className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black text-lg text-[var(--text-dark)] leading-none">GeoHunt</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--text-medium)] uppercase tracking-wide">
            {username}
          </span>
          {onLogout && (
            <button 
              onClick={onLogout}
              className="p-2 text-[var(--text-light)] hover:text-red-500 transition-colors rounded-lg"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Desktop Header - Full navigation */}
      <header className="hidden sm:flex bg-white sticky top-0 z-[1000] px-6 py-4 items-center justify-between border-b-2 border-[var(--border-light)]">
        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setActiveTab('map')}>
          <div className="w-12 h-12 bg-[var(--game-green)] rounded-xl flex items-center justify-center" style={{ boxShadow: '0 4px 0 var(--game-green-dark)' }}>
            <Compass className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-xl text-[var(--text-dark)] tracking-tight leading-none">GeoHunt</h1>
            <p className="text-[10px] font-bold text-[var(--text-light)] uppercase tracking-widest mt-0.5">Campus Explorer</p>
          </div>
        </div>

        <nav className="nav-container">
          <button 
            onClick={() => setActiveTab('map')}
            className={`nav-pill flex items-center gap-2 ${activeTab === 'map' ? 'nav-pill-active' : ''}`}
          >
            <MapIcon className="w-4 h-4" />
            <span>Explore</span>
          </button>
          <button 
            onClick={() => setActiveTab('leaderboard')}
            className={`nav-pill flex items-center gap-2 ${activeTab === 'leaderboard' ? 'nav-pill-active' : ''}`}
          >
            <Trophy className="w-4 h-4" />
            <span>Rankings</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`nav-pill flex items-center gap-2 ${activeTab === 'profile' ? 'nav-pill-active' : ''}`}
          >
            <UserCircle className="w-4 h-4" />
            <span>{username}</span>
          </button>
          <button 
            onClick={() => setActiveTab('feedback')}
            className={`nav-pill flex items-center gap-2 ${activeTab === 'feedback' ? 'nav-pill-active' : ''}`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Feedback</span>
          </button>
          {isAdmin && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={`nav-pill flex items-center gap-2 ${activeTab === 'admin' ? 'nav-pill-active' : ''}`}
            >
              <Settings className="w-4 h-4" />
              <span>Admin</span>
            </button>
          )}
          {onLogout && (
            <button 
              onClick={onLogout}
              className="nav-pill flex items-center gap-2 text-red-500 hover:bg-red-50"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          )}
        </nav>
      </header>

      {/* Mobile Bottom Navigation — sticky tab bar at the bottom of the screen */}
      <nav className="bottom-nav sm:hidden">
        <button 
          onClick={() => setActiveTab('map')}
          className={`bottom-nav-item ${activeTab === 'map' ? 'bottom-nav-item-active' : ''}`}
        >
          <div className="bottom-nav-icon">
            <MapIcon className="w-6 h-6" />
          </div>
          <span>Explore</span>
        </button>
        <button 
          onClick={() => setActiveTab('leaderboard')}
          className={`bottom-nav-item ${activeTab === 'leaderboard' ? 'bottom-nav-item-active' : ''}`}
        >
          <div className="bottom-nav-icon">
            <Trophy className="w-6 h-6" />
          </div>
          <span>Rankings</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`bottom-nav-item ${activeTab === 'profile' ? 'bottom-nav-item-active' : ''}`}
        >
          <div className="bottom-nav-icon">
            <UserCircle className="w-6 h-6" />
          </div>
          <span>Profile</span>
        </button>
        <button 
          onClick={() => setActiveTab('feedback')}
          className={`bottom-nav-item ${activeTab === 'feedback' ? 'bottom-nav-item-active' : ''}`}
        >
          <div className="bottom-nav-icon">
            <MessageSquare className="w-6 h-6" />
          </div>
          <span>Feedback</span>
        </button>
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('admin')}
            className={`bottom-nav-item ${activeTab === 'admin' ? 'bottom-nav-item-active' : ''}`}
          >
            <div className="bottom-nav-icon">
              <Settings className="w-6 h-6" />
            </div>
            <span>Admin</span>
          </button>
        )}
      </nav>
    </>
  );
};
