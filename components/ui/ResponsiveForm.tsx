import React from 'react';

interface ResponsiveFormProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}

export function ResponsiveForm({ children, onSubmit, className = '' }: ResponsiveFormProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Handle Enter key globally in form
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      
      // Don't submit if in textarea (allow newlines)
      if (target.tagName === 'TEXTAREA') return;
      
      // Don't submit if Shift+Enter
      if (e.shiftKey) return;
      
      // If in an input/select, submit the form
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
        // Handled by global hook now
        // e.preventDefault();
      }
    }
  };

  return (
    <form 
      onSubmit={onSubmit} 
      onKeyDown={handleKeyDown}
      className={`space-y-4 sm:space-y-6 ${className}`}
    >
      {children}
    </form>
  );
}

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
}

export function FormField({ label, children, required, error }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface FormActionsProps {
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  children?: React.ReactNode;
}

export function FormActions({ onCancel, submitLabel = 'Submit', cancelLabel = 'Cancel', children }: FormActionsProps) {
  if (children) {
    return (
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-4">
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-4">
      {onCancel && (
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          {cancelLabel}
        </Button>
      )}
      <Button
        type="submit"
        className="w-full sm:w-auto"
      >
        {submitLabel}
      </Button>
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border ${className}`}
      {...props}
    />
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = "", ...props }: SelectProps) {
  return (
    <select
      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border ${className}`}
      {...props}
    />
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
}

export function Button({ className = "", variant = 'primary', ...props }: ButtonProps) {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-green-600 text-white hover:bg-green-700",
  };

  return (
    <button
      className={`inline-flex justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
