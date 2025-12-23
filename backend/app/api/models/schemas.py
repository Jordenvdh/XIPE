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
from typing import List, Dict, Optional


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


class VariableRow(BaseModel):
    """
    Single row in a variables table
    
    Purpose:
    - Represents a single variable with user input and default value
    - Used across all variable tables (general, traditional modes, shared services)
    
    Fields:
    - variable: Name/description of the variable
    - userInput: User-provided value (0.0 if not set)
    - defaultValue: Default value for the variable
    """
    variable: str = Field(description="Variable name or description")
    userInput: float = Field(description="User-provided input value")
    defaultValue: float = Field(description="Default value for the variable")


class GeneralVariables(BaseModel):
    """
    General variables for emissions calculations
    
    Purpose:
    - Contains general variables used across all calculations
    - Includes electricity CO2 intensity, fleet age, fuel distribution percentages
    
    Fields:
    - variables: List of variable rows
    """
    variables: List[VariableRow] = Field(description="List of general variables")


class TraditionalModesVariables(BaseModel):
    """
    Variables for traditional transportation modes
    
    Purpose:
    - Contains variables for each traditional mode (private car, PT road, PT rail, active transport)
    - Each mode has its own list of variables
    
    Fields:
    - privateCar: Variables for private car mode
    - ptRoad: Variables for public transport road mode
    - ptRail: Variables for public transport rail mode
    - activeTransport: Variables for active transport mode
    """
    privateCar: List[VariableRow] = Field(description="Private car variables")
    ptRoad: List[VariableRow] = Field(description="Public transport road variables")
    ptRail: List[VariableRow] = Field(description="Public transport rail variables")
    activeTransport: List[VariableRow] = Field(description="Active transport variables")


class SharedServicesVariables(BaseModel):
    """
    Variables for shared services modes
    
    Purpose:
    - Contains variables for different shared service types
    - All fields are optional as not all services may have variables
    
    Fields:
    - iceCar: Variables for ICE car shared service
    - iceMoped: Variables for ICE moped shared service
    - bike: Variables for bike shared service
    - eCar: Variables for electric car shared service
    - eBike: Variables for electric bike shared service
    - eMoped: Variables for electric moped shared service
    - other: Variables for other shared service types
    - eOther: Variables for electric other shared service types
    """
    iceCar: Optional[List[VariableRow]] = Field(None, description="ICE car variables")
    iceMoped: Optional[List[VariableRow]] = Field(None, description="ICE moped variables")
    bike: Optional[List[VariableRow]] = Field(None, description="Bike variables")
    eCar: Optional[List[VariableRow]] = Field(None, description="Electric car variables")
    eBike: Optional[List[VariableRow]] = Field(None, description="Electric bike variables")
    eMoped: Optional[List[VariableRow]] = Field(None, description="Electric moped variables")
    other: Optional[List[VariableRow]] = Field(None, description="Other shared service variables")
    eOther: Optional[List[VariableRow]] = Field(None, description="Electric other shared service variables")


class AllVariables(BaseModel):
    """
    All variables grouped together
    
    Purpose:
    - Contains all variable types in a single structure
    - Used for retrieving or saving all variables at once
    
    Fields:
    - general: General variables
    - traditionalModes: Traditional modes variables (as dictionary)
    - sharedServices: Shared services variables (as dictionary)
    """
    general: List[VariableRow] = Field(description="General variables")
    traditionalModes: Dict[str, List[VariableRow]] = Field(description="Traditional modes variables")
    sharedServices: Dict[str, List[VariableRow]] = Field(description="Shared services variables")
