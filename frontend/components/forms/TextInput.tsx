'use client';

/**
 * Text Input Component
 */
interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function TextInput({
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
}: TextInputProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-white dark:bg-dark-surface border border-gray-300 dark:border-gray-600 rounded px-4 py-2 text-gray-900 dark:text-light-text focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
      />
    </div>
  );
}

