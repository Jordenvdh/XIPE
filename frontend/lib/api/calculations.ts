/**
 * API functions for calculations endpoints
 */
import apiClient from './client';
import type { CalculationRequest, CalculationResponse } from '@/lib/types';

/**
 * Calculate emissions based on input data
 */
export async function calculateEmissions(
  request: CalculationRequest
): Promise<CalculationResponse> {
  const response = await apiClient.post<CalculationResponse>(
    '/api/calculations/emissions',
    request
  );
  return response.data;
}




