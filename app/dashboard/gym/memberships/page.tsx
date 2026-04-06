"use client";

import toast from "react-hot-toast";
import { useState } from 'react';
import { useBusinessRecords } from '@/lib/useBusinessRecords';

const S = {
  page: { padding: '32px', fontFamily: 'Inter, sans-serif', color: '#fff', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 24, fontWeight: 700, margin: 0 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,.5)', marginTop: 4 },
  btn: { background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 },
  card: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '20px 24px' },
  statLabel: { fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 6 },
  statVal: { fontSize: 28, fontWeight: 700 },
  tabs: { display: 'flex', gap: 8, marginBottom: 24 },
  tab: (a: boolean) => ({ background: a ? '#16a34a' : 'rgba(255,255,255,.06)', color: a ? '#fff' : 'rgba(255,255,255,.6)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }),
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,.5)', borderBottom: '1px solid rgba(255,255,255,.07)', fontWeight: 600 },
  td: { padding: '14px 16px', fontSize: 14, borderBottom: '1px solid rgba(255,255,255,.04)' },
  badge: (c: string) => ({ display: 'inline-block', background: `${c}20`, color: c, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }),
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 6 },
  input: { width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' as const },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  modalBtns: { display: 'flex', gap: 12, marginTop: 24 },
  actBtn: { flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', borderRadius: 8, padding: '10px', fontSize: 14, cursor: 'pointer' },
};

const PLANS = ['Monthly', 'Quarterly', 'Annual'];
const PLAN_FEE: Record<string, number> = { Monthly: 3500, Quarterly: 9500, Annual: 32000 };
const STATUS_COLOR: Record<string, string> = { Active: '#34d399', Expiring: '#fbbf24', Expired: '#f87171' };

const today = new Date();

export default function MembershipsPage() {
  const { records, loading, create, update } = useBusinessRecords('gym_member');
  const [tab, setTab] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', plan: 'Monthly', startDate: today.toISOString().split('T')[0], paymentStatus: 'Paid' });

  const members = records.map(r => ({
    id: r.id,
    memberId: (r.data?.memberId as string) || r.title,
    name: r.title,
    plan: (r.data?.plan as string) || 'Monthly',
    startDate: r.date || (r.data?.startDate as string) || '',
    endDate: (r.data?.endDate as string) || '',
    status: r.status || 'Active',
    daysLeft: Number(r.data?.daysLeft) || 0,
    fee: r.amount || Number(r.data?.fee) || 0,
    paymentStatus: (r.data?.paymentStatus as string) || 'Paid',
  }));

  const filtered = tab === 'All' ? members : members.filter(m => m.status === tab);
  const active = members.filter(m => m.status === 'Active').length;
  const expiring = members.filter(m => m.status === 'Expiring').length;
  const revenue = members.filter(m => m.paymentStatus === 'Paid').reduce((a, m) => a + m.fee, 0);

  const handleAdd = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error('Member name required hai.');
      return;
    }
    if (members.some(m => m.name.trim().toLowerCase() === name.toLowerCase() && m.status !== 'Expired')) {
      toast.error('Is member ka active record already maujood hai.');
      return;
    }
    const fee = PLAN_FEE[form.plan];
    const days = form.plan === 'Monthly' ? 30 : form.plan === 'Quarterly' ? 90 : 365;
    const end = new Date(form.startDate); end.setDate(end.getDate() + days);
    const daysLeft = Math.round((end.getTime() - today.getTime()) / 86400000);
    await create({ title: name, status: daysLeft <= 7 ? 'Expiring' : 'Active', date: form.startDate, amount: fee, data: { memberId: `M-${String(records.length + 1).padStart(3, '0')}`, plan: form.plan, startDate: form.startDate, endDate: end.toISOString().split('T')[0], daysLeft, fee, paymentStatus: form.paymentStatus } });
    setShowModal(false);
    setForm({ name: '', plan: 'Monthly', startDate: today.toISOString().split('T')[0], paymentStatus: 'Paid' });
  };

  const renew = async (id: string, plan: string) => {
    const days = plan === 'Monthly' ? 30 : plan === 'Quarterly' ? 90 : 365;
    const end = new Date(); end.setDate(end.getDate() + days);
    await update(id, { status: 'Active', data: { endDate: end.toISOString().split('T')[0], daysLeft: days } });
  };

  const markPaid = async (id: string) => {
    await update(id, { data: { paymentStatus: 'Paid' } });
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>🏋️ Memberships</h1>
          <p style={S.sub}>Track all gym members and subscriptions</p>
        </div>
        <button style={S.btn} onClick={() => setShowModal(true)}>+ New Membership</button>
      </div>

      <div style={S.stats}>
        <div style={S.card}><div style={S.statLabel}>Total Members</div><div style={S.statVal}>{members.length}</div></div>
        <div style={S.card}><div style={S.statLabel}>Active</div><div style={{ ...S.statVal, color: '#34d399' }}>{active}</div></div>
        <div style={S.card}><div style={S.statLabel}>Expiring This Week</div><div style={{ ...S.statVal, color: '#f87171' }}>{expiring}</div></div>
        <div style={S.card}><div style={S.statLabel}>Revenue This Month</div><div style={{ ...S.statVal, color: '#16a34a', fontSize: 22 }}>Rs. {revenue.toLocaleString()}</div></div>
      </div>

      <div style={S.tabs}>
        {['All', 'Active', 'Expiring', 'Expired'].map(t => (
          <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>{t} ({t === 'All' ? members.length : members.filter(m => m.status === t).length})</button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.4)' }}>Loading...</div>}

      <div style={S.card}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Member</th>
            <th style={S.th}>Plan</th>
            <th style={S.th}>Start</th>
            <th style={S.th}>Expires</th>
            <th style={S.th}>Days Left</th>
            <th style={S.th}>Fee</th>
            <th style={S.th}>Status</th>
            <th style={S.th}>Payment</th>
            <th style={S.th}>Actions</th>
          </tr></thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,.25)', fontSize: 14 }}>No members found.</td></tr>
            )}
            {filtered.map(m => (
              <tr key={m.id}>
                <td style={S.td}><div style={{ fontWeight: 600 }}>{m.name}</div><div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{m.memberId}</div></td>
                <td style={S.td}>{m.plan}</td>
                <td style={S.td}>{m.startDate}</td>
                <td style={S.td}>{m.endDate}</td>
                <td style={S.td}><span style={{ color: m.daysLeft < 0 ? '#f87171' : m.daysLeft <= 7 ? '#fbbf24' : '#34d399', fontWeight: 600 }}>{m.daysLeft < 0 ? `${Math.abs(m.daysLeft)}d ago` : `${m.daysLeft}d`}</span></td>
                <td style={S.td}>Rs. {m.fee.toLocaleString()}</td>
                <td style={S.td}><span style={S.badge(STATUS_COLOR[m.status] || '#6b7280')}>{m.status}</span></td>
                <td style={S.td}>
                  {m.paymentStatus === 'Pending' ? <button style={{ ...S.btn, padding: '4px 10px', fontSize: 12 }} onClick={() => markPaid(m.id)}>Mark Paid</button> : <span style={S.badge('#34d399')}>Paid</span>}
                </td>
                <td style={S.td}>
                  {(m.status === 'Expiring' || m.status === 'Expired') && <button style={{ ...S.btn, padding: '4px 10px', fontSize: 12 }} onClick={() => renew(m.id, m.plan)}>Renew</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={S.modal}>
            <div style={S.modalTitle}>New Membership</div>
            <div style={S.field}><label style={S.label}>Member Name</label><input style={S.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" /></div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Plan</label><select style={S.input} value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}>{PLANS.map(pl => <option key={pl}>{pl}</option>)}</select></div>
              <div style={S.field}><label style={S.label}>Start Date</label><input type="date" style={S.input} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} /></div>
            </div>
            <div style={S.field}><label style={S.label}>Fee: Rs. {PLAN_FEE[form.plan].toLocaleString()}</label></div>
            <div style={S.field}><label style={S.label}>Payment Status</label><select style={S.input} value={form.paymentStatus} onChange={e => setForm(p => ({ ...p, paymentStatus: e.target.value }))}><option>Paid</option><option>Pending</option></select></div>
            <div style={S.modalBtns}>
              <button style={{ ...S.btn, flex: 1 }} onClick={handleAdd}>Add Member</button>
              <button style={S.actBtn} onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
