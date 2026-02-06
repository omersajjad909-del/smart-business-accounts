import React from 'react';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveContainer({ children, className = '' }: ResponsiveContainerProps) {
  return (
    <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] font-[var(--font-display)]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm sm:text-base text-[var(--text-muted)]">{description}</p>
          )}
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="w-full sm:w-auto px-4 py-2 bg-[var(--accent)] text-[#0b1324] rounded-lg hover:bg-[var(--accent-strong)] transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-[var(--card-bg)] rounded-lg shadow-[var(--shadow)] border border-[var(--border)] p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}
