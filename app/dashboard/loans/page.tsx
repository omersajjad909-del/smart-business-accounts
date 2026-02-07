'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { ResponsiveContainer, PageHeader, Card } from '@/components/ui/ResponsiveContainer';
import { ResponsiveForm, FormField, FormActions } from '@/components/ui/ResponsiveForm';
import { MobileTable, MobileCard, MobileCardRow, DesktopTable, ActionButtons, EmptyState } from '@/components/ui/MobileTable';

interface Loan {
  id: string;
  loanNumber: string;
  loanType: string;
  accountId: string;
  account?: {
    id: string;
    name: string;
  };
  principalAmount: number;
  interestRate: number;
  tenure: number;
  emi: number;
  startDate: string;
  endDate: string;
  status: string;
  outstandingAmount: number;
  createdAt: string;
}

interface LoanPayment {
  id: string;
  loanId: string;
  paymentDate: string;
  amount: number;
  principalPaid: number;
  interestPaid: number;
  outstandingBalance: number;
}

interface Account {
  id: string;
  name: string;
  accountType: string;
}

export default function LoansPage() {
  const user = getCurrentUser();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPayments, setShowPayments] = useState(false);

  const [loanForm, setLoanForm] = useState({
    loanType: '',
    accountId: '',
    principalAmount: '',
    interestRate: '',
    tenure: '',
    startDate: new Date().toISOString().split('T')[0],
  });

  const [paymentForm, setPaymentForm] = useState({
    loanId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
  });

  useEffect(() => {
    fetchLoans();
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedLoan) {
      fetchPayments(selectedLoan);
    }
  }, [selectedLoan]);

  const fetchLoans = async () => {
    try {
      const response = await fetch('/api/loans', {
        headers: {
          "x-user-role": user?.role || "",
          "x-company-id": user?.companyId || "",
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLoans(data);
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchPayments = async (loanId: string) => {
    try {
      const response = await fetch(`/api/loans/payments?loanId=${loanId}`, {
        headers: {
          "x-user-role": user?.role || "",
          "x-company-id": user?.companyId || "",
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...loanForm,
          principalAmount: parseFloat(loanForm.principalAmount),
          interestRate: parseFloat(loanForm.interestRate),
          tenure: parseInt(loanForm.tenure),
        }),
      });

      if (response.ok) {
        setShowLoanForm(false);
        setLoanForm({
          loanType: '',
          accountId: '',
          principalAmount: '',
          interestRate: '',
          tenure: '',
          startDate: new Date().toISOString().split('T')[0],
        });
        fetchLoans();
      }
    } catch (error) {
      console.error('Error creating loan:', error);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/loan-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentForm,
          amount: parseFloat(paymentForm.amount),
        }),
      });

      if (response.ok) {
        setShowPaymentForm(false);
        setPaymentForm({
          loanId: '',
          paymentDate: new Date().toISOString().split('T')[0],
          amount: '',
        });
        fetchLoans();
        if (selectedLoan) {
          fetchPayments(selectedLoan);
        }
      }
    } catch (error) {
      console.error('Error creating payment:', error);
    }
  };

  const handleDeleteLoan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this loan?')) return;

    try {
      const response = await fetch(`/api/loans?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchLoans();
        if (selectedLoan === id) {
          setSelectedLoan(null);
          setShowPayments(false);
        }
      }
    } catch (error) {
      console.error('Error deleting loan:', error);
    }
  };

  const viewPayments = (loanId: string) => {
    setSelectedLoan(loanId);
    setShowPayments(true);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      ACTIVE: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800',
      DEFAULTED: 'bg-red-100 text-red-800',
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
        title="Loan Management"
        description="Track loans, EMI payments, and outstanding balances"
        action={{
          label: 'New Loan',
          onClick: () => setShowLoanForm(true),
        }}
      />

      {/* Loan Form Modal */}
      {showLoanForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">New Loan</h2>
              <button
                onClick={() => setShowLoanForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <ResponsiveForm onSubmit={handleCreateLoan}>
              <FormField label="Loan Type" required>
                <select
                  value={loanForm.loanType}
                  onChange={(e) => setLoanForm({ ...loanForm, loanType: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Type</option>
                  <option value="TERM_LOAN">Term Loan</option>
                  <option value="WORKING_CAPITAL">Working Capital</option>
                  <option value="OVERDRAFT">Overdraft</option>
                  <option value="PERSONAL">Personal Loan</option>
                  <option value="VEHICLE">Vehicle Loan</option>
                  <option value="PROPERTY">Property Loan</option>
                  <option value="OTHER">Other</option>
                </select>
              </FormField>

              <FormField label="Account/Lender" required>
                <select
                  value={loanForm.accountId}
                  onChange={(e) => setLoanForm({ ...loanForm, accountId: e.target.value })}
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

              <FormField label="Principal Amount" required>
                <input
                  type="number"
                  step="0.01"
                  value={loanForm.principalAmount}
                  onChange={(e) => setLoanForm({ ...loanForm, principalAmount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </FormField>

              <FormField label="Interest Rate (% per annum)" required>
                <input
                  type="number"
                  step="0.01"
                  value={loanForm.interestRate}
                  onChange={(e) => setLoanForm({ ...loanForm, interestRate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., 10.5"
                  required
                />
              </FormField>

              <FormField label="Tenure (Months)" required>
                <input
                  type="number"
                  value={loanForm.tenure}
                  onChange={(e) => setLoanForm({ ...loanForm, tenure: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., 12, 24, 36"
                  required
                />
              </FormField>

              <FormField label="Start Date" required>
                <input
                  type="date"
                  value={loanForm.startDate}
                  onChange={(e) => setLoanForm({ ...loanForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </FormField>

              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> EMI will be automatically calculated based on principal, interest rate, and tenure.
                </p>
              </div>

              <FormActions
                onCancel={() => setShowLoanForm(false)}
                submitLabel="Create Loan"
              />
            </ResponsiveForm>
          </Card>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Record Payment</h2>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <ResponsiveForm onSubmit={handleCreatePayment}>
              <FormField label="Loan" required>
                <select
                  value={paymentForm.loanId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, loanId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Loan</option>
                  {loans.filter(l => l.status === 'ACTIVE').map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      {loan.loanNumber} - {loan.loanType} (EMI: ₹{loan.emi.toFixed(2)})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Payment Date" required>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </FormField>

              <FormField label="Payment Amount" required>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </FormField>

              <FormActions
                onCancel={() => setShowPaymentForm(false)}
                submitLabel="Record Payment"
              />
            </ResponsiveForm>
          </Card>
        </div>
      )}

      {/* Loans Table */}
      {!showPayments ? (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Loans</h2>
            <button
              onClick={() => setShowPaymentForm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Record Payment
            </button>
          </div>

          {loans.length === 0 ? (
            <EmptyState
              message="No loans found"
              actionLabel="Add First Loan"
              onAction={() => setShowLoanForm(true)}
            />
          ) : (
            <>
              {/* Desktop Table */}
              <DesktopTable>
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Loan Details</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-right py-3 px-4">Principal</th>
                    <th className="text-right py-3 px-4">EMI</th>
                    <th className="text-right py-3 px-4">Outstanding</th>
                    <th className="text-left py-3 px-4">Tenure</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <tr key={loan.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{loan.loanNumber}</div>
                          <div className="text-sm text-gray-500">{loan.account?.name}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(loan.startDate).toLocaleDateString()} - {new Date(loan.endDate).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{loan.loanType.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-right">₹{loan.principalAmount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-medium">₹{loan.emi.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-red-600 font-medium">
                        ₹{loan.outstandingAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <div>{loan.tenure} months</div>
                          <div className="text-gray-500">{loan.interestRate}% p.a.</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(loan.status)}</td>
                      <td className="py-3 px-4">
                        <ActionButtons
                          onView={() => viewPayments(loan.id)}
                          onDelete={() => handleDeleteLoan(loan.id)}
                          viewLabel="View Payments"
                          showEdit={false}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DesktopTable>

              {/* Mobile Cards */}
              <MobileTable>
                {loans.map((loan) => (
                  <MobileCard key={loan.id}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{loan.loanNumber}</div>
                        <div className="text-sm text-gray-500">{loan.loanType.replace('_', ' ')}</div>
                      </div>
                      {getStatusBadge(loan.status)}
                    </div>
                    <MobileCardRow label="Lender" value={loan.account?.name || 'N/A'} />
                    <MobileCardRow label="Principal" value={`₹${loan.principalAmount.toFixed(2)}`} />
                    <MobileCardRow 
                      label="EMI" 
                      value={`₹${loan.emi.toFixed(2)}`}
                      valueClassName="font-medium"
                    />
                    <MobileCardRow 
                      label="Outstanding" 
                      value={`₹${loan.outstandingAmount.toFixed(2)}`}
                      valueClassName="font-medium text-red-600"
                    />
                    <MobileCardRow label="Tenure" value={`${loan.tenure} months @ ${loan.interestRate}%`} />
                    <MobileCardRow 
                      label="Period" 
                      value={`${new Date(loan.startDate).toLocaleDateString()} - ${new Date(loan.endDate).toLocaleDateString()}`}
                    />
                    <div className="mt-3 pt-3 border-t flex gap-2">
                      <button
                        onClick={() => viewPayments(loan.id)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
                      >
                        View Payments
                      </button>
                      <button
                        onClick={() => handleDeleteLoan(loan.id)}
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
        /* Payment History View */
        <Card>
          <div className="flex justify-between items-center mb-4">
            <div>
              <button
                onClick={() => {
                  setShowPayments(false);
                  setSelectedLoan(null);
                }}
                className="text-blue-600 hover:text-blue-800 mb-2"
              >
                ← Back to Loans
              </button>
              <h2 className="text-lg font-semibold">
                Payment History - {loans.find(l => l.id === selectedLoan)?.loanNumber}
              </h2>
            </div>
            <button
              onClick={() => setShowPaymentForm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Record Payment
            </button>
          </div>

          {payments.length === 0 ? (
            <EmptyState
              message="No payments recorded yet"
              actionLabel="Record First Payment"
              onAction={() => setShowPaymentForm(true)}
            />
          ) : (
            <>
              {/* Desktop Table */}
              <DesktopTable>
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Payment Date</th>
                    <th className="text-right py-3 px-4">Amount Paid</th>
                    <th className="text-right py-3 px-4">Principal</th>
                    <th className="text-right py-3 px-4">Interest</th>
                    <th className="text-right py-3 px-4">Outstanding Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right font-medium">₹{payment.amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">₹{payment.principalPaid.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">₹{payment.interestPaid.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-red-600 font-medium">
                        ₹{payment.outstandingBalance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DesktopTable>

              {/* Mobile Cards */}
              <MobileTable>
                {payments.map((payment) => (
                  <MobileCard key={payment.id}>
                    <MobileCardRow label="Date" value={new Date(payment.paymentDate).toLocaleDateString()} />
                    <MobileCardRow 
                      label="Amount Paid" 
                      value={`₹${payment.amount.toFixed(2)}`}
                      valueClassName="font-medium"
                    />
                    <MobileCardRow label="Principal" value={`₹${payment.principalPaid.toFixed(2)}`} />
                    <MobileCardRow label="Interest" value={`₹${payment.interestPaid.toFixed(2)}`} />
                    <MobileCardRow 
                      label="Outstanding" 
                      value={`₹${payment.outstandingBalance.toFixed(2)}`}
                      valueClassName="font-medium text-red-600"
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
