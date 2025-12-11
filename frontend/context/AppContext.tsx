'use client';

/**
 * Global application state management using React Context
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  AppState,
  DashboardState,
  ModalSplit,
  SharedMode,
  AllVariables,
  CalculationResponse,
} from '@/lib/types';

// Initial state
const initialState: AppState = {
  dashboard: {
    country: 'Austria',
    cityName: '',
    inhabitants: 1,
  },
  modalSplit: {
    privateCar: { split: 0, distance: 0 },
    publicTransport: {
      road: { split: 0, distance: 0 },
      rail: { split: 0, distance: 0 },
    },
    activeModes: {
      cycling: { split: 0, distance: 0 },
      walking: { split: 0, distance: 0 },
    },
  },
  sharedModes: [
    { mode: 'Car', numVehicles: 0, percentageElectric: 0 },
    { mode: 'Bike', numVehicles: 0, percentageElectric: 0 },
    { mode: 'Moped', numVehicles: 0, percentageElectric: 0 },
    { mode: 'e-Scooter', numVehicles: 0, percentageElectric: 100 },
    { mode: 'Other', numVehicles: 0, percentageElectric: 0 },
  ],
  variables: {
    general: [
      { variable: 'Average CO2 emission intensity for electricity generation (gCO2/kWh)', userInput: 0, defaultValue: 96.0 },
      { variable: 'Well-to-Tank emissions fraction of Well-to-Wheel emissions ICE cars (%)', userInput: 0, defaultValue: 20.0 },
      { variable: 'Average age of the car fleet (years)', userInput: 0, defaultValue: 9.3 },
      { variable: 'Percentage of petrol cars in the current fleet (%)', userInput: 0, defaultValue: 42.2 },
      { variable: 'Percentage of diesel cars in the current fleet (%)', userInput: 0, defaultValue: 49.9 },
      { variable: 'Percentage of electric cars in the current fleet (%)', userInput: 0, defaultValue: 7.8 },
    ],
    traditionalModes: {},
    sharedServices: {},
  },
  results: null,
  loading: false,
  error: null,
};

// Create context
interface AppContextType extends AppState {
  updateDashboard: (dashboard: Partial<DashboardState>) => void;
  updateModalSplit: (modalSplit: Partial<ModalSplit>) => void;
  updateSharedModes: (sharedModes: SharedMode[]) => void;
  updateVariables: (variables: Partial<AllVariables>) => void;
  setResults: (results: CalculationResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage after mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('xipe-state');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setState((prev) => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error('Error loading state from localStorage:', e);
        }
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('xipe-state', JSON.stringify(state));
    }
  }, [state]);

  // Update functions
  const updateDashboard = useCallback((dashboard: Partial<DashboardState>) => {
    setState((prev) => ({
      ...prev,
      dashboard: { ...prev.dashboard, ...dashboard },
    }));
  }, []);

  const updateModalSplit = useCallback((modalSplit: Partial<ModalSplit>) => {
    setState((prev) => ({
      ...prev,
      modalSplit: { ...prev.modalSplit, ...modalSplit },
    }));
  }, []);

  const updateSharedModes = useCallback((sharedModes: SharedMode[]) => {
    setState((prev) => ({ ...prev, sharedModes }));
  }, []);

  const updateVariables = useCallback((variables: Partial<AllVariables>) => {
    setState((prev) => ({
      ...prev,
      variables: { ...prev.variables, ...variables },
    }));
  }, []);

  const setResults = useCallback((results: CalculationResponse | null) => {
    setState((prev) => ({ ...prev, results }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const resetState = useCallback(() => {
    setState(initialState);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('xipe-state');
    }
  }, []);

  const value: AppContextType = {
    ...state,
    updateDashboard,
    updateModalSplit,
    updateSharedModes,
    updateVariables,
    setResults,
    setLoading,
    setError,
    resetState,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook to use context
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

