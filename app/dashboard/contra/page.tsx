'use client';

import { useState, useEffect } from 'react';
import { ResponsiveContainer, PageHeader, Card } from '@/components/ui/ResponsiveContainer';
import { ResponsiveForm, FormField, FormActions } from '@/components/ui/ResponsiveForm';
import { MobileTable, MobileCard, MobileCardRow, DesktopTable, EmptyState } from '@/components/ui/MobileTable';

interface ContraEntry {
  id: string;
  contraNumber: string;
  date: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  narration?: string;
  fromAccount?: {
    id: string;
    name: string;
  };
  toAccount?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface Account {
  id: string;
  name: string;
  accountType: string;
}

export default function ContraPage() {
  const [entries, setEntries] = useState<ContraEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    narration: '',
  });

  useEffect(() => {
    fetchEntries();
    fetchAccounts();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await fetch('/api/contra');
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Error fetching contra entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        // Filter only CASH and BANK accounts
        const cashBankAccounts = data.filter(
          (acc: Account) => acc.accountType === 'CASH' || acc.accountType === 'BANK'
        );
        setAccounts(cashBankAccounts);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.fromAccountId === formData.toAccountId) {
      alert('From and To accounts must be different');
      return;
    }

    try {
      const response = await fetch('/api/contra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      if (response.ok) {
        setShowForm(false);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          fromAccountId: '',
          toAccountId: '',
          amount: '',
          narration: '',
        });
        fetchEntries();
      }
    } catch (error) {
      console.error('Error creating contra entry:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contra entry?')) return;

    try {
      const response = await fetch(`/api/contra?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchEntries();
      }
    } catch (error) {
      console.error('Error deleting contra entry:', error);
    }
  };

  if (loading) {
    return (
      <ResponsiveContainer>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading...</p>
        </div>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer>
      <PageHeader
        title="Contra Entry"
        description="Cash to Bank or Bank to Bank transfers"
        action={{
          label: 'New Contra Entry',
          onClick: () => setShowForm(true),
        }}
      />

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">New Contra Entry</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <ResponsiveForm onSubmit={handleSubmit}>
              <FormField label="Date" required>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </FormField>

              <FormField label="From Account (Credit)" required>
                <select
                  value={formData.fromAccountId}
                  onChange={(e) => setFormData({ ...formData, fromAccountId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.accountType})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="To Account (Debit)" required>
                <select
                  value={formData.toAccountId}
                  onChange={(e) => setFormData({ ...formData, toAccountId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.accountType})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Amount" required>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0.00"
                  required
                />
              </FormField>

              <FormField label="Narration">
                <textarea
                  value={formData.narration}
                  onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Optional description"
                />
              </FormField>

              <FormActions
                onCancel={() => setShowForm(false)}
                submitLabel="Create Contra Entry"
              />
            </ResponsiveForm>
          </Card>
        </div>
      )}

      {/* Contra Entries Table */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Contra Entries</h2>

        {entries.length === 0 ? (
          <EmptyState
            message="No contra entries found"
            actionLabel="Create First Entry"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <>
            {/* Desktop Table */}
            <DesktopTable>
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Contra No.</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">From Account</th>
                  <th className="text-left py-3 px-4">To Account</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{entry.contraNumber}</td>
                    <td className="py-3 px-4">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4">{entry.fromAccount?.name || 'N/A'}</td>
                    <td className="py-3 px-4">{entry.toAccount?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-right font-medium">₹{entry.amount.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DesktopTable>

            {/* Mobile Cards */}
            <MobileTable>
              {entries.map((entry) => (
                <MobileCard key={entry.id}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{entry.contraNumber}</div>
                      <div className="text-sm text-gray-500">{new Date(entry.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <MobileCardRow label="From" value={entry.fromAccount?.name || 'N/A'} />
                  <MobileCardRow label="To" value={entry.toAccount?.name || 'N/A'} />
                  <MobileCardRow 
                    label="Amount" 
                    value={`₹${entry.amount.toFixed(2)}`}
                    valueClassName="font-medium text-green-600"
                  />
                  {entry.narration && (
                    <MobileCardRow label="Narration" value={entry.narration} />
                  )}
                  <div className="mt-3 pt-3 border-t">
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="w-full px-3 py-2 bg-red-600 text-white rounded-lg text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </MobileCard>
              ))}
            </MobileTable>
          </>
        )}
      </Card>
    </ResponsiveContainer>
  );
}
