
/**
 * API Service Layer — handles all communication with the GeoHunt backend.
 * Manages JWT tokens, provides typed request helpers, and organizes endpoints
 * into logical groups (auth, treasures, progress, leaderboard, admin).
 */

/** Base URL for all API requests — relative path in production (proxied by Netlify), absolute in dev */
const API_BASE = (import.meta as any).env?.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5001/api' : '/api');

// ─── Token Management ───────────────────────────────────────────────────────

/** Retrieve the stored JWT token from local storage */
const getToken = (): string | null => localStorage.getItem('geohunt_token');

/** Save a JWT token to local storage after login/register */
const setToken = (token: string): void => localStorage.setItem('geohunt_token', token);

/** Remove the JWT token from local storage on logout */
const clearToken = (): void => localStorage.removeItem('geohunt_token');

// ─── Core Request Helper ────────────────────────────────────────────────────

/**
 * Make an authenticated API request.
 * Automatically attaches the JWT token (if available) and handles error responses.
 * @param   {string}      endpoint - The API path (e.g., '/auth/register')
 * @param   {RequestInit}  options  - Fetch options (method, body, etc.)
 * @returns {Promise<T>}  The parsed JSON response
 * @throws  {Error}        If the server returns a non-OK status
 */
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// ─── Type Definitions ───────────────────────────────────────────────────────

/** Shape of a treasure as returned by the API */
export interface TreasureFromAPI {
  _id: string;
  name: string;
  description: string;
  clue: string;
  latitude: number;
  longitude: number;
  points: number;
  trivia?: string;
  category: 'academic' | 'social' | 'sports' | 'history';
}

/** Shape of a player's progress as returned by the API */
export interface ProgressFromAPI {
  _id: string;
  user: string;
  unlockedTreasures: TreasureFromAPI[];
  totalPoints: number;
  badges: string[];
  level: number;
  missionBriefing?: string;
}

/** A single entry in the leaderboard ranking */
export interface LeaderboardEntry {
  rank: number;
  username: string;
  points: number;
  treasuresFound: number;
  level: number;
  badges: string[];
}

/** Response from the register and login endpoints */
export interface AuthResponse {
  success: boolean;
  token: string;
  isNewUser?: boolean;
  message?: string;
  data: {
    id: string;
    username: string;
    email?: string;
    playerId?: string;
    playerNumber?: number;
  };
}

// ─── Auth API ───────────────────────────────────────────────────────────────

/** Authentication endpoints — register, login, session management */
export const authAPI = {
  /**
   * Register a new player with just a username.
   * Returns a JWT token and the player's unique Player ID.
   * @param {string} username - The display name the player wants
   */
  register: async (username: string): Promise<AuthResponse> => {
    const response = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
    setToken(response.token);
    return response;
  },

  /**
   * Admin login with email and password.
   * Used for accessing the admin dashboard.
   * @param {string} email    - Admin email address
   * @param {string} password - Admin password
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(response.token);
    return response;
  },

  /**
   * Player login with their unique Player ID (e.g., "aaron42").
   * The simpler login flow for returning players.
   * @param {string} playerId - The player's unique identifier
   */
  loginWithPlayerId: async (playerId: string): Promise<AuthResponse> => {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    });
    setToken(response.token);
    return response;
  },

  /** Fetch the currently authenticated user's profile and progress */
  getMe: async (): Promise<{ success: boolean; data: { user: any; progress: ProgressFromAPI } }> => {
    return apiRequest('/auth/me');
  },

  /** Clear all stored auth data and log the user out */
  logout: (): void => {
    clearToken();
    localStorage.removeItem('geohunt_user');
    localStorage.removeItem('geohunt_playerId');
  },

  /** Check if a user is currently logged in (has a stored token) */
  isLoggedIn: (): boolean => {
    return !!getToken();
  }
};

// ─── Treasures API ──────────────────────────────────────────────────────────

