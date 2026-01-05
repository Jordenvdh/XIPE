'use client';

/**
 * Variables for Shared Services Page
 * Page for configuring shared mobility service variables
 */
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import DataTable from '@/components/tables/DataTable';
import Alert from '@/components/forms/Alert';
import LoadingSpinner from '@/components/forms/LoadingSpinner';
import { 
  getSharedServicesVariables,
  saveSharedServiceVariables 
} from '@/lib/api/variables';
import type { VariableRow } from '@/lib/types';

// Service names mapping (frontend key -> backend key)
const SERVICE_MAPPING: Record<string, string> = {
  'iceCar': 'ice_car',
  'iceMoped': 'ice_moped',
  'bike': 'bike',
  'eCar': 'e_car',
  'eBike': 'e_bike',
  'eMoped': 'e_moped',
  'eScooter': 'e_scooter',
  'other': 'other',
  'eOther': 'e_other',
};

// Display names for services (matching original Streamlit page)
const SERVICE_NAMES: Record<string, string> = {
  'iceCar': 'Shared ICE Car',
  'iceMoped': 'Shared ICE Moped',
  'bike': 'Shared bike',
  'eCar': 'Shared e-Car',
  'eBike': 'Shared e-bike',
  'eMoped': 'Shared e-Moped',
  'eScooter': 'Shared e-Scooter',
  'other': 'Shared Other', // Will be dynamic based on user input
  'eOther': 'Shared e-Other', // Will be dynamic based on user input
};

export default function SharedServicesVariablesPage() {
  const [sharedServices, setSharedServices] = useState<Record<string, VariableRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load variables on mount
  useEffect(() => {
    const loadVariables = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await getSharedServicesVariables();
        
        // Map backend keys (snake_case) to frontend keys (camelCase)
        // Include all services, even if empty (backend should return defaults)
        const mappedData: Record<string, VariableRow[]> = {};
        for (const [frontendKey, backendKey] of Object.entries(SERVICE_MAPPING)) {
          mappedData[frontendKey] = data[backendKey] || [];
        }
        
        setSharedServices(mappedData);
      } catch (err) {
        console.error('Error loading shared services variables:', err);
        setError('Failed to load variables. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadVariables();
  }, []);

  const handleSave = async (serviceKey: string, variables: VariableRow[]) => {
    try {
      const backendKey = SERVICE_MAPPING[serviceKey] || serviceKey;
      await saveSharedServiceVariables(backendKey, variables);
      setSharedServices(prev => ({ ...prev, [serviceKey]: variables }));
      setSaveMessage(`${SERVICE_NAMES[serviceKey] || serviceKey} variables saved successfully!`);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error(`Error saving ${serviceKey} variables:`, err);
      setError(`Failed to save ${SERVICE_NAMES[serviceKey] || serviceKey} variables. Please try again.`);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  // Get all service keys, including those that might not have variables yet
  const allServiceKeys = Object.keys(SERVICE_MAPPING);

  return (
    <Layout>
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          Shared Modes Variables
        </h1>

        {error && (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        )}

        {saveMessage && (
          <Alert type="success" message={saveMessage} onClose={() => setSaveMessage(null)} />
        )}

        {/* Original explanatory text */}
        <div className="mb-6 text-gray-700 dark:text-gray-300">
          <p className="mb-2">
            On this page the variables and factors of the shared mobility services are displayed per service. All variables on this page have default 
            values displayed. If the user has specific variable values they can fill these in the User Input column, this will override 
            the default values in the calculations.
          </p>
          <p className="mb-2 font-semibold">
            Calculations will use the whole User Input column. Therefore, when using user input be sure to fill in all user input cells, 
            copy default values where needed.
          </p>
          <p>
            Changes on the Variables pages will directly change the Estimated Emission Change tables displayed on the Dashboard page.
          </p>
        </div>

        {/* Original warning box */}
        <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded">
          <p className="text-yellow-800 dark:text-yellow-200 font-medium">
            Don't forget to click the save buttons to save the data in the table.
          </p>
        </div>

        {/* Render tables for each service */}
        {allServiceKeys.map((serviceKey) => {
          const variables = sharedServices[serviceKey] || [];
          const displayName = SERVICE_NAMES[serviceKey] || serviceKey;

          // Always show all services, even if empty (matching original Streamlit behavior)
          return (
            <DataTable
              key={serviceKey}
              variables={variables}
              onSave={(vars) => handleSave(serviceKey, vars)}
              title={displayName}
            />
          );
        })}
      </div>
    </Layout>
  );
}
