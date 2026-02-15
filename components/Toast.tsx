/**
 * Toast Notification System — shows temporary feedback messages to the player.
 * Supports success (green), error (red), and info (blue) message types.
 * Each toast auto-dismisses after 3 seconds with a smooth slide animation.
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

/** Shape of a toast notification */
export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}

/** Maps toast types to their corresponding Lucide icons */
const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

/** Maps toast types to their background and shadow colors */
const COLORS = {
  success: { bg: 'bg-[var(--duo-green)]', shadow: 'var(--duo-green-dark)' },
  error: { bg: 'bg-red-500', shadow: '#b91c1c' },
  info: { bg: 'bg-[var(--duo-blue)]', shadow: 'var(--duo-blue-dark)' },
};

/**
 * Individual toast notification with slide-in/slide-out animation.
 * Auto-dismisses after 3 seconds. Can also be manually dismissed via the X button.
 * @param {ToastData} toast    - The toast data to display
 * @param {Function}  onRemove - Callback to remove this toast from the list
 */
const ToastItem: React.FC<{ toast: ToastData; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger the slide-in animation on next frame
    requestAnimationFrame(() => setIsVisible(true));
    // Auto-dismiss after 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const Icon = ICONS[toast.type];
  const color = COLORS[toast.type];

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-all duration-300 ${color.bg} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
      style={{ boxShadow: `0 4px 0 ${color.shadow}, 0 8px 24px rgba(0,0,0,0.15)` }}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => { setIsVisible(false); setTimeout(() => onRemove(toast.id), 300); }} className="p-1 hover:bg-white/20 rounded-lg shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Container that renders all active toast notifications.
 * Positioned fixed at the top-center of the viewport with the highest z-index.
 * @param {ToastData[]} toasts   - Array of active toasts
 * @param {Function}    onRemove - Callback to remove a toast by ID
 */
export const ToastContainer: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[90%] max-w-sm pointer-events-auto">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
};
