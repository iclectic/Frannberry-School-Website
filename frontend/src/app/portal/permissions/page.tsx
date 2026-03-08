'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

interface Permission {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

interface CustomRole {
  id: string;
  name: string;
  description?: string;
  baseRole: string;
  rolePermissions: { permission: Permission }[];
  _count: { userCustomRoles: number };
}

export default function PermissionsPage() {
  const { token } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);

  // New permission form
  const [permName, setPermName] = useState('');
  const [permDesc, setPermDesc] = useState('');
  const [permCategory, setPermCategory] = useState('');

  // New role form
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [roleBase, setRoleBase] = useState('TEACHER');
  const [rolePermIds, setRolePermIds] = useState<string[]>([]);

  const [tab, setTab] = useState<'permissions' | 'roles'>('roles');

  useEffect(() => {
    if (!token) return;
    fetchAll();
  }, [token]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        apiFetch('/permissions', { token: token! }),
        apiFetch('/permissions/roles', { token: token! }),
      ]);
      setPermissions(Array.isArray(p) ? p : []);
      setRoles(Array.isArray(r) ? r : []);
    } catch {}
    setLoading(false);
  }

  async function handleCreatePermission(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/permissions', {
        token: token!, method: 'POST',
        body: JSON.stringify({ name: permName, description: permDesc || undefined, category: permCategory || undefined }),
      });
      setPermName(''); setPermDesc(''); setPermCategory('');
      fetchAll();
    } catch (err: any) { alert(err.message); }
  }

  async function handleDeletePermission(id: string) {
    if (!confirm('Delete this permission?')) return;
    try {
      await apiFetch(`/permissions/${id}`, { token: token!, method: 'DELETE' });
      fetchAll();
    } catch (err: any) { alert(err.message); }
  }

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/permissions/roles', {
        token: token!, method: 'POST',
        body: JSON.stringify({ name: roleName, description: roleDesc || undefined, baseRole: roleBase, permissionIds: rolePermIds }),
      });
      setRoleName(''); setRoleDesc(''); setRolePermIds([]);
      fetchAll();
    } catch (err: any) { alert(err.message); }
  }

  async function handleDeleteRole(id: string) {
    if (!confirm('Delete this custom role?')) return;
    try {
      await apiFetch(`/permissions/roles/${id}`, { token: token!, method: 'DELETE' });
      fetchAll();
    } catch (err: any) { alert(err.message); }
  }

  function togglePerm(pid: string) {
    setRolePermIds((prev) => prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]);
  }

  // Group permissions by category
  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    const cat = p.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  if (loading) {
    return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Permissions & Roles</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Manage granular permissions and custom roles for fine-grained access control.</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('roles')} className={`px-4 py-2 text-sm rounded-md font-medium transition ${tab === 'roles' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
          Custom Roles ({roles.length})
        </button>
        <button onClick={() => setTab('permissions')} className={`px-4 py-2 text-sm rounded-md font-medium transition ${tab === 'permissions' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
          Permissions ({permissions.length})
        </button>
      </div>

      {/* ── Permissions Tab ──────────────────────────────────────────────── */}
      {tab === 'permissions' && (
        <>
          <form onSubmit={handleCreatePermission} className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-6 mb-6">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Create Permission</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Name</label>
                <input type="text" value={permName} onChange={(e) => setPermName(e.target.value)} required placeholder="can_view_grades" className="mt-1 w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Category</label>
                <input type="text" value={permCategory} onChange={(e) => setPermCategory(e.target.value)} placeholder="Grades" className="mt-1 w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
                <input type="text" value={permDesc} onChange={(e) => setPermDesc(e.target.value)} placeholder="View student grades" className="mt-1 w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <button type="submit" className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create</button>
          </form>

          {Object.entries(grouped).map(([category, perms]) => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{category}</h3>
              <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 divide-y dark:divide-gray-700">
                {perms.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">{p.name}</p>
                      {p.description && <p className="text-xs text-gray-500 dark:text-gray-400">{p.description}</p>}
                    </div>
                    <button onClick={() => handleDeletePermission(p.id)} className="text-xs text-red-600 dark:text-red-400 hover:underline">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {permissions.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-center py-8">No permissions defined yet.</p>}
        </>
      )}

      {/* ── Roles Tab ────────────────────────────────────────────────────── */}
      {tab === 'roles' && (
        <>
          <form onSubmit={handleCreateRole} className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-6 mb-6">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Create Custom Role</h2>
            <div className="grid gap-4 sm:grid-cols-3 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Role Name</label>
                <input type="text" value={roleName} onChange={(e) => setRoleName(e.target.value)} required placeholder="Head of Department" className="mt-1 w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Base Role</label>
                <select value={roleBase} onChange={(e) => setRoleBase(e.target.value)} className="mt-1 w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm">
                  <option value="TEACHER">Teacher</option>
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
                <input type="text" value={roleDesc} onChange={(e) => setRoleDesc(e.target.value)} placeholder="Optional description" className="mt-1 w-full border dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            {permissions.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">Assign Permissions</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {permissions.map((p) => (
                    <label key={p.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer border transition ${rolePermIds.includes(p.id) ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
                      <input type="checkbox" checked={rolePermIds.includes(p.id)} onChange={() => togglePerm(p.id)} className="sr-only" />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create Role</button>
          </form>

          {roles.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No custom roles defined yet.</p>
          ) : (
            <div className="space-y-4">
              {roles.map((r) => (
                <div key={r.id} className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{r.name}</h3>
                      {r.description && <p className="text-xs text-gray-500 dark:text-gray-400">{r.description}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">Base: {r.baseRole}</span>
                        <span className="text-xs text-gray-400">{r._count.userCustomRoles} user(s) assigned</span>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteRole(r.id)} className="text-xs text-red-600 dark:text-red-400 hover:underline">Delete</button>
                  </div>
                  {r.rolePermissions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {r.rolePermissions.map((rp) => (
                        <span key={rp.permission.id} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-mono">
                          {rp.permission.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No permissions assigned</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
