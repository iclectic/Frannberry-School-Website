'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

export default function PortalMessagesPage() {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    apiFetch('/messaging/conversations', { token })
      .then((data) => setConversations(Array.isArray(data) ? data : []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [token]);

  const openConversation = async (conv: any) => {
    setSelected(conv);
    try {
      const data = await apiFetch(`/messaging/conversations/${conv.id}/messages`, { token: token! });
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !selected || !token) return;
    try {
      await apiFetch(`/messaging/conversations/${selected.id}/messages`, {
        method: 'POST',
        token,
        body: JSON.stringify({ content: newMsg }),
      });
      setNewMsg('');
      openConversation(selected);
    } catch {}
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Messages</h1>

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
              </div>

              <div className="mt-3 flex gap-2 border-t border-gray-200 pt-3">
                <input
                  type="text"
                  className="input-field flex-1"
                  placeholder="Type your message…"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button onClick={sendMessage} className="btn-primary shrink-0">Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
