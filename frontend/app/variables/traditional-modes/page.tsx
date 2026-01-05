'use client';

/**
 * Variables for Traditional Modes Page
 * Page for configuring traditional transport mode variables
 */
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/Layout';
import DataTable from '@/components/tables/DataTable';
import Alert from '@/components/forms/Alert';
import LoadingSpinner from '@/components/forms/LoadingSpinner';
import { 
  getGeneralVariables, 
  getTraditionalModesVariables,
  saveGeneralVariables,
  saveTraditionalModeVariables 
} from '@/lib/api/variables';
import type { VariableRow, GeneralVariables, TraditionalModesVariables } from '@/lib/types';

// Default traditional modes variables (from backend calculations.py)
const defaultTraditionalModes = {
  pt_road: [
    { variable: 'CO2 emission factors Tank-to-Wheel (gr/km)', userInput: 0, defaultValue: 63.0 },
    { variable: 'Average NOx emissions (mg/km)', userInput: 0, defaultValue: 30.67 },
    { variable: 'Average PM emissions (mg/km)', userInput: 0, defaultValue: 0.67 },
    { variable: 'Emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 20.0 },
  ],
  pt_rail: [
    { variable: 'Average efficiency of public transport rail (kWh/km)', userInput: 0, defaultValue: 0.09 },
    { variable: 'Emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 13.0 },
  ],
  cycling: [
    { variable: 'Emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 17.0 },
  ],
  walking: [
    { variable: 'Emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 0.0 },
  ],
};

export default function TraditionalModesVariablesPage() {
  const [generalVars, setGeneralVars] = useState<VariableRow[]>([]);
  const [traditionalModes, setTraditionalModes] = useState<TraditionalModesVariables>({
    privateCar: [],
    ptRoad: [],
    ptRail: [],
    activeTransport: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load variables on mount
  useEffect(() => {
    const loadVariables = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [generalData, traditionalData] = await Promise.all([
          getGeneralVariables(),
          getTraditionalModesVariables()
        ]);
        
        setGeneralVars(generalData.variables || []);
        
        // Use defaults if arrays are empty
        setTraditionalModes({
          privateCar: traditionalData.privateCar.length > 0 
            ? traditionalData.privateCar 
            : [], // Private car defaults come from country-specific endpoint
          ptRoad: traditionalData.ptRoad.length > 0 
            ? traditionalData.ptRoad 
            : defaultTraditionalModes.pt_road,
          ptRail: traditionalData.ptRail.length > 0 
            ? traditionalData.ptRail 
            : defaultTraditionalModes.pt_rail,
          activeTransport: traditionalData.activeTransport.length > 0 
            ? traditionalData.activeTransport 
            : [...defaultTraditionalModes.cycling, ...defaultTraditionalModes.walking],
        });
      } catch (err) {
        console.error('Error loading variables:', err);
        setError('Failed to load variables. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadVariables();
  }, []);

  const handleSaveGeneral = async (variables: VariableRow[]) => {
    try {
      await saveGeneralVariables({ variables });
      setGeneralVars(variables);
      setSaveMessage('General variables saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Error saving general variables:', err);
      setError('Failed to save general variables. Please try again.');
    }
  };

  const handleSavePrivateCar = async (variables: VariableRow[]) => {
    try {
      await saveTraditionalModeVariables('private_car', variables);
      setTraditionalModes(prev => ({ ...prev, privateCar: variables }));
      setSaveMessage('Private Car variables saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Error saving private car variables:', err);
      setError('Failed to save private car variables. Please try again.');
    }
  };

  const handleSavePtRoad = async (variables: VariableRow[]) => {
    try {
      await saveTraditionalModeVariables('pt_road', variables);
      setTraditionalModes(prev => ({ ...prev, ptRoad: variables }));
      setSaveMessage('Public Transport Road variables saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Error saving PT Road variables:', err);
      setError('Failed to save PT Road variables. Please try again.');
    }
  };

  const handleSavePtRail = async (variables: VariableRow[]) => {
    try {
      await saveTraditionalModeVariables('pt_rail', variables);
      setTraditionalModes(prev => ({ ...prev, ptRail: variables }));
      setSaveMessage('Public Transport Rail variables saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Error saving PT Rail variables:', err);
      setError('Failed to save PT Rail variables. Please try again.');
    }
  };

  const handleSaveActiveTransport = async (variables: VariableRow[]) => {
    try {
      await saveTraditionalModeVariables('active_transport', variables);
      setTraditionalModes(prev => ({ ...prev, activeTransport: variables }));
      setSaveMessage('Active Transport variables saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Error saving active transport variables:', err);
      setError('Failed to save active transport variables. Please try again.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          Variables for Traditional Modes
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
          </p>
        </div>

        {/* General Variables */}
        <DataTable
          variables={generalVars}
          onSave={handleSaveGeneral}
          title="General Variables"
        />

        {/* Private Car Variables */}
        {traditionalModes.privateCar.length > 0 ? (
          <DataTable
            variables={traditionalModes.privateCar}
            onSave={handleSavePrivateCar}
            title="Private Car Variables"
          />
        ) : (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Private Car Variables</h3>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Private car variables are country-specific. 
                Please configure them from the Dashboard page after selecting a country, 
                or they will be calculated automatically based on the selected country during emissions calculations.
              </p>
            </div>
          </div>
        )}

        {/* Public Transport Road Variables */}
        <DataTable
          variables={traditionalModes.ptRoad}
          onSave={handleSavePtRoad}
          title="Public Transport Road Variables"
        />

        {/* Public Transport Rail Variables */}
        <DataTable
          variables={traditionalModes.ptRail}
          onSave={handleSavePtRail}
          title="Public Transport Rail Variables"
        />

        {/* Active Transport Variables */}
        <DataTable
          variables={traditionalModes.activeTransport}
          onSave={handleSaveActiveTransport}
          title="Active Transport Variables"
        />
      </div>
    </Layout>
  );
}
