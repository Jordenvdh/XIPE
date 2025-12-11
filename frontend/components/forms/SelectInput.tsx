'use client';

/**
 * Select Dropdown Input Component
 */
interface SelectInputProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}

export default function SelectInput({
  value,
  options,
  onChange,
  label,
  disabled = false,
}: SelectInputProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-white dark:bg-dark-surface border border-gray-300 dark:border-gray-600 rounded px-4 py-2 text-gray-900 dark:text-light-text focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

