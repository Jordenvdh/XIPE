'use client';

/**
 * Country Constants Page
 * Display read-only country constants tables
 */
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import ReadOnlyTable from '@/components/tables/ReadOnlyTable';
import { getCo2Emissions, getElectricityIntensity } from '@/lib/api/data';

export default function CountryConstantsPage() {
  const [co2Data, setCo2Data] = useState<Array<Record<string, string | number>>>([]);
  const [elecData, setElecData] = useState<Array<Record<string, string | number>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [co2, elec] = await Promise.all([
        getCo2Emissions(),
        getElectricityIntensity(),
      ]);

      // Transform data for table display
      if (co2.data) {
        setCo2Data(co2.data);
      }
      if (elec.data) {
        setElecData(elec.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading country constants:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-800 dark:text-gray-400">Loading country constants...</div>
        </div>
      </Layout>
    );
  }

  // Extract column names from data
  const co2Columns = co2Data.length > 0 ? Object.keys(co2Data[0]) : [];
  const elecColumns = elecData.length > 0 ? Object.keys(elecData[0]) : [];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">Country Constants</h1>

        {/* CO2 Emissions Table */}
        <ReadOnlyTable
          data={co2Data}
          columns={co2Columns}
          title="Average CO2 emissions per km from new passenger cars"
          description="Source: EuroStat. Up to 2020 the NEDC measuring method was used, which was replaced by the WLTP from 2021 onwards. NEDC and WLTP values underestimate real world CO2 emission by respectively 40% and 14%. These factors are included to calculate the average Tank-to-Wheel values for ICE cars."
        />

        {/* Electricity Intensity Table */}
        <ReadOnlyTable
          data={elecData}
          columns={elecColumns}
          title="2023 GHG emission intensity of electricity production (gCO2e/kWh)"
          description="Source: EEA"
        />
      </div>
    </Layout>
  );
}

