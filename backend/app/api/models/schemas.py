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


class ModalSplitItem(BaseModel):
    """
    Modal split item with split percentage and distance
    
    Purpose:
    - Represents a single mode's share and average distance
    
    Fields:
    - split: Modal split percentage (0-100)
    - distance: Average distance in km
    """
    split: float = Field(ge=0, le=100, description="Modal split percentage")
    distance: float = Field(ge=0, description="Average distance in km")


class PublicTransportSplit(BaseModel):
    """
    Public transport modal split
    
    Purpose:
    - Contains modal split for road and rail public transport
    
    Fields:
    - road: Road public transport modal split
    - rail: Rail public transport modal split
    """
    road: ModalSplitItem = Field(description="Road public transport modal split")
    rail: ModalSplitItem = Field(description="Rail public transport modal split")


class ActiveModesSplit(BaseModel):
    """
    Active modes modal split
    
    Purpose:
    - Contains modal split for cycling and walking
    
    Fields:
    - cycling: Cycling modal split
    - walking: Walking modal split
    """
    cycling: ModalSplitItem = Field(description="Cycling modal split")
    walking: ModalSplitItem = Field(description="Walking modal split")


class ModalSplit(BaseModel):
    """
    Complete modal split structure
    
    Purpose:
    - Contains modal split data for all transportation modes
    
    Fields:
    - privateCar: Private car modal split
    - publicTransport: Public transport modal split (road and rail)
    - activeModes: Active modes modal split (cycling and walking)
    """
    privateCar: ModalSplitItem = Field(description="Private car modal split")
    publicTransport: PublicTransportSplit = Field(description="Public transport modal split")
    activeModes: ActiveModesSplit = Field(description="Active modes modal split")


class SharedMode(BaseModel):
    """
    Shared mobility mode configuration
    
    Purpose:
    - Represents a shared mobility service configuration
    
    Fields:
    - mode: Type of shared mode (Car, Bike, Moped, e-Scooter, Other)
    - numVehicles: Number of vehicles in the fleet
    - percentageElectric: Percentage of electric vehicles (0-100)
    """
    mode: str = Field(description="Shared mode type")
    numVehicles: float = Field(ge=0, description="Number of vehicles")
    percentageElectric: float = Field(ge=0, le=100, description="Percentage of electric vehicles")


class CalculationRequest(BaseModel):
    """
    Request for emissions calculation
    
    Purpose:
    - Contains all input data needed for emissions calculations
    - Validates input before processing
    
    Fields:
    - country: Country name
    - cityName: City name
    - inhabitants: Number of inhabitants
    - modalSplit: Modal split data for all modes
    - sharedModes: List of shared mobility modes
    - variables: All variable values for calculations
    """
    country: str = Field(description="Country name")
    cityName: str = Field(description="City name")
    inhabitants: int = Field(ge=1, description="Number of inhabitants")
    modalSplit: ModalSplit = Field(description="Modal split data")
    sharedModes: List[SharedMode] = Field(description="Shared mobility modes")
    variables: AllVariables = Field(description="All variable values")


class PerModeResult(BaseModel):
    """
    Calculation results for a single mode
    
    Purpose:
    - Contains emissions results for one transportation mode
    
    Fields:
    - ttw: Tank-to-Wheel CO2 emissions
    - wtt: Well-to-Tank CO2 emissions
    - lca: Life Cycle Assessment CO2 emissions
    - total: Total CO2 emissions
    - nox: NOx emissions
    - pm: PM emissions
    """
    ttw: float = Field(description="Tank-to-Wheel CO2 emissions")
    wtt: float = Field(description="Well-to-Tank CO2 emissions")
    lca: float = Field(description="Life Cycle Assessment CO2 emissions")
    total: float = Field(description="Total CO2 emissions")
    nox: float = Field(description="NOx emissions")
    pm: float = Field(description="PM emissions")


class AirQualityTotals(BaseModel):
    """
    Air quality totals
    
    Purpose:
    - Contains air quality emissions totals in different units
    
    Fields:
    - gPerDay: Grams per day
    - kgPerYear: Kilograms per year
    - kgPerYearPer1000: Kilograms per year per 1000 inhabitants
    """
    gPerDay: float = Field(description="Grams per day")
    kgPerYear: float = Field(description="Kilograms per year")
    kgPerYearPer1000: float = Field(description="Kilograms per year per 1000 inhabitants")


class Co2CategoryTotals(BaseModel):
    """
    CO2 category totals
    
    Purpose:
    - Contains CO2 emissions totals for a category in different units
    
    Fields:
    - kgPerDay: Kilograms per day
    - tonPerYear: Tons per year
    - tonPerYearPer1000: Tons per year per 1000 inhabitants
    """
    kgPerDay: float = Field(description="Kilograms per day")
    tonPerYear: float = Field(description="Tons per year")
    tonPerYearPer1000: float = Field(description="Tons per year per 1000 inhabitants")


class Co2Totals(BaseModel):
    """
    Complete CO2 totals
    
    Purpose:
    - Contains all CO2 emission totals broken down by category
    
    Fields:
    - total: Total CO2 emissions
    - tankToWheel: Tank-to-Wheel CO2 emissions
    - wellToTank: Well-to-Tank CO2 emissions
    - lifeCycle: Life Cycle Assessment CO2 emissions
    """
    total: Co2CategoryTotals = Field(description="Total CO2 emissions")
    tankToWheel: Co2CategoryTotals = Field(description="Tank-to-Wheel CO2 emissions")
    wellToTank: Co2CategoryTotals = Field(description="Well-to-Tank CO2 emissions")
    lifeCycle: Co2CategoryTotals = Field(description="Life Cycle Assessment CO2 emissions")


class CalculationTotals(BaseModel):
    """
    Complete calculation totals
    
    Purpose:
    - Contains all emission totals (CO2 and air quality)
    
    Fields:
    - co2: CO2 emission totals
    - airQuality: Air quality emission totals (NOx and PM)
    """
    co2: Co2Totals = Field(description="CO2 emission totals")
    airQuality: Dict[str, AirQualityTotals] = Field(description="Air quality emission totals")


class CalculationResponse(BaseModel):
    """
    Response from emissions calculation
    
    Purpose:
    - Contains all calculation results
    
    Fields:
    - perMode: Results per transportation mode
    - totals: Overall totals for all emissions
    """
    perMode: Dict[str, PerModeResult] = Field(description="Results per mode")
    totals: CalculationTotals = Field(description="Overall totals")
