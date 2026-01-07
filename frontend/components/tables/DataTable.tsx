'use client';

/**
 * Editable Data Table Component
 * Displays variables with editable "User Input" column and read-only "Default Value" column
 * 
 * Security considerations:
 * - OWASP #7 - XSS: React automatically escapes all rendered content
 * - User input is validated as numbers only (type="number")
 * - No dangerouslySetInnerHTML or innerHTML used
 * - All text content is safely escaped by React
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

  // Keep local state in sync when parent-provided variables change,
  // but preserve userInput values that the user has entered.
  // Always update defaultValue from props to ensure country-specific defaults update correctly.
  useEffect(() => {
    setEditedVariables((current) => {
      // If variable count changed, use new props
      if (current.length !== variables.length) {
        return variables;
      }
      
      // Otherwise, merge: preserve userInput from props if it exists (saved value),
      // otherwise preserve current userInput if user is actively editing
      return variables.map((propVar, index) => {
        const currentVar = current[index];
        
        // If props has a non-zero userInput, it means it was saved - use it
        // This ensures saved values are displayed correctly
        if (propVar.userInput !== 0) {
          return {
            ...propVar, // Includes updated defaultValue and saved userInput
          };
        }
        
        // If current has a non-zero userInput and props doesn't have one saved,
        // preserve current (user is actively editing)
        if (currentVar && currentVar.userInput !== 0) {
          return {
            ...propVar, // Includes updated defaultValue
            userInput: currentVar.userInput, // Preserve current user input
          };
        }
        
        // Otherwise use props as-is (includes updated defaultValue and userInput=0)
        return propVar;
      });
    });
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
    <div className="mb-6">
      {title && (
        <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">{title}</h3>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-white text-sm">Variable</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-white text-sm">User Input</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-white text-sm">Default Value</th>
            </tr>
          </thead>
          <tbody>
            {/* Render editable rows with a theme-aware hover background */}
            {editedVariables.map((variable, index) => (
              <tr 
                key={index} 
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-[var(--hover-bg)] transition-colors"
              >
                {/* OWASP #7 - XSS: React automatically escapes variable.variable */}
                <td className="py-2 px-2 text-gray-900 dark:text-white text-sm">{variable.variable}</td>
                <td className="py-2 px-2">
                  {/* OWASP #7 - XSS: type="number" restricts input to numeric values only */}
                  <input
                    type="number"
                    value={variable.userInput || ''}
                    onChange={(e) => {
                      // OWASP #1 - Injection Prevention: Parse and validate numeric input
                      const newValue = parseFloat(e.target.value) || 0;
                      handleInputChange(index, newValue);
                    }}
                    className="w-full bg-table-input text-dark-text px-2 py-1.5 rounded border border-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue hover:bg-table-input-hover transition-colors text-sm"
                    disabled={disabled}
                    step="0.01"
                    min="0"
                    aria-label={`User input for ${variable.variable}`}
                  />
                </td>
                {/* OWASP #7 - XSS: formatDefaultValue returns string, React escapes it */}
                <td className="py-2 px-2 text-gray-800 dark:text-gray-400 text-sm">
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

