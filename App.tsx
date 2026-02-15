/**
 * App — the root component for the GeoHunt campus treasure hunt game.
 * Manages global state for authentication, treasures, user progress,
 * geolocation, leaderboard, and AI-generated content.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MapComponent } from './components/MapComponent';
import { Scanner } from './components/Scanner';
import { AdminPanel } from './components/AdminPanel';
import { ToastContainer, ToastData } from './components/Toast';
import { LeaderboardTab } from './components/LeaderboardTab';
import { ProfileTab } from './components/ProfileTab';
import { FeedbackTab } from './components/FeedbackTab';
import { BADGES } from './constants';
import { Treasure, UserProgress } from './types';
import { generateCampusTrivia, generateMissionBriefing, generateProximityHint } from './services/geminiService';
import { authAPI, treasuresAPI, progressAPI, leaderboardAPI, convertTreasure, LeaderboardEntry } from './services/api';
import { 
  Trophy, MapPin, Lock, Unlock, AlertCircle, 
  User, Award, Zap, Compass, Info, CheckCircle2, X, Settings, Camera, HelpCircle, ChevronRight,
  Navigation, MousePointer2, AlertTriangle, BookOpen, Target, Sparkles, Activity, ShieldCheck,
  Star, Map as MapIcon, Flag, GraduationCap
} from 'lucide-react';

/** Maps badge icon names (from BADGES constant) to their Lucide components */
const BADGE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Compass,
  GraduationCap,
  Star,
  Trophy
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'map' | 'leaderboard' | 'profile' | 'admin'>('map');
  const [username, setUsername] = useState<string>(localStorage.getItem('geohunt_user') || '');
  const [treasures, setTreasures] = useState<Treasure[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(localStorage.getItem('geohunt_admin') === 'true');
  const [userProgress, setUserProgress] = useState<UserProgress>({
    username: '',
    unlockedTreasureIds: [],
    totalPoints: 0,
    badges: [],
    level: 1
  });

  const [selectedTreasure, setSelectedTreasure] = useState<Treasure | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [triviaCache, setTriviaCache] = useState<Record<string, string>>({});
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<GeolocationCoordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [showCompletion, setShowCompletion] = useState(false);


  /**
   * Add a toast notification to the screen.
   * @param {string} message - Text to display in the toast
   * @param {'success'|'error'|'info'} type - Toast style variant
   */
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  /**
   * Remove a toast notification by its ID.
   * @param {string} id - The toast ID to remove
   */
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /** Fetch all treasures from the API on initial mount */
  useEffect(() => {
    const fetchTreasures = async () => {
      try {
        const response = await treasuresAPI.getAll();
        const unlockedIds = userProgress?.unlockedTreasureIds || [];
        setTreasures(response.data.map(t => convertTreasure(t, unlockedIds)));
      } catch (error) {
        console.error('Failed to fetch treasures:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTreasures();
  }, []);

  /** Refresh the leaderboard whenever the player's score changes */
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await leaderboardAPI.get(10);
        setLeaderboard(response.data);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      }
    };
    fetchLeaderboard();
  }, [userProgress.totalPoints]);

  /** Restore the player's progress from the API if they have a valid session */
  useEffect(() => {
    const loadProgress = async () => {
      if (authAPI.isLoggedIn() && username) {
        try {
          const response = await progressAPI.get();
          const prog = response.data;
          setUserProgress({
            username,
            unlockedTreasureIds: prog.unlockedTreasures.map(t => t._id),
            totalPoints: prog.totalPoints,
            badges: prog.badges,
            level: prog.level,
            missionBriefing: prog.missionBriefing
          });
        } catch (error) {
          console.error('Failed to load progress:', error);
        }
      }
    };
    loadProgress();
  }, [username]);

  /** Watch the user's GPS position for live tracking on the map */
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("We couldn't find your GPS. Make sure location is on!");
      return;
    }
    const geoOptions = { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 };
    const watchId = navigator.geolocation.watchPosition(
      (pos) => { 
        setUserLocation(pos.coords); 
        setLocationError(null); 
      },
      (err) => {
        let msg = "Connecting to satellites...";
        if (err.code === 1) msg = "We need your location to play the game!";
        if (!userLocation || err.code === 1) setLocationError(msg);
      },
      geoOptions
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []); // Empty dependency to only run once

  /**
   * Calculate distance between two GPS points using the Haversine formula.
   * @returns {number} Distance in meters
   */
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  /** Get the distance from the user to a specific treasure in meters */
  const getDistanceTo = useCallback((treasure: Treasure) => {
    if (!userLocation) return Infinity;
    return calculateDistance(userLocation.latitude, userLocation.longitude, treasure.latitude, treasure.longitude);
  }, [userLocation]);

  /** Check if the user is within scanning range (50m) of a treasure */
  const isNear = useCallback((treasure: Treasure) => {
    return getDistanceTo(treasure) < 50;
  }, [getDistanceTo]);

  const [newPlayerId, setNewPlayerId] = useState<string | null>(null);
  
  /**
   * Handle new player registration.
   * Creates an account, generates an AI mission briefing, and loads progress.
   */
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('username') as string;
    if (name) {
      setIsLoadingBriefing(true);
      setLoginError('');
      try {
        // Register with just username - backend generates playerId
        const regRes = await authAPI.register(name);
        
        // Show the new playerId to user
        if (regRes.isNewUser && regRes.data.playerId) {
          setNewPlayerId(regRes.data.playerId);
          localStorage.setItem('geohunt_playerId', regRes.data.playerId);
        }
        
        // Check user role from getMe
        const meRes = await authAPI.getMe();
        const userIsAdmin = meRes.data.user?.role === 'admin';
        setIsAdmin(userIsAdmin);
        localStorage.setItem('geohunt_admin', userIsAdmin.toString());
        
        // Generate mission briefing
        const briefing = await generateMissionBriefing(name);
        
        // Update briefing in backend
        await progressAPI.updateBriefing(briefing);
        
        // Load progress from backend
        const progressRes = await progressAPI.get();
        const prog = progressRes.data;
        
        setUserProgress({
          username: name,
          unlockedTreasureIds: prog.unlockedTreasures.map(t => t._id),
          totalPoints: prog.totalPoints,
          badges: prog.badges,
          level: prog.level,
          missionBriefing: briefing
        });
        setUsername(name);
        localStorage.setItem('geohunt_user', name);
      } catch (error: any) {
        setLoginError(error.message || 'Registration failed');
      } finally {
        setIsLoadingBriefing(false);
      }
    }
  };

  /**
   * Handle returning player login via their unique Player ID.
   * Restores their existing session and progress.
   */
  const handleReturnPlayerLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const playerId = formData.get('playerId') as string;
    if (playerId) {
      setIsLoadingBriefing(true);
      setLoginError('');
      try {
        await authAPI.loginWithPlayerId(playerId);
        
        const meRes = await authAPI.getMe();
        const userIsAdmin = meRes.data.user?.role === 'admin';
        setIsAdmin(userIsAdmin);
        localStorage.setItem('geohunt_admin', userIsAdmin.toString());
        
        const name = meRes.data.user.username;
        const prog = meRes.data.progress;
        
        setUserProgress({
          username: name,
          unlockedTreasureIds: prog?.unlockedTreasures?.map((t: any) => t._id) || [],
          totalPoints: prog?.totalPoints || 0,
          badges: prog?.badges || [],
          level: prog?.level || 1,
          missionBriefing: prog?.missionBriefing || ''
        });
        setUsername(name);
        localStorage.setItem('geohunt_user', name);
        localStorage.setItem('geohunt_playerId', playerId);
      } catch (error: any) {
        setLoginError(error.message || 'Player ID not found');
      } finally {
        setIsLoadingBriefing(false);
      }
    }
  };

  /**
   * When a treasure marker is tapped, open its detail modal and fetch AI trivia.
   * Caches trivia to avoid re-generating for the same treasure.
   */
  const handleTreasureClick = async (treasure: Treasure) => {
    setSelectedTreasure(treasure);
    setAiHint(null);
    if (!triviaCache[treasure.id]) {
      const trivia = await generateCampusTrivia(treasure.name, treasure.category);
      setTriviaCache(prev => ({ ...prev, [treasure.id]: trivia }));
    }
  };

  /**
   * Unlock a treasure after successful QR scan.
   * Awards points, checks for badges, and triggers completion if all found.
   * @param {string} id - The treasure ID from the scanned QR code
   */
  const unlockTreasure = async (id: string) => {
    const treasure = treasures.find(t => t.id === id);
    if (treasure && !userProgress.unlockedTreasureIds.includes(id)) {
      try {
        // Unlock via API
        const response = await progressAPI.unlockTreasure(id);
        const prog = response.data;
        
        const newUnlockedIds = prog.unlockedTreasures.map(t => t._id);
        setUserProgress(prev => ({
          ...prev,
          unlockedTreasureIds: newUnlockedIds,
          totalPoints: prog.totalPoints,
          badges: prog.badges,
          level: prog.level
        }));
        
        // Update treasures list to mark as unlocked
        setTreasures(prev => prev.map(t => 
          t.id === id ? { ...t, isUnlocked: true } : t
        ));
        
        setIsScannerOpen(false);
        setSelectedTreasure({ ...treasure, isUnlocked: true });
        addToast(`🎉 Unlocked "${treasure.name}" for +${treasure.points} pts!`, 'success');

        // Check game completion
        if (newUnlockedIds.length === treasures.length && treasures.length > 0) {
          setTimeout(() => setShowCompletion(true), 1200);
        }
      } catch (error: any) {
        console.error('Failed to unlock treasure:', error);
        addToast(error.message || 'Failed to unlock treasure', 'error');
      }
    }
  };

  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showReturnPlayer, setShowReturnPlayer] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  /**
   * Handle admin login with email and password credentials.
   * On success, sets admin flag and loads the admin's progress.
   */
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingBriefing(true);
    setLoginError('');
    try {
      await authAPI.login(adminEmail, adminPassword);
      const meRes = await authAPI.getMe();
      const userIsAdmin = meRes.data.user.role === 'admin';
      setIsAdmin(userIsAdmin);
      localStorage.setItem('geohunt_admin', userIsAdmin.toString());
      
      const name = meRes.data.user.username;
      const prog = meRes.data.progress;
      
      setUserProgress({
        username: name,
        unlockedTreasureIds: prog?.unlockedTreasures?.map((t: any) => t._id) || [],
        totalPoints: prog?.totalPoints || 0,
        badges: prog?.badges || [],
        level: prog?.level || 1,
        missionBriefing: prog?.missionBriefing || 'Welcome, Admin!'
      });
      setUsername(name);
      localStorage.setItem('geohunt_user', name);
    } catch (error: any) {
      setLoginError(error.message || 'Login failed');
    } finally {
      setIsLoadingBriefing(false);
    }
  };

  if (!username) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ background: 'var(--gradient-login)', backgroundSize: '200% 200%', animation: 'gradient-shift 8s ease infinite' }}>
        {/* Floating decorative icons */}
        <div className="float-icon" style={{ top: '10%', left: '8%', animationDelay: '0s', fontSize: '2.5rem' }}>🗺️</div>
        <div className="float-icon" style={{ top: '20%', right: '12%', animationDelay: '1s', fontSize: '2rem' }}>⭐</div>
        <div className="float-icon" style={{ bottom: '25%', left: '15%', animationDelay: '2s', fontSize: '1.8rem' }}>🏆</div>
        <div className="float-icon" style={{ bottom: '15%', right: '10%', animationDelay: '3s', fontSize: '2.2rem' }}>🧭</div>
        <div className="float-icon" style={{ top: '50%', left: '5%', animationDelay: '4s', fontSize: '1.5rem' }}>📍</div>
        <div className="float-icon" style={{ top: '35%', right: '5%', animationDelay: '5s', fontSize: '1.6rem' }}>🎯</div>

        <div className="card-glass p-8 sm:p-10 w-full max-w-md text-center relative z-10" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}>
          {/* Logo */}
          <div className="w-20 h-20 bg-[var(--game-gold)] rounded-2xl flex items-center justify-center mx-auto mb-6 animate-spin-slow" style={{ boxShadow: '0 4px 0 var(--game-gold-dark)' }}>
            <Compass className="w-10 h-10 text-white" style={{ animation: 'none' }} />
          </div>
          
          <h1 className="text-4xl font-black text-[var(--text-dark)] mb-2 tracking-tight">GeoHunt</h1>
          <p className="text-[var(--text-medium)] font-bold uppercase tracking-widest text-xs mb-8">Campus Treasure Explorer</p>
          
          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {loginError}
            </div>
          )}
          
          {showAdminLogin ? (
            <form onSubmit={handleAdminLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-[var(--text-medium)] uppercase tracking-widest mb-2 ml-1">Email</label>
                <input 
                  type="email" 
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  placeholder="admin@geohunt.com" 
                  disabled={isLoadingBriefing}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-medium)] uppercase tracking-widest mb-2 ml-1">Password</label>
                <input 
                  type="password" 
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="••••••••" 
                  disabled={isLoadingBriefing}
                  className="input"
                  required
                />
              </div>
              <button 
                disabled={isLoadingBriefing}
                type="submit"
                className="w-full btn-primary py-4 text-sm flex items-center justify-center gap-3"
              >
                {isLoadingBriefing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Logging In...
                  </>
                ) : (
                  <>
                    Admin Login
                    <Settings className="w-5 h-5" />
                  </>
                )}
              </button>
              <button 
                type="button"
                onClick={() => { setShowAdminLogin(false); setLoginError(''); }}
                className="w-full btn-outline py-3 text-sm"
              >
                Back to Explorer Login
              </button>
            </form>
          ) : newPlayerId ? (
            // Show new player their playerId
            <div className="text-center space-y-4 stagger-in">
              <div className="w-16 h-16 bg-[var(--game-green)] rounded-2xl flex items-center justify-center mx-auto" style={{ boxShadow: '0 4px 0 var(--game-green-dark)' }}>
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black text-[var(--text-dark)]">Welcome, Explorer!</h2>
              <p className="text-[var(--text-medium)]">Your unique Player ID is:</p>
              <div className="shimmer-text text-3xl font-black py-4 px-6 rounded-xl bg-[var(--game-gold)] text-white" style={{ boxShadow: '0 4px 0 var(--game-gold-dark)', WebkitTextFillColor: 'white' }}>
                {newPlayerId}
              </div>
              <p className="text-sm text-[var(--text-light)]">
                📝 Write this down! Use this ID to log back in and continue your adventure.
              </p>
              <button 
                onClick={() => setNewPlayerId(null)}
                className="w-full btn-primary py-4 text-sm flex items-center justify-center gap-3"
              >
                Start My Adventure!
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              {/* Tabs for New/Returning Player */}
              <div className="flex mb-6 bg-[var(--bg-main)] rounded-xl p-1">
                <button
                  onClick={() => setShowReturnPlayer(false)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                    !showReturnPlayer ? 'bg-white text-[var(--text-dark)] shadow-md' : 'text-[var(--text-light)]'
                  }`}
                >
                  New Player
                </button>
                <button
                  onClick={() => setShowReturnPlayer(true)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                    showReturnPlayer ? 'bg-white text-[var(--text-dark)] shadow-md' : 'text-[var(--text-light)]'
                  }`}
                >
                  Returning Player
                </button>
              </div>
              
              {showReturnPlayer ? (
                <form onSubmit={handleReturnPlayerLogin} className="space-y-5 text-left">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-medium)] uppercase tracking-widest mb-2 ml-1">Your Player ID</label>
                    <input 
                      name="playerId"
                      type="text" 
                      placeholder="Ex: sammy1" 
                      disabled={isLoadingBriefing}
                      className="input"
                      required
                    />
                    <p className="text-[10px] text-[var(--text-light)] mt-1 ml-1">Enter the ID you received when you first joined</p>
                  </div>
                  <button 
                    disabled={isLoadingBriefing}
                    type="submit"
                    className="w-full btn-primary py-4 text-sm flex items-center justify-center gap-3"
                  >
                    {isLoadingBriefing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Finding You...
                      </>
                    ) : (
                      <>
                        Continue Adventure
                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-5 text-left">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-medium)] uppercase tracking-widest mb-2 ml-1">Choose Your Nickname</label>
                    <input 
                      name="username"
                      type="text" 
                      placeholder="Ex: SamTheSeeker" 
                      disabled={isLoadingBriefing}
                      className="input"
                      required
                    />
                    <p className="text-[10px] text-[var(--text-light)] mt-1 ml-1">You'll get a unique Player ID to log back in</p>
                  </div>
                  <button 
                    disabled={isLoadingBriefing}
                    type="submit"
                    className="w-full btn-primary py-4 text-sm flex items-center justify-center gap-3"
                  >
                    {isLoadingBriefing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating Your ID...
                      </>
                    ) : (
                      <>
                        Start Exploring
                        <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              )}
              <button 
                onClick={() => setShowAdminLogin(true)}
                className="mt-4 text-xs text-white/60 hover:text-white/80 transition-colors"
              >
                Admin Login →
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  /** Log the user out — clear all auth tokens and reset state */
  const handleLogout = () => {
    authAPI.logout();
    setUsername('');
    setIsAdmin(false);
    setUserProgress({ username: '', unlockedTreasureIds: [], totalPoints: 0, badges: [], level: 1 });
    setActiveTab('map');
    setSelectedTreasure(null);
    localStorage.removeItem('geohunt_admin');
  };

  // Defensive guards for rendering
  const unlockedIds = userProgress?.unlockedTreasureIds || [];
  const nearbyCount = treasures.filter(t => isNear(t) && !unlockedIds.includes(t.id)).length;
  const xpProgress = ((userProgress?.totalPoints || 0) % 250) / 2.5;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-main)] font-sans text-[var(--text-dark)]">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} username={username} isAdmin={isAdmin} onLogout={handleLogout} />

      {locationError && (
        <div className="bg-amber-100 border-b border-amber-200 text-amber-800 px-6 py-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide">
          <AlertCircle className="w-4 h-4" />
          {locationError}
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto mobile-content sm:px-6 sm:py-4">
        {activeTab === 'map' && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
            {/* Compact Status Bar */}
            <div className="card p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Left: Mission */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-[var(--game-blue)] rounded-lg flex items-center justify-center shrink-0" style={{ boxShadow: '0 2px 0 var(--game-blue-dark)' }}>
                    <Flag className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm font-bold text-[var(--text-dark)] truncate">{userProgress.missionBriefing}</p>
                </div>
                
                {/* Right: Stats + Progress Ring */}
                <div className="flex items-center gap-4">
                  {/* Mini Completion Ring */}
                  <div className="relative w-11 h-11">
                    <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border-light)" strokeWidth="4" />
                      <circle cx="22" cy="22" r="18" fill="none" stroke="var(--game-green)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(unlockedIds.length / Math.max(treasures.length, 1)) * 113} 113`} style={{ transition: 'stroke-dasharray 0.5s ease' }} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[var(--game-green)]">{unlockedIds.length}/{treasures.length}</span>
                  </div>
                  <div className="text-center">
                    <span className="badge badge-gold text-[10px]">Lvl {userProgress.level}</span>
                    <p className="text-[9px] font-bold text-[var(--text-light)] mt-1">{userProgress.totalPoints % 250}/250 XP</p>
                  </div>
                  {nearbyCount > 0 && (
                    <div className="badge badge-green text-[10px] flex items-center gap-1 animate-pulse">
                      <Zap className="w-3 h-3" /> {nearbyCount}
                    </div>
                  )}
                </div>
              </div>
              {/* XP Progress */}
              <div className="progress-bar mt-3 h-2">
                <div className="progress-fill-green h-full" style={{ width: `${xpProgress}%` }} />
              </div>
            </div>

            {/* Map Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-[var(--text-dark)] flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-[var(--game-blue)]" /> Adventure Map
              </h2>
            </div>

            <div className="rounded-xl sm:rounded-2xl overflow-hidden mobile-full">
              <MapComponent 
                treasures={treasures} 
                unlockedIds={unlockedIds} 
                onTreasureClick={handleTreasureClick}
                userLocation={userLocation}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 stagger-in">
              {treasures.map((treasure) => {
                const isUnlocked = unlockedIds.includes(treasure.id);
                const near = isNear(treasure);
                const dist = getDistanceTo(treasure);
                const catEmoji = treasure.category === 'academic' ? '📚' : treasure.category === 'social' ? '🎭' : treasure.category === 'sports' ? '⚽' : '🏛️';
                const catClass = `cat-${treasure.category}`;
                
                return (
                  <div 
                    key={treasure.id}
                    onClick={() => handleTreasureClick(treasure)}
                    className={`group p-4 sm:p-5 transition-all cursor-pointer scale-press card ${
                      isUnlocked 
                        ? 'card-success opacity-90' 
                        : near 
                          ? 'card-highlight' 
                          : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3 sm:gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg ${
                          isUnlocked 
                            ? 'bg-[var(--duo-green)] text-white' 
                            : near 
                              ? catClass + ' text-white' 
                              : 'bg-[var(--duo-swan)] text-[var(--duo-hare)]'
                        }`} style={{ boxShadow: isUnlocked ? '0 4px 0 var(--duo-green-dark)' : near ? '0 4px 0 rgba(0,0,0,0.15)' : 'none' }}>
                          {isUnlocked ? <CheckCircle2 className="w-6 h-6" /> : <span>{catEmoji}</span>}
                        </div>
                        <div>
                          <h4 className="font-black text-[var(--duo-eel)] text-base mb-1">{treasure.name}</h4>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isUnlocked ? 'bg-[rgba(88,204,2,0.15)] text-[var(--duo-green)]' : 'bg-[var(--duo-swan)] text-[var(--duo-hare)]'
                            }`}>{treasure.category}</span>
                            {!isUnlocked && (
                              <span className={`text-[10px] font-bold ${near ? 'text-[var(--duo-green)]' : 'text-[var(--duo-hare)]'}`}>
                                {near ? '✓ Ready!' : dist === Infinity ? '...' : `${(dist / 1000).toFixed(1)}km`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-black ${isUnlocked ? 'text-[var(--duo-green)]' : 'text-[var(--duo-blue)]'}`}>+{treasure.points}</span>
                        <p className="text-[9px] font-bold text-[var(--duo-hare)] uppercase">XP</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardTab leaderboard={leaderboard} currentUsername={userProgress.username} />
        )}

        {activeTab === 'profile' && (
          <ProfileTab username={username} userProgress={userProgress} onLogout={handleLogout} />
        )}

        {activeTab === 'feedback' && (
          <FeedbackTab addToast={addToast} />
        )}

        {activeTab === 'admin' && <AdminPanel />}
      </main>

      {/* Discovery Modal */}
      {selectedTreasure && (
        <div 
          className="fixed inset-0 z-[2000] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-6"
          onClick={(e) => e.target === e.currentTarget && setSelectedTreasure(null)}
        >
          <div className="card w-full sm:max-w-lg max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 rounded-t-3xl sm:rounded-2xl">
            {/* Header — category gradient */}
            <div className={`sticky top-0 p-4 flex items-center justify-between z-10 rounded-t-3xl sm:rounded-t-2xl cat-${selectedTreasure.category}`} style={{ color: 'white' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur text-lg">
                  {userProgress.unlockedTreasureIds.includes(selectedTreasure.id) 
                    ? <CheckCircle2 className="w-5 h-5 text-white" /> 
                    : <span>{selectedTreasure.category === 'academic' ? '📚' : selectedTreasure.category === 'social' ? '🎭' : selectedTreasure.category === 'sports' ? '⚽' : '🏛️'}</span>}
                </div>
                <div>
                  <h3 className="text-lg font-black leading-tight">{selectedTreasure.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[8px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">{selectedTreasure.category}</span>
                    <span className="text-xs font-bold opacity-90">+{selectedTreasure.points} XP</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTreasure(null)} 
                className="p-2 hover:bg-white/20 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Clue Section */}
              <div className="bg-[var(--duo-polar)] border-2 border-[var(--duo-swan)] p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <HelpCircle className="w-4 h-4 text-[var(--duo-blue)]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--duo-wolf)]">The Clue</span>
                </div>
                <p className="text-[var(--duo-eel)] text-base font-bold leading-relaxed">"{selectedTreasure.clue}"</p>
                
                {!userProgress.unlockedTreasureIds.includes(selectedTreasure.id) && (
                  <button 
                    onClick={async () => {
                      setAiHint("Thinking...");
                      const hint = await generateProximityHint(selectedTreasure.name, selectedTreasure.clue);
                      setAiHint(hint);
                    }}
                    disabled={aiHint === "Thinking..."}
                    className="mt-3 btn-outline py-2 px-4 text-xs flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {aiHint && aiHint !== "Thinking..." ? 'Get Another Hint' : aiHint === "Thinking..." ? 'Thinking...' : 'Get AI Hint'}
                  </button>
                )}
              </div>

              {/* AI Hint */}
              {aiHint && aiHint !== "Thinking..." && !userProgress.unlockedTreasureIds.includes(selectedTreasure.id) && (
                <div className="bg-[#fff3cd] border-2 border-[#ffc107] p-4 rounded-xl animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-[#ffc107] shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-[#856404] leading-relaxed">{aiHint}</p>
                  </div>
                </div>
              )}

              {/* Status Section */}
              {userProgress.unlockedTreasureIds.includes(selectedTreasure.id) ? (
                <div className="space-y-3">
                  {/* Success Banner */}
                  <div className="bg-[rgba(88,204,2,0.1)] border-2 border-[var(--duo-green)] p-4 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="icon-box w-10 h-10 shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-[var(--duo-green)] font-black text-sm mb-1">✨ Collected!</h4>
                        <p className="text-sm text-[var(--duo-eel)] leading-relaxed">{selectedTreasure.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Trivia */}
                  {triviaCache[selectedTreasure.id] && (
                    <div className="bg-[var(--duo-polar)] border-2 border-[var(--duo-swan)] p-4 rounded-xl">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-[var(--duo-blue)] shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--duo-wolf)]">Did you know?</span>
                          <p className="text-sm text-[var(--duo-eel)] leading-relaxed mt-1">{triviaCache[selectedTreasure.id]}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Distance/Status Indicator */
                <div className={`p-4 rounded-xl border-2 ${
                  isNear(selectedTreasure) 
                    ? 'bg-[rgba(88,204,2,0.1)] border-[var(--duo-green)]' 
                    : 'bg-[var(--duo-polar)] border-[var(--duo-swan)]'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isNear(selectedTreasure) ? 'bg-[var(--duo-green)]' : 'bg-[var(--duo-swan)]'
                    }`} style={{ boxShadow: isNear(selectedTreasure) ? '0 3px 0 var(--duo-green-dark)' : 'none' }}>
                      <Navigation className={`w-5 h-5 ${isNear(selectedTreasure) ? 'text-white' : 'text-[var(--duo-hare)]'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${
                        isNear(selectedTreasure) ? 'text-[var(--duo-green)]' : 'text-[var(--duo-hare)]'
                      }`}>
                        {isNear(selectedTreasure) ? '✓ You\'re Here!' : 'Distance'}
                      </p>
                      <p className={`text-sm font-bold ${isNear(selectedTreasure) ? 'text-[var(--duo-eel)]' : 'text-[var(--duo-wolf)]'}`}>
                        {isNear(selectedTreasure) 
                          ? 'Ready to scan and collect!' 
                          : userLocation 
                            ? `${(getDistanceTo(selectedTreasure) / 1000).toFixed(1)} km away` 
                            : 'Getting location...'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            {!userProgress.unlockedTreasureIds.includes(selectedTreasure.id) && (
              <div className="p-5 pt-0">
                <button 
                  onClick={() => setIsScannerOpen(true)}
                  disabled={!isNear(selectedTreasure)}
                  className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                    isNear(selectedTreasure) 
                      ? 'btn-primary' 
                      : 'bg-[var(--duo-swan)] text-[var(--duo-hare)] cursor-not-allowed'
                  }`}
                >
                  <Camera className="w-5 h-5" />
                  {isNear(selectedTreasure) ? 'Scan & Collect' : 'Get Closer to Scan'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isScannerOpen && selectedTreasure && (
        <Scanner targetId={selectedTreasure.id} onScan={unlockTreasure} onClose={() => setIsScannerOpen(false)} />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Game Completion Celebration */}
      {showCompletion && (
        <div className="fixed inset-0 bg-black/60 z-[9998] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="card p-8 max-w-sm w-full text-center space-y-5 animate-bounce-subtle stagger-in">
            <div className="text-6xl">🏆</div>
            <h2 className="text-2xl font-black text-[var(--duo-gold)]">Campus Master!</h2>
            <p className="text-[var(--duo-eel)] font-bold text-sm">
              You've discovered all {treasures.length} treasures!
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--duo-polar)] rounded-xl p-3">
                <p className="text-2xl font-black text-[var(--duo-blue)]">{userProgress.totalPoints}</p>
                <p className="text-[9px] font-bold text-[var(--duo-hare)] uppercase">Total Points</p>
              </div>
              <div className="bg-[var(--duo-polar)] rounded-xl p-3">
                <p className="text-2xl font-black text-[var(--duo-green)]">Lvl {userProgress.level}</p>
                <p className="text-[9px] font-bold text-[var(--duo-hare)] uppercase">Level</p>
              </div>
            </div>
            {userProgress.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {userProgress.badges.map(b => {
                  const badge = BADGES.find(bb => bb.id === b);
                  return badge ? (
                    <span key={b} className="badge badge-gold text-[10px]">
                      {badge.name}
                    </span>
                  ) : null;
                })}
              </div>
            )}
            <button 
              onClick={() => setShowCompletion(false)}
              className="btn-primary w-full py-4 text-sm"
            >
              Continue Exploring
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default App;
