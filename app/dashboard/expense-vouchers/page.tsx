'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface ExpenseVoucher {
  id: string;
  voucherNo: string;
  date: string;
  description: string;
  totalAmount: number;
  approvalStatus: string;
  expenseAccount?: { id: string; name: string };
  paymentAccount?: { id: string; name: string };
  items?: ExpenseItem[];
}



interface ExpenseItem {
  description: string;
  amount: number;
  category: string;
}
type AccountWithMeta = {
  id: string;
  code?: string;
  name: string;
  type?: string | null;
  partyType?: string | null;
};




export default function ExpenseVouchersPage() {
  const [vouchers, setVouchers] = useState<ExpenseVoucher[]>([]);
  const [accounts, setAccounts] = useState<AccountWithMeta[]>([]);
  const [showForm, setShowForm] = useState(true);
  const [items, setItems] = useState<ExpenseItem[]>([
    { description: '', amount: 0, category: '' },
  ]);
  const [formData, setFormData] = useState({
    voucherNo: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    expenseAccountId: '',
    paymentAccountId: '',
  });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [editingId, setEditingId] = useState('');

  useEffect(() => {
    fetchVouchers();
    fetchAccounts();
  }, [statusFilter]);

  const fetchVouchers = async () => {
    try {
      let url = '/api/expense-vouchers';
      if (statusFilter) url += `?status=${statusFilter}`;
      const response = await fetch(url);
      const data = await response.json();
      setVouchers(data);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      // User role header zaroori hai warna API data nahi degi
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const role = (user.role || user?.user?.role || 'ADMIN').toUpperCase();
      const response = await fetch('/api/accounts', {
        headers: { 'x-user-role': role }
      });
      const data = await response.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setAccounts([]);
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { description: '', amount: 0, category: '' },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: string,
    value: Any
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/expense-vouchers?id=${editingId}` : '/api/expense-vouchers';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          ...formData,
          totalAmount,
          items: items.map(item => ({
            ...item,
            amount: parseFloat(item.amount.toString()),
          })),
        }),
      });

      if (response.ok) {
        alert(editingId ? 'Expense voucher updated successfully' : 'Expense voucher saved successfully');
        setFormData({
          voucherNo: '',
          date: new Date().toISOString().split('T')[0],
          description: '',
          expenseAccountId: '',
          paymentAccountId: '',
        });
        setItems([{ description: '', amount: 0, category: '' }]);
        setEditingId('');
        setShowForm(false);
        fetchVouchers();
      }
    } catch (error) {
      console.error('Error saving voucher:', error);
      alert('Error: Failed to save voucher');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (voucher: ExpenseVoucher) => {
    setEditingId(voucher.id);
    setFormData({
      voucherNo: voucher.voucherNo,
      date: new Date(voucher.date).toISOString().split('T')[0],
      description: voucher.description,
      expenseAccountId: voucher.expenseAccount?.id || '',
      paymentAccountId: voucher.paymentAccount?.id || '',
    });
    // Load items if available
    if (voucher.items && voucher.items.length > 0) {
      setItems(voucher.items.map(item => ({
        description: item.description || '',
        amount: item.amount || 0,
        category: item.category || '',
      })));
    }
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/expense-vouchers?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Expense voucher deleted successfully');
        fetchVouchers();
      } else {
        alert('Error: Failed to delete voucher');
      }
    } catch (error) {
      console.error('Error deleting voucher:', error);
      alert('Error: Failed to delete voucher');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/expense-vouchers?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, approvalStatus: newStatus }),
      });

      if (response.ok) {
        toast.success(`Status changed to ${newStatus}`);
        fetchVouchers();
      } else {
        toast.error('Error: Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error: Failed to update status');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Expense Vouchers</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-500 text-white px-6 py-2 rounded font-semibold hover:bg-green-600"
        >
          {showForm ? 'Expense List' : 'New Expense'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-lg shadow mb-6"
        >
          {/* Debug: Accounts data show karo */}
          {/* <pre style={{background:'#eee',padding:'8px',marginBottom:'8px',fontSize:'12px',overflow:'auto'}}>{JSON.stringify(accounts, null, 2)}</pre> */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Voucher No</label>
              <input
                type="text"
                required
                value={formData.voucherNo}
                onChange={(e) =>
                  setFormData({ ...formData, voucherNo: e.target.value })
                }
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
              <label className="block text-sm font-semibold mb-2">Expense Account</label>
              <select
                required
                value={formData.expenseAccountId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expenseAccountId: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Select</option>
                {Array.isArray(accounts) &&
                  accounts
                    .filter((acc: AccountWithMeta) => {
                      const n = acc.name.toLowerCase();
                      const t = (acc.type ?? '').toLowerCase();
                      const p = (acc.partyType ?? '').toLowerCase();

                      return (
                        n.includes('expense') ||
                        t.includes('expense') ||
                        p.includes('expense')
                      );
                    })

                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Payment Account</label>
              <select
                required
                value={formData.paymentAccountId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentAccountId: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Select</option>
                {Array.isArray(accounts) &&
                  accounts
                    .filter((acc) => {
                      const n = acc.name.toLowerCase();
                      const t = (acc.type || '').toLowerCase();
                      const p = (acc.partyType || '').toLowerCase();
                      return (
                        n.includes('cash') ||
                        n.includes('bank') ||
                        t.includes('cash') ||
                        t.includes('bank') ||
                        p.includes('bank')
                      );
                    })
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full border border-gray-300 rounded px-3 py-2"
              rows={2}
            />
          </div>

          {/* Items */}
          <div className="mb-4">
            <h3 className="font-semibold mb-3">Expense Details</h3>
            <table className="w-full border border-gray-300 rounded">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-3 py-2 text-left">Description</th>
                  <th className="border px-3 py-2 text-left">Category</th>
                  <th className="border px-3 py-2 text-right">Amount</th>
                  <th className="border px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="border px-3 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(index, 'description', e.target.value)
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1"
                        placeholder="Description"
                      />
                    </td>
                    <td className="border px-3 py-2">
                      <select
                        value={item.category}
                        onChange={(e) =>
                          handleItemChange(index, 'category', e.target.value)
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="">Select</option>
                        <option value="TRAVEL">Travel</option>
                        <option value="FOOD">Food</option>
                        <option value="SUPPLIES">Supplies</option>
                        <option value="UTILITIES">Utilities</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </td>
                    <td className="border px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) =>
                          handleItemChange(index, 'amount', parseFloat(e.target.value))
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1 text-right"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="border px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={handleAddItem}
              className="mt-2 text-blue-500 hover:text-blue-700 font-semibold"
            >
              + Add Item
            </button>
          </div>

          <div className="mb-4 text-right">
            <span className="font-semibold text-lg">
              Total: {totalAmount.toFixed(2)}
            </span>
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
                setEditingId('');
                setFormData({
                  voucherNo: '',
                  date: new Date().toISOString().split('T')[0],
                  description: '',
                  expenseAccountId: '',
                  paymentAccountId: '',
                });
                setItems([{ description: '', amount: 0, category: '' }]);
              }}
              className="bg-gray-500 text-white px-6 py-2 rounded font-semibold hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded px-4 py-2"
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left">Voucher No</th>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-left">Amount</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((voucher) => (
              <tr key={voucher.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 font-semibold">{voucher.voucherNo}</td>
                <td className="px-6 py-3">
                  {new Date(voucher.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-3">{voucher.totalAmount.toFixed(2)}</td>
                <td className="px-6 py-3">
                  <span className={`px-3 py-1 rounded text-white text-sm ${voucher.approvalStatus === 'DRAFT' ? 'bg-gray-500' :
                      voucher.approvalStatus === 'PENDING' ? 'bg-yellow-500' :
                        voucher.approvalStatus === 'APPROVED' ? 'bg-green-500' :
                          'bg-red-500'
                    }`}>
                    {voucher.approvalStatus}
                  </span>
                </td>
                <td className="px-6 py-3 space-x-2">
                  <button
                    onClick={() => handleEdit(voucher)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    Edit
                  </button>
                  {voucher.approvalStatus === 'DRAFT' && (
                    <button
                      onClick={() => handleStatusChange(voucher.id, 'PENDING')}
                      className="text-yellow-600 hover:text-yellow-800 font-medium text-sm"
                    >
                      Submit
                    </button>
                  )}
                  {voucher.approvalStatus === 'PENDING' && (
                    <button
                      onClick={() => handleStatusChange(voucher.id, 'APPROVED')}
                      className="text-green-600 hover:text-green-800 font-medium text-sm"
                    >
                      Approve
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(voucher.id)}
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
    </div>
  );
}
