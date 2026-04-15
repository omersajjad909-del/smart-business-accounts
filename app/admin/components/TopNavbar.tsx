import React from 'react';

export default function TopNavbar() {
  return (
    <header className="fixed left-0 md:left-64 right-0 top-0 min-h-16 bg-white border-b border-gray-200 flex items-center px-4 sm:px-6 md:px-8 py-3 z-10 shadow-sm">
      <div className="font-bold text-lg sm:text-xl text-gray-900">Smart Business Admin</div>
      <div className="ml-auto flex items-center gap-3 sm:gap-4">
        {/* Placeholder for user avatar, notifications, etc. */}
        <span className="hidden sm:inline text-gray-500">Admin</span>
        <img src="/admin-avatar.png" alt="Admin Avatar" className="w-8 h-8 rounded-full border" />
      </div>
    </header>
  );
}
