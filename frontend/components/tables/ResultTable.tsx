'use client';

/**
 * Result Table Component with Color Coding
 * Green: negative values (reduction), Red: positive values (increase), Yellow: zero
 */
interface ResultTableProps {
  data: Record<string, number[]>;
  rowLabels: string[];
  columnLabels: string[];
  title?: string;
}

function getCellColor(value: number): string {
  if (value < 0) {
    return 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 font-semibold'; // Reduction (bright green)
  } else if (value > 0) {
    return 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold'; // Increase (bright red)
  } else {
    return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 font-semibold'; // No change (bright yellow)
  }
}

export default function ResultTable({ 
  data, 
  rowLabels, 
  columnLabels,
  title 
}: ResultTableProps) {
  return (
    <div className="mb-8">
      {title && (
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{title}</h3>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <th className="text-left p-3 font-semibold text-gray-900 dark:text-white"></th>
              {columnLabels.map((label, index) => (
                <th key={index} className="text-left p-3 font-semibold text-gray-900 dark:text-white">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowLabels.map((rowLabel, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-200 dark:border-gray-700">
                <td className="p-3 font-medium text-gray-900 dark:text-white">{rowLabel}</td>
                {columnLabels.map((colLabel, colIndex) => {
                  const value = data[colLabel]?.[rowIndex] ?? 0;
                  return (
                    <td 
                      key={colIndex} 
                      className={`p-3 ${getCellColor(value)}`}
                    >
                      {value.toFixed(2)}
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

