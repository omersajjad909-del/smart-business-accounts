import toast from "react-hot-toast";
'use client';
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
  tabs: { display: 'flex', gap: 8, marginBottom: 24 },
  tab: (a: boolean) => ({ background: a ? '#92400e' : 'rgba(255,255,255,.06)', color: a ? '#fff' : 'rgba(255,255,255,.6)', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }),
  card: { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,.5)', borderBottom: '1px solid rgba(255,255,255,.07)', fontWeight: 600 },
  td: { padding: '14px 16px', fontSize: 14, borderBottom: '1px solid rgba(255,255,255,.04)' },
  badge: (c: string) => ({ display: 'inline-block', background: `${c}20`, color: c, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }),
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 500 },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 6 },
  input: { width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box' as const },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  modalBtns: { display: 'flex', gap: 12, marginTop: 24 },
  actBtn: { background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
};

const STATUS_COLOR: Record<string, string> = { Draft: '#6b7280', Sent: '#38bdf8', Paid: '#34d399', Overdue: '#f87171' };

export default function BillingPage() {
  const { records, loading, create, update } = useBusinessRecords('legal_invoice');
  const [tab, setTab] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ client: '', caseId: '', description: '', hours: '', rate: '5000', disbursements: '0', dueDate: '' });

  const invoices = records.map(r => ({
    id: r.id,
    invoiceId: (r.data?.invoiceId as string) || r.id,
    caseId: (r.data?.caseId as string) || '',
    client: r.title,
    description: (r.data?.description as string) || '',
    hours: Number(r.data?.hours) || 0,
    rate: Number(r.data?.rate) || 0,
    amount: Number(r.data?.amount) || 0,
    disbursements: Number(r.data?.disbursements) || 0,
    total: r.amount || Number(r.data?.total) || 0,
    status: r.status || 'Draft',
    dueDate: r.date || (r.data?.dueDate as string) || '',
  }));

  const filtered = tab === 'All' ? invoices : invoices.filter(i => i.status === tab);
  const totalBilled = invoices.reduce((a, i) => a + i.total, 0);
  const received = invoices.filter(i => i.status === 'Paid').reduce((a, i) => a + i.total, 0);
  const pending = invoices.filter(i => i.status === 'Sent').reduce((a, i) => a + i.total, 0);
  const overdue = invoices.filter(i => i.status === 'Overdue').reduce((a, i) => a + i.total, 0);

  const handleAdd = async () => {
    const client = form.client.trim();
    const caseId = form.caseId.trim();
    const description = form.description.trim();
    const hours = Number(form.hours); const rate = Number(form.rate); const disb = Number(form.disbursements);
    const duplicateInvoice = invoices.some(i => i.client.toLowerCase() === client.toLowerCase() && i.caseId.toLowerCase() === caseId.toLowerCase() && i.description.toLowerCase() === description.toLowerCase() && i.dueDate === form.dueDate);
    if (!client || !caseId || !description || !form.dueDate) {
      toast.error('Client, case ID, description, aur due date required hain.');
      return;
    }
    if (hours <= 0 || rate <= 0 || disb < 0) {
      toast('Hours aur rate positive hon, aur disbursements negative na hon.');
      return;
    }
    if (duplicateInvoice) {
      toast.error('Yeh invoice is case ke liye already draft ho chuki hai.');
      return;
    }
    const amount = hours * rate; const total = amount + disb;
    await create({ title: form.client, status: 'Draft', date: form.dueDate, amount: total, data: { invoiceId: `INV-${String(records.length + 1).padStart(3, '0')}`, caseId: form.caseId, description: form.description, hours, rate, amount, disbursements: disb, total, dueDate: form.dueDate } });
    setShowModal(false);
    setForm({ client: '', caseId: '', description: '', hours: '', rate: '5000', disbursements: '0', dueDate: '' });
  };

  const markPaid = async (id: string) => {
    const invoice = invoices.find(i => i.id === id);
    if (!invoice || invoice.status === 'Draft') {
      toast.success('Draft invoice ko pehle send karein, phir paid mark karein.');
      return;
    }
    await update(id, { status: 'Paid' });
  };
  const sendInvoice = async (id: string) => {
    const invoice = invoices.find(i => i.id === id);
    if (!invoice || invoice.total <= 0) {
      toast.error('Invalid invoice total ke saath send nahi ki ja sakti.');
      return;
    }
    await update(id, { status: 'Sent' });
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>🧾 Billing</h1>
          <p style={S.sub}>Legal invoices and fee management</p>
        </div>
        <button style={S.btn} onClick={() => setShowModal(true)}>+ New Invoice</button>
      </div>

      <div style={S.stats}>
        <div style={S.stat}><div style={S.statLabel}>Total Billed</div><div style={{ ...S.statVal, fontSize: 22 }}>Rs. {totalBilled.toLocaleString()}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Received</div><div style={{ ...S.statVal, color: '#34d399', fontSize: 22 }}>Rs. {received.toLocaleString()}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Pending</div><div style={{ ...S.statVal, color: '#fbbf24', fontSize: 22 }}>Rs. {pending.toLocaleString()}</div></div>
        <div style={S.stat}><div style={S.statLabel}>Overdue</div><div style={{ ...S.statVal, color: '#f87171', fontSize: 22 }}>Rs. {overdue.toLocaleString()}</div></div>
      </div>

      <div style={S.tabs}>
        {['All', 'Draft', 'Sent', 'Paid', 'Overdue'].map(t => (
          <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,.4)' }}>Loading...</div>}

      <div style={S.card}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Invoice</th><th style={S.th}>Client</th><th style={S.th}>Description</th>
            <th style={S.th}>Hours</th><th style={S.th}>Amount</th><th style={S.th}>Total</th>
            <th style={S.th}>Due Date</th><th style={S.th}>Status</th><th style={S.th}>Actions</th>
          </tr></thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,.25)', fontSize: 14 }}>No invoices found.</td></tr>
            )}
            {filtered.map(i => (
              <tr key={i.id}>
                <td style={S.td}><div style={{ fontWeight: 600 }}>{i.invoiceId}</div><div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>{i.caseId}</div></td>
                <td style={S.td}>{i.client}</td>
                <td style={{ ...S.td, maxWidth: 200 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.description}</div></td>
                <td style={S.td}>{i.hours}h @ Rs. {i.rate.toLocaleString()}</td>
                <td style={S.td}>Rs. {i.amount.toLocaleString()}</td>
                <td style={S.td}><strong>Rs. {i.total.toLocaleString()}</strong></td>
                <td style={S.td}>{i.dueDate}</td>
                <td style={S.td}><span style={S.badge(STATUS_COLOR[i.status])}>{i.status}</span></td>
                <td style={S.td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {i.status === 'Draft' && <button style={{ ...S.actBtn, color: '#38bdf8' }} onClick={() => sendInvoice(i.id)}>Send</button>}
                    {(i.status === 'Sent' || i.status === 'Overdue') && <button style={{ ...S.actBtn, color: '#34d399' }} onClick={() => markPaid(i.id)}>Mark Paid</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={S.modal}>
            <div style={S.modalTitle}>New Invoice</div>
            <div style={S.row2}>
              <div style={S.field}><label style={S.label}>Client</label><input style={S.input} value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} /></div>
              <div style={S.field}><label style={S.label}>Case ID</label><input style={S.input} value={form.caseId} onChange={e => setForm(p => ({ ...p, caseId: e.target.value }))} placeholder="CASE-XXX" /></div>
            </div>
            <div style={S.field}><label style={S.label}>Description</label><input style={S.input} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div style={S.row3}>
              <div style={S.field}><label style={S.label}>Hours</label><input type="number" style={S.input} value={form.hours} onChange={e => setForm(p => ({ ...p, hours: e.target.value }))} /></div>
              <div style={S.field}><label style={S.label}>Rate / Hr</label><input type="number" style={S.input} value={form.rate} onChange={e => setForm(p => ({ ...p, rate: e.target.value }))} /></div>
              <div style={S.field}><label style={S.label}>Disbursements</label><input type="number" style={S.input} value={form.disbursements} onChange={e => setForm(p => ({ ...p, disbursements: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: 16, padding: '12px', background: 'rgba(146,64,14,.1)', borderRadius: 8, fontSize: 14 }}>
              Total: <strong>Rs. {((Number(form.hours) * Number(form.rate)) + Number(form.disbursements)).toLocaleString()}</strong>
            </div>
            <div style={S.field}><label style={S.label}>Due Date</label><input type="date" style={S.input} value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} /></div>
            <div style={S.modalBtns}>
              <button style={{ ...S.btn, flex: 1 }} onClick={handleAdd}>Create Invoice</button>
              <button style={{ ...S.actBtn, flex: 1, padding: '10px' }} onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
