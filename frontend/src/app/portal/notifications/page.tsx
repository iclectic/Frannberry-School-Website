'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

export default function PortalNotificationsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/notifications?limit=50', { token });
      setNotifications(data?.notifications || []);
      setUnreadCount(data?.unreadCount || 0);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  const markAsRead = async (id: string) => {
    if (!token) return;
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH', token });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH', token });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'ANNOUNCEMENT': return '📢';
      case 'MESSAGE': return '💬';
      case 'ASSIGNMENT': return '📝';
      case 'RESULT': return '📊';
      case 'ATTENDANCE': return '✅';
      default: return '🔔';
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="text-sm font-medium text-brand-700 hover:text-brand-800">
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : notifications.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-400">
          No notifications yet
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-xl border p-4 transition ${n.isRead ? 'border-gray-100 bg-white' : 'border-brand-100 bg-brand-50/30'}`}
            >
              <span className="mt-0.5 text-lg">{typeIcon(n.type)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-sm font-semibold ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                    {n.title}
                  </h3>
                  <time className="shrink-0 text-xs text-gray-400">
                    {new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
                <p className="mt-0.5 text-sm text-gray-500">{n.body}</p>
                <div className="mt-2 flex items-center gap-3">
                  {n.link && (
                    <Link href={n.link} className="text-xs font-medium text-brand-700 hover:text-brand-800">
                      View details →
                    </Link>
                  )}
                  {!n.isRead && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
              {!n.isRead && (
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
