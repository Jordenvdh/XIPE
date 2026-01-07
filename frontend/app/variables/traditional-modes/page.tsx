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
import { useApp } from '@/context/AppContext';
import { 
  getGeneralVariables, 
  getTraditionalModesVariables,
  getPrivateCarDefaults,
  getGeneralDefaults,
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
  const { dashboard } = useApp();
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

  // Load variables on mount and when country changes
  useEffect(() => {
    const loadVariables = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const country = dashboard.country || 'Austria';
        
        const [generalData, traditionalData, privateCarDefaults, generalDefaults] = await Promise.all([
          getGeneralVariables(),
          getTraditionalModesVariables(),
          getPrivateCarDefaults(country).catch(() => []), // Fallback to empty array if fails
          getGeneralDefaults(country).catch(() => []) // Fallback to empty array if fails
        ]);
        
        // Merge general variables with country-specific defaults
        // Preserve userInput from saved values if they exist (user has saved something)
        let mergedGeneralVars: VariableRow[] = [];
        if (generalDefaults.length > 0) {
          const savedGeneralVars = generalData.variables || [];
          mergedGeneralVars = generalDefaults.map((defaultVar) => {
            const savedVar = savedGeneralVars.find(
              v => v.variable === defaultVar.variable
            );
            // If savedVar exists, it means user has saved this variable
            // Preserve the saved userInput (even if it equals the old defaultValue)
            // Only set to 0 if no saved value exists
            return {
              ...defaultVar, // This includes the new country-specific defaultValue
              userInput: savedVar ? savedVar.userInput : 0, // Preserve saved userInput, or 0 if not saved
            };
          });
        } else {
          // Fallback to saved values if country-specific defaults unavailable
          mergedGeneralVars = generalData.variables || [];
        }
        
        setGeneralVars(mergedGeneralVars);
        
        // Private car defaults come from country-specific endpoint
        // Always use country-specific defaults when available to ensure they update when country changes
        // Merge with saved values: preserve userInput from saved values if they exist
        let mergedPrivateCar: VariableRow[] = [];
        if (privateCarDefaults.length > 0) {
          // We have country-specific defaults - always use them for defaultValue
          // Merge with saved userInput: preserve saved userInput if it exists
          const savedPrivateCar = traditionalData.privateCar || [];
          mergedPrivateCar = privateCarDefaults.map((defaultVar) => {
            const savedVar = savedPrivateCar.find(
              v => v.variable === defaultVar.variable
            );
            // If savedVar exists, it means user has saved this variable
            // Preserve the saved userInput (even if it equals the old defaultValue)
            // Only set to 0 if no saved value exists
            return {
              ...defaultVar, // This includes the new country-specific defaultValue
              userInput: savedVar ? savedVar.userInput : 0, // Preserve saved userInput, or 0 if not saved
            };
          });
        } else {
          // Fallback to saved values if country-specific defaults unavailable
          mergedPrivateCar = traditionalData.privateCar || [];
        }
        
        setTraditionalModes({
          privateCar: mergedPrivateCar,
          ptRoad: traditionalData.ptRoad || [],
          ptRail: traditionalData.ptRail || [],
          activeTransport: traditionalData.activeTransport || [],
        });
      } catch (err) {
        console.error('Error loading variables:', err);
        setError('Failed to load variables. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadVariables();
  }, [dashboard.country]);

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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          Traditional Modes Variables
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
            On this page the variables and factors of the traditional modes are displayed per mode. All variables on this page have default 
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

        {/* Improved warning box with better readability */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 rounded">
          <p className="text-gray-900 dark:text-gray-100 font-medium">
            Don't forget to click the save buttons to save the data in the table.
          </p>
        </div>

        {/* General Variables */}
        <DataTable
          variables={generalVars}
          onSave={handleSaveGeneral}
          title="General variables"
        />

        {/* Private Car Variables */}
        {traditionalModes.privateCar.length > 0 ? (
          <DataTable
            variables={traditionalModes.privateCar}
            onSave={handleSavePrivateCar}
            title="Private Car (per vehicle km)"
          />
        ) : (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Private Car (per vehicle km)</h3>
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
          title="Public Transport Road (per passenger km)"
        />

        {/* Public Transport Rail Variables */}
        <DataTable
          variables={traditionalModes.ptRail}
          onSave={handleSavePtRail}
          title="Public Transport Rail (per passenger km)"
        />

        {/* Active Transport Variables */}
        <DataTable
          variables={traditionalModes.activeTransport}
          onSave={handleSaveActiveTransport}
          title="Active Transport (per vehicle km)"
        />
      </div>
    </Layout>
  );
}
