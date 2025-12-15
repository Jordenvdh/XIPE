'use client';

/**
 * Variables for Shared Services Page
 * Display and edit variables for shared mobility services
 */
import { useState, useMemo, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import DataTable from '@/components/tables/DataTable';
import Alert from '@/components/forms/Alert';
import { useApp } from '@/context/AppContext';
import { saveSharedServiceVariables, getSharedServicesVariables } from '@/lib/api/variables';
import type { VariableRow } from '@/lib/types';

export default function SharedServicesPage() {
  const { sharedModes, modalSplit, variables, updateVariables } = useApp();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSave = async (service: string, rows: VariableRow[]) => {
    try {
      // Persist to backend (for this session) and to frontend context/localStorage
      // so that saved values are:
      // - used in the calculation request from the dashboard
      // - shown again in the User Input column after navigation/refresh.
      await saveSharedServiceVariables(service, rows);

      // Merge this service into the sharedServices part of the global variables
      updateVariables({
        sharedServices: {
          ...(variables.sharedServices || {}),
          [service]: rows,
        },
      });

      setSaveMessage(`${service} variables saved successfully!`);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error(`Error saving ${service} variables:`, error);
    }
  };

  /**
   * Helper function to update default values based on modal split from dashboard.
   *
   * Percentages ("Replaces X by (%)") always follow the modal split values.
   *
   * For trip distances, we mirror the original XIPE logic used in the backend:
   * - Most shared modes use the distance of the mode they replace (car / PT / bike / walk).
   * - Shared bike:
   *     - When replacing car / PT road / PT rail / cycling → cycling distance
   *     - When replacing walking → walking distance
   * - Shared e-bike:
   *     - When replacing car / PT road / PT rail → 1.5 × cycling distance
   *     - When replacing cycling → cycling distance
   *     - When replacing walking → walking distance
   * - Shared e-scooter:
   *     - When replacing car / PT road / PT rail / cycling → cycling distance
   *     - When replacing walking → walking distance
   *
   * This way the values shown in the Variables tables match the distances
   * actually used in the calculation engine.
   */
  const updateDefaultsWithModalSplit = (baseVars: VariableRow[], serviceType: string): VariableRow[] => {
    // Base modal split distances
    const distCarBase = modalSplit.privateCar.distance;
    const distRoadBase = modalSplit.publicTransport.road.distance;
    const distRailBase = modalSplit.publicTransport.rail.distance;
    const distCycBase = modalSplit.activeModes.cycling.distance;
    const distWalkBase = modalSplit.activeModes.walking.distance;

    // Adjusted distances per service, following backend default_inputs_map
    let distCar = distCarBase;
    let distRoad = distRoadBase;
    let distRail = distRailBase;
    let distCyc = distCycBase;
    let distWalk = distWalkBase;

    if (serviceType === 'bike') {
      // Bike: all motorised replacements use the bike (cycling) distance
      distCar = distCycBase;
      distRoad = distCycBase;
      distRail = distCycBase;
      distCyc = distCycBase;
      distWalk = distWalkBase;
    } else if (serviceType === 'e_bike') {
      // e-Bike: 1.5x cycling distance for car/PT replacements, cycling for cycling, walking for walking
      const scaled = distCycBase * 1.5;
      distCar = scaled;
      distRoad = scaled;
      distRail = scaled;
      distCyc = distCycBase;
      distWalk = distWalkBase;
    } else if (serviceType === 'e_scooter') {
      // e-Scooter: use cycling distance for all but walking
      distCar = distCycBase;
      distRoad = distCycBase;
      distRail = distCycBase;
      distCyc = distCycBase;
      distWalk = distWalkBase;
    }

    return baseVars.map((varRow) => {
      let newDefault = varRow.defaultValue;

      // Map modal split percentages to "Replaces X by (%)" variables
      if (varRow.variable === 'Replaces private car by (%)') {
        newDefault = modalSplit.privateCar.split;
      } else if (varRow.variable === 'Replaces PT road by (%)') {
        newDefault = modalSplit.publicTransport.road.split;
      } else if (varRow.variable === 'Replaces PT rail by (%)') {
        newDefault = modalSplit.publicTransport.rail.split;
      } else if (varRow.variable === 'Replaces cycling by (%)') {
        newDefault = modalSplit.activeModes.cycling.split;
      } else if (varRow.variable === 'Replaces walking by (%)') {
        newDefault = modalSplit.activeModes.walking.split;
      }
      // Map modal split distances (with caps/scaling per service) to
      // "Average trip distance when replacing X" variables.
      else if (varRow.variable === 'Average trip distance of the shared mode when replacing car (km)') {
        newDefault = distCar;
      } else if (varRow.variable === 'Average trip distance of the shared mode when replacing PT road (km)') {
        newDefault = distRoad;
      } else if (varRow.variable === 'Average trip distance of the shared mode when replacing PT rail (km)') {
        newDefault = distRail;
      } else if (varRow.variable === 'Average trip distance of the shared mode when replacing cycling (km)') {
        newDefault = distCyc;
      } else if (varRow.variable === 'Average trip distance of the shared mode when replacing walking (km)') {
        newDefault = distWalk;
      }

      return { ...varRow, defaultValue: newDefault };
    });
  };

  // Base default variables for each shared service type (without modal split values)
  const getBaseDefaultVariables = (serviceType: string): VariableRow[] => {
    const defaults: Record<string, VariableRow[]> = {
      ice_car: [
        { variable: 'Average number of trips per day', userInput: 0, defaultValue: 5.0 },
        { variable: 'Average Tank-to-Wheel CO2 emissions (g/km)', userInput: 0, defaultValue: 133.38 },
        { variable: 'Average NOx emissions (mg/km)', userInput: 0, defaultValue: 60.0 },
        { variable: 'Average PM emissions (mg/km)', userInput: 0, defaultValue: 4.5 },
        { variable: 'Emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 55.0 },
        { variable: 'Replaces private car by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT road by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT rail by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces cycling by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces walking by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing car (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT road (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT rail (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing cycling (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing walking (km)', userInput: 0, defaultValue: 0.0 },
      ],
      ice_moped: [
        { variable: 'Average number of trips per day', userInput: 0, defaultValue: 5.0 },
        { variable: 'Average Tank-to-Wheel CO2 emissions (g/km)', userInput: 0, defaultValue: 37.0 },
        { variable: 'Average NOx emissions (mg/km)', userInput: 0, defaultValue: 60.0 },
        { variable: 'Average PM emissions (mg/km)', userInput: 0, defaultValue: 4.5 },
        { variable: 'Emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 31.0 },
        { variable: 'Replaces private car by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT road by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT rail by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces cycling by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces walking by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing car (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT road (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT rail (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing cycling (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing walking (km)', userInput: 0, defaultValue: 0.0 },
      ],
      bike: [
        { variable: 'Average number of trips per day', userInput: 0, defaultValue: 4.0 },
        { variable: 'Emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 58.0 },
        { variable: 'Replaces private car by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT road by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT rail by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces cycling by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces walking by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing car (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT road (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT rail (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing cycling (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing walking (km)', userInput: 0, defaultValue: 0.0 },
      ],
      e_car: [
        { variable: 'Average number of trips per day', userInput: 0, defaultValue: 5.0 },
        { variable: 'Average efficiency of the electric vehicle (kWh/km)', userInput: 0, defaultValue: 0.17 },
        { variable: 'Emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 81.0 },
        { variable: 'Replaces private car by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT road by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT rail by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces cycling by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces walking by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing car (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT road (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT rail (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing cycling (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing walking (km)', userInput: 0, defaultValue: 0.0 },
      ],
      e_bike: [
        { variable: 'Average number of trips per day', userInput: 0, defaultValue: 4.0 },
        { variable: 'Average efficiency of the electric vehicle (kWh/km)', userInput: 0, defaultValue: 0.01 },
        { variable: 'Emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 71.0 },
        { variable: 'Replaces private car by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT road by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT rail by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces cycling by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces walking by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing car (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT road (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT rail (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing cycling (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing walking (km)', userInput: 0, defaultValue: 0.0 },
      ],
      e_moped: [
        { variable: 'Average number of trips per day', userInput: 0, defaultValue: 5.0 },
        { variable: 'Average efficiency of the electric vehicle (kWh/km)', userInput: 0, defaultValue: 0.03 },
        { variable: 'Emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 59.0 },
        { variable: 'Replaces private car by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT road by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT rail by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces cycling by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces walking by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing car (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT road (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT rail (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing cycling (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing walking (km)', userInput: 0, defaultValue: 0.0 },
      ],
      e_scooter: [
        { variable: 'Average number of trips per day', userInput: 0, defaultValue: 5.0 },
        { variable: 'Average efficiency of the electric vehicle (kWh/km)', userInput: 0, defaultValue: 0.02 },
        { variable: 'Emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 100.0 },
        { variable: 'Replaces private car by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT road by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT rail by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces cycling by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces walking by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing car (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT road (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT rail (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing cycling (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing walking (km)', userInput: 0, defaultValue: 0.0 },
      ],
      // Shared "other" ICE: all emission/usage defaults zero by design.
      // Only the "replaces X by (%)" and "average trip distance when replacing X"
      // fields will be filled from the dashboard modal split via updateDefaultsWithModalSplit.
      other: [
        { variable: 'Average number of trips per day', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average Tank-to-Wheel CO2 emissions (g/km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average NOx emissions (mg/km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average PM emissions (mg/km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces private car by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT road by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT rail by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces cycling by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces walking by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing car (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT road (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT rail (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing cycling (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing walking (km)', userInput: 0, defaultValue: 0.0 },
      ],
      // Shared "other" electric: same pattern as above, using electric vehicle
      // efficiency but with a default of zero so the user provides a value.
      e_other: [
        { variable: 'Average number of trips per day', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average efficiency of the electric vehicle (kWh/km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Emission factor for life-cycle phases excluding use phase (gCO2/km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces private car by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT road by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces PT rail by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces cycling by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Replaces walking by (%)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing car (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT road (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing PT rail (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing cycling (km)', userInput: 0, defaultValue: 0.0 },
        { variable: 'Average trip distance of the shared mode when replacing walking (km)', userInput: 0, defaultValue: 0.0 },
      ],
    };

    return defaults[serviceType] || [];
  };

  /**
   * Load variables from API on mount
   * Variables will be updated with modal split defaults via useMemo
   */
  useEffect(() => {
    const loadVariables = async () => {
      try {
        // Variables are loaded and stored in context by AppContext
        // We'll use those if available, otherwise use defaults
        setLoading(false);
      } catch (error) {
        console.error('Error loading shared services variables:', error);
        setLoading(false);
      }
    };
    loadVariables();
  }, []);

  /**
   * Get default variables for a service type, updated with modal split values
   * This ensures defaults reflect the dashboard modal split inputs
   */
  const getDefaultVariables = (serviceType: string): VariableRow[] => {
    const baseVars = getBaseDefaultVariables(serviceType);
    // Check if we have saved variables from context/API, otherwise use defaults with modal split
    const savedVars = variables.sharedServices?.[serviceType];
    const varsToUse = savedVars && savedVars.length > 0 ? savedVars : baseVars;
    
    // Update defaults with modal split values (preserving user inputs if any)
    return updateDefaultsWithModalSplit(varsToUse, serviceType);
  };

  // Memoize variables for each service type to avoid recalculating on every render
  const iceCarVars = useMemo(() => getDefaultVariables('ice_car'), [modalSplit, variables.sharedServices]);
  const iceMopedVars = useMemo(() => getDefaultVariables('ice_moped'), [modalSplit, variables.sharedServices]);
  const bikeVars = useMemo(() => getDefaultVariables('bike'), [modalSplit, variables.sharedServices]);
  const eCarVars = useMemo(() => getDefaultVariables('e_car'), [modalSplit, variables.sharedServices]);
  const eBikeVars = useMemo(() => getDefaultVariables('e_bike'), [modalSplit, variables.sharedServices]);
  const eMopedVars = useMemo(() => getDefaultVariables('e_moped'), [modalSplit, variables.sharedServices]);
  const eScooterVars = useMemo(() => getDefaultVariables('e_scooter'), [modalSplit, variables.sharedServices]);
  const otherVars = useMemo(() => getDefaultVariables('other'), [modalSplit, variables.sharedServices]);
  const eOtherVars = useMemo(() => getDefaultVariables('e_other'), [modalSplit, variables.sharedServices]);

  const otherModeName = sharedModes.find(m => m.mode === 'Other')?.mode || 'Other';

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">Shared Modes Variables</h1>
        
        <div className="mb-8 text-gray-900 dark:text-gray-300 space-y-4">
          <p>
            On this page the variables and factors of the shared mobility services are displayed per service. 
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

        {/* Shared ICE Car */}
        <DataTable
          variables={iceCarVars}
          onSave={(vars) => handleSave('ice_car', vars)}
          title="Shared ICE Car"
        />

        {/* Shared ICE Moped */}
        <DataTable
          variables={iceMopedVars}
          onSave={(vars) => handleSave('ice_moped', vars)}
          title="Shared ICE Moped"
        />

        {/* Shared Bike */}
        <DataTable
          variables={bikeVars}
          onSave={(vars) => handleSave('bike', vars)}
          title="Shared bike"
        />

        {/* Shared e-Car */}
        <DataTable
          variables={eCarVars}
          onSave={(vars) => handleSave('e_car', vars)}
          title="Shared e-Car"
        />

        {/* Shared e-Bike */}
        <DataTable
          variables={eBikeVars}
          onSave={(vars) => handleSave('e_bike', vars)}
          title="Shared e-bike"
        />

        {/* Shared e-Moped */}
        <DataTable
          variables={eMopedVars}
          onSave={(vars) => handleSave('e_moped', vars)}
          title="Shared e-Moped"
        />

        {/* Shared e-Scooter */}
        <DataTable
          variables={eScooterVars}
          onSave={(vars) => handleSave('e_scooter', vars)}
          title="Shared e-Scooter"
        />

        {/* Shared Other */}
        <div className="mb-4">
          <p className="text-gray-900 dark:text-gray-300 mb-4">
            Please use these tables to insert a shared mode not available in the tool, this table 
            should be used to add an ICE vehicle, while the next an electric vehicle.
          </p>
        </div>
        <DataTable
          variables={otherVars}
          onSave={(vars) => handleSave('other', vars)}
          title={`Shared ${otherModeName}`}
        />

        {/* Shared e-Other */}
        <DataTable
          variables={eOtherVars}
          onSave={(vars) => handleSave('e_other', vars)}
          title={`Shared e-${otherModeName}`}
        />
      </div>
    </Layout>
  );
}

