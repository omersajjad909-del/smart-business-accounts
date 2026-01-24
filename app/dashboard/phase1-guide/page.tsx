'use client';

import Link from 'next/link';

export default function Phase1GuidePage() {
  const features = [
    {
      icon: '🏦',
      title: 'Bank Reconciliation',
      description: 'Match your system balance with bank statements',
      link: '/dashboard/bank-reconciliation',
      color: 'blue'
    },
    {
      icon: '💵',
      title: 'Payment Receipts',
      description: 'Record cash, check, and bank transfer payments',
      link: '/dashboard/payment-receipts',
      color: 'green'
    },
    {
      icon: '📋',
      title: 'Expense Vouchers',
      description: 'Record travel, food, and other expenses',
      link: '/dashboard/expense-vouchers',
      color: 'purple'
    },
    {
      icon: '🔧',
      title: 'Tax Configuration',
      description: 'Set up GST, VAT and other tax rates',
      link: '/dashboard/tax-configuration',
      color: 'orange'
    },
  ];

  const steps = [
    {
      num: 1,
      title: 'Add Bank Accounts',
      desc: 'First, add your bank accounts in Bank Reconciliation'
    },
    {
      num: 2,
      title: 'Import Bank Statements',
      desc: 'Add monthly statements from your bank'
    },
    {
      num: 3,
      title: 'Reconcile Balances',
      desc: 'Match system and bank balances'
    },
    {
      num: 4,
      title: 'Keep Records',
      desc: 'Record payments and expenses'
    },
  ];

  const colorClasses = {
    blue: 'border-blue-400 bg-blue-50 hover:bg-blue-100',
    green: 'border-green-400 bg-green-50 hover:bg-green-100',
    purple: 'border-purple-400 bg-purple-50 hover:bg-purple-100',
    orange: 'border-orange-400 bg-orange-50 hover:bg-orange-100',
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">💰 Phase 1: Banking & Payment Guide</h1>
        <p className="text-gray-600 text-lg">Complete solution for your financial management</p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {features.map((feature, idx) => (
          <Link
            key={idx}
            href={feature.link}
            className={`border-2 p-6 rounded-lg transition-all hover:shadow-lg ${colorClasses[feature.color as keyof typeof colorClasses]}`}
          >
            <div className="text-4xl mb-2">{feature.icon}</div>
            <div className="font-bold text-lg mb-1">{feature.title}</div>
            <div className="text-sm text-gray-700">{feature.description}</div>
          </Link>
        ))}
      </div>

      {/* Getting Started Steps */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-2xl font-bold mb-6">Getting Started</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, idx) => (
            <div key={idx} className="border-l-4 border-blue-500 pl-4">
              <div className="text-3xl font-bold text-blue-500 mb-2">{step.num}</div>
              <div className="font-semibold mb-1">{step.title}</div>
              <div className="text-sm text-gray-600">{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bank Reconciliation */}
        <div className="border border-blue-200 bg-blue-50 p-6 rounded-lg">
          <div className="text-2xl mb-2">🏦 Bank Reconciliation</div>
          <div className="font-semibold mb-3 text-gray-600">Match bank statements with your system</div>
          <ul className="space-y-2 text-sm">
            <li>✓ Support for multiple bank accounts</li>
            <li>✓ Automatic balance checking</li>
            <li>✓ Historical records</li>
            <li>✓ Discrepancy identification</li>
          </ul>
        </div>

        {/* Payment Receipts */}
        <div className="border border-green-200 bg-green-50 p-6 rounded-lg">
          <div className="text-2xl mb-2">💵 Payment Receipts</div>
          <div className="font-semibold mb-3 text-gray-600">Record all payment methods</div>
          <ul className="space-y-2 text-sm">
            <li>✓ Record cash payments</li>
            <li>✓ Check payment tracking</li>
            <li>✓ Bank transfer records</li>
            <li>✓ Status monitoring</li>
          </ul>
        </div>

        {/* Expense Vouchers */}
        <div className="border border-purple-200 bg-purple-50 p-6 rounded-lg">
          <div className="text-2xl mb-2">📋 Expense Vouchers</div>
          <div className="font-semibold mb-3 text-gray-600">Track and manage business expenses</div>
          <ul className="space-y-2 text-sm">
            <li>✓ Multiple expense categories</li>
            <li>✓ Approval workflow</li>
            <li>✓ Document attachment support</li>
            <li>✓ Detailed expense tracking</li>
          </ul>
        </div>

        {/* Tax Configuration */}
        <div className="border border-orange-200 bg-orange-50 p-6 rounded-lg">
          <div className="text-2xl mb-2">🔧 Tax Configuration</div>
          <div className="font-semibold mb-3 text-gray-600">Configure tax rates and types</div>
          <ul className="space-y-2 text-sm">
            <li>✓ Set GST rates</li>
            <li>✓ Add VAT configuration</li>
            <li>✓ Sales tax setup</li>
            <li>✓ Automatic invoice application</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center bg-gray-50 p-6 rounded-lg">
        <p className="text-gray-600 mb-4">For questions or help, please contact support</p>
        <Link href="/dashboard" className="inline-block bg-blue-500 text-white px-6 py-2 rounded font-semibold hover:bg-blue-600">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
