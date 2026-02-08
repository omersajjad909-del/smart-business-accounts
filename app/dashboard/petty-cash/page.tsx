'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { ResponsiveContainer, PageHeader, Card } from '@/components/ui/ResponsiveContainer';
import { ResponsiveForm, FormField, FormActions } from '@/components/ui/ResponsiveForm';
import { MobileTable, MobileCard, MobileCardRow, DesktopTable, ActionButtons, EmptyState } from '@/components/ui/MobileTable';

interface PettyCash {
  id: string;
  accountName: string;
  openingBalance: number;
  currentBalance: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PettyCashExpense {
  id: string;
  pettyCashId: string;
  date: string;
  voucherNumber: string;
  description: string;
  amount: number;
  category: string;
  createdAt: string;
}

export default function PettyCashPage() {
  const user = getCurrentUser();
  const [pettyCashAccounts, setPettyCashAccounts] = useState<PettyCash[]>([]);
  const [expenses, setExpenses] = useState<PettyCashExpense[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showExpenses, setShowExpenses] = useState(false);

  // Form states
  const [accountForm, setAccountForm] = useState({
    accountName: '',
    openingBalance: '',
    description: '',
    isActive: true,
  });

  const [expenseForm, setExpenseForm] = useState({
    pettyCashId: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: '',
  });

  useEffect(() => {
    fetchPettyCashAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchExpenses(selectedAccount);
    }
  }, [selectedAccount]);

