'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getCurrentUser } from '@/lib/auth';

interface TaxConfiguration {
  id: string;
  taxType: string;
  taxCode: string;
  taxRate: number;
  description?: string;
  isActive: boolean;
}

export default function TaxConfigurationPage() {
  const [taxes, setTaxes] = useState<TaxConfiguration[]>([]);
  const [showForm, setShowForm] = useState(true);
  const [formData, setFormData] = useState({
    taxType: '',
    taxCode: '',
    taxRate: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    fetchTaxes();
  }, []);

  const fetchTaxes = async () => {
    try {
      const response = await fetch('/api/tax-configuration');
      const data = await response.json();
      setTaxes(data);
    } catch (error) {
      console.error('Error fetching taxes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingId
        ? `/api/tax-configuration?id=${editingId}`
        : '/api/tax-configuration';
      const method = editingId ? 'PUT' : 'POST';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (user) {
        headers['x-user-id'] = user.id;
        headers['x-user-role'] = user.role;
        headers['x-company-id'] = user.companyId || '';
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          id: editingId,
          ...formData,
          taxRate: formData.taxRate ? parseFloat(formData.taxRate.toString()) : 0,
        }),
      });

      if (response.ok) {
        toast.success(editingId ? 'Tax configuration updated successfully' : 'Tax configuration added successfully');
        setFormData({
          taxType: '',
          taxCode: '',
          taxRate: '',
          description: '',
        });
        setEditingId('');
        setShowForm(false);
        fetchTaxes();
      }
    } catch (error) {
      console.error('Error saving tax:', error);
      toast.error('Error: Unable to save tax configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tax: TaxConfiguration) => {
    setFormData({
      taxType: tax.taxType,
      taxCode: tax.taxCode,
      taxRate: tax.taxRate.toString(), // ✅ FIX
      description: tax.description || '',
    });

    setEditingId(tax.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({
      taxType: '',
      taxCode: '',
      taxRate: '',
      description: '',
    });
    setEditingId('');
    setShowForm(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Tax Configuration</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto bg-green-500 text-white px-6 py-2 rounded font-semibold hover:bg-green-600"
        >
          {showForm ? 'Show List' : 'New Tax'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 md:p-6 rounded-lg shadow mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Tax Type</label>
              <select
                required
                value={formData.taxType}
                onChange={(e) =>
                  setFormData({ ...formData, taxType: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Select</option>
                <option value="GST">GST</option>
                <option value="VAT">VAT</option>
                <option value="SALES_TAX">Sales Tax</option>
                <option value="INCOME_TAX">Income Tax</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Tax Code</label>
              <input
                type="text"
                required
                value={formData.taxCode}
                onChange={(e) =>
                  setFormData({ ...formData, taxCode: e.target.value })
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="e.g. GST5"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Tax Rate (%)</label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                max="100"
                value={formData.taxRate || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    taxRate: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
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
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-2 rounded font-semibold hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="bg-gray-500 text-white px-6 py-2 rounded font-semibold hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left whitespace-nowrap">Type</th>
              <th className="px-6 py-3 text-left whitespace-nowrap">Code</th>
              <th className="px-6 py-3 text-right whitespace-nowrap">Rate (%)</th>
              <th className="px-6 py-3 text-left whitespace-nowrap">Status</th>
              <th className="px-6 py-3 text-left whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody>
            {taxes.map((tax) => (
              <tr key={tax.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3 whitespace-nowrap">{tax.taxType}</td>
                <td className="px-6 py-3 font-semibold whitespace-nowrap">{tax.taxCode}</td>
                <td className="px-6 py-3 text-right font-semibold whitespace-nowrap">
                  {tax.taxRate.toFixed(2)}%
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <span className={`px-3 py-1 rounded text-white text-sm ${tax.isActive ? 'bg-green-500' : 'bg-gray-500'
                    }`}>
                    {tax.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-3 space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => handleEdit(tax)}
                    className="text-blue-500 hover:text-blue-700 font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Are you sure? This cannot be undone.')) return;
                      try {
                        const response = await fetch(`/api/tax-configuration?id=${tax.id}`, {
                          method: 'DELETE',
                        });
                        if (response.ok) {
                          toast.success('Tax configuration deleted successfully');
                          fetchTaxes();
                        } else {
                          toast.error('Error: Failed to delete tax configuration');
                        }
                      } catch (error) {
                        console.error('Error deleting tax:', error);
                        toast.error('Error: Failed to delete tax configuration');
                      }
                    }}
                    className="text-red-500 hover:text-red-700 font-semibold"
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
