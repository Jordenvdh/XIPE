/**
 * API functions for data endpoints
 */
import apiClient from './client';
import type { CountryData } from '@/lib/types';

/**
 * Get list of available countries
 */
export async function getCountries(): Promise<string[]> {
  const response = await apiClient.get<string[]>('/api/countries');
  return response.data;
}

/**
 * Get country-specific data
 */
export async function getCountryData(country: string): Promise<CountryData> {
  const response = await apiClient.get<CountryData>(`/api/country/${country}/data`);
  return response.data;
}

/**
 * Get CO2 emissions table
 */
export async function getCo2Emissions() {
  const response = await apiClient.get('/api/country-constants/co2-emissions');
  return response.data;
}

/**
 * Get electricity intensity table
 */
export async function getElectricityIntensity() {
  const response = await apiClient.get('/api/country-constants/electricity-intensity');
  return response.data;
}









