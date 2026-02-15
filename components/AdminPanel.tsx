/**
 * Admin Panel — dashboard for managing the GeoHunt game.
 * Provides three tabs:
 *   - Stats: overview of players, treasures, and game activity
 *   - Treasures: CRUD management with QR code printing
 *   - Users: role management, progress reset, and user deletion
 * Only accessible to users with the 'admin' role.
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, Plus, MapPin, Users, BarChart3, Trash2, Edit2, 
  Crown, RefreshCw, X, Save, AlertCircle, CheckCircle2, Loader2, Printer, QrCode, MessageSquare, Star, Bug, Lightbulb, MessageCircle
} from 'lucide-react';
import { adminAPI, treasuresAPI, feedbackAPI, TreasureFromAPI, AdminStats, UserFromAPI, TreasureInput, FeedbackFromAPI } from '../services/api';

/** Available admin dashboard tabs */
type Tab = 'stats' | 'treasures' | 'users' | 'feedback';

/** Form data shape for creating/editing a treasure (values are strings for form inputs) */
interface TreasureFormData {
  name: string;
  description: string;
  clue: string;
  latitude: string;
  longitude: string;
  points: string;
  category: 'academic' | 'social' | 'sports' | 'history';
}

/** Blank form state for the "New Treasure" form */
const emptyTreasure: TreasureFormData = {
  name: '',
  description: '',
  clue: '',
  latitude: '',
  longitude: '',
  points: '',
  category: 'academic'
};

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [treasures, setTreasures] = useState<TreasureFromAPI[]>([]);
  const [users, setUsers] = useState<UserFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackFromAPI[]>([]);
  
  // Treasure form state
  const [showTreasureForm, setShowTreasureForm] = useState(false);
  const [editingTreasure, setEditingTreasure] = useState<string | null>(null);
  const [treasureForm, setTreasureForm] = useState<TreasureFormData>(emptyTreasure);
  const [formLoading, setFormLoading] = useState(false);

  // Print QR modal state
  const [printTreasure, setPrintTreasure] = useState<TreasureFromAPI | null>(null);

  // Load data based on active tab
  useEffect(() => {
    loadData();
  }, [activeTab]);

  /**
   * Load data for the currently active tab from the API.
   * Fetches stats, treasures, or users depending on which tab is selected.
   */
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'stats') {
        const response = await adminAPI.getStats();
        setStats(response.data);
      } else if (activeTab === 'treasures') {
        const response = await treasuresAPI.getAll();
        setTreasures(response.data);
      } else if (activeTab === 'users') {
        const response = await adminAPI.getUsers();
        setUsers(response.data);
      } else if (activeTab === 'feedback') {
        const response = await feedbackAPI.getAll();
        setFeedback(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Display a success or error message that auto-clears after 3 seconds.
   * @param {string}  msg     - The message text to display
   * @param {boolean} isError - If true, shows as error; otherwise as success
   */
  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
    }
    setTimeout(() => { setError(null); setSuccess(null); }, 3000);
  };

  /** Open the treasure form in "create new" mode with empty fields */
  const handleCreateTreasure = () => {
    setTreasureForm(emptyTreasure);
    setEditingTreasure(null);
    setShowTreasureForm(true);
  };

  /** Open the treasure form in "edit" mode, pre-populated with existing data */
  const handleEditTreasure = (treasure: TreasureFromAPI) => {
    setTreasureForm({
      name: treasure.name,
      description: treasure.description,
      clue: treasure.clue,
      latitude: treasure.latitude.toString(),
      longitude: treasure.longitude.toString(),
      points: treasure.points.toString(),
      category: treasure.category
    });
    setEditingTreasure(treasure._id);
    setShowTreasureForm(true);
  };

  /** Save the treasure form — creates a new treasure or updates an existing one */
  const handleSaveTreasure = async () => {
    setFormLoading(true);
    try {
      const treasureData: TreasureInput = {
        name: treasureForm.name,
        description: treasureForm.description,
        clue: treasureForm.clue,
        latitude: parseFloat(treasureForm.latitude),
        longitude: parseFloat(treasureForm.longitude),
        points: parseInt(treasureForm.points),
        category: treasureForm.category
      };

      if (editingTreasure) {
        await adminAPI.updateTreasure(editingTreasure, treasureData);
        showMessage('Treasure updated successfully!');
      } else {
        await adminAPI.createTreasure(treasureData);
        showMessage('Treasure created successfully!');
      }
      
      setShowTreasureForm(false);
      loadData();
    } catch (err: any) {
      showMessage(err.message || 'Failed to save treasure', true);
    } finally {
      setFormLoading(false);
    }
  };

  /** Delete a treasure after confirmation prompt */
  const handleDeleteTreasure = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await adminAPI.deleteTreasure(id);
      showMessage('Treasure deleted');
      loadData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  /** Toggle a user's role between 'user' and 'admin' */
  const handleToggleRole = async (user: UserFromAPI) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await adminAPI.updateUserRole(user._id, newRole);
      showMessage(`${user.username} is now ${newRole}`);
      loadData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  /** Permanently delete a user after confirmation prompt */
  const handleDeleteUser = async (user: UserFromAPI) => {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    try {
      await adminAPI.deleteUser(user._id);
      showMessage('User deleted');
      loadData();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  /** Reset a player's progress back to zero (keeps their account) */
  const handleResetProgress = async (user: UserFromAPI) => {
    if (!confirm(`Reset all progress for "${user.username}"?`)) return;
    try {
      await adminAPI.resetUserProgress(user._id);
      showMessage(`Progress reset for ${user.username}`);
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const tabs = [
    { id: 'stats' as Tab, label: 'Dashboard', icon: BarChart3 },
    { id: 'treasures' as Tab, label: 'Treasures', icon: MapPin },
    { id: 'users' as Tab, label: 'Users', icon: Users },
    { id: 'feedback' as Tab, label: 'Feedback', icon: MessageSquare },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center" style={{ boxShadow: '0 3px 0 #7c3aed' }}>
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[var(--duo-eel)]">Admin Dashboard</h2>
              <p className="text-xs text-[var(--duo-hare)]">Manage treasures, users, and view analytics</p>
            </div>
          </div>
          <button onClick={loadData} className="btn-outline px-3 py-2 text-xs flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b-2 border-[var(--duo-swan)]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all border-b-2 -mb-[2px] ${
                activeTab === tab.id 
                  ? 'text-[var(--duo-blue)] border-[var(--duo-blue)]' 
                  : 'text-[var(--duo-hare)] border-transparent hover:text-[var(--duo-wolf)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 p-3 rounded-xl flex items-center gap-2 text-red-700 text-sm font-medium">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border-2 border-green-200 p-3 rounded-xl flex items-center gap-2 text-green-700 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" />
          {success}
        </div>
      )}

      {loading ? (
        <div className="card p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--duo-blue)]" />
        </div>
      ) : (
        <>
          {/* Stats Tab */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="card p-4 text-center">
                  <p className="text-2xl font-black text-[var(--duo-blue)]">{stats.users.total}</p>
                  <p className="text-[10px] font-bold text-[var(--duo-hare)] uppercase">Total Users</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-black text-purple-600">{stats.users.admins}</p>
                  <p className="text-[10px] font-bold text-[var(--duo-hare)] uppercase">Admins</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-black text-[var(--duo-green)]">{stats.treasures.total}</p>
                  <p className="text-[10px] font-bold text-[var(--duo-hare)] uppercase">Treasures</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-black text-[var(--duo-gold)]">{stats.activity.totalUnlocks}</p>
                  <p className="text-[10px] font-bold text-[var(--duo-hare)] uppercase">Unlocks</p>
                </div>
              </div>

              {/* Top Hunters */}
              <div className="card p-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-[var(--duo-eel)] mb-3">Top Hunters</h3>
                <div className="space-y-2">
                  {stats.topHunters.map((hunter, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-[var(--duo-swan)] last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                          idx === 0 ? 'bg-[var(--duo-gold)] text-white' : 'bg-[var(--duo-swan)] text-[var(--duo-hare)]'
                        }`}>{idx + 1}</span>
                        <span className="font-bold text-[var(--duo-eel)]">{hunter.username}</span>
                      </div>
                      <span className="font-black text-[var(--duo-blue)]">{hunter.points} XP</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Treasures by Category */}
              <div className="card p-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-[var(--duo-eel)] mb-3">Treasures by Category</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {stats.treasures.byCategory.map(cat => (
                    <div key={cat._id} className="p-3 bg-[var(--duo-polar)] rounded-lg text-center">
                      <p className="text-lg font-black text-[var(--duo-eel)]">{cat.count}</p>
                      <p className="text-[9px] font-bold text-[var(--duo-hare)] uppercase">{cat._id}</p>
                      <p className="text-[10px] text-[var(--duo-wolf)]">{cat.totalPoints} pts</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Treasures Tab */}
          {activeTab === 'treasures' && (
            <div className="space-y-4">
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      const qrCards = treasures.map(t => `
                        <div class="card">
                          <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`geohunt:${t._id}`)}" alt="QR Code" />
                          <h1 class="title">${t.name}</h1>
                          <p class="meta">${t.category} • ${t.points} pts</p>
                          <div class="footer">
                            <p class="footer-title">Scan to unlock!</p>
                            <p class="footer-sub">GeoHunt Campus Treasure</p>
                          </div>
                        </div>
                      `).join('');
                      
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>GeoHunt - All QR Codes</title>
                            <style>
                              body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; }
                              .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
                              .card { border: 4px dashed #e5e5e5; border-radius: 16px; padding: 24px; text-align: center; break-inside: avoid; }
                              .qr { width: 160px; height: 160px; margin: 0 auto 12px; }
                              .title { font-size: 18px; font-weight: 900; color: #4b4b4b; margin: 0 0 4px; }
                              .meta { font-size: 10px; font-weight: 700; color: #afafaf; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 12px; }
                              .footer { background: #f7f7f7; border-radius: 8px; padding: 8px; }
                              .footer-title { font-size: 9px; font-weight: 700; color: #777; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 2px; }
                              .footer-sub { font-size: 10px; color: #afafaf; margin: 0; }
                              @media print { body { padding: 10px; } .card { page-break-inside: avoid; } }
                            </style>
                          </head>
                          <body>
                            <h1 style="text-align:center;margin:0 0 20px;font-size:24px;">GeoHunt Location QR Codes</h1>
                            <div class="grid">${qrCards}</div>
                            <script>window.onload = function() { setTimeout(() => window.print(), 500); }</script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }
                  }}
                  className="btn-outline px-4 py-2 text-sm flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print All QR Codes
                </button>
                <button onClick={handleCreateTreasure} className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Treasure
                </button>
              </div>

              <div className="card overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-[var(--duo-swan)] text-[var(--duo-hare)] text-[10px] uppercase tracking-widest">
                      <th className="p-3 font-bold">Name</th>
                      <th className="p-3 font-bold">Category</th>
                      <th className="p-3 font-bold">Points</th>
                      <th className="p-3 font-bold">Coordinates</th>
                      <th className="p-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {treasures.map(t => (
                      <tr key={t._id} className="border-b border-[var(--duo-swan)] last:border-0 hover:bg-[var(--duo-polar)]">
                        <td className="p-3 font-bold text-[var(--duo-eel)]">{t.name}</td>
                        <td className="p-3"><span className="badge badge-gray text-[8px]">{t.category}</span></td>
                        <td className="p-3 font-black text-[var(--duo-blue)]">{t.points}</td>
                        <td className="p-3 text-xs text-[var(--duo-hare)] font-mono">{t.latitude.toFixed(4)}, {t.longitude.toFixed(4)}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => setPrintTreasure(t)} className="p-2 text-[var(--duo-hare)] hover:text-purple-600" title="Print QR Code">
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEditTreasure(t)} className="p-2 text-[var(--duo-hare)] hover:text-[var(--duo-blue)]">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteTreasure(t._id, t.name)} className="p-2 text-[var(--duo-hare)] hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="card overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-[var(--duo-swan)] text-[var(--duo-hare)] text-[10px] uppercase tracking-widest">
                    <th className="p-3 font-bold">Username</th>
                    <th className="p-3 font-bold">Email</th>
                    <th className="p-3 font-bold">Role</th>
                    <th className="p-3 font-bold">Joined</th>
                    <th className="p-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className="border-b border-[var(--duo-swan)] last:border-0 hover:bg-[var(--duo-polar)]">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--duo-eel)]">{u.username}</span>
                          {u.role === 'admin' && <Crown className="w-4 h-4 text-[var(--duo-gold)]" />}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-[var(--duo-hare)]">{u.email}</td>
                      <td className="p-3">
                        <span className={`badge text-[8px] ${u.role === 'admin' ? 'badge-gold' : 'badge-gray'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-[var(--duo-hare)]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => handleToggleRole(u)} 
                          className="p-2 text-[var(--duo-hare)] hover:text-purple-600"
                          title={u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                        >
                          <Crown className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleResetProgress(u)} 
                          className="p-2 text-[var(--duo-hare)] hover:text-orange-500"
                          title="Reset progress"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u)} 
                          className="p-2 text-[var(--duo-hare)] hover:text-red-500"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Treasure Form Modal */}
      {showTreasureForm && (
        <div className="fixed inset-0 z-[9990] bg-black/50 flex items-center justify-center p-0 sm:p-4" onClick={(e) => e.target === e.currentTarget && setShowTreasureForm(false)}>
          <div className="card w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[90vh] overflow-y-auto sm:rounded-2xl rounded-none">
            <div className="sticky top-0 bg-white border-b-2 border-[var(--duo-swan)] p-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-[var(--duo-eel)]">
                {editingTreasure ? 'Edit Treasure' : 'Add New Treasure'}
              </h3>
              <button onClick={() => setShowTreasureForm(false)} className="p-2 hover:bg-[var(--duo-polar)] rounded-lg">
                <X className="w-5 h-5 text-[var(--duo-hare)]" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--duo-wolf)] uppercase mb-1">Name</label>
                <input
                  type="text"
                  value={treasureForm.name}
                  onChange={e => setTreasureForm({...treasureForm, name: e.target.value})}
                  className="input"
                  placeholder="e.g., Science Lab"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-[var(--duo-wolf)] uppercase mb-1">Description</label>
                <textarea
                  value={treasureForm.description}
                  onChange={e => setTreasureForm({...treasureForm, description: e.target.value})}
                  className="input min-h-[80px]"
                  placeholder="Brief description of the location"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-[var(--duo-wolf)] uppercase mb-1">Clue</label>
                <textarea
                  value={treasureForm.clue}
                  onChange={e => setTreasureForm({...treasureForm, clue: e.target.value})}
                  className="input min-h-[80px]"
                  placeholder="The riddle or hint for hunters"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--duo-wolf)] uppercase mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={treasureForm.latitude}
                    onChange={e => setTreasureForm({...treasureForm, latitude: e.target.value})}
                    className="input"
                    placeholder="51.5074"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--duo-wolf)] uppercase mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={treasureForm.longitude}
                    onChange={e => setTreasureForm({...treasureForm, longitude: e.target.value})}
                    className="input"
                    placeholder="-0.1278"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--duo-wolf)] uppercase mb-1">Points</label>
                  <input
                    type="number"
                    value={treasureForm.points}
                    onChange={e => setTreasureForm({...treasureForm, points: e.target.value})}
                    className="input"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--duo-wolf)] uppercase mb-1">Category</label>
                  <select
                    value={treasureForm.category}
                    onChange={e => setTreasureForm({...treasureForm, category: e.target.value as any})}
                    className="input"
                  >
                    <option value="academic">Academic</option>
                    <option value="social">Social</option>
                    <option value="sports">Sports</option>
                    <option value="history">History</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t-2 border-[var(--duo-swan)] flex gap-3">
              <button 
                onClick={() => setShowTreasureForm(false)}
                className="flex-1 btn-outline py-3"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveTreasure}
                disabled={formLoading || !treasureForm.name || !treasureForm.clue}
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
              >
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingTreasure ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Print Modal */}
      {printTreasure && (
        <div className="fixed inset-0 z-[9990] bg-black/50 flex items-center justify-center p-0 sm:p-4" onClick={(e) => e.target === e.currentTarget && setPrintTreasure(null)}>
          <div className="card w-full h-full sm:h-auto sm:max-w-md overflow-y-auto sm:rounded-2xl rounded-none">
            <div className="sticky top-0 bg-white border-b-2 border-[var(--duo-swan)] p-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-[var(--duo-eel)]">Print QR Code</h3>
              <button onClick={() => setPrintTreasure(null)} className="p-2 hover:bg-[var(--duo-polar)] rounded-lg">
                <X className="w-5 h-5 text-[var(--duo-hare)]" />
              </button>
            </div>
            
            {/* Printable Card */}
            <div id="qr-print-area" className="p-6 text-center bg-white">
              <div className="border-4 border-dashed border-[var(--duo-swan)] p-6 rounded-2xl">
                {/* QR Code using QR Server API */}
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`geohunt:${printTreasure._id}`)}`}
                  alt={`QR Code for ${printTreasure.name}`}
                  className="mx-auto mb-4"
                  style={{ imageRendering: 'pixelated' }}
                />
                
                <h4 className="text-xl font-black text-[var(--duo-eel)] mb-1">{printTreasure.name}</h4>
                <p className="text-xs font-bold text-[var(--duo-hare)] uppercase tracking-wide mb-3">{printTreasure.category} • {printTreasure.points} pts</p>
                
                <div className="bg-[var(--duo-polar)] rounded-lg p-3 mt-4">
                  <p className="text-[10px] font-bold text-[var(--duo-wolf)] uppercase tracking-wide mb-1">Scan to unlock!</p>
                  <p className="text-xs text-[var(--duo-hare)]">GeoHunt Campus Treasure</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t-2 border-[var(--duo-swan)] flex gap-3">
              <button 
                onClick={() => setPrintTreasure(null)}
                className="flex-1 btn-outline py-3"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const printArea = document.getElementById('qr-print-area');
                  if (printArea) {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>GeoHunt - ${printTreasure.name}</title>
                            <style>
                              body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 40px; text-align: center; }
                              .card { border: 4px dashed #e5e5e5; border-radius: 16px; padding: 32px; max-width: 300px; margin: 0 auto; }
                              .qr { width: 200px; height: 200px; margin: 0 auto 16px; image-rendering: pixelated; }
                              .title { font-size: 24px; font-weight: 900; color: #4b4b4b; margin: 0 0 4px; }
                              .meta { font-size: 11px; font-weight: 700; color: #afafaf; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 16px; }
                              .footer { background: #f7f7f7; border-radius: 8px; padding: 12px; margin-top: 16px; }
                              .footer-title { font-size: 10px; font-weight: 700; color: #777; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 4px; }
                              .footer-sub { font-size: 12px; color: #afafaf; margin: 0; }
                              @media print { body { padding: 0; } }
                            </style>
                          </head>
                          <body>
                            <div class="card">
                              <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`geohunt:${printTreasure._id}`)}" alt="QR Code" />
                              <h1 class="title">${printTreasure.name}</h1>
                              <p class="meta">${printTreasure.category} • ${printTreasure.points} pts</p>
                              <div class="footer">
                                <p class="footer-title">Scan to unlock!</p>
                                <p class="footer-sub">GeoHunt Campus Treasure</p>
                              </div>
                            </div>
                            <script>window.onload = function() { window.print(); }</script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }
                  }
                }}
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback Tab ─────────────────────────────────── */}
      {activeTab === 'feedback' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wide text-[var(--duo-wolf)]">
              All Player Feedback ({feedback.length})
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--duo-hare)]" />
            </div>
          ) : feedback.length === 0 ? (
            <div className="card p-8 text-center">
              <MessageSquare className="w-10 h-10 mx-auto text-[var(--duo-hare)] mb-3" />
              <p className="text-[var(--duo-hare)] font-bold text-sm">No feedback yet</p>
            </div>
          ) : (
            feedback.map(fb => {
              const typeConfig: Record<string, { label: string; color: string; Icon: React.FC<any> }> = {
                bug: { label: 'Bug Report', color: '#ff4b4b', Icon: Bug },
                suggestion: { label: 'Suggestion', color: '#ffc800', Icon: Lightbulb },
                general: { label: 'General', color: '#1cb0f6', Icon: MessageCircle },
              };
              const config = typeConfig[fb.type] || typeConfig.general;
              const username = typeof fb.user === 'object' ? fb.user.username : 'Unknown';

              return (
                <div key={fb._id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-md text-white flex items-center gap-1"
                        style={{ background: config.color }}
                      >
                        <config.Icon className="w-3 h-3" />
                        {config.label}
                      </span>
                      <span className="text-xs font-bold text-[var(--duo-eel)]">{username}</span>
                    </div>
                    <span className="text-[10px] text-[var(--duo-hare)] font-bold">
                      {new Date(fb.createdAt).toLocaleDateString()} {new Date(fb.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--duo-eel)] font-medium">{fb.message}</p>
                  {fb.rating && (
                    <div className="flex gap-0.5 mt-2">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-3 h-3 ${s <= fb.rating! ? 'text-[var(--duo-gold)] fill-[var(--duo-gold)]' : 'text-[var(--duo-swan)]'}`} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