  const fetchPettyCashAccounts = async () => {
    try {
      const headers: Record<string, string> = {};
      if (user) {
        headers['x-user-role'] = user.role || '';
        headers['x-company-id'] = user.companyId || '';
      }
      const response = await fetch('/api/petty-cash', { headers });
      if (response.ok) {
        const data = await response.json();
        setPettyCashAccounts(data);
      }
    } catch (error) {
      console.error('Error fetching petty cash accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async (accountId: string) => {
    try {
      const headers: Record<string, string> = {};
      if (user) {
        headers['x-user-role'] = user.role || '';
        headers['x-company-id'] = user.companyId || '';
      }
      const response = await fetch(`/api/petty-cash-expense?pettyCashId=${accountId}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user) {
        headers['x-user-role'] = user.role || '';
        headers['x-company-id'] = user.companyId || '';
      }
      const response = await fetch('/api/petty-cash', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...accountForm,
          openingBalance: parseFloat(accountForm.openingBalance),
        }),
      });

      if (response.ok) {
        setShowAccountForm(false);
        setAccountForm({ accountName: '', openingBalance: '', description: '', isActive: true });
        fetchPettyCashAccounts();
      }
    } catch (error) {
      console.error('Error creating petty cash account:', error);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user) {
        headers['x-user-role'] = user.role || '';
        headers['x-company-id'] = user.companyId || '';
      }
      const response = await fetch('/api/petty-cash-expense', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...expenseForm,
          amount: parseFloat(expenseForm.amount),
        }),
      });

      if (response.ok) {
        setShowExpenseForm(false);
        setExpenseForm({
          pettyCashId: '',
          date: new Date().toISOString().split('T')[0],
          description: '',
          amount: '',
          category: '',
        });
        fetchPettyCashAccounts();
        if (selectedAccount) {
          fetchExpenses(selectedAccount);
        }
      }
    } catch (error) {
      console.error('Error creating expense:', error);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this petty cash account?')) return;

    try {
      const headers: Record<string, string> = {};
      if (user) {
        headers['x-user-role'] = user.role || '';
        headers['x-company-id'] = user.companyId || '';
      }
      const response = await fetch(`/api/petty-cash?id=${id}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        fetchPettyCashAccounts();
        if (selectedAccount === id) {
          setSelectedAccount(null);
          setShowExpenses(false);
        }
      }
    } catch (error) {
      console.error('Error deleting petty cash account:', error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const headers: Record<string, string> = {};
      if (user) {
        headers['x-user-role'] = user.role || '';
        headers['x-company-id'] = user.companyId || '';
      }
      const response = await fetch(`/api/petty-cash-expense?id=${id}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        fetchPettyCashAccounts();
        if (selectedAccount) {
          fetchExpenses(selectedAccount);
        }
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const toggleAccountStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/petty-cash', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });

      if (response.ok) {
        fetchPettyCashAccounts();
      }
    } catch (error) {
      console.error('Error updating account status:', error);
    }
  };

  const viewExpenses = (accountId: string) => {
    setSelectedAccount(accountId);
    setShowExpenses(true);
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
        title="Petty Cash Management"
        description="Manage petty cash accounts and track small expenses"
        action={{
          label: 'New Petty Cash Account',
          onClick: () => setShowAccountForm(true),
        }}
      />

      {/* Account Form Modal */}
      {showAccountForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">New Petty Cash Account</h2>
              <button
                onClick={() => setShowAccountForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <ResponsiveForm onSubmit={handleCreateAccount}>
              <FormField label="Account Name" required>
                <input
                  type="text"
                  value={accountForm.accountName}
                  onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </FormField>

              <FormField label="Opening Balance" required>
                <input
                  type="number"
                  step="0.01"
                  value={accountForm.openingBalance}
                  onChange={(e) => setAccountForm({ ...accountForm, openingBalance: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </FormField>

              <FormField label="Description">
                <textarea
                  value={accountForm.description}
                  onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </FormField>

              <FormField label="Status">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={accountForm.isActive}
                    onChange={(e) => setAccountForm({ ...accountForm, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  Active
                </label>
              </FormField>

              <FormActions
                onCancel={() => setShowAccountForm(false)}
                submitLabel="Create Account"
              />
            </ResponsiveForm>
          </Card>
        </div>
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">New Expense</h2>
              <button
                onClick={() => setShowExpenseForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <ResponsiveForm onSubmit={handleCreateExpense}>
              <FormField label="Petty Cash Account" required>
                <select
                  value={expenseForm.pettyCashId}
                  onChange={(e) => setExpenseForm({ ...expenseForm, pettyCashId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Account</option>
                  {pettyCashAccounts.filter(acc => acc.isActive).map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountName} (Balance: ₹{account.currentBalance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Date" required>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </FormField>

              <FormField label="Description" required>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </FormField>

              <FormField label="Amount" required>
                <input
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </FormField>

              <FormField label="Category" required>
                <input
                  type="text"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Office Supplies, Tea/Coffee, Courier"
                  required
                />
              </FormField>

              <FormActions
                onCancel={() => setShowExpenseForm(false)}
                submitLabel="Create Expense"
              />
            </ResponsiveForm>
          </Card>
        </div>
      )}

      {/* Petty Cash Accounts Table */}
      {!showExpenses ? (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Petty Cash Accounts</h2>
            <button
              onClick={() => setShowExpenseForm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Record Expense
            </button>
          </div>

          {pettyCashAccounts.length === 0 ? (
            <EmptyState
              message="No petty cash accounts found"
              actionLabel="Create First Account"
              onAction={() => setShowAccountForm(true)}
            />
          ) : (
            <>
              {/* Desktop Table */}
              <DesktopTable>
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Account Name</th>
                    <th className="text-right py-3 px-4">Opening Balance</th>
                    <th className="text-right py-3 px-4">Current Balance</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pettyCashAccounts.map((account) => (
                    <tr key={account.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{account.accountName}</div>
                          {account.description && (
                            <div className="text-sm text-gray-500">{account.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">₹{account.openingBalance.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-medium">₹{account.currentBalance.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {account.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <ActionButtons
                          onView={() => viewExpenses(account.id)}
                          onEdit={() => toggleAccountStatus(account.id, account.isActive)}
                          onDelete={() => handleDeleteAccount(account.id)}
                          editLabel={account.isActive ? 'Deactivate' : 'Activate'}
                          viewLabel="View Expenses"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DesktopTable>

              {/* Mobile Cards */}
              <MobileTable>
                {pettyCashAccounts.map((account) => (
                  <MobileCard key={account.id}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{account.accountName}</div>
                        {account.description && (
                          <div className="text-sm text-gray-500">{account.description}</div>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <MobileCardRow label="Opening Balance" value={`₹${account.openingBalance.toFixed(2)}`} />
                    <MobileCardRow 
                      label="Current Balance" 
                      value={`₹${account.currentBalance.toFixed(2)}`}
                      valueClassName="font-medium"
                    />
                    <div className="mt-3 pt-3 border-t flex gap-2">
                      <button
                        onClick={() => viewExpenses(account.id)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
                      >
                        View Expenses
                      </button>
                      <button
                        onClick={() => toggleAccountStatus(account.id, account.isActive)}
                        className="flex-1 px-3 py-2 bg-yellow-600 text-white rounded-lg text-sm"
                      >
                        {account.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm"
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
      ) : (
        /* Expenses View */
        <Card>
          <div className="flex justify-between items-center mb-4">
            <div>
              <button
                onClick={() => {
                  setShowExpenses(false);
                  setSelectedAccount(null);
                }}
                className="text-blue-600 hover:text-blue-800 mb-2"
              >
                ← Back to Accounts
              </button>
              <h2 className="text-lg font-semibold">
                Expenses - {pettyCashAccounts.find(a => a.id === selectedAccount)?.accountName}
              </h2>
            </div>
            <button
              onClick={() => setShowExpenseForm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              New Expense
            </button>
          </div>

          {expenses.length === 0 ? (
            <EmptyState
              message="No expenses recorded yet"
              actionLabel="Record First Expense"
              onAction={() => setShowExpenseForm(true)}
            />
          ) : (
            <>
              {/* Desktop Table */}
              <DesktopTable>
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Voucher No.</th>
                    <th className="text-left py-3 px-4">Description</th>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-right py-3 px-4">Amount</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{new Date(expense.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4">{expense.voucherNumber}</td>
                      <td className="py-3 px-4">{expense.description}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">{expense.category}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">₹{expense.amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
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
                {expenses.map((expense) => (
                  <MobileCard key={expense.id}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{expense.description}</div>
                        <div className="text-sm text-gray-500">{expense.voucherNumber}</div>
                      </div>
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">{expense.category}</span>
                    </div>
                    <MobileCardRow label="Date" value={new Date(expense.date).toLocaleDateString()} />
                    <MobileCardRow 
                      label="Amount" 
                      value={`₹${expense.amount.toFixed(2)}`}
                      valueClassName="font-medium text-red-600"
                    />
                    <div className="mt-3 pt-3 border-t">
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
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
      )}
    </ResponsiveContainer>
  );
}
