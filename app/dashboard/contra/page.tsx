'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

import { ResponsiveContainer, PageHeader, Card } from '@/components/ui/ResponsiveContainer';
import { ResponsiveForm as _ResponsiveForm, FormField as _FormField, FormActions as _FormActions } from '@/components/ui/ResponsiveForm';
import {
  _MobileTable,
  _MobileCard,
  _MobileCardRow,
  DesktopTable,
  EmptyState,
} from '@/components/ui/MobileTable';

interface ContraEntry {
  id: string;
  contraNumber: string;
  date: string;
  amount: number;
  narration?: string;
  fromAccount?: { name: string };
  toAccount?: { name: string };
}

interface Account {
  id: string;
  name: string;
  accountType: string;
}

export default function ContraPage() {
  const [entries, setEntries] = useState<ContraEntry[]>([]);
  const [_accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [_showForm, setShowForm] = useState(false);

  const [formData, _setFormData] = useState({
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
      const res = await fetch('/api/contra');
      if (res.ok) setEntries(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    const res = await fetch('/api/accounts');
    if (!res.ok) return;
    const data = await res.json();
    setAccounts(data.filter((a: Account) => a.accountType === 'CASH' || a.accountType === 'BANK'));
  };

  const _handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.fromAccountId === formData.toAccountId) {
      toast.error('From & To account same nahi ho sakte');
      return;
    }

    const res = await fetch('/api/contra', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, amount: Number(formData.amount) }),
    });

    if (res.ok) {
      toast.success('Contra entry created');
      setShowForm(false);
      fetchEntries();
    }
  };

  if (loading) {
    return (
      <ResponsiveContainer>
        <div className="h-64 flex items-center justify-center">Loading…</div>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer>
      <PageHeader
        title="Contra Entry"
        description="Cash / Bank transfers"
        action={{ label: 'New Entry', onClick: () => setShowForm(true) }}
      />

      <Card>
        {entries.length === 0 ? (
          <EmptyState message="No contra entries" onAction={() => setShowForm(true)} />
        ) : (
          <DesktopTable>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td>{e.contraNumber}</td>
                  <td>{e.fromAccount?.name}</td>
                  <td>{e.toAccount?.name}</td>
                  <td>{e.amount}</td>
                </tr>
              ))}
            </tbody>
          </DesktopTable>
        )}
      </Card>
    </ResponsiveContainer>
  );
}
