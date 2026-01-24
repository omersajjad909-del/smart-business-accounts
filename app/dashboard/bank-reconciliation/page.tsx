'use client';

import { useEffect, useState } from 'react';

interface BankAccount {
  id: string;
  accountNo?: string;
  bankName?: string;
  accountName?: string;
  balance?: number;
  accountId?: string | null;
  source?: 'BankAccount' | 'Account';

  account?: {
    openDebit?: number;
  };
}

interface BankStatement {
  id: string;
  statementNo: string;
  date: string;
  amount: number;
  description: string;
  referenceNo?: string;
  isReconciled: boolean;
}



export default function BankReconciliationPage() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedStatements, setSelectedStatements] = useState<string[]>([]);
  const [systemBalance, setSystemBalance] = useState(0);
  const [bankBalance, setBankBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAddBankForm, setShowAddBankForm] = useState(false);
  const [editingBankId, setEditingBankId] = useState('');
  const [newBankForm, setNewBankForm] = useState({
    bankName: '',
    accountNo: '',
    accountName: '',
    balance: 0,
  });

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchStatements(selectedAccount);
      // Auto-load system balance from selected account
      const account = bankAccounts.find(a =>
        a.id === selectedAccount ||
        a.accountId === selectedAccount ||
        (a.source === 'Account' && a.accountId === selectedAccount)
      );
      if (account) {
        // Use balance from BankAccount if available, otherwise from Account
        if (account.source === 'BankAccount') {
          setSystemBalance(account.balance || 0);
        } else {
          // For Account table banks, use openDebit from account
          setSystemBalance(account.account?.openDebit || 0);
        }
      }
    } else {
      setSystemBalance(0);
      setBankBalance(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount, bankAccounts]);

  const fetchBankAccounts = async () => {
    try {
      const response = await fetch('/api/bank-accounts');
      const data = await response.json();
      setBankAccounts(data);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const fetchStatements = async (accountId: string) => {
    try {
      // Check if this is a BankAccount ID or Account ID
      const bankAccount = bankAccounts.find(ba => ba.id === accountId || ba.accountId === accountId);

      if (bankAccount && bankAccount.source === 'BankAccount') {
        // This is from BankAccount table, use bankAccountId
        const response = await fetch(`/api/bank-statements?bankAccountId=${accountId}&isReconciled=false`);
        const data = await response.json();
        setStatements(data);
      } else {
        // This is from Account table, find BankAccount by accountId
        const bankAcc = bankAccounts.find(ba => ba.accountId === accountId);
        if (bankAcc && bankAcc.source === 'BankAccount') {
          const response = await fetch(`/api/bank-statements?bankAccountId=${bankAcc.id}&isReconciled=false`);
          const data = await response.json();
          setStatements(data);
        } else {
          // No BankAccount entry, no statements
          setStatements([]);
        }
      }
    } catch (error) {
      console.error('Error fetching statements:', error);
      setStatements([]);
    }
  };

  const toggleStatement = (id: string) => {
    setSelectedStatements((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleReconcile = async () => {
    if (!selectedAccount || selectedStatements.length === 0) {
      alert('Please select bank account and statements');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/bank-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountId: selectedAccount,
          reconcileDate: new Date(),
          systemBalance,
          bankBalance,
          statementIds: selectedStatements,
          narration: `Reconciliation for ${selectedStatements.length} statements`,
        }),
      });

      if (response.ok) {
        alert('Reconciliation completed successfully');
        setSelectedStatements([]);
        setSystemBalance(0);
        setBankBalance(0);
        fetchStatements(selectedAccount);
      }
    } catch (error) {
      console.error('Error reconciling:', error);
      alert('Error: Reconciliation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newBankForm.bankName || !newBankForm.accountNo || !newBankForm.accountName) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const method = editingBankId ? 'PUT' : 'POST';
      const body = editingBankId ? { id: editingBankId, ...newBankForm } : newBankForm;

      const response = await fetch('/api/bank-accounts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        alert(editingBankId ? 'Bank account updated successfully' : 'Bank account added successfully');
        setNewBankForm({
          bankName: '',
          accountNo: '',
          accountName: '',
          balance: 0,
        });
        setEditingBankId('');
        setShowAddBankForm(false);
        fetchBankAccounts();
      } else {
        alert('Error saving bank account');
      }
    } catch (error) {
      console.error('Error saving bank:', error);
      alert('Error: Unable to save bank account');
    } finally {
      setLoading(false);
    }
  };

  const handleEditBank = (account: BankAccount) => {
    setEditingBankId(account.id);
    setNewBankForm({
      bankName: account.bankName ?? '',
      accountNo: account.accountNo ?? '',
      accountName: account.accountName ?? '',
      balance: account.balance ?? 0,
    });

    setShowAddBankForm(true);
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm('Are you sure? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/bank-accounts?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Bank account deleted successfully');
        fetchBankAccounts();
        if (selectedAccount === id) {
          setSelectedAccount('');
        }
      } else {
        const err = await response.json();
        alert(err.error || 'Error: Failed to delete bank account');
      }
    } catch (error) {
      console.error('Error deleting bank:', error);
      alert('Error: Failed to delete bank account');
    }
  };

  const difference = Math.abs((systemBalance || 0) - (bankBalance || 0));
  const isBalanced = difference < 0.01;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Bank Reconciliation</h1>
        <button
          onClick={() => setShowAddBankForm(!showAddBankForm)}
          className="bg-green-500 text-white px-6 py-2 rounded font-semibold hover:bg-green-600"
        >
          {showAddBankForm ? 'Cancel' : '➕ Add Bank Account'}
        </button>
      </div>

      {/* Add/Edit Bank Form */}
      {showAddBankForm && (
        <form onSubmit={handleAddBank} className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">{editingBankId ? 'Edit Bank Account' : 'Add New Bank Account'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Bank Name</label>
              <input
                type="text"
                required
                placeholder="e.g., HBL, UBL, MCB"
                value={newBankForm.bankName}
                onChange={(e) => setNewBankForm({ ...newBankForm, bankName: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Account Number</label>
              <input
                type="text"
                required
                placeholder="e.g., 1234-5678-9"
                value={newBankForm.accountNo}
                onChange={(e) => setNewBankForm({ ...newBankForm, accountNo: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Account Holder Name</label>
              <input
                type="text"
                required
                placeholder="Your name or company name"
                value={newBankForm.accountName}
                onChange={(e) => setNewBankForm({ ...newBankForm, accountName: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Starting Balance (Rs.)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newBankForm.balance || ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                  setNewBankForm({ ...newBankForm, balance: val });
                }}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-2 rounded font-semibold hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingBankId ? 'Update Bank Account' : 'Save Bank Account'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddBankForm(false);
                setEditingBankId('');
                setNewBankForm({
                  bankName: '',
                  accountNo: '',
                  accountName: '',
                  balance: 0,
                });
              }}
              className="bg-gray-500 text-white px-6 py-2 rounded font-semibold hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Bank Account Selection */}
        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block text-sm font-semibold mb-2">Bank Account</label>
          <div className="space-y-2">
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">Select Account</option>
              {bankAccounts.map((account) => (
                <option
                  key={account.id}
                  value={
                    account.source === 'BankAccount'
                      ? account.id
                      : account.accountId ?? ''
                  }
                >

                  {account.bankName} - {account.accountNo}
                </option>
              ))}
            </select>
            {bankAccounts.length > 0 && (
              <div className="flex gap-2 text-sm">
                {bankAccounts.map((account) => (
                  <div key={account.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                    <span className="text-xs">{account.bankName} - {account.accountNo}</span>
                    <button
                      type="button"
                      onClick={() => handleEditBank(account)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBank(account.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Balance */}
        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block text-sm font-semibold mb-2">System Balance</label>
          <input
            type="number"
            step="0.01"
            value={systemBalance || ''}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
              setSystemBalance(val);
            }}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        {/* Bank Balance */}
        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block text-sm font-semibold mb-2">Bank Balance</label>
          <input
            type="number"
            step="0.01"
            value={bankBalance || ''}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
              setBankBalance(val);
            }}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
      </div>

      {/* Show Difference */}
      <div className={`p-4 rounded-lg mb-6 text-white font-semibold ${isBalanced ? 'bg-green-500' : 'bg-red-500'
        }`}>
        Difference: {difference.toFixed(2)} {isBalanced ? '✓ Balanced' : '✗ Not Balanced'}
      </div>

      {/* Statements List */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="font-semibold">Bank Statements ({statements.length})</h2>
        </div>
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left">Select</th>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-left">Amount</th>
              <th className="px-6 py-3 text-left">Description</th>
              <th className="px-6 py-3 text-left">Reference</th>
            </tr>
          </thead>
          <tbody>
            {statements.map((statement) => (
              <tr key={statement.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectedStatements.includes(statement.id)}
                    onChange={() => toggleStatement(statement.id)}
                  />
                </td>
                <td className="px-6 py-3">
                  {new Date(statement.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-3 font-semibold">
                  {statement.amount.toFixed(2)}
                </td>
                <td className="px-6 py-3">{statement.description}</td>
                <td className="px-6 py-3">{statement.referenceNo || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reconcile Button */}
      <div className="mt-6 flex gap-4">
        <button
          onClick={handleReconcile}
          disabled={loading || !isBalanced}
          className="bg-blue-500 text-white px-6 py-2 rounded font-semibold hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Reconcile'}
        </button>
      </div>
    </div>
  );
}
