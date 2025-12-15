'use client';

/**
 * Editable Data Table Component
 * Displays variables with editable "User Input" column and read-only "Default Value" column
 */
import { useEffect, useState } from 'react';
import type { VariableRow } from '@/lib/types';

interface DataTableProps {
  variables: VariableRow[];
  onSave: (variables: VariableRow[]) => void;
  title?: string;
  disabled?: boolean;
  /**
   * Optional change handler for live updates (e.g., syncing context/local state)
   */
  onChange?: (variables: VariableRow[]) => void;
}

export default function DataTable({ 
  variables, 
  onSave, 
  title,
  disabled = false,
  onChange,
}: DataTableProps) {
  const [editedVariables, setEditedVariables] = useState<VariableRow[]>(variables);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Format default values so that:
   * - Large numbers show at most one decimal, with trailing ".0" trimmed
   *   (e.g. 20.0 → "20", 20.3 → "20.3").
   * - Small numbers are shown with enough significant digits to reveal
   *   the first non‑zero decimal (e.g. 0.03 → "0.03", 0.003 → "0.003").
   * This avoids rounding very efficient electric values (such as 0.03 kWh/km)
   * down to "0.0" in the UI while keeping the underlying numeric value intact.
   */
  const formatDefaultValue = (value: number): string => {
    if (!Number.isFinite(value)) return '';
    if (value === 0) return '0';

    const abs = Math.abs(value);

    // For small magnitudes, use significant digits and trim trailing zeros.
    if (abs < 1) {
      const raw = value.toPrecision(3); // e.g. 0.00312 -> "0.00312"
      // Avoid scientific notation if it appears for extremely small values.
      if (raw.includes('e') || raw.includes('E')) {
        return value.toString();
      }
      return raw.replace(/(?:\.0+|(\.\d*?[1-9]))0*$/, '$1');
    }

    // For >= 1, show one decimal and strip a trailing ".0".
    const raw = value.toFixed(1); // e.g. 20.0 -> "20.0", 20.3 -> "20.3"
    return raw.replace(/\.0$/, '');
  };

  // Keep local state in sync when parent-provided variables change
  useEffect(() => {
    setEditedVariables(variables);
  }, [variables]);

  const handleInputChange = (index: number, value: number) => {
    const updated = [...editedVariables];
    updated[index] = { ...updated[index], userInput: value };
    setEditedVariables(updated);
    onChange?.(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedVariables);
    } catch (error) {
      console.error('Error saving variables:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mb-8">
      {title && (
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{title}</h3>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">Variable</th>
              <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">User Input</th>
              <th className="text-left p-3 font-semibold text-gray-900 dark:text-white">Default Value</th>
            </tr>
          </thead>
          <tbody>
            {/* Render editable rows with a theme-aware hover background */}
            {editedVariables.map((variable, index) => (
              <tr 
                key={index} 
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-[var(--hover-bg)] transition-colors"
              >
                <td className="p-3 text-gray-900 dark:text-white">{variable.variable}</td>
                <td className="p-3">
                  <input
                    type="number"
                    value={variable.userInput}
                    onChange={(e) => handleInputChange(index, parseFloat(e.target.value) || 0)}
                    className="w-full bg-table-input text-dark-text px-3 py-2 rounded border border-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue hover:bg-table-input-hover transition-colors"
                    disabled={disabled}
                    step="0.01"
                    min="0"
                    aria-label={`User input for ${variable.variable}`}
                  />
                </td>
                <td className="p-3 text-gray-800 dark:text-gray-400">
                  {formatDefaultValue(variable.defaultValue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving || disabled}
        className="mt-4 bg-brand-blue hover:bg-blue-600 dark:hover:bg-blue-700 active:bg-blue-700 dark:active:bg-blue-800 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded transition-colors font-medium shadow-sm hover:shadow-md"
        aria-label={`Save ${title || 'variables'}`}
      >
        {isSaving ? 'Saving...' : title ? `Save ${title}` : 'Save'}
      </button>
    </div>
  );
}

