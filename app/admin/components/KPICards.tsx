import React from 'react';

const kpis = [
  { label: 'Total Companies', value: '128', icon: '🏢', color: 'bg-blue-100 text-blue-800' },
  { label: 'Active Subscriptions', value: '97', icon: '🧾', color: 'bg-green-100 text-green-800' },
  { label: 'MRR', value: '$12,400', icon: '💰', color: 'bg-yellow-100 text-yellow-800' },
  { label: 'New Signups (30d)', value: '23', icon: '✨', color: 'bg-indigo-100 text-indigo-800' },
  { label: 'Churn Rate', value: '2.1%', icon: '📉', color: 'bg-red-100 text-red-800' },
  { label: 'Active Users (24h)', value: '312', icon: '👤', color: 'bg-purple-100 text-purple-800' },
];

export default function KPICards() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-10">
      {kpis.map((kpi) => (
        <div key={kpi.label} className={`flex flex-col items-center justify-center p-6 rounded-2xl shadow bg-white border ${kpi.color}`}>
          <span className="text-3xl mb-2">{kpi.icon}</span>
          <div className="text-2xl font-bold mb-1">{kpi.value}</div>
          <div className="text-sm text-gray-600 font-medium">{kpi.label}</div>
        </div>
      ))}
    </section>
  );
}
