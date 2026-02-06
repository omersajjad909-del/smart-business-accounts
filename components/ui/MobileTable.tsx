import React from 'react';

interface MobileTableProps<T> {
  children?: React.ReactNode;
  data?: T[];
  emptyMessage?: string;
  renderCard?: (item: T) => React.ReactNode;
}

export function MobileTable<T>({ children, data, emptyMessage, renderCard }: MobileTableProps<T>) {
  if (data && renderCard) {
    if (data.length === 0) {
      return (
        <div className="md:hidden py-8 text-center text-[var(--text-muted)] bg-[var(--card-bg)] rounded-lg border border-[var(--border)]">
          {emptyMessage || "No items found"}
        </div>
      );
    }
    return (
      <div className="md:hidden space-y-4">
        {data.map((item, index) => (
          <React.Fragment key={index}>{renderCard(item)}</React.Fragment>
        ))}
      </div>
    );
  }

  return <div className="md:hidden space-y-4">{children}</div>;
}

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileCard({ children, className = '' }: MobileCardProps) {
  return (
    <div className={`bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-4 ${className}`}>
      {children}
    </div>
  );
}

interface MobileCardRowProps {
  label: string;
  value: string | React.ReactNode;
  valueClassName?: string;
}

export function MobileCardRow({ label, value, valueClassName = '' }: MobileCardRowProps) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-[var(--border)]/50 last:border-0">
      <span className="text-sm text-[var(--text-muted)] font-medium">{label}:</span>
      <span className={`text-sm text-[var(--text-primary)] text-right ${valueClassName}`}>{value}</span>
    </div>
  );
}

interface DesktopTableProps {
  children: React.ReactNode;
  className?: string;
}

export function DesktopTable({ children, className = '' }: DesktopTableProps) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className={`min-w-full divide-y divide-[var(--border)] ${className}`}>
        {children}
      </table>
    </div>
  );
}

interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  viewLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
}

export function ActionButtons({
  onView,
  onEdit,
  onDelete,
  viewLabel = 'View',
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  showView = true,
  showEdit = true,
  showDelete = true,
}: ActionButtonsProps) {
  return (
    <div className="flex items-center gap-2 justify-end">
      {showView && onView && (
        <button
          onClick={onView}
          className="text-[var(--accent)] hover:text-[var(--accent-strong)] text-sm font-medium"
        >
          {viewLabel}
        </button>
      )}
      {showEdit && onEdit && (
        <button
          onClick={onEdit}
          className="text-[var(--warning)] hover:opacity-90 text-sm font-medium"
        >
          {editLabel}
        </button>
      )}
      {showDelete && onDelete && (
        <button
          onClick={onDelete}
          className="text-[var(--danger)] hover:opacity-90 text-sm font-medium"
        >
          {deleteLabel}
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  message?: string;
  className?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export function EmptyState({ message = "No items found", className = "", onAction, actionLabel = "Create New" }: EmptyStateProps) {
  return (
    <div className={`text-center py-10 text-[var(--text-muted)] bg-[var(--card-bg-2)] rounded-lg flex flex-col items-center justify-center gap-4 ${className}`}>
      <p>{message}</p>
      {onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-[var(--accent)] text-[#0b1324] rounded-lg hover:bg-[var(--accent-strong)] transition-colors text-sm font-medium"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
