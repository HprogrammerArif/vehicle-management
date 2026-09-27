import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  X,
  Upload,
  Loader2,
  Smile,
  Car,
  MapPin,
  Fuel,
  CloudRain,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../lib/api';

interface MessageInputProps {
  onSendMessage: (body: string, messageType?: string, attachmentUrl?: string) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-grow textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${Math.max(newHeight, 38)}px`;
    }
  }, [text]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    // Trigger typing event
    onTyping(true);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleSend = () => {
    if ((!text.trim() && !attachmentUrl.trim()) || isUploading) return;

    const isImage = attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || attachmentUrl.includes('/uploads/chat/');
    onSendMessage(
      text.trim(),
      attachmentUrl ? (isImage ? 'IMAGE' : 'FILE') : 'TEXT',
      attachmentUrl.trim() ? attachmentUrl.trim() : undefined
    );

    setText('');
    setAttachmentUrl('');
    setAttachmentName('');
    setShowUrlInput(false);
    onTyping(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = '38px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await api.uploadChatAttachment(file);
      if (res.success && res.url) {
        setAttachmentUrl(res.url);
        setAttachmentName(res.filename || file.name);
      } else {
        alert(res.message || 'File upload failed');
      }
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const quickTemplates = [
    { label: 'Trip Approved', icon: Car, text: 'All set! Your trip request is approved. Safe driving!' },
    { label: 'Status Check', icon: MapPin, text: 'Hey there, how is the route looking? Send a quick ping when safe.' },
    { label: 'Fuel Logged', icon: Fuel, text: 'Fuel receipt verified and logged. Thanks for sending it through!' },
    { label: 'Weather Alert', icon: CloudRain, text: 'Caution: Heavy traffic/rain reported ahead. Please drive carefully!' },
    { label: 'Issue Resolved', icon: CheckCircle, text: 'All resolved on our end. Let us know if you need anything else!' },
  ];

  return (
    <div className="border-t border-slate-800 bg-slate-900/90 p-3.5 space-y-2.5">
      {/* Quick Action Badges */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-none">
        <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider shrink-0 mr-1">
          Quick Dispatch:
        </span>
        {quickTemplates.map((tmpl, idx) => {
          const Icon = tmpl.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setText((prev) => (prev ? `${prev} ${tmpl.text}` : tmpl.text))}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] shrink-0 transition-colors cursor-pointer hover:border-slate-600 active:scale-95"
            >
              <Icon className="w-3 h-3 text-indigo-400" />
              <span>{tmpl.label}</span>
            </button>
          );
        })}
      </div>

      {/* Attachment Preview Chip */}
      {attachmentUrl && (
        <div className="flex items-center justify-between p-2 bg-indigo-950/40 rounded-lg border border-indigo-800/50 text-xs animate-fadeIn">
          <div className="flex items-center gap-2 truncate">
            <ImageIcon className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-indigo-200 truncate font-medium">
              {attachmentName || 'Attachment ready to send'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setAttachmentUrl('');
              setAttachmentName('');
            }}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Optional Attachment URL Drawer */}
      {showUrlInput && (
        <div className="flex items-center gap-2 p-2 bg-slate-950/80 rounded-lg border border-slate-800 animate-fadeIn">
          <ImageIcon className="w-4 h-4 text-indigo-400 shrink-0" />
          <input
            type="text"
            placeholder="Or paste an image URL (e.g. https://...)"
            value={attachmentUrl}
            onChange={(e) => {
              setAttachmentUrl(e.target.value);
              setAttachmentName('Web Image');
            }}
            className="w-full bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowUrlInput(false)}
            className="text-slate-400 hover:text-slate-200 text-xs px-2"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Main Input Box */}
      <div className="flex items-end gap-2 bg-slate-950/70 rounded-xl border border-slate-800 focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/30 p-2 transition-all">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Upload file button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="Upload image or file"
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
          ) : (
            <Paperclip className="w-4 h-4" />
          )}
        </button>

        {/* Paste URL toggle */}
        <button
          type="button"
          onClick={() => setShowUrlInput((v) => !v)}
          title="Paste image URL"
          className={`p-2 rounded-lg transition-colors ${
            showUrlInput ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        {/* Auto-growing Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isUploading}
          placeholder="Write a message... (Enter to send, Shift+Enter for newline)"
          className="flex-1 bg-transparent resize-none border-none py-1.5 px-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none max-h-32 min-h-[38px] leading-relaxed"
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || isUploading || (!text.trim() && !attachmentUrl.trim())}
          className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
