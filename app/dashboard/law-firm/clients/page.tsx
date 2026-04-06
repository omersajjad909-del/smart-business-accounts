"use client";

import toast from "react-hot-toast";
import { useState } from 'react';
import { useBusinessRecords } from '@/lib/useBusinessRecords';

const S = {
  page: { padding: '32px', fontFamily: 'Inter, sans-serif', color: '#fff', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  title: { fontSize: 24, fontWeight: 700, margin: 0 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,.5)', marginTop: 4 },
  btn: { background: '#92400e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 },
  stat: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '20px 24px' },
  statLabel: { fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 6 },
  statVal: { fontSize: 28, fontWeight: 700 },
  card: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, overflow: 'hidden' },
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
  actBtn: { background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
};

export default function ClientsPage() {
  const { records, loading, create } = useBusinessRecords('legal_client');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'Individual', phone: '', email: '', city: '', status: 'Active' });

  const clients = records.map(r => ({
    id: r.id,
    clientId: (r.data?.clientId as string) || r.id,
    name: r.title,
    type: (r.data?.type as string) || 'Individual',
    phone: (r.data?.phone as string) || '',
    email: (r.data?.email as string) || '',
    city: (r.data?.city as string) || '',
    totalCases: Number(r.data?.totalCases) || 0,
    activeCases: Number(r.data?.activeCases) || 0,
    totalBilled: r.amount || Number(r.data?.totalBilled) || 0,
    outstanding: Number(r.data?.outstanding) || 0,
    joined: r.date || (r.data?.joined as string) || '',
    status: r.status || 'Active',
  }));

  const thisMonth = clients.filter(c => new Date(c.joined).getMonth() === new Date().getMonth()).length;
  const totalOutstanding = clients.reduce((a, c) => a + c.outstanding, 0);
  const active = clients.filter(c => c.status === 'Active').length;

  const handleAdd = async () => {
    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim().toLowerCase();
    const city = form.city.trim();
    const duplicateName = clients.some(c => c.name.toLowerCase() === name.toLowerCase());
    const duplicatePhone = phone && clients.some(c => c.phone.trim() === phone);
    const duplicateEmail = email && clients.some(c => c.email.trim().toLowerCase() === email);
    if (!name || !phone || !city) {
      toast.error('Client name, phone, aur city required hain.');
      return;
    }
    if (duplicateName || duplicatePhone || duplicateEmail) {
      toast('Yeh client name, phone, ya email pehle se maujood hai.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    await create({ title: form.name, status: form.status, date: today, data: { clientId: `CLT-${String(records.length + 1).padStart(3, '0')}`, type: form.type, phone: form.phone, email: form.email, city: form.city, totalCases: 0, activeCases: 0, totalBilled: 0, outstanding: 0, joined: today } });
    setShowModal(false);
    setForm({ name: '', type: 'Individual', phone: '', email: '', city: '', status: 'Active' });
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>👤 Clients</h1>
          <p style={S.sub}>Manage law firm clients and accounts</p>
        </div>
        <button style={S.btn} onClick={() => setShowModal(true)}>+ New Client</button>
      </div>

      <div style={S.stats}>
        <div style={S.stat}><div style={S.statLabel}>Total Clients</div><div style={S.statVal}>{clients.length}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Active</div><div style={{ ...S.statVal, color: '#34d399' }}>{active}</div></div>
        <div style={S.stat}><div style={S.statLabel}>New This Month</div><div style={{ ...S.statVal, color: '#818cf8' }}>{thisMonth}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Outstanding Dues</div><div style={{ ...S.statVal, color: '#f87171', fontSize: 22 }}>Rs. {totalOutstanding.toLocaleString()}</div></div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.4)' }}>Loading...</div>}

      <div style={S.card}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Client</th><th style={S.th}>Type</th><th style={S.th}>Contact</th>
            <th style={S.th}>City</th><th style={S.th}>Cases</th><th style={S.th}>Billed</th>
            <th style={S.th}>Outstanding</th><th style={S.th}>Status</th>
          </tr></thead>
          <tbody>
            {!loading && clients.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,.25)', fontSize: 14 }}>No clients found.</td></tr>
            )}
            {clients.map(c => (
              <tr key={c.id}>
                <td style={S.td}><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{c.clientId} · Joined {c.joined}</div></td>
                <td style={S.td}><span style={S.badge(c.type === 'Company' ? '#818cf8' : '#38bdf8')}>{c.type}</span></td>
                <td style={S.td}><div>{c.phone}</div><div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{c.email}</div></td>
                <td style={S.td}>{c.city}</td>
                <td style={S.td}><span style={{ color: '#38bdf8', fontWeight: 600 }}>{c.activeCases}</span> <span style={{ color: 'rgba(255,255,255,.4)' }}>/ {c.totalCases}</span></td>
                <td style={S.td}>Rs. {c.totalBilled.toLocaleString()}</td>
                <td style={S.td}><span style={{ color: c.outstanding > 0 ? '#f87171' : '#34d399', fontWeight: 600 }}>{c.outstanding > 0 ? `Rs. ${c.outstanding.toLocaleString()}` : '✓ Clear'}</span></td>
                <td style={S.td}><span style={S.badge(c.status === 'Active' ? '#34d399' : '#6b7280')}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={S.modal}>
            <div style={S.modalTitle}>Add New Client</div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Full Name / Company</label><input style={S.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div style={S.field}><label style={S.label}>Type</label><select style={S.input} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}><option>Individual</option><option>Company</option></select></div>
            </div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Phone</label><input style={S.input} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="03XX-XXXXXXX" /></div>
              <div style={S.field}><label style={S.label}>City</label><input style={S.input} value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Karachi" /></div>
            </div>
            <div style={S.field}><label style={S.label}>Email</label><input style={S.input} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="client@email.com" /></div>
            <div style={S.modalBtns}>
              <button style={{ ...S.btn, flex: 1 }} onClick={handleAdd}>Add Client</button>
              <button style={{ ...S.actBtn, flex: 1, padding: '10px' }} onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
