/**
 * Feedback Tab — lets players submit feedback and view their submission history.
 * Supports three feedback types: Bug Report, Suggestion, and General.
 * Includes an optional 1-5 star rating for overall game experience.
 */

import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Bug, Lightbulb, MessageCircle, Star, CheckCircle2, Loader2 } from 'lucide-react';
import { feedbackAPI, FeedbackFromAPI } from '../services/api';

/** Available feedback types with display info */
const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug Report', icon: Bug, color: '#ff4b4b' },
  { value: 'suggestion', label: 'Suggestion', icon: Lightbulb, color: '#ffc800' },
  { value: 'general', label: 'General', icon: MessageCircle, color: '#1cb0f6' },
];

interface FeedbackTabProps {
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

/**
 * Player feedback form with type selector, star rating, and message input.
 * Shows a history of the player's previously submitted feedback below the form.
 */
export const FeedbackTab: React.FC<FeedbackTabProps> = ({ addToast }) => {
  const [type, setType] = useState<string>('general');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [myFeedback, setMyFeedback] = useState<FeedbackFromAPI[]>([]);
  const [loading, setLoading] = useState(true);

  /** Load the player's own feedback history on mount */
  useEffect(() => {
    loadMyFeedback();
  }, []);

  const loadMyFeedback = async () => {
    try {
      const res = await feedbackAPI.getMine();
      setMyFeedback(res.data);
    } catch (err) {
      console.error('Failed to load feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  /** Submit the feedback form */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      addToast('Please write a message', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await feedbackAPI.submit({
        type,
        message: message.trim(),
        ...(rating > 0 ? { rating } : {}),
      });

      setSubmitted(true);
      addToast('Thanks for your feedback!', 'success');

      // Reset form after brief success animation
      setTimeout(() => {
        setMessage('');
        setRating(0);
        setType('general');
        setSubmitted(false);
        loadMyFeedback();
      }, 1500);
    } catch (err: any) {
      addToast(err.message || 'Failed to submit feedback', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /** Get display info for a feedback type */
  const getTypeInfo = (t: string) => FEEDBACK_TYPES.find(ft => ft.value === t) || FEEDBACK_TYPES[2];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[var(--duo-blue)] rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ boxShadow: '0 4px 0 var(--duo-blue-dark)' }}>
          <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-[var(--duo-eel)] mb-1">Send Feedback</h2>
        <p className="text-[var(--duo-hare)] font-bold text-[10px] sm:text-xs uppercase tracking-wide">Help us improve GeoHunt</p>
      </div>

      {/* Feedback Form */}
      <form onSubmit={handleSubmit} className="card p-5 sm:p-6 space-y-5">
        {/* Type Selector */}
        <div>
          <label className="text-xs font-black uppercase tracking-wide text-[var(--duo-wolf)] mb-3 block">Feedback Type</label>
          <div className="grid grid-cols-3 gap-2">
            {FEEDBACK_TYPES.map(ft => {
              const Icon = ft.icon;
              const isActive = type === ft.value;
              return (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => setType(ft.value)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    isActive
                      ? 'border-[var(--duo-blue)] bg-[rgba(28,176,246,0.08)]'
                      : 'border-[var(--duo-swan)] hover:border-[var(--duo-hare)]'
                  }`}
                >
                  <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: ft.color }} />
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${isActive ? 'text-[var(--duo-blue)]' : 'text-[var(--duo-hare)]'}`}>
                    {ft.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Star Rating (optional) */}
        <div>
          <label className="text-xs font-black uppercase tracking-wide text-[var(--duo-wolf)] mb-3 block">
            Rate Your Experience <span className="text-[var(--duo-hare)] font-bold">(optional)</span>
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(rating === star ? 0 : star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'text-[var(--duo-gold)] fill-[var(--duo-gold)]'
                      : 'text-[var(--duo-swan)]'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="text-xs font-black uppercase tracking-wide text-[var(--duo-wolf)] mb-3 block">Your Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Tell us what's on your mind..."
            maxLength={1000}
            rows={4}
            className="w-full p-4 rounded-xl border-2 border-[var(--duo-swan)] bg-[var(--duo-polar)] text-sm text-[var(--duo-eel)] font-medium resize-none focus:outline-none focus:border-[var(--duo-blue)] transition-colors placeholder:text-[var(--duo-hare)]"
          />
          <p className="text-[10px] text-[var(--duo-hare)] font-bold mt-1 text-right">{message.length}/1000</p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || submitted || !message.trim()}
          className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all border-b-4 active:border-b-0 active:translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed ${
            submitted
              ? 'bg-[var(--duo-green)] border-[var(--duo-green-dark)] text-white'
              : 'bg-[var(--duo-blue)] border-[var(--duo-blue-dark)] text-white hover:brightness-110'
          }`}
        >
          {submitted ? (
            <><CheckCircle2 className="w-5 h-5" /> Sent!</>
          ) : submitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>
          ) : (
            <><Send className="w-5 h-5" /> Submit Feedback</>
          )}
        </button>
      </form>

      {/* Previous Feedback */}
      {!loading && myFeedback.length > 0 && (
        <div>
          <h3 className="text-xs font-black uppercase tracking-wide text-[var(--duo-wolf)] mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> Your Previous Feedback
          </h3>
          <div className="space-y-2">
            {myFeedback.map(fb => {
              const info = getTypeInfo(fb.type);
              return (
                <div key={fb._id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-md text-white"
                      style={{ background: info.color }}
                    >
                      {info.label}
                    </span>
                    <span className="text-[10px] text-[var(--duo-hare)] font-bold">
                      {new Date(fb.createdAt).toLocaleDateString()}
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
            })}
          </div>
        </div>
      )}
    </div>
  );
};
