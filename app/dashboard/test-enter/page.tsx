'use client';

import { useState } from 'react';
import { ResponsiveContainer, PageHeader, Card } from '@/components/ui/ResponsiveContainer';
import { ResponsiveForm, FormField, FormActions } from '@/components/ui/ResponsiveForm';

export default function TestEnterPage() {
  const [result, setResult] = useState('');
  const [formData, setFormData] = useState({
    field1: '',
    field2: '',
    field3: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(`Form submitted! Values: ${JSON.stringify(formData)}`);
  };

  return (
    <ResponsiveContainer>
      <PageHeader
        title="Enter Key Test Page"
        description="Test if Enter key submits the form"
      />

      <Card>
        <h2 className="text-lg font-semibold mb-4">Test Form</h2>
        
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ul className="list-disc ml-5 space-y-1 text-sm">
            <li>Fill any input field</li>
            <li>Press <kbd className="px-2 py-1 bg-gray-200 rounded">Enter</kbd></li>
            <li>Form should submit automatically</li>
            <li>Result will appear below</li>
          </ul>
        </div>

        {result && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
            <strong>✅ Success!</strong>
            <p className="mt-2">{result}</p>
          </div>
        )}

        <ResponsiveForm onSubmit={handleSubmit}>
          <FormField label="Field 1" required>
            <input
              type="text"
              value={formData.field1}
              onChange={(e) => setFormData({ ...formData, field1: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Type here and press Enter"
              required
            />
          </FormField>

          <FormField label="Field 2 (Select)" required>
            <select
              value={formData.field2}
              onChange={(e) => setFormData({ ...formData, field2: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="">Select and press Enter</option>
              <option value="option1">Option 1</option>
              <option value="option2">Option 2</option>
              <option value="option3">Option 3</option>
            </select>
          </FormField>

          <FormField label="Field 3 (Textarea - Enter should NOT submit)">
            <textarea
              value={formData.field3}
              onChange={(e) => setFormData({ ...formData, field3: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
              placeholder="Enter key should create new line here, not submit"
            />
          </FormField>

          <FormActions
            onCancel={() => setResult('Cancelled!')}
            submitLabel="Submit (or press Enter)"
          />
        </ResponsiveForm>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold mb-2">Current Values:</h3>
          <pre className="text-xs">{JSON.stringify(formData, null, 2)}</pre>
        </div>
      </Card>
    </ResponsiveContainer>
  );
}
