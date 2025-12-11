'use client';

/**
 * Variables for Shared Services Page
 * Display and edit variables for shared mobility services
 */
import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import DataTable from '@/components/tables/DataTable';
import Alert from '@/components/forms/Alert';
import { useApp } from '@/context/AppContext';
import { saveSharedServiceVariables } from '@/lib/api/variables';
import type { VariableRow } from '@/lib/types';

export default function SharedServicesPage() {
  const { sharedModes } = useApp();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSave = async (service: string, variables: VariableRow[]) => {
    try {
      await saveSharedServiceVariables(service, variables);
      setSaveMessage(`${service} variables saved successfully!`);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error(`Error saving ${service} variables:`, error);
    }
  };

  // Default variables for each shared service type
  // These would normally be loaded from the backend
  const getDefaultVariables = (serviceType: string): VariableRow[] => {
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
    };

    return defaults[serviceType] || [];
  };

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
          variables={getDefaultVariables('ice_car')}
          onSave={(vars) => handleSave('ice_car', vars)}
          title="Shared ICE Car"
        />

        {/* Shared ICE Moped */}
        <DataTable
          variables={getDefaultVariables('ice_moped')}
          onSave={(vars) => handleSave('ice_moped', vars)}
          title="Shared ICE Moped"
        />

        {/* Shared Bike */}
        <DataTable
          variables={getDefaultVariables('bike')}
          onSave={(vars) => handleSave('bike', vars)}
          title="Shared bike"
        />

        {/* Shared e-Car */}
        <DataTable
          variables={getDefaultVariables('e_car')}
          onSave={(vars) => handleSave('e_car', vars)}
          title="Shared e-Car"
        />

        {/* Shared e-Bike */}
        <DataTable
          variables={getDefaultVariables('e_bike')}
          onSave={(vars) => handleSave('e_bike', vars)}
          title="Shared e-bike"
        />

        {/* Shared e-Moped */}
        <DataTable
          variables={getDefaultVariables('e_moped')}
          onSave={(vars) => handleSave('e_moped', vars)}
          title="Shared e-Moped"
        />

        {/* Shared e-Scooter */}
        <DataTable
          variables={getDefaultVariables('e_scooter')}
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
          variables={getDefaultVariables('ice_car')}
          onSave={(vars) => handleSave('other', vars)}
          title={`Shared ${otherModeName}`}
        />

        {/* Shared e-Other */}
        <DataTable
          variables={getDefaultVariables('e_car')}
          onSave={(vars) => handleSave('e_other', vars)}
          title={`Shared e-${otherModeName}`}
        />
      </div>
    </Layout>
  );
}

