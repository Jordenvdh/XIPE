'use client';

/**
 * Main Layout Wrapper Component
 * Provides sidebar and main content area structure
 */
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-dark-bg">
      <Sidebar />
      <main className="flex-1 px-6 lg:px-12 py-8 lg:py-12 overflow-auto pt-20 lg:pt-12 text-gray-900 dark:text-light-text">
        {children}
      </main>
    </div>
  );
}

