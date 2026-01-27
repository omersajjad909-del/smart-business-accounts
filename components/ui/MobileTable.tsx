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
        <div className="md:hidden py-8 text-center text-gray-500 bg-white rounded-lg border border-gray-200">
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
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
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
    <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 font-medium">{label}:</span>
      <span className={`text-sm text-gray-900 text-right ${valueClassName}`}>{value}</span>
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
      <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
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
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {viewLabel}
        </button>
      )}
      {showEdit && onEdit && (
        <button
          onClick={onEdit}
          className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
        >
          {editLabel}
        </button>
      )}
      {showDelete && onDelete && (
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
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
    <div className={`text-center py-10 text-gray-500 bg-gray-50 rounded-lg flex flex-col items-center justify-center gap-4 ${className}`}>
      <p>{message}</p>
      {onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
