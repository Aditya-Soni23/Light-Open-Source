import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, User, Radio, Sparkles } from 'lucide-react';
import { UserProfile, ChatMessage, DirectConversation } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  sendDirectMessage,
  subscribeToDirectMessages,
  getDirectConversationId
} from '../../services/chat';

interface DirectChatViewProps {
  currentUser: UserProfile;
  recipient: UserProfile;
  onJoinVoice: (channelId: string, title: string) => void;
  onToast: (msg: string) => void;
}

export const DirectChatView: React.FC<DirectChatViewProps> = ({
  currentUser,
  recipient,
  onJoinVoice,
  onToast,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversationId = getDirectConversationId(currentUser.uid, recipient.uid);

  useEffect(() => {
    const unsubscribe = subscribeToDirectMessages(conversationId, (loaded) => {
      setMessages(loaded);
    });
    return () => unsubscribe();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    setInputText('');
    setSending(true);
    try {
      await sendDirectMessage(conversationId, currentUser, text);
    } catch (e: any) {
      onToast(`Failed to send message: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col h-full light-app-shell overflow-hidden transition-colors">
      {/* Chat Header */}
      <div className="h-13 light-surface light-divider border-b px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Avatar
            name={recipient.displayName}
            photoURL={recipient.photoURL}
            status={recipient.status}
            size="md"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-white text-xs">
                {recipient.displayName}
              </span>
              <span className="text-[11px] font-mono text-slate-400">@{recipient.username}</span>
            </div>
            {recipient.currentGame && (
              <p className="text-[10px] text-accent dark:text-accent">Playing {recipient.currentGame}</p>
            )}
          </div>
        </div>

        {/* Quick Voice Launch */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onJoinVoice(`dm_${conversationId}`, `Call: ${recipient.displayName}`)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-2 text-xs font-medium cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-accent" />
            <span>Join Direct Voice</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#161b22] border border-black/5 dark:border-white/5 flex items-center justify-center mx-auto mb-3">
              <Avatar
                name={recipient.displayName}
                photoURL={recipient.photoURL}
                size="lg"
              />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
              {recipient.displayName}
            </h3>
            <p className="text-xs text-slate-400 font-mono mb-2">@{recipient.username}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              This is the beginning of your direct conversation history with {recipient.displayName}. Send a message to say hello!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderUid === currentUser.uid;
            const prevMsg = messages[index - 1];
            const isSequential = prevMsg && prevMsg.senderUid === msg.senderUid && (msg.timestamp - prevMsg.timestamp < 300000);

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 group ${isMe ? 'justify-end' : 'justify-start'} ${
                  isSequential ? 'mt-1' : 'mt-3'
                }`}
              >
                {!isMe && !isSequential && (
                  <Avatar
                    name={msg.senderDisplayName}
                    photoURL={msg.senderPhotoURL}
                    size="sm"
                    className="mt-0.5"
                  />
                )}
                {!isMe && isSequential && <div className="w-7 shrink-0" />}

                <div
                  className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    isMe
                      ? 'bg-accent text-white font-medium rounded-tr-xs shadow-xs'
                      : 'bg-white dark:bg-[#1c2128] text-slate-900 dark:text-slate-100 rounded-tl-xs border border-black/5 dark:border-white/5 shadow-xs'
                  }`}
                >
                  {!isMe && !isSequential && (
                    <div className="font-medium text-[11px] text-accent dark:text-accent mb-0.5">
                      {msg.senderDisplayName}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  <div
                    className={`text-[9px] font-mono mt-1 text-right select-none ${
                      isMe ? 'text-white/80' : 'text-slate-400'
                    }`}
                  >
                    {formatTimestamp(msg.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Footer */}
      <form
        onSubmit={handleSendMessage}
        className="p-3.5 light-surface light-divider border-t shrink-0"
      >
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#1c2128] border border-black/5 dark:border-white/5 focus-within:border-accent rounded-2xl px-3.5 py-2 transition-colors shadow-xs">
          <input
            type="text"
            placeholder={`Message @${recipient.username}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="w-7 h-7 rounded-xl bg-accent hover:bg-accent-hover text-white flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer shrink-0 shadow-xs"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </form>
    </div>
  );
};
