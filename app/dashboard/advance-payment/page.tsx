"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import {
  ResponsiveContainer,
  PageHeader,
  Card,
} from "@/components/ui/ResponsiveContainer";

import {
  ResponsiveForm,
  FormField,
  FormActions,
  Input,
  Select,
  Button,
} from "@/components/ui/ResponsiveForm";

import {
  MobileTable,
  MobileCard,
  MobileCardRow,
  DesktopTable,
} from "@/components/ui/MobileTable";


type AdvancePayment = {
  id: string;
  advanceNo: string;
  date: string;
  amount: number;
  adjustedAmount: number;
  balance: number;
  status: string;
  supplier: { id: string; name: string };
  po?: { id: string; poNo: string };
  adjustments: any[];
  createdAt: string;
};

interface Account {
  id: string;
  name: string;
  type: string;
  partyType?: string | null;
}


export default function AdvancePaymentPage() {
  const [advances, setAdvances] = useState<AdvancePayment[]>([]);
  const [suppliers, setSuppliers] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<AdvancePayment | null>(null);

  // Form state
  const [advanceNo, setAdvanceNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [narration, setNarration] = useState("");

  // Adjust form state
  const [invoiceNo, setInvoiceNo] = useState("");
  const [adjustedAmount, setAdjustedAmount] = useState("");
  const [adjustRemarks, setAdjustRemarks] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [advancesRes, accountsRes] = await Promise.all([
        fetch("/api/advance-payment"),
        fetch("/api/accounts"),
      ]);

      const advancesData = await advancesRes.json();
      const accountsData = await accountsRes.json();

      setAdvances(advancesData);

      // Filter suppliers
      const supplierAccounts = accountsData.filter(
  (acc: Account) => acc.type === "SUPPLIER"
);

      setSuppliers(supplierAccounts);

      // Generate next advance number
      if (advancesData.length > 0) {
        const lastNo = Math.max(...advancesData.map((a: AdvancePayment) => {
          const match = a.advanceNo.match(/\d+/);
          return match ? parseInt(match[0]) : 0;
        }));
        setAdvanceNo(`ADV-${String(lastNo + 1).padStart(3, "0")}`);
      } else {
        setAdvanceNo("ADV-001");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!supplierId || !amount) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/advance-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advanceNo,
          date,
          amount: parseFloat(amount),
          supplierId,
          narration,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Advance payment created successfully!");
        resetForm();
        fetchData();
        setShowForm(false);
      } else {
        toast.error(data.error || "Failed to create advance payment");
      }
    } catch (error) {
      console.error("Error creating advance payment:", error);
      toast.error("Failed to create advance payment");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedAdvance || !invoiceNo || !adjustedAmount) {
      toast.error("Please fill all required fields");
      return;
    }

    const adjustAmount = parseFloat(adjustedAmount);
    if (adjustAmount > selectedAdvance.balance) {
      toast.error(`Adjusted amount cannot exceed balance: Rs. ${selectedAdvance.balance.toLocaleString()}`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/advance-payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAdvance.id,
          invoiceNo,
          adjustedAmount: adjustAmount,
          date: new Date().toISOString(),
          remarks: adjustRemarks,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Advance adjusted successfully!");
        setShowAdjustForm(false);
        setSelectedAdvance(null);
        resetAdjustForm();
        fetchData();
      } else {
        toast.error(data.error || "Failed to adjust advance");
      }
    } catch (error) {
      console.error("Error adjusting advance:", error);
      toast.error("Failed to adjust advance");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setDate(new Date().toISOString().split("T")[0]);
    setAmount("");
    setSupplierId("");
    setNarration("");
  }

  function resetAdjustForm() {
    setInvoiceNo("");
    setAdjustedAmount("");
    setAdjustRemarks("");
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this advance payment?")) return;

    try {
      const res = await fetch(`/api/advance-payment?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Advance payment deleted!");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete");
    }
  }

function getStatusBadge(status: string) {
  const color =
    status === "CLOSED"
      ? "bg-green-100 text-green-700"
      : status === "ADJUSTED"
      ? "bg-blue-100 text-blue-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-semibold inline-block ${color}`}
    >
      {status}
    </span>
  );
}

  if (loading && advances.length === 0) {
    return (
      <ResponsiveContainer>
        <div className="text-center py-10">Loading...</div>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer>
      <PageHeader
        title="💰 Advance Payment to Suppliers"
        description="Track supplier advances and adjust against invoices"
        action={{
          label: showForm ? "Cancel" : "+ New Advance Payment",
          onClick: () => setShowForm(!showForm)
        }}
      />

      {showForm && (
        <Card className="mb-6">
          <ResponsiveForm onSubmit={handleSubmit}>
            <FormField label="Advance No" required>
              <Input
                type="text"
                value={advanceNo}
                onChange={(e) => setAdvanceNo(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Date" required>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Supplier" required>
              <Select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Amount" required>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </FormField>

            <FormField label="Narration">
              <Input
                type="text"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Optional description"
              />
            </FormField>

            <FormActions>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "Saving..." : "Save Advance Payment"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </FormActions>
          </ResponsiveForm>
        </Card>
      )}

      {showAdjustForm && selectedAdvance && (
        <Card className="mb-6 border-2 border-blue-500">
          <h3 className="text-lg font-bold mb-4 text-blue-600">
            Adjust Advance: {selectedAdvance.advanceNo}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Supplier: <strong>{selectedAdvance.supplier.name}</strong> | 
            Balance: <strong>Rs. {selectedAdvance.balance.toLocaleString()}</strong>
          </p>
          <ResponsiveForm onSubmit={handleAdjust}>
            <FormField label="Invoice No" required>
              <Input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="e.g., INV-123"
                required
              />
            </FormField>

            <FormField label="Adjusted Amount" required>
              <Input
                type="number"
                step="0.01"
                value={adjustedAmount}
                onChange={(e) => setAdjustedAmount(e.target.value)}
                placeholder="0.00"
                max={selectedAdvance.balance}
                required
              />
            </FormField>

            <FormField label="Remarks">
              <Input
                type="text"
                value={adjustRemarks}
                onChange={(e) => setAdjustRemarks(e.target.value)}
                placeholder="Optional remarks"
              />
            </FormField>

            <FormActions>
              <Button type="submit" variant="success" disabled={loading}>
                {loading ? "Adjusting..." : "Adjust Advance"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowAdjustForm(false);
                  setSelectedAdvance(null);
                  resetAdjustForm();
                }}
              >
                Cancel
              </Button>
            </FormActions>
          </ResponsiveForm>
        </Card>
      )}

      <Card>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <DesktopTable>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Advance No
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Supplier
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Adjusted
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Balance
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {advances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No advance payments found. Create your first one!
                  </td>
                </tr>
              ) : (
                advances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {adv.advanceNo}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(adv.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {adv.supplier.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      Rs. {adv.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-blue-600">
                      Rs. {adv.adjustedAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                      Rs. {adv.balance.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getStatusBadge(adv.status)}
                    </td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      {adv.status !== "CLOSED" && (
                        <button
                          onClick={() => {
                            setSelectedAdvance(adv);
                            setShowAdjustForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Adjust
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(adv.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </DesktopTable>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden">
          <MobileTable
            data={advances}
            emptyMessage="No advance payments found. Create your first one!"
            renderCard={(adv) => (
              <MobileCard>
                <MobileCardRow label="Advance No" value={adv.advanceNo} />
                <MobileCardRow
                  label="Date"
                  value={new Date(adv.date).toLocaleDateString()}
                />
                <MobileCardRow label="Supplier" value={adv.supplier.name} />
                <MobileCardRow
                  label="Amount"
                  value={`Rs. ${adv.amount.toLocaleString()}`}
                  valueClassName="font-bold"
                />
                <MobileCardRow
                  label="Adjusted"
                  value={`Rs. ${adv.adjustedAmount.toLocaleString()}`}
                />
                <MobileCardRow
                  label="Balance"
                  value={`Rs. ${adv.balance.toLocaleString()}`}
                  valueClassName="font-bold text-green-600"
                />
                <MobileCardRow
                  label="Status"
                  value={getStatusBadge(adv.status)}
                />
                <div className="pt-2 mt-2 border-t border-gray-200 flex gap-2">
                  {adv.status !== "CLOSED" && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        setSelectedAdvance(adv);
                        setShowAdjustForm(true);
                      }}
                      className="flex-1"
                    >
                      Adjust
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(adv.id)}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </MobileCard>
            )}
          />
        </div>
      </Card>
    </ResponsiveContainer>
  );
}
