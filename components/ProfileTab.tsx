/**
 * Profile Tab — the player's personal dashboard.
 * Displays their avatar, XP stats, level progress bar, and trophy room.
 * The trophy room shows all available badges and which ones the player has earned.
 * Also includes a "Sign Out & Reset" button at the bottom.
 */

import React from 'react';
import { User, Star, Zap, Award, Trophy, Compass, GraduationCap } from 'lucide-react';
import { BADGES } from '../constants';
import { UserProgress } from '../types';

/** Maps badge icon names to their Lucide icon components */
const BADGE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Compass,
  GraduationCap,
  Star,
  Trophy
};

/** Props for the ProfileTab component */
interface ProfileTabProps {
  username: string;
  userProgress: UserProgress;
  onLogout: () => void;
}

/**
 * Renders the player's profile with stats, level progress, and badge collection.
 * @param {string}       username     - The player's display name
 * @param {UserProgress} userProgress - Their game progress data (points, badges, level, etc.)
 * @param {Function}     onLogout     - Callback to sign out and reset local state
 */
export const ProfileTab: React.FC<ProfileTabProps> = ({ username, userProgress, onLogout }) => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Profile Header — avatar, username, and level badge */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center avatar-ring" style={{ background: 'var(--bg-main)' }}>
              <User className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--duo-hare)]" />
            </div>
            <div className="absolute -bottom-2 -right-2 level-badge w-8 h-8 text-xs">
              {userProgress.level}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--duo-eel)] truncate">{username}</h2>
            <p className="text-xs font-bold uppercase tracking-wide flex items-center gap-1 gradient-text">
              <Star className="w-3 h-3" style={{ WebkitTextFillColor: 'initial', color: 'var(--game-blue)' }} /> Campus Adventurer
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid — XP, treasures found, badges earned */}
      <div className="grid grid-cols-3 gap-3 stagger-in">
        <div className="card p-4 text-center scale-press">
          <p className="text-2xl sm:text-3xl font-black gradient-text">{userProgress.totalPoints}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--duo-wolf)]">XP</p>
        </div>
        <div className="card p-4 text-center scale-press">
          <p className="text-2xl sm:text-3xl font-black text-[var(--duo-green)]">{userProgress.unlockedTreasureIds.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--duo-wolf)]">Found</p>
        </div>
        <div className="card p-4 text-center scale-press">
          <p className="text-2xl sm:text-3xl font-black gradient-text-gold">{userProgress.badges.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--duo-wolf)]">Badges</p>
        </div>
      </div>

      {/* XP Progress Bar — shows progress toward the next level */}
      <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--duo-gold)]" />
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--duo-wolf)]">Level {userProgress.level} Progress</span>
          </div>
          <span className="text-xs font-bold text-[var(--duo-wolf)]">{userProgress.totalPoints % 250}/250 XP</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(userProgress.totalPoints % 250) / 2.5}%` }} />
        </div>
      </div>

      {/* Trophy Room — shows all badges and whether they've been earned */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <Award className="w-5 h-5 text-[var(--duo-gold)]" />
          <h3 className="text-sm font-black uppercase tracking-wide text-[var(--duo-eel)]">Trophy Room</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 stagger-in">
          {BADGES.map(badge => {
            const hasBadge = userProgress.badges.includes(badge.id);
            const IconComponent = BADGE_ICONS[badge.icon];
            return (
              <div 
                key={badge.id} 
                className={`card p-4 text-center scale-press ${hasBadge ? 'card-success badge-glow' : ''}`}
              >
                <div className={`w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center ${
                  hasBadge 
                    ? 'bg-[var(--duo-gold)]' 
                    : 'bg-[var(--duo-swan)]'
                }`} style={{ boxShadow: hasBadge ? '0 3px 0 var(--duo-gold-dark, #cc8400)' : 'none' }}>
                  {IconComponent && <IconComponent className={`w-6 h-6 ${hasBadge ? 'text-white' : 'text-[var(--duo-hare)]'}`} />}
                </div>
                <h4 className="text-xs font-black text-[var(--duo-eel)] mb-0.5">{badge.name}</h4>
                <p className={`text-[10px] font-bold ${hasBadge ? 'text-[var(--duo-green)] shimmer-text' : 'text-[var(--duo-hare)]'}`} style={hasBadge ? { WebkitTextFillColor: 'var(--duo-green)' } : {}}>
                  {hasBadge ? '✓ Collected' : 'Locked'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sign Out Button */}
      <div className="pt-4 pb-8">
        <button 
          onClick={onLogout}
          className="w-full btn-outline py-3 text-[var(--duo-red)] border-[var(--duo-red)] hover:bg-[rgba(255,75,75,0.1)]"
        >
          Sign Out & Reset
        </button>
      </div>
    </div>
  );
};
