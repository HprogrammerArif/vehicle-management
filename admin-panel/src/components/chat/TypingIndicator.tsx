import React from 'react';

interface TypingIndicatorProps {
  userName: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ userName }) => {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 border border-slate-800 rounded-full w-fit text-xs text-slate-400 animate-pulse">
      <span className="font-medium text-slate-300">{userName}</span>
      <span>is typing</span>
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
      </div>
    </div>
  );
};
