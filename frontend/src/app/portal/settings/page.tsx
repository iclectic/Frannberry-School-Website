'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  role: string;
  mfaEnabled: boolean;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Profile form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const data = await apiFetch('/users/me', { token: token || undefined });
      setProfile(data);
      setFirstName(data.firstName);
      setLastName(data.lastName);
      setPhone(data.phone || '');
      setAvatarUrl(data.avatarUrl || '');
    } catch {}
    setLoading(false);
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    const token = localStorage.getItem('token');
    try {
      const updated = await apiFetch('/users/me', {
        method: 'PATCH',
        token: token || undefined,
        body: JSON.stringify({ firstName, lastName, phone: phone || null, avatarUrl: avatarUrl || null }),
      });
      setProfile({ ...profile!, ...updated });
      // Update stored user
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        user.firstName = updated.firstName;
        user.lastName = updated.lastName;
        localStorage.setItem('user', JSON.stringify(user));
      }
      setMessage('Profile updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    }
    setSaving(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage('');
    setPwError('');

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }

    setChangingPw(true);
    const token = localStorage.getItem('token');
    try {
      const res = await apiFetch('/users/me/password', {
        method: 'PATCH',
        token: token || undefined,
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPwMessage(res.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password.');
    }
    setChangingPw(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>

      {/* Avatar Preview */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-blue-600">
                {firstName?.[0]}{lastName?.[0]}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{profile?.firstName} {profile?.lastName}</h2>
            <p className="text-sm text-gray-500">{profile?.email}</p>
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-medium">{profile?.role}</span>
          </div>
        </div>
      </div>

      {/* Profile Update Form */}
      <form onSubmit={handleUpdateProfile} className="bg-white rounded-xl border p-6 mb-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Personal Information</h3>

        {message && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-4 py-2">{message}</div>}
        {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            type="tel"
            placeholder="+44 7xxx xxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            type="url"
            placeholder="https://example.com/avatar.jpg"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">Paste a URL to an image. File upload coming soon.</p>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">Email:</span>
          <span>{profile?.email}</span>
          <span className="text-gray-400">(cannot be changed)</span>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Password Change Form */}
      <form onSubmit={handleChangePassword} className="bg-white rounded-xl border p-6 mb-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Change Password</h3>

        {pwMessage && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-4 py-2">{pwMessage}</div>}
        {pwError && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2">{pwError}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={changingPw}
          className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm font-medium disabled:opacity-50"
        >
          {changingPw ? 'Changing...' : 'Change Password'}
        </button>
      </form>

      {/* Account Info */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Account</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Two-Factor Authentication</span>
            <span className={`font-medium ${profile?.mfaEnabled ? 'text-green-600' : 'text-gray-400'}`}>
              {profile?.mfaEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Role</span>
            <span className="font-medium text-gray-900">{profile?.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
