import React from 'react';

interface ResponsiveFormProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}

export function ResponsiveForm({ children, onSubmit, className = '' }: ResponsiveFormProps) {
  return (
    <form onSubmit={onSubmit} className={`space-y-4 sm:space-y-6 ${className}`}>
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
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
}

export function FormActions({ onCancel, submitLabel = 'Submit', cancelLabel = 'Cancel' }: FormActionsProps) {
  return (
    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        {submitLabel}
      </button>
    </div>
  );
}
