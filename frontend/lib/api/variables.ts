/**
 * API functions for variables endpoints
 */
import apiClient from './client';
import type { VariableRow, GeneralVariables, TraditionalModesVariables } from '@/lib/types';

/**
 * Get general variables (returns defaults if none saved)
 */
export async function getGeneralVariables(): Promise<GeneralVariables> {
  const response = await apiClient.get<GeneralVariables>('/api/variables/general');
  return response.data;
}

/**
 * Get traditional modes variables (returns empty arrays if none saved)
 */
export async function getTraditionalModesVariables(): Promise<TraditionalModesVariables> {
  const response = await apiClient.get<TraditionalModesVariables>('/api/variables/traditional-modes');
  return response.data;
}

/**
 * Get country-specific private car defaults
 */
export async function getPrivateCarDefaults(country: string): Promise<VariableRow[]> {
  const response = await apiClient.get<VariableRow[]>('/api/variables/traditional-modes/private-car-defaults', {
    params: { country },
  });
  return response.data;
}

/**
 * Get shared services variables (returns empty object if none saved)
 */
export async function getSharedServicesVariables(): Promise<Record<string, VariableRow[]>> {
  const response = await apiClient.get<Record<string, VariableRow[]>>('/api/variables/shared-services');
  return response.data;
}
