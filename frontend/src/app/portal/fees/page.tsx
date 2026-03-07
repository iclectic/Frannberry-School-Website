'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface Invoice {
  id: string;
  invoiceNo: string;
  amount: number;
  amountPaid: number;
  status: string;
  dueDate: string;
  issuedAt: string;
  student?: { user: { firstName: string; lastName: string } };
  feeTemplate?: { name: string };
  payments?: Payment[];
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  reference?: string;
  note?: string;
  paidAt: string;
  recordedBy?: { firstName: string; lastName: string };
}

interface FeeTemplate {
  id: string;
  name: string;
  description?: string;
  amount: number;
  term?: { name: string };
  class?: { name: string };
  dueDate?: string;
}

const STATUS_BADGE: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-yellow-100 text-yellow-800',
  UNPAID: 'bg-red-100 text-red-800',
  OVERDUE: 'bg-red-200 text-red-900',
};

export default function FeesPage() {
  const [role, setRole] = useState('');
  const [tab, setTab] = useState<'invoices' | 'templates'>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [parentData, setParentData] = useState<any[]>([]);
  const [templates, setTemplates] = useState<FeeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', method: 'BANK_TRANSFER', reference: '', note: '' });
  const [showTemplate, setShowTemplate] = useState(false);
  const [tplForm, setTplForm] = useState({ name: '', description: '', amount: '', dueDate: '' });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const u = JSON.parse(stored);
      setRole(u.role);
    }
  }, []);

  useEffect(() => {
    if (role) fetchData();
  }, [role, tab]);

  async function fetchData() {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      if (role === 'ADMIN') {
        if (tab === 'invoices') {
          const data = await apiFetch('/fees/invoices', { token: token || undefined });
          setInvoices(data);
        } else {
          const data = await apiFetch('/fees/templates', { token: token || undefined });
          setTemplates(data);
        }
      } else {
        const data = await apiFetch('/fees/my', { token: token || undefined });
        if (role === 'PARENT') {
          setParentData(data);
        } else {
          setInvoices(data);
        }
      }
    } catch { setInvoices([]); setTemplates([]); }
    setLoading(false);
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvoice) return;
    const token = localStorage.getItem('token');
    try {
      await apiFetch('/fees/payments', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amount: parseFloat(payForm.amount),
          method: payForm.method,
          reference: payForm.reference || undefined,
          note: payForm.note || undefined,
        }),
      });
      setShowPayment(false);
      setPayForm({ amount: '', method: 'BANK_TRANSFER', reference: '', note: '' });
      setSelectedInvoice(null);
      fetchData();
    } catch {}
  }

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await apiFetch('/fees/templates', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({
          name: tplForm.name,
          description: tplForm.description || undefined,
          amount: parseFloat(tplForm.amount),
          dueDate: tplForm.dueDate || undefined,
        }),
      });
      setShowTemplate(false);
      setTplForm({ name: '', description: '', amount: '', dueDate: '' });
      fetchData();
    } catch {}
  }

  async function handleGenerate(templateId: string) {
    const token = localStorage.getItem('token');
    try {
      const res = await apiFetch('/fees/invoices/generate', {
        method: 'POST',
        token: token || undefined,
        body: JSON.stringify({ feeTemplateId: templateId }),
      });
      alert(`Generated ${res.generated} invoice(s)`);
      setTab('invoices');
      fetchData();
    } catch {}
  }

  function renderInvoiceTable(list: Invoice[]) {
    if (list.length === 0) return <p className="text-center text-gray-500 py-12">No invoices found.</p>;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600">Invoice #</th>
              {role === 'ADMIN' && <th className="px-4 py-3 font-medium text-gray-600">Student</th>}
              <th className="px-4 py-3 font-medium text-gray-600">Fee</th>
              <th className="px-4 py-3 font-medium text-gray-600">Amount</th>
              <th className="px-4 py-3 font-medium text-gray-600">Paid</th>
              <th className="px-4 py-3 font-medium text-gray-600">Balance</th>
              <th className="px-4 py-3 font-medium text-gray-600">Due Date</th>
              <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              {role === 'ADMIN' && <th className="px-4 py-3 font-medium text-gray-600">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{inv.invoiceNo}</td>
                {role === 'ADMIN' && <td className="px-4 py-3">{inv.student?.user?.firstName} {inv.student?.user?.lastName}</td>}
                <td className="px-4 py-3">{inv.feeTemplate?.name}</td>
                <td className="px-4 py-3 font-medium">£{inv.amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-green-700">£{inv.amountPaid.toFixed(2)}</td>
                <td className="px-4 py-3 text-red-700">£{(inv.amount - inv.amountPaid).toFixed(2)}</td>
                <td className="px-4 py-3">{new Date(inv.dueDate).toLocaleDateString('en-GB')}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_BADGE[inv.status] || 'bg-gray-100'}`}>{inv.status}</span>
                </td>
                {role === 'ADMIN' && (
                  <td className="px-4 py-3">
                    {inv.status !== 'PAID' && (
                      <button
                        onClick={() => { setSelectedInvoice(inv); setShowPayment(true); setPayForm({ ...payForm, amount: String(inv.amount - inv.amountPaid) }); }}
                        className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Record Payment
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Fee Management</h1>

      {role === 'ADMIN' && (
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('invoices')} className={`px-4 py-2 text-sm rounded-lg font-medium ${tab === 'invoices' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Invoices</button>
          <button onClick={() => setTab('templates')} className={`px-4 py-2 text-sm rounded-lg font-medium ${tab === 'templates' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Fee Templates</button>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && selectedInvoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleRecordPayment} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Record Payment — {selectedInvoice.invoiceNo}</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (£)</label>
              <input type="number" step="0.01" required className="w-full border rounded-lg px-3 py-2 text-sm" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                {['CASH', 'BANK_TRANSFER', 'CARD', 'ONLINE', 'OTHER'].map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">Confirm Payment</button>
              <button type="button" onClick={() => { setShowPayment(false); setSelectedInvoice(null); }} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
      ) : role === 'ADMIN' && tab === 'templates' ? (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowTemplate(!showTemplate)} className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ New Fee Template</button>
          </div>
          {showTemplate && (
            <form onSubmit={handleCreateTemplate} className="bg-white rounded-xl border p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" required value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (£)</label>
                <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" required value={tplForm.amount} onChange={(e) => setTplForm({ ...tplForm, amount: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={tplForm.dueDate} onChange={(e) => setTplForm({ ...tplForm, dueDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={tplForm.description} onChange={(e) => setTplForm({ ...tplForm, description: e.target.value })} />
              </div>
              <div className="md:col-span-2 flex gap-3">
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Create Template</button>
                <button type="button" onClick={() => setShowTemplate(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              </div>
            </form>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div key={tpl.id} className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-gray-900 mb-1">{tpl.name}</h3>
                {tpl.description && <p className="text-sm text-gray-500 mb-2">{tpl.description}</p>}
                <p className="text-2xl font-bold text-blue-700 mb-2">£{tpl.amount.toFixed(2)}</p>
                {tpl.term && <p className="text-xs text-gray-500">Term: {tpl.term.name}</p>}
                {tpl.class && <p className="text-xs text-gray-500">Class: {tpl.class.name}</p>}
                {tpl.dueDate && <p className="text-xs text-gray-500">Due: {new Date(tpl.dueDate).toLocaleDateString('en-GB')}</p>}
                <button onClick={() => handleGenerate(tpl.id)} className="mt-3 text-sm px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 w-full">
                  Generate Invoices
                </button>
              </div>
            ))}
            {templates.length === 0 && <p className="text-gray-500 col-span-full text-center py-12">No fee templates yet.</p>}
          </div>
        </div>
      ) : role === 'PARENT' ? (
        <div className="space-y-6">
          {parentData.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No fee records found.</p>
          ) : (
            parentData.map((child: any, idx: number) => (
              <div key={idx}>
                <h3 className="font-semibold text-gray-800 mb-3">{child.student?.user?.firstName} {child.student?.user?.lastName}</h3>
                <div className="bg-white rounded-xl border overflow-hidden">
                  {renderInvoiceTable(child.invoices || [])}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          {renderInvoiceTable(invoices)}
        </div>
      )}
    </div>
  );
}
