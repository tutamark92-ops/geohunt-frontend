/**
 * Leaderboard Tab — displays the top explorers ranked by total XP.
 * Shows a medal-style ranking list with gold/silver/bronze for the top 3,
 * highlights the current user, and shows their personal ranking position.
 * Falls back to demo data if no real leaderboard data is available yet.
 */

import React from 'react';
import { Trophy } from 'lucide-react';

/** Shape of a leaderboard entry */
interface LeaderboardEntry {
  rank?: number;
  username: string;
  points: number;
  treasuresFound: number;
  level?: number;
  badges?: string[];
}

/** Props for the LeaderboardTab component */
interface LeaderboardTabProps {
  leaderboard: LeaderboardEntry[];
  currentUsername: string;
}

/**
 * Renders the full leaderboard view with ranked player list.
 * @param {LeaderboardEntry[]} leaderboard     - Array of ranked players from the API
 * @param {string}             currentUsername  - The logged-in player's name (to highlight "You")
 */
export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({ leaderboard, currentUsername }) => {
  // Fall back to demo data if no real entries exist yet
  const entries = leaderboard.length > 0 ? leaderboard : [
    { rank: 1, username: 'DaisyQuest', points: 650, treasuresFound: 5, level: 3, badges: [] },
    { rank: 2, username: 'RiverGuide', points: 480, treasuresFound: 4, level: 2, badges: [] },
    { rank: 3, username: 'SunnyHunter', points: 310, treasuresFound: 2, level: 2, badges: [] }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center">
        <div className="icon-box icon-box-gold w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4">
          <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-[var(--duo-eel)] mb-1">Top Explorers</h2>
        <p className="text-[var(--duo-hare)] font-bold text-[10px] sm:text-xs uppercase tracking-wide">Campus treasure hunters</p>
      </div>
      
      {/* Rankings List */}
      <div className="card overflow-hidden">
        {entries.map((entry, idx) => {
          const isMe = entry.username === currentUsername;
          return (
            <div 
              key={idx} 
              className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 border-b-2 border-[var(--duo-polar)] last:border-0 ${
                isMe ? 'bg-[rgba(28,176,246,0.08)]' : ''
              }`}
            >
              {/* Rank badge — gold, silver, bronze for top 3 */}
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-sm sm:text-base shrink-0 ${
                idx === 0 
                  ? 'bg-[var(--duo-gold)] text-white' 
                  : idx === 1 
                    ? 'bg-[#C0C0C0] text-white' 
                    : idx === 2 
                      ? 'bg-[#CD7F32] text-white' 
                      : 'bg-[var(--duo-swan)] text-[var(--duo-hare)]'
              }`} style={{ boxShadow: idx < 3 ? '0 3px 0 rgba(0,0,0,0.2)' : 'none' }}>
                {idx === 0 ? '👑' : `#${idx + 1}`}
              </div>
              
              {/* Player name and treasure count */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-[var(--duo-eel)] text-sm sm:text-base truncate">{entry.username}</h4>
                  {isMe && (
                    <span className="badge badge-blue text-[8px] shrink-0">You</span>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-[var(--duo-hare)]">{entry.treasuresFound} secrets found</p>
              </div>
              
              {/* XP score */}
              <div className="text-right shrink-0">
                <span className={`font-black text-lg sm:text-xl ${idx === 0 ? 'text-[var(--duo-gold)]' : 'text-[var(--duo-blue)]'}`}>
                  {entry.points}
                </span>
                <p className="text-[9px] sm:text-[10px] font-bold text-[var(--duo-hare)] uppercase">XP</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Your Position — shows where the current player ranks */}
      <div className="card p-4 text-center">
        <p className="text-xs font-bold text-[var(--duo-wolf)] uppercase tracking-wide mb-1">Your Ranking</p>
        <p className="text-2xl font-black text-[var(--duo-blue)]">
          #{leaderboard.length > 0 
            ? (leaderboard.findIndex(e => e.username === currentUsername) + 1) || '-'
            : '-'}
          <span className="text-sm text-[var(--duo-hare)] ml-1">of {leaderboard.length || '-'}</span>
        </p>
      </div>
    </div>
  );
};
