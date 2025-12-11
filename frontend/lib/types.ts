/**
 * TypeScript type definitions for XIPE frontend
 * These types match the backend API schemas
 */

// Data Types
export interface FuelDistribution {
  petrol: number;
  diesel: number;
  ev: number;
  other: number;
}

export interface CountryData {
  averageAge: number;
  fuelDistribution: FuelDistribution;
  electricityCo2: number;
}

// Modal Split Types
export interface ModalSplitItem {
  split: number;
  distance: number;
}

export interface ModalSplit {
  privateCar: ModalSplitItem;
  publicTransport: {
    road: ModalSplitItem;
    rail: ModalSplitItem;
  };
  activeModes: {
    cycling: ModalSplitItem;
    walking: ModalSplitItem;
  };
}

// Shared Modes Types
export type SharedModeType = "Car" | "Bike" | "Moped" | "e-Scooter" | "Other";

export interface SharedMode {
  mode: SharedModeType;
  numVehicles: number;
  percentageElectric: number;
}

// Variable Types
export interface VariableRow {
  variable: string;
  userInput: number;
  defaultValue: number;
}

export interface GeneralVariables {
  variables: VariableRow[];
}

export interface TraditionalModesVariables {
  privateCar: VariableRow[];
  ptRoad: VariableRow[];
  ptRail: VariableRow[];
  activeTransport: VariableRow[];
}

export interface SharedServicesVariables {
  iceCar?: VariableRow[];
  iceMoped?: VariableRow[];
  bike?: VariableRow[];
  eCar?: VariableRow[];
  eBike?: VariableRow[];
  eMoped?: VariableRow[];
  eScooter?: VariableRow[];
  other?: VariableRow[];
  eOther?: VariableRow[];
}

export interface AllVariables {
  general: VariableRow[];
  traditionalModes: Record<string, VariableRow[]>;
  sharedServices: Record<string, VariableRow[]>;
}

// Calculation Types
export interface PerModeResult {
  ttw: number;
  wtt: number;
  lca: number;
  total: number;
  nox: number;
  pm: number;
}

export interface AirQualityTotals {
  gPerDay: number;
  kgPerYear: number;
  kgPerYearPer1000: number;
}

export interface Co2CategoryTotals {
  kgPerDay: number;
  tonPerYear: number;
  tonPerYearPer1000: number;
}

export interface Co2Totals {
  total: Co2CategoryTotals;
  tankToWheel: Co2CategoryTotals;
  wellToTank: Co2CategoryTotals;
  lifeCycle: Co2CategoryTotals;
}

export interface CalculationTotals {
  co2: Co2Totals;
  airQuality: {
    nox: AirQualityTotals;
    pm: AirQualityTotals;
  };
}

export interface CalculationResponse {
  perMode: Record<string, PerModeResult>;
  totals: CalculationTotals;
}

export interface CalculationRequest {
  country: string;
  cityName: string;
  inhabitants: number;
  modalSplit: ModalSplit;
  sharedModes: SharedMode[];
  variables: AllVariables;
}

// App State Types
export interface DashboardState {
  country: string;
  cityName: string;
  inhabitants: number;
}

export interface AppState {
  dashboard: DashboardState;
  modalSplit: ModalSplit;
  sharedModes: SharedMode[];
  variables: AllVariables;
  results: CalculationResponse | null;
  loading: boolean;
  error: string | null;
}

