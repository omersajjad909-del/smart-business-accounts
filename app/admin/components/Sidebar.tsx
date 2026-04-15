import React from 'react';


import Link from "next/link";

const sections = [
  { name: 'Dashboard', icon: '📊', href: '/admin' },
  { name: 'Companies', icon: '🏢', href: '/admin/companies' },
  { name: 'Users', icon: '👤', href: '/admin/users' },
  { name: 'Subscriptions', icon: '💳', href: '/admin/subscriptions' },
  { name: 'Revenue Analytics', icon: '💰', href: '/admin/revenue' },
  { name: 'Geo Analytics', icon: '🌍', href: '/admin/geo' },
  { name: 'Usage Insights', icon: '📈', href: '/admin/usage' },
  { name: 'Plans & Billing', icon: '🧾', href: '/admin/plans' },
  { name: 'Business Modules', icon: '🧩', href: '/admin/business-modules' },
  { name: 'Feature Flags', icon: '🚩', href: '/admin/feature-flags' },
  { name: 'Broadcasts', icon: '📢', href: '/admin/broadcasts' },
  { name: 'Marketing Automation', icon: '⚡', href: '/admin/automation' },
  { name: 'CRM Workspace', icon: '🤝', href: '/admin/crm' },
  { name: 'Leads', icon: '🎯', href: '/admin/leads' },
  { name: 'Email Logs', icon: '✉️', href: '/admin/email-logs' },
  { name: 'Testimonials', icon: '⭐', href: '/admin/testimonials' },
  { name: 'Web Content', icon: '🌐', href: '/admin/web' },
  { name: 'System Health', icon: '🩺', href: '/admin/system' },
  { name: 'Audit Logs', icon: '📝', href: '/admin/logs' },
  { name: 'Settings', icon: '⚙️', href: '/admin/settings' },
];

export default function Sidebar() {
  return (
    <aside className="h-screen w-64 bg-gray-900 text-white flex flex-col fixed left-0 top-0 z-20 shadow-lg">
      <div className="px-6 py-8 text-2xl font-black tracking-tight border-b border-gray-800">Admin Panel</div>
      <nav className="flex-1 py-6">
        <ul className="space-y-2">
          {sections.map((section) => (
            <li key={section.name}>
              <Link href={section.href} className="flex items-center px-6 py-3 rounded-lg hover:bg-gray-800 transition">
                <span className="mr-3 text-xl">{section.icon}</span>
                <span className="font-semibold">{section.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
