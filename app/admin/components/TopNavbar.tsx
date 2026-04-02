import React from 'react';

export default function TopNavbar() {
  return (
    <header className="fixed left-64 right-0 top-0 h-16 bg-white border-b border-gray-200 flex items-center px-8 z-10 shadow-sm">
      <div className="font-bold text-xl text-gray-900">Smart Business Admin</div>
      <div className="ml-auto flex items-center gap-4">
        {/* Placeholder for user avatar, notifications, etc. */}
        <span className="text-gray-500">Admin</span>
        <img src="/admin-avatar.png" alt="Admin Avatar" className="w-8 h-8 rounded-full border" />
      </div>
    </header>
  );
}
