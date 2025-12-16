/**
 * API functions for variables endpoints
 */
import apiClient from './client';
import type {
  GeneralVariables,
  TraditionalModesVariables,
  SharedServicesVariables,
  VariableRow,
} from '@/lib/types';

/**
 * Get general variables
 */
export async function getGeneralVariables(): Promise<GeneralVariables> {
  const response = await apiClient.get<GeneralVariables>('/api/variables/general');
  return response.data;
}

/**
 * Save general variables
 */
export async function saveGeneralVariables(variables: GeneralVariables): Promise<void> {
  await apiClient.post('/api/variables/general', variables);
}

/**
 * Get traditional modes variables
 */
export async function getTraditionalModesVariables(): Promise<TraditionalModesVariables> {
  const response = await apiClient.get<TraditionalModesVariables>('/api/variables/traditional-modes');
  return response.data;
}

/**
 * Get country-specific default variables for the private car mode.
 *
 * This uses the same backend datasets and correction factors as the
 * main calculation engine (CO2, NOx, PM based on fleet age and fuel mix),
 * so the visible defaults on the Variables page match what is used
 * internally for the calculations.
 */
export async function getPrivateCarDefaults(country: string): Promise<VariableRow[]> {
  const response = await apiClient.get<VariableRow[]>('/api/variables/traditional-modes/private-car-defaults', {
    params: { country },
  });
  return response.data;
}

/**
 * Save traditional mode variables
 */
export async function saveTraditionalModeVariables(
  mode: string,
  variables: VariableRow[]
): Promise<void> {
  await apiClient.post(`/api/variables/traditional-modes/${mode}`, variables);
}

/**
 * Get shared services variables
 */
export async function getSharedServicesVariables(): Promise<Record<string, VariableRow[]>> {
  const response = await apiClient.get<Record<string, VariableRow[]>>('/api/variables/shared-services');
  return response.data;
}

/**
 * Save shared service variables
 */
export async function saveSharedServiceVariables(
  service: string,
  variables: VariableRow[]
): Promise<void> {
  await apiClient.post(`/api/variables/shared-services/${service}`, variables);
}




