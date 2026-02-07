'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { ResponsiveContainer, PageHeader, Card } from '@/components/ui/ResponsiveContainer';
import { ResponsiveForm, FormField, FormActions } from '@/components/ui/ResponsiveForm';
import { MobileTable, MobileCard, MobileCardRow, DesktopTable, ActionButtons, EmptyState } from '@/components/ui/MobileTable';

interface DebitNote {
  id: string;
  debitNoteNumber: string;
  date: string;
  accountId: string;
  account?: {
    id: string;
    name: string;
  };
  amount: number;
  reason: string;
  description?: string;
  reference?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Account {
  id: string;
  name: string;
  accountType: string;
}

export default function DebitNotePage() {
  const user = getCurrentUser();
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    accountId: '',
    amount: '',
    reason: '',
    description: '',
    reference: '',
  });

  useEffect(() => {
    fetchDebitNotes();
    fetchAccounts();
  }, []);

  const fetchDebitNotes = async () => {
    try {
      const response = await fetch('/api/debit-note', {
        headers: {
          "x-user-role": user?.role || "",
          "x-company-id": user?.companyId || "",
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDebitNotes(data);
      }
    } catch (error) {
      console.error('Error fetching debit notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts', {
        headers: {
          "x-user-role": user?.role || "",
          "x-company-id": user?.companyId || "",
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Filter for supplier/vendor accounts only
        const supplierAccounts = data.filter(
          (acc: Account) => acc.accountType === 'SUPPLIER' || acc.accountType === 'PAYABLE'
        );
        setAccounts(supplierAccounts);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/debit-note', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          "x-user-role": user?.role || "",
          "x-company-id": user?.companyId || "",
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      if (response.ok) {
        setShowForm(false);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          accountId: '',
          amount: '',
          reason: '',
          description: '',
          reference: '',
        });
        fetchDebitNotes();
      }
    } catch (error) {
      console.error('Error creating debit note:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this debit note?')) return;

    try {
      const response = await fetch(`/api/debit-note?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchDebitNotes();
      }
    } catch (error) {
      console.error('Error deleting debit note:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      APPLIED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
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
        title="Debit Notes"
        description="Issue debit notes to suppliers for returns, shortages, or adjustments"
        action={{
          label: 'New Debit Note',
          onClick: () => setShowForm(true),
        }}
      />

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">New Debit Note</h2>
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

              <FormField label="Supplier Account" required>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Supplier</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
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
                  required
                />
              </FormField>

              <FormField label="Reason" required>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Reason</option>
                  <option value="RETURN">Purchase Return</option>
                  <option value="SHORTAGE">Quantity Shortage</option>
                  <option value="QUALITY">Quality Issue</option>
                  <option value="PRICE">Price Difference</option>
                  <option value="DAMAGE">Damaged Goods</option>
                  <option value="OTHER">Other</option>
                </select>
              </FormField>

              <FormField label="Description" required>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  required
                />
              </FormField>

              <FormField label="Reference (Optional)">
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Purchase invoice number or reference"
                />
              </FormField>

              <FormActions
                onCancel={() => setShowForm(false)}
                submitLabel="Create Debit Note"
              />
            </ResponsiveForm>
          </Card>
        </div>
      )}

      {/* Debit Notes Table */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Debit Notes List</h2>

        {debitNotes.length === 0 ? (
          <EmptyState
            message="No debit notes found"
            actionLabel="Create First Debit Note"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <>
            {/* Desktop Table */}
            <DesktopTable>
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Debit Note No.</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Supplier</th>
                  <th className="text-left py-3 px-4">Reason</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {debitNotes.map((note) => (
                  <tr key={note.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{note.debitNoteNumber}</td>
                    <td className="py-3 px-4">{new Date(note.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{note.account?.name || 'N/A'}</div>
                        {note.reference && (
                          <div className="text-sm text-gray-500">Ref: {note.reference}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="text-sm">{note.reason}</div>
                        {note.description && (
                          <div className="text-xs text-gray-500">{note.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-red-600">
                      ₹{note.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(note.status)}</td>
                    <td className="py-3 px-4">
                      <ActionButtons
                        onDelete={() => handleDelete(note.id)}
                        showView={false}
                        showEdit={false}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </DesktopTable>

            {/* Mobile Cards */}
            <MobileTable>
              {debitNotes.map((note) => (
                <MobileCard key={note.id}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{note.debitNoteNumber}</div>
                      <div className="text-sm text-gray-500">{new Date(note.date).toLocaleDateString()}</div>
                    </div>
                    {getStatusBadge(note.status)}
                  </div>
                  <MobileCardRow label="Supplier" value={note.account?.name || 'N/A'} />
                  <MobileCardRow label="Reason" value={note.reason} />
                  {note.description && (
                    <MobileCardRow label="Description" value={note.description} />
                  )}
                  {note.reference && (
                    <MobileCardRow label="Reference" value={note.reference} />
                  )}
                  <MobileCardRow 
                    label="Amount" 
                    value={`₹${note.amount.toFixed(2)}`}
                    valueClassName="font-medium text-red-600"
                  />
                  <div className="mt-3 pt-3 border-t">
                    <button
                      onClick={() => handleDelete(note.id)}
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
