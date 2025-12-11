'use client';

/**
 * Pie Chart Component for Fuel Distribution
 * Uses Recharts for visualization
 */
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { FuelDistribution } from '@/lib/types';

interface PieChartProps {
  data: FuelDistribution;
  title?: string;
}

const COLORS = {
  petrol: '#60a5fa',      // Light blue
  diesel: '#1e40af',      // Dark blue
  ev: '#ec4899',          // Pink
  other: '#ef4444',       // Red
};

export default function PieChart({ data, title }: PieChartProps) {
  const chartData = [
    { name: 'Petrol', value: data.petrol, color: COLORS.petrol },
    { name: 'Diesel', value: data.diesel, color: COLORS.diesel },
    { name: 'EV', value: data.ev, color: COLORS.ev },
    { name: 'Other', value: data.other, color: COLORS.other },
  ].filter(item => item.value > 0); // Only show non-zero values

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height={300}>
        <RechartsPieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => `${value.toFixed(1)}%`}
            contentStyle={{ 
              backgroundColor: 'var(--background)', 
              border: '1px solid var(--foreground)',
              borderRadius: '4px',
              color: 'var(--foreground)'
            }}
          />
          <Legend 
            formatter={(value) => value}
            wrapperStyle={{ color: 'var(--foreground)' }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

