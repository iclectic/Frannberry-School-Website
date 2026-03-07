'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface TrendData {
  termName: string;
  overallAverage: number;
  subjectAverages: Record<string, number>;
}

interface ComparisonData {
  subject: string;
  myAverage: number;
  classAverage: number;
}

const CHART_COLOURS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2'];

export default function AnalyticsPage() {
  const [role, setRole] = useState('');
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [comparison, setComparison] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const u = JSON.parse(stored);
      setRole(u.role);
    }
  }, []);

  useEffect(() => {
    if (role === 'PARENT') {
      fetchChildren();
    } else if (role === 'STUDENT') {
      fetchMyData();
    }
  }, [role]);

  useEffect(() => {
    if (selectedChild) fetchChildData(selectedChild);
  }, [selectedChild]);

  async function fetchChildren() {
    const token = localStorage.getItem('token');
    try {
      const data = await apiFetch('/users/me/children', { token: token || undefined });
      setChildren(data);
      if (data.length > 0) setSelectedChild(data[0].id);
    } catch { setChildren([]); setLoading(false); }
  }

  async function fetchMyData() {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const [t, c] = await Promise.all([
        apiFetch('/analytics/my/trends', { token: token || undefined }),
        apiFetch('/analytics/my/comparison', { token: token || undefined }),
      ]);
      setTrends(t);
      setComparison(c);
    } catch { setTrends([]); setComparison([]); }
    setLoading(false);
  }

  async function fetchChildData(studentProfileId: string) {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const [t, c] = await Promise.all([
        apiFetch(`/analytics/student/${studentProfileId}/trends`, { token: token || undefined }),
        apiFetch(`/analytics/student/${studentProfileId}/comparison`, { token: token || undefined }),
      ]);
      setTrends(t);
      setComparison(c);
    } catch { setTrends([]); setComparison([]); }
    setLoading(false);
  }

  // Build line chart data from trends
  const allSubjects = Array.from(new Set(trends.flatMap((t) => Object.keys(t.subjectAverages))));
  const trendChartData = trends.map((t) => ({
    term: t.termName,
    Overall: t.overallAverage,
    ...t.subjectAverages,
  }));

  if (!['STUDENT', 'PARENT', 'ADMIN', 'TEACHER'].includes(role)) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Performance Analytics</h1>
        <p className="text-gray-500 text-center py-12">Analytics are not available for your role.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Performance Analytics</h1>

      {role === 'PARENT' && children.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Child</label>
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
          >
            {children.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.user?.firstName} {c.user?.lastName}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Grade Trends Over Terms */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Grade Trends Over Terms</h2>
            {trendChartData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No result data available yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="term" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Overall" stroke="#1e40af" strokeWidth={3} dot={{ r: 5 }} />
                  {allSubjects.map((subj, i) => (
                    <Line
                      key={subj}
                      type="monotone"
                      dataKey={subj}
                      stroke={CHART_COLOURS[i % CHART_COLOURS.length]}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Subject Comparison vs Class Average */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Score vs Class Average</h2>
            {comparison.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No comparison data available yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={comparison} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="myAverage" name="Your Average" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="classAverage" name="Class Average" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Summary Cards */}
          {trends.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(() => {
                const latest = trends[trends.length - 1];
                const prev = trends.length > 1 ? trends[trends.length - 2] : null;
                const diff = prev ? latest.overallAverage - prev.overallAverage : 0;
                return (
                  <>
                    <div className="bg-white rounded-xl border p-5 text-center">
                      <p className="text-sm text-gray-500 mb-1">Latest Average</p>
                      <p className="text-3xl font-bold text-blue-700">{latest.overallAverage}%</p>
                    </div>
                    <div className="bg-white rounded-xl border p-5 text-center">
                      <p className="text-sm text-gray-500 mb-1">Subjects Taken</p>
                      <p className="text-3xl font-bold text-gray-900">{Object.keys(latest.subjectAverages).length}</p>
                    </div>
                    <div className="bg-white rounded-xl border p-5 text-center">
                      <p className="text-sm text-gray-500 mb-1">Terms Recorded</p>
                      <p className="text-3xl font-bold text-gray-900">{trends.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border p-5 text-center">
                      <p className="text-sm text-gray-500 mb-1">Change</p>
                      <p className={`text-3xl font-bold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