/** Public treasure endpoints — fetching map data */
export const treasuresAPI = {
  /** Get all treasures for rendering on the map */
  getAll: async (): Promise<{ success: boolean; count: number; data: TreasureFromAPI[] }> => {
    return apiRequest('/treasures');
  },

  /**
   * Get a single treasure's full details.
   * @param {string} id - The treasure's MongoDB ObjectId
   */
  getOne: async (id: string): Promise<{ success: boolean; data: TreasureFromAPI }> => {
    return apiRequest(`/treasures/${id}`);
  }
};

// ─── Progress API ───────────────────────────────────────────────────────────

/** Player progress endpoints — tracking and unlocking */
export const progressAPI = {
  /** Get the current player's full game progress */
  get: async (): Promise<{ success: boolean; data: ProgressFromAPI }> => {
    return apiRequest('/progress');
  },

  /**
   * Unlock a treasure after scanning its QR code.
   * Awards points and may trigger badge achievements.
   * @param {string} treasureId - The ID embedded in the QR code
   */
  unlockTreasure: async (treasureId: string): Promise<{ 
    success: boolean; 
    data: ProgressFromAPI; 
    message: string;
  }> => {
    return apiRequest(`/progress/unlock/${treasureId}`, {
      method: 'POST',
    });
  },

  /**
   * Save the AI-generated mission briefing for the player.
   * @param {string} missionBriefing - The Gemini-generated welcome text
   */
  updateBriefing: async (missionBriefing: string): Promise<{ success: boolean; data: ProgressFromAPI }> => {
    return apiRequest('/progress/briefing', {
      method: 'PUT',
      body: JSON.stringify({ missionBriefing }),
    });
  }
};

// ─── Leaderboard API ────────────────────────────────────────────────────────

/** Leaderboard endpoint — player rankings */
export const leaderboardAPI = {
  /**
   * Fetch the top players ranked by total points.
   * @param {number} [limit=10] - Number of players to return
   */
  get: async (limit: number = 10): Promise<{ success: boolean; count: number; data: LeaderboardEntry[] }> => {
    return apiRequest(`/leaderboard?limit=${limit}`);
  }
};

// ─── Data Conversion ────────────────────────────────────────────────────────

/**
 * Convert an API treasure object to the frontend's Treasure type.
 * Maps `_id` to `id` and adds the `isUnlocked` boolean based on the player's progress.
 * @param {TreasureFromAPI} apiTreasure - The raw treasure from the API
 * @param {string[]}        unlockedIds - IDs the current player has unlocked
 * @returns {Treasure}      Frontend-ready treasure object
 */
export const convertTreasure = (apiTreasure: TreasureFromAPI, unlockedIds: string[]): import('../types').Treasure => ({
  id: apiTreasure._id,
  name: apiTreasure.name,
  description: apiTreasure.description,
  clue: apiTreasure.clue,
  latitude: apiTreasure.latitude,
  longitude: apiTreasure.longitude,
  points: apiTreasure.points,
  trivia: apiTreasure.trivia,
  category: apiTreasure.category,
  isUnlocked: unlockedIds.includes(apiTreasure._id),
});

// ─── Admin Types ────────────────────────────────────────────────────────────

