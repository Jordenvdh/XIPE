"""
Data loading utilities for CSV files
Loads and caches country data, vehicle data, and emission limits
"""
import pandas as pd
import os
from pathlib import Path
from typing import Dict, List, Optional


class DataLoader:
    """Loads and caches CSV data files"""
    
    def __init__(self, data_dir: str = "app/data"):
        """
        Initialize data loader
        
        Args:
            data_dir: Directory containing CSV data files
        """
        # Get the base directory (backend/)
        # __file__ is backend/app/core/data_loader.py
        # parent.parent.parent gets us to backend/
        base_dir = Path(__file__).parent.parent.parent
        self.data_dir = base_dir / data_dir
        
        # Data caches
        self._car_co2: Optional[pd.DataFrame] = None
        self._car_acea: Optional[pd.DataFrame] = None
        self._air_emission: Optional[pd.DataFrame] = None
        self._elec_co2_country: Optional[pd.DataFrame] = None
        
        # Load data on initialization
        self._load_all_data()
    
    def _load_all_data(self):
        """Load all CSV files"""
        try:
            # Load CO2 emissions data
            co2_path = self.data_dir / "co2_emissions_new_cars_EU.csv"
            if co2_path.exists():
                self._car_co2 = pd.read_csv(co2_path)
            
            # Load ACEA vehicle data
            acea_path = self.data_dir / "acea_vehicle_data.csv"
            if acea_path.exists():
                self._car_acea = pd.read_csv(acea_path)
            
            # Load air emission limits
            air_path = self.data_dir / "air_emission_limits.csv"
            if air_path.exists():
                self._air_emission = pd.read_csv(air_path)
            
            # Create electricity CO2 country data
            self._create_elec_co2_data()
            
        except Exception as e:
            print(f"Error loading data: {e}")
            raise
    
    def _create_elec_co2_data(self):
        """Create electricity CO2 emission intensity dataframe"""
        if self._car_co2 is None:
            return
        
        # Get country list from CO2 data
        country_list = self._car_co2.columns.tolist()[1:-1]
        
        # Electricity emission intensity per country (from EEA)
        # Same order as country list
        elec_co2 = [
            96, 145, 422, 133, 589, 400, 103, 658, 66, 68, 366, 416, 180, 310, 252,
            86, 180, 52, 347, 321, 666, 173, 247, 115, 208, 205, 7, 251
        ]
        
        # Create dataframe
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
        Get country-specific data
        
        Args:
            country: Country name
            
        Returns:
            Dictionary with country data
        """
        if country not in self.get_country_list():
            raise ValueError(f"Country '{country}' not found")
        
        # Get car age
        car_age = self.car_acea.loc[
            self.car_acea["country"] == country, "average_age_acea"
        ].values[0]
        
        # Get fuel distribution
        perc_petrol = self.car_acea.loc[
            self.car_acea["country"] == country, "perc_petrol"
        ].values[0]
        
        perc_diesel = self.car_acea.loc[
            self.car_acea["country"] == country, "perc_diesel"
        ].values[0]
        
        perc_ev = self.car_acea.loc[
            self.car_acea["country"] == country, "perc_ev"
        ].values[0]
        
        perc_other = 1 - perc_petrol - perc_diesel - perc_ev
        
        # Get electricity CO2 intensity
        elec_co2 = self.elec_co2_country.loc[0, country]
        
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

