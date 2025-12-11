'use client';

/**
 * Loading Spinner Component
 */
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export default function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className={`${sizes[size]} border-4 border-gray-600 border-t-brand-blue rounded-full animate-spin`}
      />
      {text && <p className="text-sm text-gray-800 dark:text-gray-400">{text}</p>}
    </div>
  );
}