/** Dashboard statistics returned by the admin stats endpoint */
export interface AdminStats {
  users: {
    total: number;
    admins: number;
    regular: number;
  };
  treasures: {
    total: number;
    byCategory: { _id: string; count: number; totalPoints: number }[];
  };
  activity: {
    totalUnlocks: number;
    totalPointsEarned: number;
    averageLevel: number;
  };
  topHunters: {
    username: string;
    points: number;
    level: number;
    treasures: number;
  }[];
  recentUsers: {
    _id: string;
    username: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
}

/** A user as seen from the admin panel */
export interface UserFromAPI {
  _id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

/** Input shape for creating or updating a treasure from the admin panel */
export interface TreasureInput {
  name: string;
  description: string;
  clue: string;
  latitude: number;
  longitude: number;
  points: number;
  category: 'academic' | 'social' | 'sports' | 'history';
  trivia?: string;
}

// ─── Admin API ──────────────────────────────────────────────────────────────

/** Admin-only endpoints — manage users, treasures, and view dashboard stats */
export const adminAPI = {
  /** Get the full admin dashboard statistics overview */
  getStats: async (): Promise<{ success: boolean; data: AdminStats }> => {
    return apiRequest('/admin/stats');
  },

  /** Get all registered users (passwords excluded) */
  getUsers: async (): Promise<{ success: boolean; count: number; data: UserFromAPI[] }> => {
    return apiRequest('/admin/users');
  },

  /**
   * Get a specific user's profile and game progress.
   * @param {string} id - The user's MongoDB ObjectId
   */
  getUser: async (id: string): Promise<{ success: boolean; data: { user: UserFromAPI; progress: ProgressFromAPI } }> => {
    return apiRequest(`/admin/users/${id}`);
  },

  /**
   * Change a user's role between 'user' and 'admin'.
   * @param {string} id   - The user's MongoDB ObjectId
   * @param {string} role - The new role to assign
   */
  updateUserRole: async (id: string, role: 'user' | 'admin'): Promise<{ success: boolean; data: UserFromAPI }> => {
    return apiRequest(`/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  /**
   * Permanently delete a user and their progress.
   * @param {string} id - The user's MongoDB ObjectId
   */
  deleteUser: async (id: string): Promise<{ success: boolean }> => {
    return apiRequest(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Reset a player's progress back to zero (keeps their account).
   * @param {string} id - The user's MongoDB ObjectId
   */
  resetUserProgress: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiRequest(`/admin/users/${id}/reset`, {
      method: 'POST',
    });
  },

  /**
   * Add a new treasure location to the map.
   * @param {TreasureInput} treasure - The treasure data to create
   */
  createTreasure: async (treasure: TreasureInput): Promise<{ success: boolean; data: TreasureFromAPI }> => {
    return apiRequest('/admin/treasures', {
      method: 'POST',
      body: JSON.stringify(treasure),
    });
  },

  /**
   * Update an existing treasure's details.
   * @param {string}                id       - The treasure's MongoDB ObjectId
   * @param {Partial<TreasureInput>} treasure - The fields to update
   */
  updateTreasure: async (id: string, treasure: Partial<TreasureInput>): Promise<{ success: boolean; data: TreasureFromAPI }> => {
    return apiRequest(`/admin/treasures/${id}`, {
      method: 'PUT',
      body: JSON.stringify(treasure),
    });
  },

  /**
   * Remove a treasure from the game.
   * @param {string} id - The treasure's MongoDB ObjectId
   */
  deleteTreasure: async (id: string): Promise<{ success: boolean }> => {
    return apiRequest(`/admin/treasures/${id}`, {
      method: 'DELETE',
    });
  },
};

// ─── Feedback Types ─────────────────────────────────────────────────────────

/** Shape of a feedback entry as returned by the API */
export interface FeedbackFromAPI {
  _id: string;
  user: { _id: string; username: string; email?: string } | string;
  type: 'bug' | 'suggestion' | 'general';
  message: string;
  rating?: number;
  createdAt: string;
}

// ─── Feedback API ───────────────────────────────────────────────────────────

/** Feedback endpoints — players submit, admins view all */
export const feedbackAPI = {
  /**
   * Submit new feedback.
   * @param {object} data - The feedback data (type, message, optional rating)
   */
  submit: async (data: { type: string; message: string; rating?: number }): Promise<{ success: boolean; data: FeedbackFromAPI }> => {
    return apiRequest('/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Get the current player's own feedback history */
  getMine: async (): Promise<{ success: boolean; count: number; data: FeedbackFromAPI[] }> => {
    return apiRequest('/feedback/mine');
  },

  /** Admin: get all feedback from all users */
  getAll: async (): Promise<{ success: boolean; count: number; data: FeedbackFromAPI[] }> => {
    return apiRequest('/feedback');
  },
};
