"""
Data loading utilities for CSV files
Loads and caches country data, vehicle data, and emission limits

Purpose:
- Centralized data loading and caching for CSV files
- Provides country-specific data for calculations
- Handles data transformation and validation

Security considerations:
- OWASP #1 - Injection Prevention: File paths are constructed safely
- OWASP #3 - Sensitive Data Exposure: Only public reference data is loaded
"""
import pandas as pd
import os
from pathlib import Path
from typing import Dict, List, Optional


class DataLoader:
    """
    Loads and caches CSV data files
    
    This class handles:
    - Loading CSV files from the data directory
    - Caching loaded dataframes for performance
    - Providing country-specific data lookups
    - Creating derived datasets (electricity CO2 intensity)
    """
    
    def __init__(self, data_dir: str = "app/data"):
        """
        Initialize data loader
        
        Purpose:
        - Set up data directory path
        - Initialize data caches
        - Load all CSV files on initialization
        
        Args:
            data_dir: Directory containing CSV data files (relative to backend/)
        """
        # Path resolution: Get the base directory (backend/)
        # __file__ is backend/app/core/data_loader.py
        # parent.parent.parent gets us to backend/
        # OWASP #1 - Injection Prevention: Use Path objects for safe path handling
        base_dir = Path(__file__).parent.parent.parent
        self.data_dir = base_dir / data_dir
        
        # Data caches: Store loaded dataframes to avoid reloading
        # These are loaded once and reused for all requests
        self._car_co2: Optional[pd.DataFrame] = None  # CO2 emissions by country/year
        self._car_acea: Optional[pd.DataFrame] = None  # ACEA vehicle fleet data
        self._air_emission: Optional[pd.DataFrame] = None  # Air emission limits
        self._elec_co2_country: Optional[pd.DataFrame] = None  # Electricity CO2 intensity
        
        # Load all data files on initialization
        # This ensures data is available immediately and errors are caught early
        self._load_all_data()
    
    def _load_all_data(self):
        """
        Load all CSV files from the data directory
        
        Purpose:
        - Loads all required CSV files into memory
        - Creates derived datasets (electricity CO2 intensity)
        - Raises exceptions if critical files are missing
        
        Files loaded:
        - co2_emissions_new_cars_EU.csv: CO2 emissions by country and year
        - acea_vehicle_data.csv: Vehicle fleet statistics by country
        - air_emission_limits.csv: NOx and PM emission limits by year
        """
        try:
            # Load CO2 emissions data
            # This file contains CO2 emissions per km for new cars by country and year
            co2_path = self.data_dir / "co2_emissions_new_cars_EU.csv"
            if co2_path.exists():
                self._car_co2 = pd.read_csv(co2_path)
            
            # Load ACEA vehicle data
            # Contains country-specific fleet statistics (age, fuel distribution)
            acea_path = self.data_dir / "acea_vehicle_data.csv"
            if acea_path.exists():
                self._car_acea = pd.read_csv(acea_path)
            
            # Load air emission limits
            # Contains NOx and PM emission limits by fuel type and year
            air_path = self.data_dir / "air_emission_limits.csv"
            if air_path.exists():
                self._air_emission = pd.read_csv(air_path)
            
            # Create electricity CO2 country data
            # Derived dataset: Electricity emission intensity by country
            self._create_elec_co2_data()
            
        except Exception as e:
            # Log error and re-raise for upstream handling
            print(f"Error loading data: {e}")
            raise
    
    def _create_elec_co2_data(self):
        """
        Create electricity CO2 emission intensity dataframe
        
        Purpose:
        - Creates a derived dataset with electricity CO2 intensity by country
        - Data source: EEA (European Environment Agency)
        - Values are in gCO2/kWh
        
        Process:
        1. Extract country list from CO2 emissions data
        2. Map countries to their electricity CO2 intensity values
        3. Create a transposed dataframe for easy lookup
        """
        if self._car_co2 is None:
            return
        
        # Get country list from CO2 data
        # Skip first column (year) and last column (if present)
        country_list = self._car_co2.columns.tolist()[1:-1]
        
        # Electricity emission intensity per country (from EEA)
        # Values in gCO2/kWh, same order as country list
        # Source: European Environment Agency electricity generation data
        elec_co2 = [
            96, 145, 422, 133, 589, 400, 103, 658, 66, 68, 366, 416, 180, 310, 252,
            86, 180, 52, 347, 321, 666, 173, 247, 115, 208, 205, 7, 251
        ]
        
        # Create dataframe: Map countries to their CO2 intensity values
        # Transpose for easier lookup by country name
        df_elec_co2 = pd.DataFrame.from_dict(
            dict(zip(country_list, elec_co2)), orient='index'
        )
        self._elec_co2_country = df_elec_co2.T
    
    @property
    def car_co2(self) -> pd.DataFrame:
        """Get CO2 emissions data"""
        if self._car_co2 is None:
            raise ValueError("CO2 emissions data not loaded")
        return self._car_co2
    
    @property
    def car_acea(self) -> pd.DataFrame:
        """Get ACEA vehicle data"""
        if self._car_acea is None:
            raise ValueError("ACEA vehicle data not loaded")
        return self._car_acea
    
    @property
    def air_emission(self) -> pd.DataFrame:
        """Get air emission limits data"""
        if self._air_emission is None:
            raise ValueError("Air emission limits data not loaded")
        return self._air_emission
    
    @property
    def elec_co2_country(self) -> pd.DataFrame:
        """Get electricity CO2 emission intensity by country"""
        if self._elec_co2_country is None:
            raise ValueError("Electricity CO2 data not loaded")
        return self._elec_co2_country
    
    def get_country_list(self) -> List[str]:
        """Get list of available countries"""
        return self.car_co2.columns.tolist()[1:-1]
    
    def get_year_list(self) -> pd.Series:
        """Get list of available years"""
        return self.car_co2[self.car_co2.columns[0]]
    
    def get_country_data(self, country: str) -> Dict:
        """
        Get country-specific data for calculations
        
        Purpose:
        - Retrieves all country-specific data needed for emissions calculations
        - Combines data from multiple sources (ACEA, CO2 emissions, electricity intensity)
        - Handles edge cases (negative fuel distribution due to rounding)
        
        Args:
            country: Country name (must be in the country list)
            
        Returns:
            Dictionary with:
            - averageAge: Average age of car fleet in years
            - fuelDistribution: Percentages for petrol, diesel, ev, other
            - electricityCo2: Electricity CO2 intensity in gCO2/kWh
            
        Raises:
            ValueError: If country is not found in the dataset
        """
        # Validate country exists in dataset
        if country not in self.get_country_list():
            raise ValueError(f"Country '{country}' not found")
        
        # Get car age from ACEA data
        # Average age of the car fleet in this country
        car_age = self.car_acea.loc[
            self.car_acea["country"] == country, "average_age_acea"
        ].values[0]
        
        # Get fuel distribution percentages from ACEA data
        # Values are stored as fractions (0-1), converted to percentages (0-100) later
        perc_petrol = self.car_acea.loc[
            self.car_acea["country"] == country, "perc_petrol"
        ].values[0]
        
        perc_diesel = self.car_acea.loc[
            self.car_acea["country"] == country, "perc_diesel"
        ].values[0]
        
        perc_ev = self.car_acea.loc[
            self.car_acea["country"] == country, "perc_ev"
        ].values[0]
        
        # Compute residual "other" share
        # Edge case handling: Due to source rounding/updates, some countries
        # (e.g. Denmark) can end up with a slightly negative value when
        # petrol + diesel + EV exceed 1.0 by a small margin.
        # Clamp at zero to satisfy Pydantic's >= 0 constraint and avoid
        # spurious validation errors while preserving the main fuel shares.
        perc_other_raw = 1 - perc_petrol - perc_diesel - perc_ev
        perc_other = max(0.0, perc_other_raw)
        
        # Get electricity CO2 intensity from derived dataset
        # Value in gCO2/kWh for electricity generation in this country
        elec_co2 = self.elec_co2_country.loc[0, country]
        
        # Return structured data dictionary
        # Convert fractions to percentages for fuel distribution
        return {
            "averageAge": float(car_age),
            "fuelDistribution": {
                "petrol": float(perc_petrol * 100),
                "diesel": float(perc_diesel * 100),
                "ev": float(perc_ev * 100),
                "other": float(perc_other * 100)
            },
            "electricityCo2": float(elec_co2)
        }


# Global data loader instance
_data_loader: Optional[DataLoader] = None


def get_data_loader() -> DataLoader:
    """Get or create global data loader instance"""
    global _data_loader
    if _data_loader is None:
        _data_loader = DataLoader()
    return _data_loader

