'use client';

/**
 * Number Input Component with Increment/Decrement Buttons
 */
import { useState, useEffect } from 'react';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  format?: (value: number) => string;
  disabled?: boolean;
}

export default function NumberInput({
  value,
  onChange,
  label,
  min = 0,
  max,
  step = 0.1,
  format = (v) => v.toFixed(1),
  disabled = false,
}: NumberInputProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const handleIncrement = () => {
    const newValue = value + step;
    if (max === undefined || newValue <= max) {
      onChange(newValue);
    }
  };

  const handleDecrement = () => {
    const newValue = value - step;
    if (newValue >= min) {
      onChange(newValue);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {label && (
        <label className="text-sm font-medium min-w-[120px] text-gray-900 dark:text-white">{label}</label>
      )}
      <div className="flex items-center border border-gray-600 rounded">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className="px-3 py-2 bg-brand-blue dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 active:bg-blue-700 dark:active:bg-blue-800 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500 dark:disabled:text-gray-500 text-white rounded-l transition-colors font-bold text-lg leading-none"
          aria-label={`Decrease ${label || 'value'}`}
        >
          −
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const newValue = parseFloat(e.target.value) || 0;
            if (newValue >= min && (max === undefined || newValue <= max)) {
              onChange(newValue);
            }
          }}
          className="w-24 px-3 py-2 bg-white dark:bg-dark-surface text-gray-900 dark:text-light-text text-center border-0 focus:outline-none focus:ring-2 focus:ring-brand-blue"
          min={min}
          max={max}
          step={step}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && value >= max)}
          className="px-3 py-2 bg-brand-blue dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 active:bg-blue-700 dark:active:bg-blue-800 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500 dark:disabled:text-gray-500 text-white rounded-r transition-colors font-bold text-lg leading-none"
          aria-label={`Increase ${label || 'value'}`}
        >
          +
        </button>
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {mounted ? format(value) : format(0)}
      </span>
    </div>
  );
}

