'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { exportToCSV } from '@/lib/export';

interface PaymentReceipt {
  id: string;
  receiptNo: string;
  date: string;
  amount: number;
  paymentMode: string;
  referenceNo?: string;
  status: string;
  narration?: string;
  party?: { id: string; name: string };
}

interface Party {
  id: string;
  code: string;
  name: string;
  phone?: string;
}

interface BankAccount {
  id: string;
  accountNo: string;
  bankName: string;
  accountName: string;
}

export default function PaymentReceiptsPage() {
  const user = getCurrentUser();
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showForm, setShowForm] = useState(true);
  const [showList, setShowList] = useState(false);
  const [formData, setFormData] = useState({
    receiptNo: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMode: 'CASH',
    partyId: '',
    bankAccountId: '',
    referenceNo: '',
    narration: '',
  });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [editingId, setEditingId] = useState('');

  useEffect(() => {
    fetchReceipts();
    fetchParties();
    fetchBankAccounts();
  }, [statusFilter]);

  const fetchBankAccounts = async () => {
    try {
      const response = await fetch('/api/bank-accounts', {
        headers: {
          'x-user-role': user?.role || 'ADMIN',
          'x-user-id': user?.id || '',
          'x-company-id': user?.companyId || '',
        },
      });
      
      if (!response.ok) {
        console.error('Bank accounts API error:', response.status, response.statusText);
        setBankAccounts([]);
        return;
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        console.error('Bank accounts API did not return an array:', data);
        setBankAccounts([]);
        return;
      }
      
      setBankAccounts(data);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      setBankAccounts([]);
    }
  };

  const fetchReceipts = async () => {
    try {
      let url = '/api/payment-receipts';
      if (statusFilter) url += `?status=${statusFilter}`;
      const response = await fetch(url, {
        headers: {
          'x-user-role': user?.role || 'ADMIN',
          'x-user-id': user?.id || '',
          'x-company-id': user?.companyId || '',
        },
      });
      
      if (!response.ok) {
        console.error('Payment receipts API error:', response.status, response.statusText);
        setReceipts([]);
        return;
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        console.error('Payment receipts API did not return an array:', data);
        setReceipts([]);
        return;
      }
      
      setReceipts(data);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      setReceipts([]);
    }
  };

  const fetchParties = async () => {
    try {
      const response = await fetch('/api/accounts', {
        headers: {
          'x-user-role': user?.role || 'ADMIN',
          'x-user-id': user?.id || '',
          'x-company-id': user?.companyId || '',
        },
      });
      
      if (!response.ok) {
        console.error('Accounts API error:', response.status, response.statusText);
        setParties([]);
        return;
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        console.error('Accounts API did not return an array:', data);
        setParties([]);
        return;
      }
      
      const filtered = data.filter((acc: any) => 
        acc.partyType === 'CUSTOMER' || !acc.partyType
      );
      setParties(filtered);
    } catch (error) {
      console.error('Error fetching parties:', error);
      setParties([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/payment-receipts?id=${editingId}` : '/api/payment-receipts';
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-company-id': user?.companyId || '',
          'x-user-role': user?.role || 'ADMIN',
        },
        body: JSON.stringify({ id: editingId, ...formData }),
      });

      if (response.ok) {
        alert(editingId ? 'Payment receipt updated successfully' : 'Payment receipt saved successfully');
        setFormData({
          receiptNo: '',
          date: new Date().toISOString().split('T')[0],
          amount: 0,
          paymentMode: 'CASH',
          partyId: '',
          bankAccountId: '',
          referenceNo: '',
          narration: '',
        });
        setEditingId('');
        setShowForm(true);
        setShowList(false);
        fetchReceipts();
      }
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert('Error: Failed to save receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (receipt: PaymentReceipt) => {
    setEditingId(receipt.id);
    setFormData({
      receiptNo: receipt.receiptNo,
      date: new Date(receipt.date).toISOString().split('T')[0],
      amount: receipt.amount,
      paymentMode: receipt.paymentMode,
      partyId: receipt.party?.id || '',
      bankAccountId: '',
      referenceNo: receipt.referenceNo || '',
      narration: receipt.narration || '',
    });
    setShowForm(true);
    setShowList(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    
    try {
      const response = await fetch(`/api/payment-receipts?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Payment receipt deleted successfully');
        fetchReceipts();
      } else {
        alert('Error: Failed to delete receipt');
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Error: Failed to delete receipt');
    }
  };

  const handleClearCheque = async (receipt: PaymentReceipt) => {
    if (!confirm(`Clear cheque ${receipt.referenceNo || receipt.receiptNo}?`)) return;
    
    try {
      const response = await fetch(`/api/payment-receipts?id=${receipt.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-company-id': user?.companyId || '',
          'x-user-role': user?.role || 'ADMIN',
        },
        body: JSON.stringify({ 
          id: receipt.id, 
          status: 'CLEARED',
          date: receipt.date,
          amount: receipt.amount,
          paymentMode: receipt.paymentMode,
          partyId: receipt.party?.id,
          referenceNo: receipt.referenceNo,
          narration: receipt.narration,
        }),
      });

      if (response.ok) {
        alert('Cheque marked as cleared');
        fetchReceipts();
      } else {
        alert('Error: Failed to clear cheque');
      }
    } catch (error) {
      console.error('Error clearing cheque:', error);
      alert('Error: Failed to clear cheque');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Payment Receipts</h1>
        <button
          onClick={() => {
            setShowList(!showList);
            setShowForm(!showForm);
          }}
          className="bg-gray-600 text-white px-6 py-2 rounded font-semibold hover:bg-gray-700"
        >
          {showList ? "Back to Form" : "View List"}
        </button>
        {showList && receipts.length > 0 && (
          <button
            onClick={() =>
              exportToCSV(
                receipts.map(r => ({
                  receiptNo: r.receiptNo,
                  date: r.date,
                  amount: r.amount,
                  paymentMode: r.paymentMode,
                  referenceNo: r.referenceNo || "",
                  status: r.status,
                  party: r.party?.name || ""
                })), "payment-receipts"
              )
            }
            className="bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-700 ml-2"
          >
            Export CSV
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-lg shadow mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                Receipt No <span className="text-gray-500 text-xs">(Auto-generated if empty)</span>
              </label>
              <input
                type="text"
                value={formData.receiptNo}
                onChange={(e) =>
                  setFormData({ ...formData, receiptNo: e.target.value })
                }
                placeholder="Leave empty for auto-generation"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Amount</label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: parseFloat(e.target.value),
                  })
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Payment Mode</label>
              <select
                value={formData.paymentMode}
                onChange={(e) =>
                  setFormData({ ...formData, paymentMode: e.target.value, bankAccountId: e.target.value === 'CASH' ? '' : formData.bankAccountId })
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>
            {(formData.paymentMode === 'CHEQUE' || formData.paymentMode === 'BANK_TRANSFER') && (
              <div>
                <label className="block text-sm font-semibold mb-2">Bank Account *</label>
                <select
                  required
                  value={formData.bankAccountId}
                  onChange={(e) =>
                    setFormData({ ...formData, bankAccountId: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Select Bank Account</option>
                  {bankAccounts.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bankName} - {bank.accountNo} ({bank.accountName})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold mb-2">Party</label>
              <select
                value={formData.partyId}
                onChange={(e) =>
                  setFormData({ ...formData, partyId: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Select</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Reference No</label>
              <input
                type="text"
                value={formData.referenceNo}
                onChange={(e) =>
                  setFormData({ ...formData, referenceNo: e.target.value })
                }
                placeholder="Cheque No or Transaction ID"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Description</label>
            <textarea
              value={formData.narration}
              onChange={(e) =>
                setFormData({ ...formData, narration: e.target.value })
              }
              className="w-full border border-gray-300 rounded px-3 py-2"
              rows={3}
            />
          </div>
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-2 rounded font-semibold hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingId ? 'Update' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setShowList(true);
                setEditingId('');
                setFormData({
                  receiptNo: '',
                  date: new Date().toISOString().split('T')[0],
                  amount: 0,
                  paymentMode: 'CASH',
                  partyId: '',
                  bankAccountId: '',
                  referenceNo: '',
                  narration: '',
                });
              }}
              className="bg-gray-500 text-white px-6 py-2 rounded font-semibold hover:bg-gray-600"
            >
              Clear
            </button>
          </div>
        </form>
      )}

      {/* Filter */}
      {showList && (
        <div className="mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CLEARED">Cleared</option>
            <option value="BOUNCED">Bounced</option>
          </select>
        </div>
      )}

      {/* List */}
      {showList && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left">Receipt No</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Amount</th>
                <th className="px-6 py-3 text-left">Mode</th>
                <th className="px-6 py-3 text-left">Party</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-3 font-semibold">{receipt.receiptNo}</td>
                  <td className="px-6 py-3">
                    {new Date(receipt.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">{receipt.amount.toFixed(2)}</td>
                  <td className="px-6 py-3">{receipt.paymentMode}</td>
                  <td className="px-6 py-3">{receipt.party?.name || '-'}</td>
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded text-white text-sm ${
                      receipt.status === 'PENDING' ? 'bg-yellow-500' :
                      receipt.status === 'CLEARED' ? 'bg-green-500' :
                      'bg-red-500'
                    }`}>
                      {receipt.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 space-x-2">
                    {receipt.status === 'PENDING' && receipt.paymentMode === 'CHEQUE' && (
                      <button
                        onClick={() => handleClearCheque(receipt)}
                        className="text-green-600 hover:text-green-800 font-medium text-sm"
                      >
                        Clear ✓
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(receipt)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(receipt.id)}
                      className="text-red-500 hover:text-red-700 font-medium text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
