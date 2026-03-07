'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string; role: string };
}

const ACTION_COLOURS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  LOGIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  LOGOUT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  VIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  EXPORT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  PASSWORD_CHANGE: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  MFA_ENABLE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  MFA_DISABLE: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  INVITE_SENT: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
};

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT', 'MFA_ENABLE', 'MFA_DISABLE', 'PASSWORD_CHANGE', 'INVITE_SENT'];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [page, filterAction, filterEntity]);

  async function fetchLogs() {
    setLoading(true);
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '30');
    if (filterAction) params.set('action', filterAction);
    if (filterEntity) params.set('entity', filterEntity);

    try {
      const data = await apiFetch(`/admin/audit-logs?${params.toString()}`, { token: token || undefined });
      setLogs(data.logs);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Audit Logs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{total} total entries</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
        >
          <option value="">All Actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input
          type="text"
          placeholder="Filter by entity (e.g. User, Class)"
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm w-56"
          value={filterEntity}
          onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-12">No audit logs found.</p>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Timestamp</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">User</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Action</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Entity</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Entity ID</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Details</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{log.user.firstName} {log.user.lastName}</div>
                        <div className="text-xs text-gray-400">{log.user.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLOURS[log.action] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{log.entity}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 max-w-[120px] truncate" title={log.entityId || ''}>
                        {log.entityId ? log.entityId.slice(0, 8) + '…' : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={log.details || ''}>
                        {log.details || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.ipAddress || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
