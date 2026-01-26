'use client';

import { useState, useEffect } from 'react';
import { ResponsiveContainer, PageHeader, Card } from '@/components/ui/ResponsiveContainer';
import { ResponsiveForm, FormField, FormActions } from '@/components/ui/ResponsiveForm';
import { MobileTable, MobileCard, MobileCardRow, DesktopTable, ActionButtons, EmptyState } from '@/components/ui/MobileTable';

interface FixedAsset {
  id: string;
  assetName: string;
  assetCode: string;
  category: string;
  purchaseDate: string;
  purchaseValue: number;
  currentValue: number;
  depreciationMethod: string;
  depreciationRate: number;
  usefulLife: number;
  salvageValue: number;
  location?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Depreciation {
  id: string;
  fixedAssetId: string;
  date: string;
  amount: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

export default function FixedAssetsPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [depreciations, setDepreciations] = useState<Depreciation[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showDepreciationForm, setShowDepreciationForm] = useState(false);
  const [showDepreciations, setShowDepreciations] = useState(false);

  const [assetForm, setAssetForm] = useState({
    assetName: '',
    assetCode: '',
    category: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseValue: '',
    depreciationMethod: 'STRAIGHT_LINE',
    depreciationRate: '',
    usefulLife: '',
    salvageValue: '',
    location: '',
  });

  const [depreciationForm, setDepreciationForm] = useState({
    fixedAssetId: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    if (selectedAsset) {
      fetchDepreciations(selectedAsset);
    }
  }, [selectedAsset]);

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/fixed-assets');
      if (response.ok) {
        const data = await response.json();
        setAssets(data);
      }
    } catch (error) {
      console.error('Error fetching fixed assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepreciations = async (assetId: string) => {
    try {
      const response = await fetch(`/api/depreciation?fixedAssetId=${assetId}`);
      if (response.ok) {
        const data = await response.json();
        setDepreciations(data);
      }
    } catch (error) {
      console.error('Error fetching depreciations:', error);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/fixed-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...assetForm,
          purchaseValue: parseFloat(assetForm.purchaseValue),
          depreciationRate: parseFloat(assetForm.depreciationRate),
          usefulLife: parseInt(assetForm.usefulLife),
          salvageValue: parseFloat(assetForm.salvageValue || '0'),
        }),
      });

      if (response.ok) {
        setShowAssetForm(false);
        setAssetForm({
          assetName: '',
          assetCode: '',
          category: '',
          purchaseDate: new Date().toISOString().split('T')[0],
          purchaseValue: '',
          depreciationMethod: 'STRAIGHT_LINE',
          depreciationRate: '',
          usefulLife: '',
          salvageValue: '',
          location: '',
        });
        fetchAssets();
      }
    } catch (error) {
      console.error('Error creating fixed asset:', error);
    }
  };

  const handleCreateDepreciation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/depreciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...depreciationForm,
          amount: parseFloat(depreciationForm.amount),
        }),
      });

      if (response.ok) {
        setShowDepreciationForm(false);
        setDepreciationForm({
          fixedAssetId: '',
          date: new Date().toISOString().split('T')[0],
          amount: '',
        });
        fetchAssets();
        if (selectedAsset) {
          fetchDepreciations(selectedAsset);
        }
      }
    } catch (error) {
      console.error('Error recording depreciation:', error);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fixed asset?')) return;

    try {
      const response = await fetch(`/api/fixed-assets?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchAssets();
        if (selectedAsset === id) {
          setSelectedAsset(null);
          setShowDepreciations(false);
        }
      }
    } catch (error) {
      console.error('Error deleting fixed asset:', error);
    }
  };

  const viewDepreciations = (assetId: string) => {
    setSelectedAsset(assetId);
    setShowDepreciations(true);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      ACTIVE: 'bg-green-100 text-green-800',
      DISPOSED: 'bg-gray-100 text-gray-800',
      SOLD: 'bg-blue-100 text-blue-800',
      SCRAPPED: 'bg-red-100 text-red-800',
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
        title="Fixed Assets Register"
        description="Track fixed assets, depreciation, and asset lifecycle"
        action={{
          label: 'New Fixed Asset',
          onClick: () => setShowAssetForm(true),
        }}
      />

      {/* Asset Form Modal */}
      {showAssetForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">New Fixed Asset</h2>
              <button
                onClick={() => setShowAssetForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <ResponsiveForm onSubmit={handleCreateAsset}>
              <FormField label="Asset Name" required>
                <input
                  type="text"
                  value={assetForm.assetName}
                  onChange={(e) => setAssetForm({ ...assetForm, assetName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </FormField>

              <FormField label="Asset Code" required>
                <input
                  type="text"
                  value={assetForm.assetCode}
                  onChange={(e) => setAssetForm({ ...assetForm, assetCode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., COMP-001"
                  required
                />
              </FormField>

              <FormField label="Category" required>
                <select
                  value={assetForm.category}
                  onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="LAND">Land</option>
                  <option value="BUILDING">Building</option>
                  <option value="MACHINERY">Machinery</option>
                  <option value="FURNITURE">Furniture</option>
                  <option value="VEHICLE">Vehicle</option>
                  <option value="COMPUTER">Computer & IT Equipment</option>
                  <option value="OTHER">Other</option>
                </select>
              </FormField>

              <FormField label="Purchase Date" required>
                <input
                  type="date"
                  value={assetForm.purchaseDate}
                  onChange={(e) => setAssetForm({ ...assetForm, purchaseDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </FormField>

              <FormField label="Purchase Value" required>
                <input
                  type="number"
                  step="0.01"
                  value={assetForm.purchaseValue}
                  onChange={(e) => setAssetForm({ ...assetForm, purchaseValue: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </FormField>

              <FormField label="Depreciation Method" required>
                <select
                  value={assetForm.depreciationMethod}
                  onChange={(e) => setAssetForm({ ...assetForm, depreciationMethod: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="STRAIGHT_LINE">Straight Line</option>
                  <option value="REDUCING_BALANCE">Reducing Balance</option>
                  <option value="WDV">Written Down Value (WDV)</option>
                </select>
              </FormField>

              <FormField label="Depreciation Rate (%)" required>
                <input
                  type="number"
                  step="0.01"
                  value={assetForm.depreciationRate}
                  onChange={(e) => setAssetForm({ ...assetForm, depreciationRate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., 10 for 10%"
                  required
                />
              </FormField>

              <FormField label="Useful Life (Years)" required>
                <input
                  type="number"
                  value={assetForm.usefulLife}
                  onChange={(e) => setAssetForm({ ...assetForm, usefulLife: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </FormField>

              <FormField label="Salvage Value">
                <input
                  type="number"
                  step="0.01"
                  value={assetForm.salvageValue}
                  onChange={(e) => setAssetForm({ ...assetForm, salvageValue: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Expected value at end of life"
                />
              </FormField>

              <FormField label="Location">
                <input
                  type="text"
                  value={assetForm.location}
                  onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Physical location of asset"
                />
              </FormField>

              <FormActions
                onCancel={() => setShowAssetForm(false)}
                submitLabel="Create Asset"
              />
            </ResponsiveForm>
          </Card>
        </div>
      )}

      {/* Depreciation Form Modal */}
      {showDepreciationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Record Depreciation</h2>
              <button
                onClick={() => setShowDepreciationForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <ResponsiveForm onSubmit={handleCreateDepreciation}>
              <FormField label="Fixed Asset" required>
                <select
                  value={depreciationForm.fixedAssetId}
                  onChange={(e) => setDepreciationForm({ ...depreciationForm, fixedAssetId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Asset</option>
                  {assets.filter(a => a.status === 'ACTIVE').map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.assetName} ({asset.assetCode}) - Current Value: ₹{asset.currentValue.toFixed(2)}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Date" required>
                <input
                  type="date"
                  value={depreciationForm.date}
                  onChange={(e) => setDepreciationForm({ ...depreciationForm, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </FormField>

              <FormField label="Depreciation Amount" required>
                <input
                  type="number"
                  step="0.01"
                  value={depreciationForm.amount}
                  onChange={(e) => setDepreciationForm({ ...depreciationForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </FormField>

              <FormActions
                onCancel={() => setShowDepreciationForm(false)}
                submitLabel="Record Depreciation"
              />
            </ResponsiveForm>
          </Card>
        </div>
      )}

      {/* Fixed Assets Table */}
      {!showDepreciations ? (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Fixed Assets</h2>
            <button
              onClick={() => setShowDepreciationForm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Record Depreciation
            </button>
          </div>

          {assets.length === 0 ? (
            <EmptyState
              message="No fixed assets found"
              actionLabel="Add First Asset"
              onAction={() => setShowAssetForm(true)}
            />
          ) : (
            <>
              {/* Desktop Table */}
              <DesktopTable>
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Asset Details</th>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-right py-3 px-4">Purchase Value</th>
                    <th className="text-right py-3 px-4">Current Value</th>
                    <th className="text-left py-3 px-4">Depreciation</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{asset.assetName}</div>
                          <div className="text-sm text-gray-500">{asset.assetCode}</div>
                          {asset.location && (
                            <div className="text-xs text-gray-400">📍 {asset.location}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">{asset.category}</td>
                      <td className="py-3 px-4 text-right">₹{asset.purchaseValue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-medium">₹{asset.currentValue.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <div>{asset.depreciationMethod.replace('_', ' ')}</div>
                          <div className="text-gray-500">{asset.depreciationRate}% / {asset.usefulLife} years</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(asset.status)}</td>
                      <td className="py-3 px-4">
                        <ActionButtons
                          onView={() => viewDepreciations(asset.id)}
                          onDelete={() => handleDeleteAsset(asset.id)}
                          viewLabel="View Depreciation"
                          showEdit={false}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DesktopTable>

              {/* Mobile Cards */}
              <MobileTable>
                {assets.map((asset) => (
                  <MobileCard key={asset.id}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{asset.assetName}</div>
                        <div className="text-sm text-gray-500">{asset.assetCode}</div>
                      </div>
                      {getStatusBadge(asset.status)}
                    </div>
                    <MobileCardRow label="Category" value={asset.category} />
                    {asset.location && <MobileCardRow label="Location" value={asset.location} />}
                    <MobileCardRow label="Purchase Value" value={`₹${asset.purchaseValue.toFixed(2)}`} />
                    <MobileCardRow 
                      label="Current Value" 
                      value={`₹${asset.currentValue.toFixed(2)}`}
                      valueClassName="font-medium"
                    />
                    <MobileCardRow 
                      label="Depreciation" 
                      value={`${asset.depreciationMethod.replace('_', ' ')} - ${asset.depreciationRate}%`}
                    />
                    <div className="mt-3 pt-3 border-t flex gap-2">
                      <button
                        onClick={() => viewDepreciations(asset.id)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
                      >
                        View Depreciation
                      </button>
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
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
        /* Depreciation History View */
        <Card>
          <div className="flex justify-between items-center mb-4">
            <div>
              <button
                onClick={() => {
                  setShowDepreciations(false);
                  setSelectedAsset(null);
                }}
                className="text-blue-600 hover:text-blue-800 mb-2"
              >
                ← Back to Assets
              </button>
              <h2 className="text-lg font-semibold">
                Depreciation History - {assets.find(a => a.id === selectedAsset)?.assetName}
              </h2>
            </div>
            <button
              onClick={() => setShowDepreciationForm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Record Depreciation
            </button>
          </div>

          {depreciations.length === 0 ? (
            <EmptyState
              message="No depreciation records found"
              actionLabel="Record First Depreciation"
              onAction={() => setShowDepreciationForm(true)}
            />
          ) : (
            <>
              {/* Desktop Table */}
              <DesktopTable>
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-right py-3 px-4">Depreciation Amount</th>
                    <th className="text-right py-3 px-4">Accumulated Depreciation</th>
                    <th className="text-right py-3 px-4">Book Value</th>
                  </tr>
                </thead>
                <tbody>
                  {depreciations.map((dep) => (
                    <tr key={dep.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{new Date(dep.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right text-red-600">₹{dep.amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">₹{dep.accumulatedDepreciation.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-medium">₹{dep.bookValue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </DesktopTable>

              {/* Mobile Cards */}
              <MobileTable>
                {depreciations.map((dep) => (
                  <MobileCard key={dep.id}>
                    <MobileCardRow label="Date" value={new Date(dep.date).toLocaleDateString()} />
                    <MobileCardRow 
                      label="Depreciation Amount" 
                      value={`₹${dep.amount.toFixed(2)}`}
                      valueClassName="text-red-600"
                    />
                    <MobileCardRow 
                      label="Accumulated" 
                      value={`₹${dep.accumulatedDepreciation.toFixed(2)}`}
                    />
                    <MobileCardRow 
                      label="Book Value" 
                      value={`₹${dep.bookValue.toFixed(2)}`}
                      valueClassName="font-medium"
                    />
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
