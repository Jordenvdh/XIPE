/**
 * API functions for variables endpoints
 */
import apiClient from './client';
import type { VariableRow, GeneralVariables, TraditionalModesVariables } from '@/lib/types';

/**
 * Saved user variables live in this browser only (localStorage), so one
 * visitor's inputs are never visible to, or overwritable by, another visitor.
 * The backend only serves read-only defaults.
 */
const STORAGE_KEY = 'xipe-saved-variables';

interface SavedVariables {
  general?: VariableRow[];
  traditionalModes?: Record<string, VariableRow[]>;
  sharedServices?: Record<string, VariableRow[]>;
}

function readSaved(): SavedVariables {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSaved(update: (saved: SavedVariables) => SavedVariables): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(update(readSaved())));
  } catch (e) {
    console.error('Error saving variables to localStorage:', e);
    throw e;
  }
}

/**
 * Get general variables (returns defaults if none saved)
 */
export async function getGeneralVariables(): Promise<GeneralVariables> {
  const saved = readSaved().general;
  if (saved && saved.length > 0) {
    return { variables: saved };
  }
  const response = await apiClient.get<GeneralVariables>('/api/variables/general');
  return response.data;
}

/**
 * Get traditional modes variables (defaults overlaid with saved values)
 */
export async function getTraditionalModesVariables(): Promise<TraditionalModesVariables> {
  const response = await apiClient.get<TraditionalModesVariables>('/api/variables/traditional-modes');
  const defaults = response.data;
  const stored = readSaved().traditionalModes;
  if (!stored) {
    return defaults;
  }
  const savedActive = stored.active_transport || [];
  return {
    privateCar: stored.private_car || [],
    ptRoad: stored.pt_road || defaults.ptRoad,
    ptRail: stored.pt_rail || defaults.ptRail,
    // Active transport needs at least cycling + walking rows
    activeTransport: savedActive.length >= 2 ? savedActive : defaults.activeTransport,
  };
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
 * Get country-specific general variables defaults
 */
export async function getGeneralDefaults(country: string): Promise<VariableRow[]> {
  const response = await apiClient.get<VariableRow[]>('/api/variables/general-defaults', {
    params: { country },
  });
  return response.data;
}

/**
 * Get shared services variables (defaults overlaid with saved values)
 */
export async function getSharedServicesVariables(): Promise<Record<string, VariableRow[]>> {
  const response = await apiClient.get<Record<string, VariableRow[]>>('/api/variables/shared-services');
  const defaults = response.data;
  const saved = readSaved().sharedServices || {};
  const result: Record<string, VariableRow[]> = {};
  for (const key of Object.keys(defaults)) {
    result[key] = saved[key] || defaults[key];
  }
  return result;
}

/**
 * Save general variables
 */
export async function saveGeneralVariables(variables: GeneralVariables): Promise<void> {
  writeSaved((saved) => ({ ...saved, general: variables.variables }));
}

/**
 * Save traditional mode variables
 */
export async function saveTraditionalModeVariables(mode: string, variables: VariableRow[]): Promise<void> {
  writeSaved((saved) => ({
    ...saved,
    traditionalModes: { ...(saved.traditionalModes || {}), [mode]: variables },
  }));
}

/**
 * Save shared service variables
 */
export async function saveSharedServiceVariables(service: string, variables: VariableRow[]): Promise<void> {
  writeSaved((saved) => ({
    ...saved,
    sharedServices: { ...(saved.sharedServices || {}), [service]: variables },
  }));
}
