"""
Pydantic schemas for API request/response models

Purpose:
- Define data structures for API requests and responses
- Provide validation and type safety
- Ensure consistent data formats across the API

Security considerations:
- OWASP #1 - Injection Prevention: Pydantic validates and sanitizes input
- OWASP #3 - Sensitive Data Exposure: Only expose necessary fields
"""
from pydantic import BaseModel, Field


class FuelDistribution(BaseModel):
    """
    Fuel distribution percentages for a country's vehicle fleet
    
    Purpose:
    - Represents the percentage breakdown of fuel types in a country's fleet
    - Values are percentages (0-100)
    
    Fields:
    - petrol: Percentage of petrol vehicles
    - diesel: Percentage of diesel vehicles
    - ev: Percentage of electric vehicles
    - other: Percentage of other fuel types
    """
    petrol: float = Field(ge=0, le=100, description="Percentage of petrol vehicles")
    diesel: float = Field(ge=0, le=100, description="Percentage of diesel vehicles")
    ev: float = Field(ge=0, le=100, description="Percentage of electric vehicles")
    other: float = Field(ge=0, le=100, description="Percentage of other fuel types")


class CountryData(BaseModel):
    """
    Country-specific data for emissions calculations
    
    Purpose:
    - Contains all country-specific data needed for emissions calculations
    - Includes fleet age, fuel distribution, and electricity CO2 intensity
    
    Fields:
    - averageAge: Average age of the vehicle fleet in years
    - fuelDistribution: Breakdown of fuel types in the fleet
    - electricityCo2: CO2 emission intensity of electricity generation (gCO2/kWh)
    """
    averageAge: float = Field(ge=0, description="Average age of vehicle fleet in years")
    fuelDistribution: FuelDistribution = Field(description="Fuel type distribution percentages")
    electricityCo2: float = Field(ge=0, description="Electricity CO2 intensity in gCO2/kWh")
