import React, { useState } from 'react';
import { useChat } from '../hooks/useChat';
import { useStore } from '../store/useStore';
import { ConversationList } from '../components/chat/ConversationList';
import { MessageThread } from '../components/chat/MessageThread';
import { MessageInput } from '../components/chat/MessageInput';
import { TripContextPanel } from '../components/chat/TripContextPanel';
import { NewConversationModal } from '../components/chat/NewConversationModal';
import {
  MessageSquare,
  CheckCircle2,
  ArchiveRestore,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { activeConversationId, setActiveConversationId } = useStore();
  const [showNewModal, setShowNewModal] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(true);

  const {
    conversation,
    messages,
    isLoading,
    isTyping,
    typingUser,
    sendMessage,
    sendTyping,
    toggleResolved,
  } = useChat(activeConversationId);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleNewCreated = (id: string) => {
    setActiveConversationId(id);
  };

  return (
    <div className="flex h-[calc(100vh-128px)] -mx-8 -mt-8 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
      {/* Left: Conversation List */}
      <ConversationList
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
        onNewConversation={() => setShowNewModal(true)}
      />

      {/* Center: Message Thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeConversationId && conversation ? (
          <>
            {/* Thread Header */}
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-white truncate">{conversation.subject}</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {conversation.participants.length} participants · {conversation._count?.messages || messages.length} messages
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Resolve / Reopen button */}
                {conversation.isResolved ? (
                  <button
                    onClick={() => toggleResolved(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900/20 hover:bg-amber-900/30 text-amber-400 border border-amber-800/40 text-xs font-medium transition-colors"
                    title="Reopen conversation"
                  >
                    <ArchiveRestore className="w-3.5 h-3.5" />
                    Reopen
                  </button>
                ) : (
                  <button
                    onClick={() => toggleResolved(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/20 hover:bg-emerald-900/30 text-emerald-400 border border-emerald-800/40 text-xs font-medium transition-colors"
                    title="Mark as resolved"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Resolve
                  </button>
                )}

                {/* Toggle context panel */}
                <button
                  onClick={() => setShowContextPanel((v) => !v)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  title={showContextPanel ? 'Hide details' : 'Show details'}
                >
                  {showContextPanel ? (
                    <PanelRightClose className="w-4 h-4" />
                  ) : (
                    <PanelRightOpen className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Messages Area */}
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                Loading messages...
              </div>
            ) : (
              <MessageThread
                messages={messages}
                isTyping={isTyping}
                typingUser={typingUser}
              />
            )}

            {/* Input Area */}
            <MessageInput
              onSendMessage={sendMessage}
              onTyping={sendTyping}
              disabled={conversation.isResolved}
            />
          </>
        ) : (
          /* Empty state when no conversation is selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-600/20 to-cyan-600/20 flex items-center justify-center border border-slate-800">
                <MessageSquare className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Fleet Chat Center</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Real-time messaging hub for coordinating with employees and drivers. Select a
                conversation from the sidebar or start a new one.
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                Start New Conversation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right: Trip Context Panel */}
      {showContextPanel && activeConversationId && (
        <TripContextPanel conversation={conversation} />
      )}

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={handleNewCreated}
      />
    </div>
  );
};
