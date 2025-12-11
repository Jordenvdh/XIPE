'use client';

/**
 * Read-Only Table Component
 * For displaying country constants and other read-only data
 */
interface ReadOnlyTableProps {
  data: Array<Record<string, string | number>>;
  columns: string[];
  title?: string;
  description?: string;
}

export default function ReadOnlyTable({ 
  data, 
  columns, 
  title,
  description 
}: ReadOnlyTableProps) {
  return (
    <div className="mb-8">
      {title && (
        <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{title}</h3>
      )}
      
      {description && (
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">{description}</p>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              {columns.map((column, index) => (
                <th key={index} className="text-left p-3 font-semibold text-gray-900 dark:text-white">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                {columns.map((column, colIndex) => {
                  const value = row[column];
                  return (
                    <td key={colIndex} className="p-3 text-gray-900 dark:text-white">
                      {typeof value === 'number' ? value.toFixed(1) : value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

