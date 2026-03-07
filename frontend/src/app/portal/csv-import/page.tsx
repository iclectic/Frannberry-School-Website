'use client';

import { useState } from 'react';

export default function CsvImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [error, setError] = useState('');

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setResult(null);
    setError('');

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/admin/import-csv`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    }
    setUploading(false);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Bulk CSV Import</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Upload a CSV file to create multiple student or teacher accounts at once.
      </p>

      {/* CSV Format Guide */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">CSV Format</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Your CSV file must include a header row with these columns:
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm border dark:border-gray-700 rounded-lg overflow-hidden w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Column</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Required</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              <tr><td className="px-3 py-2 font-mono text-xs">email</td><td className="px-3 py-2 text-green-600">Yes</td><td className="px-3 py-2 text-gray-600 dark:text-gray-400">User email address</td></tr>
              <tr><td className="px-3 py-2 font-mono text-xs">firstname</td><td className="px-3 py-2 text-green-600">Yes</td><td className="px-3 py-2 text-gray-600 dark:text-gray-400">First name</td></tr>
              <tr><td className="px-3 py-2 font-mono text-xs">lastname</td><td className="px-3 py-2 text-green-600">Yes</td><td className="px-3 py-2 text-gray-600 dark:text-gray-400">Last name</td></tr>
              <tr><td className="px-3 py-2 font-mono text-xs">role</td><td className="px-3 py-2 text-green-600">Yes</td><td className="px-3 py-2 text-gray-600 dark:text-gray-400">STUDENT, TEACHER, PARENT, or STAFF</td></tr>
              <tr><td className="px-3 py-2 font-mono text-xs">password</td><td className="px-3 py-2 text-gray-400">No</td><td className="px-3 py-2 text-gray-600 dark:text-gray-400">Defaults to Welcome123!</td></tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Example:</p>
          <pre className="text-xs text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">email,firstname,lastname,role,password
john.doe@school.com,John,Doe,STUDENT,MyPass123!
jane.smith@school.com,Jane,Smith,TEACHER,
mike.brown@example.com,Mike,Brown,PARENT,</pre>
        </div>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select CSV File</label>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); setError(''); }}
            className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200"
          />
        </div>
        {file && <p className="text-xs text-gray-400 mt-2">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}

        <button
          type="submit"
          disabled={!file || uploading}
          className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          {uploading ? 'Importing…' : 'Upload & Import'}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Import Results</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{result.created}</p>
              <p className="text-xs text-green-600 dark:text-green-400">Users Created</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{result.skipped}</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">Rows Skipped</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Errors:</h3>
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-3 py-1.5">
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.errors.length === 0 && result.created > 0 && (
            <p className="text-sm text-green-600 dark:text-green-400">All rows imported successfully!</p>
          )}
        </div>
      )}
    </div>
  );
}
