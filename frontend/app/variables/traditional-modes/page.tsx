'use client';

/**
 * Variables for Traditional Modes Page
 * Display and edit variables for traditional transportation modes
 */
import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/layout/Layout';
import DataTable from '@/components/tables/DataTable';
import Alert from '@/components/forms/Alert';
import { useApp } from '@/context/AppContext';
import { 
  getGeneralVariables, 
  saveGeneralVariables,
  getTraditionalModesVariables,
  saveTraditionalModeVariables 
} from '@/lib/api/variables';
import type { VariableRow } from '@/lib/types';

// Default variables (from Streamlit code)
const defaultGeneralVars: VariableRow[] = [
  { variable: 'Average CO2 emission intensity for electricity generation (gCO2/kWh)', userInput: 0, defaultValue: 96.0 },
  { variable: 'Well-to-Tank emissions fraction of Well-to-Wheel emissions ICE cars (%)', userInput: 0, defaultValue: 20.0 },
  { variable: 'Average age of the car fleet (years)', userInput: 0, defaultValue: 9.3 },
  { variable: 'Percentage of petrol cars in the current fleet (%)', userInput: 0, defaultValue: 42.2 },
  { variable: 'Percentage of diesel cars in the current fleet (%)', userInput: 0, defaultValue: 49.9 },
  { variable: 'Percentage of electric cars in the current fleet (%)', userInput: 0, defaultValue: 7.8 },
];

