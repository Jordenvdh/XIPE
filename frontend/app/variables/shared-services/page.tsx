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

// Display names for services
const SERVICE_NAMES: Record<string, string> = {
  'iceCar': 'Shared ICE Car',
  'iceMoped': 'Shared ICE Moped',
  'bike': 'Shared Bike',
  'eCar': 'Shared e-Car',
  'eBike': 'Shared e-Bike',
  'eMoped': 'Shared e-Moped',
  'eScooter': 'Shared e-Scooter',
  'other': 'Shared Other',
  'eOther': 'Shared e-Other',
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
        setSharedServices(data || {});
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
          Variables for Shared Services
        </h1>

        {error && (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        )}

        {saveMessage && (
          <Alert type="success" message={saveMessage} onClose={() => setSaveMessage(null)} />
        )}

        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> Changes to variables will be saved and used in calculations. 
            Default values are provided for reference. User input values override defaults when provided.
            If a service has no variables, the table will be empty until variables are added.
          </p>
        </div>

        {/* Render tables for each service */}
        {allServiceKeys.map((serviceKey) => {
          const variables = sharedServices[serviceKey] || [];
          const displayName = SERVICE_NAMES[serviceKey] || serviceKey;

          // Only show table if it has variables or if we want to show empty ones
          // For now, only show if variables exist
          if (variables.length === 0) {
            return null;
          }

          return (
            <DataTable
              key={serviceKey}
              variables={variables}
              onSave={(vars) => handleSave(serviceKey, vars)}
              title={displayName}
            />
          );
        })}

        {/* Show message if no services have variables */}
        {allServiceKeys.every(key => !sharedServices[key] || sharedServices[key].length === 0) && (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">
            <p>No shared services variables have been configured yet.</p>
            <p className="mt-2 text-sm">Variables will appear here once they are configured in the dashboard.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
