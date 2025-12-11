'use client';

/**
 * Alert/Notification Component
 */
interface AlertProps {
  message: string;
  type?: 'warning' | 'error' | 'success' | 'info';
  onClose?: () => void;
}

export default function Alert({ message, type = 'info', onClose }: AlertProps) {
  const colors = {
    warning: 'bg-yellow-500/20 border-yellow-500 text-yellow-900 dark:text-yellow-300',
    error: 'bg-red-500/20 border-red-500 text-red-900 dark:text-red-300',
    success: 'bg-green-500/20 border-green-500 text-green-900 dark:text-green-300',
    info: 'bg-brand-blue/20 border-brand-blue text-brand-blue dark:text-blue-300',
  };

  const icons = {
    warning: '⚠️',
    error: '❌',
    success: '✅',
    info: 'ℹ️',
  };

  return (
    <div className={`border rounded-lg p-4 mb-4 flex items-center gap-3 ${colors[type]}`}>
      <span className="text-xl">{icons[type]}</span>
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-current hover:opacity-70 transition-opacity"
        >
          ×
        </button>
      )}
    </div>
  );
}