const defaultPrivateCarVars: VariableRow[] = [
  { variable: 'CO2 emission factors Tank-to-Wheel (gr/km)', userInput: 0, defaultValue: 118.6 },
  { variable: 'Average NOx emissions (mg/km)', userInput: 0, defaultValue: 69.0 },
  { variable: 'Average PM emissions (mg/km)', userInput: 0, defaultValue: 4.5 },
  { variable: 'Emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 55.0 },
];

const defaultPtRoadVars: VariableRow[] = [
  { variable: 'CO2 emission factors Tank-to-Wheel (gr/km)', userInput: 0, defaultValue: 63.0 },
  { variable: 'Average NOx emissions (mg/km)', userInput: 0, defaultValue: 30.67 },
  { variable: 'Average PM emissions (mg/km)', userInput: 0, defaultValue: 0.67 },
  { variable: 'Emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 20.0 },
];

const defaultPtRailVars: VariableRow[] = [
  { variable: 'Average efficiency of public transport rail (kWh/km)', userInput: 0, defaultValue: 0.09 },
  { variable: 'Emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 13.0 },
];

const defaultActiveTransportVars: VariableRow[] = [
  { variable: 'Cycling, emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 17.0 },
  { variable: 'Walking, emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 0.0 },
];

export default function TraditionalModesPage() {
  const { updateVariables, variables } = useApp();
  // Seed local state from context so edits persist across navigation without saving.
  const [generalVars, setGeneralVars] = useState<VariableRow[]>(
    variables.general?.length ? variables.general : defaultGeneralVars
  );
  const [privateCarVars, setPrivateCarVars] = useState<VariableRow[]>(
    variables.traditionalModes?.private_car || variables.traditionalModes?.privateCar || defaultPrivateCarVars
  );
  const [ptRoadVars, setPtRoadVars] = useState<VariableRow[]>(
    variables.traditionalModes?.pt_road || variables.traditionalModes?.ptRoad || defaultPtRoadVars
  );
  const [ptRailVars, setPtRailVars] = useState<VariableRow[]>(
    variables.traditionalModes?.pt_rail || variables.traditionalModes?.ptRail || defaultPtRailVars
  );
  const [activeTransportVars, setActiveTransportVars] = useState<VariableRow[]>(
    variables.traditionalModes?.active_transport || variables.traditionalModes?.activeTransport || defaultActiveTransportVars
  );
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Memoized helper to keep a consistent traditional modes shape in context
  const buildTraditionalContext = useMemo(
    () => ({
      private_car: privateCarVars,
      pt_road: ptRoadVars,
      pt_rail: ptRailVars,
      active_transport: activeTransportVars,
    }),
    [privateCarVars, ptRoadVars, ptRailVars, activeTransportVars]
  );

  useEffect(() => {
    loadVariables();
  }, []);

  const loadVariables = async () => {
    try {
      const [general, traditional] = await Promise.all([
        getGeneralVariables(),
        getTraditionalModesVariables(),
      ]);

      // Hydrate local and global state from API, falling back to defaults when missing
      const apiPrivateCar = traditional?.privateCar?.length ? traditional.privateCar : defaultPrivateCarVars;
      const apiPtRoad = traditional?.ptRoad?.length ? traditional.ptRoad : defaultPtRoadVars;
      const apiPtRail = traditional?.ptRail?.length ? traditional.ptRail : defaultPtRailVars;
      const apiActive = traditional?.activeTransport?.length ? traditional.activeTransport : defaultActiveTransportVars;

      setGeneralVars(general.variables?.length ? general.variables : defaultGeneralVars);
      setPrivateCarVars(apiPrivateCar);
      setPtRoadVars(apiPtRoad);
      setPtRailVars(apiPtRail);
      setActiveTransportVars(apiActive);

      updateVariables({
        general: general.variables?.length ? general.variables : defaultGeneralVars,
        traditionalModes: {
          private_car: apiPrivateCar,
          pt_road: apiPtRoad,
          pt_rail: apiPtRail,
          active_transport: apiActive,
        },
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading variables:', error);
      setLoading(false);
    }
  };

  const handleSaveGeneral = async (variables: VariableRow[]) => {
    try {
      await saveGeneralVariables({ variables });
      setGeneralVars(variables);
      updateVariables({ general: variables });
      setSaveMessage('General variables saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving general variables:', error);
    }
  };

  const handleSavePrivateCar = async (variables: VariableRow[]) => {
    try {
      await saveTraditionalModeVariables('private_car', variables);
      setPrivateCarVars(variables);
      updateVariables({ traditionalModes: { ...buildTraditionalContext, private_car: variables } });
      setSaveMessage('Private Car variables saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving private car variables:', error);
    }
  };

  const handleSavePtRoad = async (variables: VariableRow[]) => {
    try {
      await saveTraditionalModeVariables('pt_road', variables);
      setPtRoadVars(variables);
      updateVariables({ traditionalModes: { ...buildTraditionalContext, pt_road: variables } });
      setSaveMessage('Public Transport Road variables saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving PT road variables:', error);
    }
  };

  const handleSavePtRail = async (variables: VariableRow[]) => {
    try {
      await saveTraditionalModeVariables('pt_rail', variables);
      setPtRailVars(variables);
      updateVariables({ traditionalModes: { ...buildTraditionalContext, pt_rail: variables } });
      setSaveMessage('Public Transport Rail variables saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving PT rail variables:', error);
    }
  };

  const handleSaveActiveTransport = async (variables: VariableRow[]) => {
    try {
      await saveTraditionalModeVariables('active_transport', variables);
      setActiveTransportVars(variables);
      updateVariables({ traditionalModes: { ...buildTraditionalContext, active_transport: variables } });
      setSaveMessage('Active Transport variables saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving active transport variables:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-800 dark:text-gray-400">Loading variables...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">Traditional Modes Variables</h1>
        
        <div className="mb-8 text-gray-900 dark:text-gray-300 space-y-4">
          <p>
            On this page the variables and factors of the traditional modes are displayed per mode. 
            All variables on this page have default values displayed. If the user has specific variable 
            values they can fill these in the User Input column, this will override the default values 
            in the calculations.
          </p>
          <p>
            <strong>Calculations will use the whole User Input column. Therefore, when using user input 
            be sure to fill in all user input cells, copy default values where needed.</strong>
          </p>
          <p>
            Changes on the Variables pages will directly change the Estimated Emission Change tables 
            displayed on the Dashboard page.
          </p>
        </div>

        {saveMessage && (
          <Alert message={saveMessage} type="success" onClose={() => setSaveMessage(null)} />
        )}

        <Alert 
          message="Don't forget to click the save buttons to save the data in the table." 
          type="warning" 
        />

        {/* General Variables */}
        <DataTable
          variables={generalVars.length > 0 ? generalVars : defaultGeneralVars}
          onChange={(rows) => {
            setGeneralVars(rows);
            updateVariables({ general: rows });
          }}
          onSave={handleSaveGeneral}
          title="General variables"
        />

        {/* Private Car Variables */}
        <DataTable
          variables={privateCarVars.length > 0 ? privateCarVars : defaultPrivateCarVars}
          onChange={(rows) => {
            setPrivateCarVars(rows);
            updateVariables({ traditionalModes: { ...buildTraditionalContext, private_car: rows } });
          }}
          onSave={handleSavePrivateCar}
          title="Private Car (per vehicle km)"
        />

        {/* Public Transport Road Variables */}
        <DataTable
          variables={ptRoadVars.length > 0 ? ptRoadVars : defaultPtRoadVars}
          onChange={(rows) => {
            setPtRoadVars(rows);
            updateVariables({ traditionalModes: { ...buildTraditionalContext, pt_road: rows } });
          }}
          onSave={handleSavePtRoad}
          title="Public Transport Road (per passenger km)"
        />

        {/* Public Transport Rail Variables */}
        <DataTable
          variables={ptRailVars.length > 0 ? ptRailVars : defaultPtRailVars}
          onChange={(rows) => {
            setPtRailVars(rows);
            updateVariables({ traditionalModes: { ...buildTraditionalContext, pt_rail: rows } });
          }}
          onSave={handleSavePtRail}
          title="Public Transport Rail (per passenger km)"
        />

        {/* Active Transport Variables */}
        <DataTable
          variables={activeTransportVars.length > 0 ? activeTransportVars : defaultActiveTransportVars}
          onChange={(rows) => {
            setActiveTransportVars(rows);
            updateVariables({ traditionalModes: { ...buildTraditionalContext, active_transport: rows } });
          }}
          onSave={handleSaveActiveTransport}
          title="Active Transport (per vehicle km)"
        />
      </div>
    </Layout>
  );
}

