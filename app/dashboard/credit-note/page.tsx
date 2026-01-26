'use client';

import { useState, useEffect } from 'react';
import { ResponsiveContainer, PageHeader, Card } from '@/components/ui/ResponsiveContainer';
import { ResponsiveForm, FormField, FormActions } from '@/components/ui/ResponsiveForm';
import { MobileTable, MobileCard, MobileCardRow, DesktopTable, ActionButtons, EmptyState } from '@/components/ui/MobileTable';

interface CreditNote {
  id: string;
  creditNoteNumber: string;
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

export default function CreditNotePage() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
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
    fetchCreditNotes();
    fetchAccounts();
  }, []);

  const fetchCreditNotes = async () => {
    try {
      const response = await fetch('/api/credit-note');
      if (response.ok) {
        const data = await response.json();
        setCreditNotes(data);
      }
    } catch (error) {
      console.error('Error fetching credit notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        // Filter for customer accounts only
        const customerAccounts = data.filter(
          (acc: Account) => acc.accountType === 'CUSTOMER' || acc.accountType === 'RECEIVABLE'
        );
        setAccounts(customerAccounts);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/credit-note', {
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
          accountId: '',
          amount: '',
          reason: '',
          description: '',
          reference: '',
        });
        fetchCreditNotes();
      }
    } catch (error) {
      console.error('Error creating credit note:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credit note?')) return;

    try {
      const response = await fetch(`/api/credit-note?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchCreditNotes();
      }
    } catch (error) {
      console.error('Error deleting credit note:', error);
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
        title="Credit Notes"
        description="Issue credit notes to customers for returns, discounts, or corrections"
        action={{
          label: 'New Credit Note',
          onClick: () => setShowForm(true),
        }}
      />

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">New Credit Note</h2>
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

              <FormField label="Customer Account" required>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Customer</option>
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
                  <option value="RETURN">Sales Return</option>
                  <option value="DISCOUNT">Discount Adjustment</option>
                  <option value="ERROR">Billing Error</option>
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
                  placeholder="Invoice number or reference"
                />
              </FormField>

              <FormActions
                onCancel={() => setShowForm(false)}
                submitLabel="Create Credit Note"
              />
            </ResponsiveForm>
          </Card>
        </div>
      )}

      {/* Credit Notes Table */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Credit Notes List</h2>

        {creditNotes.length === 0 ? (
          <EmptyState
            message="No credit notes found"
            actionLabel="Create First Credit Note"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <>
            {/* Desktop Table */}
            <DesktopTable>
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Credit Note No.</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Customer</th>
                  <th className="text-left py-3 px-4">Reason</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {creditNotes.map((note) => (
                  <tr key={note.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{note.creditNoteNumber}</td>
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
                    <td className="py-3 px-4 text-right font-medium text-green-600">
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
              {creditNotes.map((note) => (
                <MobileCard key={note.id}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{note.creditNoteNumber}</div>
                      <div className="text-sm text-gray-500">{new Date(note.date).toLocaleDateString()}</div>
                    </div>
                    {getStatusBadge(note.status)}
                  </div>
                  <MobileCardRow label="Customer" value={note.account?.name || 'N/A'} />
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
                    valueClassName="font-medium text-green-600"
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
