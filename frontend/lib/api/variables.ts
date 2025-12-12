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


