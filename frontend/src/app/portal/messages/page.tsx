'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import { useSocket } from '@/lib/useSocket';

const PURPOSE_LABEL: Record<string, string> = {
  PARENT_TEACHER: 'Teacher',
  PARENT_HEAD: 'Headteacher',
  TEACHER_TEACHER: 'Colleague',
  TEACHER_HEAD: 'Headteacher',
  PUPIL_TEACHER: 'Teacher',
};

export default function PortalMessagesPage() {
  const { user, token } = useAuth();
  const { connected, sendMessage: wsSend, joinConversation, emitTyping, onNewMessage, onUserTyping } = useSocket();

  const [conversations, setConversations] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [allowance, setAllowance] = useState<any>(null);
  const [childChoice, setChildChoice] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [showContacts, setShowContacts] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const selectedRef = useRef<any>(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = useCallback(() => {
    if (!token) return Promise.resolve();
    return apiFetch('/messaging/conversations', { token })
      .then((data) => setConversations(Array.isArray(data) ? data : []))
      .catch(() => setConversations([]));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      loadConversations(),
      apiFetch('/messaging/contacts', { token }).then((data) => setContacts(data?.contacts ?? [])).catch(() => setContacts([])),
    ]).finally(() => setLoading(false));
  }, [token, loadConversations]);

  useEffect(() => {
    const unsub = onNewMessage((message: any) => {
      if (selectedRef.current && message.conversationId === selectedRef.current.id) {
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      }
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

  useEffect(() => {
    const unsub = onUserTyping((data) => {
      if (data.userId === user?.id) return;
      setTypingUsers((prev) => ({ ...prev, [data.userId]: data.conversationId }));
      if (typingTimeoutRef.current[data.userId]) clearTimeout(typingTimeoutRef.current[data.userId]);
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

  const refreshAllowance = useCallback(async (conversationId: string) => {
    if (!token) return;
    try {
      const data = await apiFetch(`/messaging/conversations/${conversationId}/allowance`, { token });
      setAllowance(data);
    } catch {
      setAllowance(null);
    }
  }, [token]);

  const openConversation = useCallback(async (conv: any) => {
    setSelected(conv);
    setNotice('');
    setTypingUsers({});
    setShowContacts(false);
    try {
      const data = await apiFetch(`/messaging/conversations/${conv.id}/messages`, { token: token! });
      const msgs = data?.messages ?? (Array.isArray(data) ? data : []);
      setMessages(msgs);
      setConversations((prev) => prev.map((item) => (item.id === conv.id ? { ...item, unreadCount: 0, hasUnread: false } : item)));
    } catch {
      setMessages([]);
    }
    refreshAllowance(conv.id);
    joinConversation(conv.id);
  }, [token, joinConversation, refreshAllowance]);

  const startConversation = async (contact: any) => {
    if (!token) return;
    setNotice('');
    const studentId = contact.requiresStudentId ? childChoice[contact.userId] : contact.children?.[0]?.studentId;
    if (contact.requiresStudentId && !studentId) {
      setNotice('Choose which child this conversation is about.');
      return;
    }
    try {
      const conv = await apiFetch('/messaging/conversations', {
        method: 'POST',
        token,
        body: JSON.stringify({ participantId: contact.userId, ...(studentId ? { studentId } : {}) }),
      });
      await loadConversations();
      await openConversation(conv);
    } catch (err: any) {
      setNotice(err.message || 'Could not open the conversation');
    }
  };

  const composerClosed = allowance?.limited && allowance.remaining === 0;

  const handleSend = useCallback(async () => {
    if (!newMsg.trim() || !selected || composerClosed) return;
    const content = newMsg.trim();
    setNewMsg('');
    setNotice('');
    try {
      let msg: any;
      if (connected) {
        msg = await wsSend(selected.id, content);
        if (msg?.error) throw new Error(msg.error);
      } else if (token) {
        msg = await apiFetch(`/messaging/conversations/${selected.id}/messages`, {
          method: 'POST',
          token,
          body: JSON.stringify({ content }),
        });
      }
      if (msg && !msg.error) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
      await refreshAllowance(selected.id);
    } catch (err: any) {
      setNotice(err.message || 'Message was not sent');
      setNewMsg(content);
      refreshAllowance(selected.id);
    }
  }, [newMsg, selected, connected, wsSend, token, composerClosed, refreshAllowance]);

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

  const typingNames = selected
    ? Object.entries(typingUsers)
        .filter(([, convId]) => convId === selected.id)
        .map(([userId]) => selected.participants?.find((p: any) => p.user?.id === userId)?.user?.firstName || 'Someone')
    : [];

  const blockedRole = user?.role === 'ADMIN' || user?.role === 'STAFF';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Messages</h1>
        <div className="flex items-center gap-3">
          {!blockedRole && (
            <button type="button" className="btn-secondary text-sm" onClick={() => setShowContacts((open) => !open)}>
              {showContacts ? 'Hide contacts' : 'New message'}
            </button>
          )}
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${connected ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
            {connected ? 'Live' : 'Connecting…'}
          </span>
        </div>
      </div>

      {blockedRole && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Office admin and other staff cannot open conversations.
        </p>
      )}
      {notice && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{notice}</p>}

      {showContacts && (
        <div className="card mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">People you can write to</h2>
          {contacts.length === 0 ? (
            <p className="text-sm text-gray-400">No contacts for your role.</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div key={`${contact.userId}-${contact.purpose}`} className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-gray-200 p-3">
                  <div>
                    <p className="font-medium text-gray-900">{contact.name}</p>
                    <p className="text-xs text-gray-500">
                      {PURPOSE_LABEL[contact.purpose] || contact.role}
                      {contact.schools?.length ? ` · ${contact.schools.map((school: any) => school.name).join(', ')}` : ''}
                    </p>
                    {contact.requiresStudentId && (
                      <label className="mt-2 block text-xs text-gray-600">
                        Which child?
                        <select
                          className="input-field mt-1"
                          value={childChoice[contact.userId] || ''}
                          onChange={(e) => setChildChoice((prev) => ({ ...prev, [contact.userId]: e.target.value }))}
                        >
                          <option value="">Choose a child</option>
                          {contact.children.map((child: any) => (
                            <option key={child.studentId} value={child.studentId}>{child.name} ({child.schoolName})</option>
                          ))}
                        </select>
                      </label>
                    )}
                    {!contact.requiresStudentId && contact.children?.length === 1 && (
                      <p className="mt-1 text-xs text-gray-400">About {contact.children[0].name}</p>
                    )}
                  </div>
                  <button type="button" className="btn-primary text-sm" onClick={() => startConversation(contact)}>Open</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">Conversations</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-gray-400">No conversations yet.</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv: any) => {
                const others = conv.participants?.filter((p: any) => p.user?.id !== user?.id) ?? [];
                const title = others.map((p: any) => `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.trim()).join(', ') || conv.title || 'Conversation';
                return (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    className={`w-full rounded-lg p-3 text-left text-sm transition hover:bg-gray-50 ${selected?.id === conv.id ? 'bg-brand-50 ring-1 ring-brand-200' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-900">{title}</span>
                      {conv.unreadCount > 0 && (
                        <span className="rounded-full bg-brand-700 px-2 py-0.5 text-xs font-semibold text-white">{conv.unreadCount}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {PURPOSE_LABEL[conv.purpose] || 'Message'}
                      {conv.student ? ` · ${conv.student.firstName} ${conv.student.lastName}` : ''}
                      {conv.school?.name ? ` · ${conv.school.name}` : ''}
                    </p>
                    {conv.messages?.[0] && <p className="mt-0.5 truncate text-xs text-gray-500">{conv.messages[0].content}</p>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="card lg:col-span-2">
          {!selected ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-400">
              Select a conversation to view messages
            </div>
          ) : (
            <div className="flex h-[500px] flex-col">
              <div className="mb-3 border-b border-gray-200 pb-3">
                <h2 className="font-semibold text-gray-900">
                  {selected.participants?.filter((p: any) => p.user?.id !== user?.id).map((p: any) => `${p.user?.firstName} ${p.user?.lastName}`).join(', ') || 'Conversation'}
                </h2>
                <p className="text-xs text-gray-500">
                  {selected.school?.name}
                  {selected.student ? ` · ${selected.student.firstName} ${selected.student.lastName}` : ''}
                </p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto">
                {messages.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${msg.senderId === user?.id ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      {msg.senderId !== user?.id && (
                        <div className="mb-1 text-xs font-medium opacity-70">{msg.sender?.firstName} {msg.sender?.lastName}</div>
                      )}
                      <p>{msg.content}</p>
                      <time className={`mt-1 block text-xs ${msg.senderId === user?.id ? 'text-brand-200' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' })}
                      </time>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {typingNames.length > 0 && (
                <div className="px-1 py-1 text-xs italic text-gray-400">
                  {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…
                </div>
              )}

              <div className="mt-3 border-t border-gray-200 pt-3">
                {allowance?.limited ? (
                  <p className="mb-2 text-xs text-gray-500">
                    {allowance.remaining} of {allowance.limit} left this week {allowance.scope === 'head' ? 'to this head' : 'for teachers'} (Monday 00:00 Europe/London).
                  </p>
                ) : (
                  <p className="mb-2 text-xs text-gray-400">No weekly limit.</p>
                )}
                {composerClosed ? (
                  <p className="rounded-lg bg-gray-100 p-3 text-sm text-gray-600">
                    You have used this week&apos;s messages. The composer opens again on Monday at 00:00 London time. Deleting a message does not restore the allowance.
                  </p>
                ) : (
                  <div className="flex gap-2">
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
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
