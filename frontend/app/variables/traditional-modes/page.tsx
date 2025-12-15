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
  saveTraditionalModeVariables,
  getPrivateCarDefaults,
} from '@/lib/api/variables';
import { getCountryData } from '@/lib/api/data';
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
  const { updateVariables, variables, dashboard } = useApp();
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

  // Update general variables (and private car defaults) when country changes
  useEffect(() => {
    if (dashboard.country && !loading) {
      loadCountrySpecificDefaults(dashboard.country);
      loadPrivateCarDefaults(dashboard.country);
    }
  }, [dashboard.country, loading]);

  // Sync generalVars state changes to context (but not during initial render)
  useEffect(() => {
    if (!loading) {
      updateVariables({ general: generalVars });
    }
  }, [generalVars, loading, updateVariables]);

  /**
   * Load country-specific default values and update general variables.
   * This ensures variables reflect the selected country's data.
   */
  const loadCountrySpecificDefaults = async (country: string) => {
    try {
      const countryData = await getCountryData(country);
      
      // Update general variables with country-specific defaults
      // Use current state to preserve any user inputs
      setGeneralVars((currentVars) => {
        const updatedGeneralVars = currentVars.map((varRow) => {
          // Only update defaults, preserve user inputs
          let newDefault = varRow.defaultValue;
          
          // Map country data to specific variables
          if (varRow.variable === 'Average CO2 emission intensity for electricity generation (gCO2/kWh)') {
            newDefault = countryData.electricityCo2;
          } else if (varRow.variable === 'Average age of the car fleet (years)') {
            newDefault = countryData.averageAge;
          } else if (varRow.variable === 'Percentage of petrol cars in the current fleet (%)') {
            newDefault = countryData.fuelDistribution.petrol;
          } else if (varRow.variable === 'Percentage of diesel cars in the current fleet (%)') {
            newDefault = countryData.fuelDistribution.diesel;
          } else if (varRow.variable === 'Percentage of electric cars in the current fleet (%)') {
            newDefault = countryData.fuelDistribution.ev;
          }
          
          return { ...varRow, defaultValue: newDefault };
        });
        
        // Don't call updateVariables here - let the useEffect handle it
        return updatedGeneralVars;
      });
    } catch (error) {
      console.error('Error loading country-specific defaults:', error);
      // Don't show error to user, just log it
    }
  };

  /**
   * Load country-specific default values for the private car mode.
   * Uses a backend helper that applies the same WLTP/NEDC corrections
   * and fuel‑mix based NOx/PM as the main calculation engine.
   *
   * Only the default values are updated – any user inputs in the table
   * are preserved so manual overrides continue to work.
   */
  const loadPrivateCarDefaults = async (country: string) => {
    try {
      const backendDefaults = await getPrivateCarDefaults(country);

      setPrivateCarVars((currentVars) => {
        // Map backend rows by variable name for easy lookup
        const backendByVariable = new Map(
          backendDefaults.map((row) => [row.variable, row.defaultValue])
        );

        const updated = currentVars.map((row) => {
          if (!backendByVariable.has(row.variable)) {
            return row;
          }

          return {
            ...row,
            // Replace only the defaultValue; keep any userInput as-is
            defaultValue: backendByVariable.get(row.variable) ?? row.defaultValue,
          };
        });

        return updated;
      });
    } catch (error) {
      // Silently ignore – if this fails, we keep the existing defaults.
      console.error('Error loading private car defaults from backend:', error);
    }
  };

  const loadVariables = async () => {
    try {
      const [general, traditional] = await Promise.all([
        getGeneralVariables(),
        getTraditionalModesVariables(),
      ]);

      // Hydrate local and global state from API, falling back to context (saved values),
      // then to defaults when missing.
      // This ensures that user inputs saved in context/localStorage persist across
      // navigation and page refreshes.
      const apiPrivateCar = traditional?.privateCar?.length 
        ? traditional.privateCar 
        : (variables.traditionalModes?.private_car || variables.traditionalModes?.privateCar || defaultPrivateCarVars);
      const apiPtRoad = traditional?.ptRoad?.length 
        ? traditional.ptRoad 
        : (variables.traditionalModes?.pt_road || variables.traditionalModes?.ptRoad || defaultPtRoadVars);
      const apiPtRail = traditional?.ptRail?.length 
        ? traditional.ptRail 
        : (variables.traditionalModes?.pt_rail || variables.traditionalModes?.ptRail || defaultPtRailVars);
      const apiActive = traditional?.activeTransport?.length 
        ? traditional.activeTransport 
        : (variables.traditionalModes?.active_transport || variables.traditionalModes?.activeTransport || defaultActiveTransportVars);

      // Start with API-loaded, then context (saved values), then defaults
      // This ensures user inputs persist across navigation/refresh
      let initialGeneralVars = general.variables?.length 
        ? general.variables 
        : (variables.general?.length ? variables.general : defaultGeneralVars);
      
      // If country is selected, update defaults with country-specific data
      if (dashboard.country) {
        try {
          const countryData = await getCountryData(dashboard.country);
          initialGeneralVars = initialGeneralVars.map((varRow) => {
            let newDefault = varRow.defaultValue;
            
            // Map country data to specific variables
            if (varRow.variable === 'Average CO2 emission intensity for electricity generation (gCO2/kWh)') {
              newDefault = countryData.electricityCo2;
            } else if (varRow.variable === 'Average age of the car fleet (years)') {
              newDefault = countryData.averageAge;
            } else if (varRow.variable === 'Percentage of petrol cars in the current fleet (%)') {
              newDefault = countryData.fuelDistribution.petrol;
            } else if (varRow.variable === 'Percentage of diesel cars in the current fleet (%)') {
              newDefault = countryData.fuelDistribution.diesel;
            } else if (varRow.variable === 'Percentage of electric cars in the current fleet (%)') {
              newDefault = countryData.fuelDistribution.ev;
            }
            
            return { ...varRow, defaultValue: newDefault };
          });
        } catch (error) {
          console.error('Error loading country data during initial load:', error);
          // Continue with defaults if country data fails
        }
      }

      setGeneralVars(initialGeneralVars);
      setPrivateCarVars(apiPrivateCar);
      setPtRoadVars(apiPtRoad);
      setPtRailVars(apiPtRail);
      setActiveTransportVars(apiActive);

      updateVariables({
        general: initialGeneralVars,
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
      // Update context - deep merge will preserve other modes
      updateVariables({ 
        traditionalModes: { 
          private_car: variables,
        } 
      });
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
      // Update context - deep merge will preserve other modes
      updateVariables({ 
        traditionalModes: { 
          pt_road: variables,
        } 
      });
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
      // Update context - deep merge will preserve other modes
      updateVariables({ 
        traditionalModes: { 
          pt_rail: variables,
        } 
      });
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
      // Update context - deep merge will preserve other modes
      updateVariables({ 
        traditionalModes: { 
          active_transport: variables,
        } 
      });
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
            // Update context immediately so edits persist even before clicking Save
            // Use functional update to ensure we get the latest state
            updateVariables({ 
              traditionalModes: { 
                private_car: rows,
              } 
            });
          }}
          onSave={handleSavePrivateCar}
          title="Private Car (per vehicle km)"
        />

        {/* Public Transport Road Variables */}
        <DataTable
          variables={ptRoadVars.length > 0 ? ptRoadVars : defaultPtRoadVars}
          onChange={(rows) => {
            setPtRoadVars(rows);
            // Update context immediately so edits persist even before clicking Save
            updateVariables({ 
              traditionalModes: { 
                pt_road: rows,
              } 
            });
          }}
          onSave={handleSavePtRoad}
          title="Public Transport Road (per passenger km)"
        />

        {/* Public Transport Rail Variables */}
        <DataTable
          variables={ptRailVars.length > 0 ? ptRailVars : defaultPtRailVars}
          onChange={(rows) => {
            setPtRailVars(rows);
            // Update context immediately so edits persist even before clicking Save
            updateVariables({ 
              traditionalModes: { 
                pt_rail: rows,
              } 
            });
          }}
          onSave={handleSavePtRail}
          title="Public Transport Rail (per passenger km)"
        />

        {/* Active Transport Variables */}
        <DataTable
          variables={activeTransportVars.length > 0 ? activeTransportVars : defaultActiveTransportVars}
          onChange={(rows) => {
            setActiveTransportVars(rows);
            // Update context immediately so edits persist even before clicking Save
            updateVariables({ 
              traditionalModes: { 
                active_transport: rows,
              } 
            });
          }}
          onSave={handleSaveActiveTransport}
          title="Active Transport (per vehicle km)"
        />
      </div>
    </Layout>
  );
}

