'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import { useSocket } from '@/lib/useSocket';

export default function PortalMessagesPage() {
  const { user, token } = useAuth();
  const { connected, sendMessage: wsSend, joinConversation, emitTyping, onNewMessage, onUserTyping } = useSocket();

  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const selectedRef = useRef<any>(null);

  // Keep selectedRef in sync so WebSocket callbacks see the latest value
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations list via REST
  useEffect(() => {
    if (!token) return;
    apiFetch('/messaging/conversations', { token })
      .then((data) => setConversations(Array.isArray(data) ? data : []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [token]);

  // Listen for real-time messages
  useEffect(() => {
    const unsub = onNewMessage((message: any) => {
      // If the message belongs to the currently open conversation, append it
      if (selectedRef.current && message.conversationId === selectedRef.current.id) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }

      // Update the conversation list's last message preview
      setConversations((prev) =>
        prev.map((c) =>
          c.id === message.conversationId
            ? { ...c, messages: [{ content: message.content, createdAt: message.createdAt, senderId: message.senderId }], updatedAt: message.createdAt }
            : c,
        ),
      );
    });

    return unsub;
  }, [onNewMessage]);

  // Listen for typing indicators
  useEffect(() => {
    const unsub = onUserTyping((data) => {
      if (data.userId === user?.id) return; // Ignore own typing

      setTypingUsers((prev) => ({ ...prev, [data.userId]: data.conversationId }));

      // Clear after 2s of no typing events
      if (typingTimeoutRef.current[data.userId]) {
        clearTimeout(typingTimeoutRef.current[data.userId]);
      }
      typingTimeoutRef.current[data.userId] = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      }, 2000);
    });

    return unsub;
  }, [onUserTyping, user?.id]);

  // Open a conversation: fetch history via REST, then join the WS room
  const openConversation = useCallback(async (conv: any) => {
    setSelected(conv);
    setTypingUsers({});
    try {
      const data = await apiFetch(`/messaging/conversations/${conv.id}/messages`, { token: token! });
      const msgs = data?.messages ?? (Array.isArray(data) ? data : []);
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
    joinConversation(conv.id);
  }, [token, joinConversation]);

  // Send a message via WebSocket (with REST fallback)
  const handleSend = useCallback(async () => {
    if (!newMsg.trim() || !selected) return;
    const content = newMsg.trim();
    setNewMsg('');

    if (connected) {
      wsSend(selected.id, content);
    } else if (token) {
      // Fallback to REST if WebSocket is disconnected
      try {
        const msg = await apiFetch(`/messaging/conversations/${selected.id}/messages`, {
          method: 'POST',
          token,
          body: JSON.stringify({ content }),
        });
        setMessages((prev) => [...prev, msg]);
      } catch {}
    }
  }, [newMsg, selected, connected, wsSend, token]);

  // Emit typing indicator on keypress (throttled)
  const lastTypingEmit = useRef(0);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSend();
        return;
      }
      if (selected && Date.now() - lastTypingEmit.current > 1000) {
        emitTyping(selected.id);
        lastTypingEmit.current = Date.now();
      }
    },
    [handleSend, selected, emitTyping],
  );

  // Typing indicator text for the current conversation
  const typingNames = selected
    ? Object.entries(typingUsers)
        .filter(([, convId]) => convId === selected.id)
        .map(([userId]) => {
          const participant = selected.participants?.find((p: any) => p.user?.id === userId);
          return participant?.user?.firstName || 'Someone';
        })
    : [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${connected ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
          {connected ? 'Live' : 'Connecting…'}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversations list */}
        <div className="card lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">Conversations</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-gray-400">No conversations yet.</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv: any) => (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv)}
                  className={`w-full rounded-lg p-3 text-left text-sm transition hover:bg-gray-50 ${selected?.id === conv.id ? 'bg-brand-50 ring-1 ring-brand-200' : ''}`}
                >
                  <div className="font-medium text-gray-900">
                    {conv.title || conv.participants?.map((p: any) => `${p.user?.firstName || ''} ${p.user?.lastName || ''}`).join(', ') || 'Conversation'}
                  </div>
                  {conv.messages?.[0] && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">{conv.messages[0].content}</p>
                  )}
                  <div className="mt-0.5 text-xs text-gray-400">
                    {new Date(conv.updatedAt).toLocaleDateString('en-GB')}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages panel */}
        <div className="card lg:col-span-2">
          {!selected ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-400">
              Select a conversation to view messages
            </div>
          ) : (
            <div className="flex h-[500px] flex-col">
              <div className="mb-3 border-b border-gray-200 pb-3">
                <h2 className="font-semibold text-gray-900">
                  {selected.title || 'Conversation'}
                </h2>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto">
                {messages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${msg.senderId === user?.id ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      {msg.senderId !== user?.id && (
                        <div className="mb-1 text-xs font-medium opacity-70">
                          {msg.sender?.firstName} {msg.sender?.lastName}
                        </div>
                      )}
                      <p>{msg.content}</p>
                      <time className={`mt-1 block text-xs ${msg.senderId === user?.id ? 'text-brand-200' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Typing indicator */}
              {typingNames.length > 0 && (
                <div className="px-1 py-1 text-xs text-gray-400 italic">
                  {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…
                </div>
              )}

              <div className="mt-3 flex gap-2 border-t border-gray-200 pt-3">
                <input
                  type="text"
                  className="input-field flex-1"
                  placeholder="Type your message…"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button onClick={handleSend} className="btn-primary shrink-0">Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
