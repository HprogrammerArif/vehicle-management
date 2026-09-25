import React, { useState } from 'react';
import { api } from '../../lib/api';
import { ConvType } from '../../types';
import { X, Send, MessageSquare, AlertTriangle, HelpCircle, Navigation } from 'lucide-react';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [subject, setSubject] = useState('');
  const [type, setType] = useState<ConvType>('GENERAL');
  const [initialMessage, setInitialMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const typeOptions: { value: ConvType; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      value: 'GENERAL',
      label: 'General',
      icon: <MessageSquare className="w-5 h-5" />,
      desc: 'Open-ended discussion',
    },
    {
      value: 'SUPPORT',
      label: 'Support Request',
      icon: <HelpCircle className="w-5 h-5" />,
      desc: 'Ask admin for help',
    },
    {
      value: 'INCIDENT',
      label: 'Incident Report',
      icon: <AlertTriangle className="w-5 h-5" />,
      desc: 'Breakdowns, accidents, emergencies',
    },
    {
      value: 'TRIP_THREAD',
      label: 'Trip Thread',
      icon: <Navigation className="w-5 h-5" />,
      desc: 'Linked to a specific trip',
    },
  ];

  const handleSubmit = async () => {
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      const res = await api.startConversation({
        subject: subject.trim(),
        type,
        initialMessage: initialMessage.trim() || undefined,
      });

      if (res.success && res.data) {
        onCreated(res.data.id);
        setSubject('');
        setType('GENERAL');
        setInitialMessage('');
        onClose();
      } else {
        setError(res.message || 'Failed to create conversation');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg mx-4 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-bold text-white">New Conversation</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                    type === opt.value
                      ? 'bg-indigo-600/10 border-indigo-500/50 ring-1 ring-indigo-500/20'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <span
                    className={`${
                      type === opt.value ? 'text-indigo-400' : 'text-slate-500'
                    }`}
                  >
                    {opt.icon}
                  </span>
                  <div>
                    <p
                      className={`text-xs font-semibold ${
                        type === opt.value ? 'text-white' : 'text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-slate-500">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Subject
            </label>
            <input
              type="text"
              placeholder="e.g., Need to reschedule Gazipur trip"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          {/* Initial message (optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              First Message <span className="text-slate-600">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Describe the issue or request in detail..."
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-xs font-medium bg-red-900/20 rounded-lg px-3 py-2 border border-red-800/30">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !subject.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            {isSubmitting ? 'Creating...' : 'Start Conversation'}
          </button>
        </div>
      </div>
    </div>
  );
};
