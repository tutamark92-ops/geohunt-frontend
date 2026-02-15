/**
 * Core type definitions for the GeoHunt frontend.
 * These interfaces define the shape of data used throughout the React app.
 */

/** A treasure location on the campus map */
export interface Treasure {
  id: string;
  name: string;
  description: string;
  clue: string;
  latitude: number;
  longitude: number;
  points: number;
  trivia?: string;
  isUnlocked: boolean;
  category: 'academic' | 'social' | 'sports' | 'history';
}

/** Tracks a player's overall game progress */
export interface UserProgress {
  username: string;
  unlockedTreasureIds: string[];
  totalPoints: number;
  badges: string[];
  level: number;
  missionBriefing?: string;
}

/** A single row in the leaderboard rankings */
export interface LeaderboardEntry {
  username: string;
  points: number;
  treasuresFound: number;
}

