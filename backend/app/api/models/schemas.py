"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any


# Data Models
class FuelDistribution(BaseModel):
    """Fuel distribution percentages"""
    petrol: float = Field(..., ge=0, le=100)
    diesel: float = Field(..., ge=0, le=100)
    ev: float = Field(..., ge=0, le=100)
    other: float = Field(..., ge=0, le=100)


class CountryData(BaseModel):
    """Country-specific data"""
    averageAge: float
    fuelDistribution: FuelDistribution
    electricityCo2: float


# Modal Split Models
class ModalSplitItem(BaseModel):
    """Modal split item with split percentage and distance"""
    split: float = Field(..., ge=0, le=100)
    distance: float = Field(..., ge=0)


class PublicTransport(BaseModel):
    """Public transport modal split"""
    road: ModalSplitItem
    rail: ModalSplitItem


class ActiveModes(BaseModel):
    """Active modes modal split"""
    cycling: ModalSplitItem
    walking: ModalSplitItem


class ModalSplit(BaseModel):
    """Modal split data"""
    privateCar: ModalSplitItem
    publicTransport: PublicTransport
    activeModes: ActiveModes


# Shared Modes Models
class SharedMode(BaseModel):
    """Shared mobility service"""
    mode: str = Field(..., pattern="^(Car|Bike|Moped|e-Scooter|Other)$")
    numVehicles: int = Field(..., ge=0)
    percentageElectric: float = Field(..., ge=0, le=100)


# Variable Models
class VariableRow(BaseModel):
    """Single variable row"""
    variable: str
    userInput: float = Field(default=0.0)
    defaultValue: float


class VariableTable(BaseModel):
    """Variable table"""
    variables: List[VariableRow]


# Variables Structure
class GeneralVariables(BaseModel):
    """General variables"""
    variables: List[VariableRow]


class TraditionalModesVariables(BaseModel):
    """Traditional modes variables"""
    privateCar: List[VariableRow]
    ptRoad: List[VariableRow]
    ptRail: List[VariableRow]
    activeTransport: List[VariableRow]


class SharedServicesVariables(BaseModel):
    """Shared services variables"""
    iceCar: Optional[List[VariableRow]] = None
    iceMoped: Optional[List[VariableRow]] = None
    bike: Optional[List[VariableRow]] = None
    eCar: Optional[List[VariableRow]] = None
    eBike: Optional[List[VariableRow]] = None
    eMoped: Optional[List[VariableRow]] = None
    eScooter: Optional[List[VariableRow]] = None
    other: Optional[List[VariableRow]] = None
    eOther: Optional[List[VariableRow]] = None


class AllVariables(BaseModel):
    """All variables"""
    general: List[VariableRow]
    traditionalModes: Dict[str, List[VariableRow]]
    sharedServices: Dict[str, List[VariableRow]]


# Calculation Request/Response Models
class CalculationRequest(BaseModel):
    """Request model for emissions calculation"""
    country: str
    cityName: str
    inhabitants: int = Field(..., gt=0)
    modalSplit: ModalSplit
    sharedModes: List[SharedMode]
    variables: AllVariables


class PerModeResult(BaseModel):
    """Per-mode emission results"""
    ttw: float
    wtt: float
    lca: float
    total: float
    nox: float
    pm: float


class AirQualityTotals(BaseModel):
    """Air quality totals"""
    gPerDay: float
    kgPerYear: float
    kgPerYearPer1000: float


class Co2CategoryTotals(BaseModel):
    """CO2 category totals (for Total, TTW, WTT, LCA)"""
    kgPerDay: float
    tonPerYear: float
    tonPerYearPer1000: float


class Co2Totals(BaseModel):
    """CO2 totals with separate categories"""
    total: Co2CategoryTotals
    tankToWheel: Co2CategoryTotals
    wellToTank: Co2CategoryTotals
    lifeCycle: Co2CategoryTotals


class CalculationTotals(BaseModel):
    """Calculation totals"""
    co2: Co2Totals
    airQuality: Dict[str, AirQualityTotals]


class CalculationResponse(BaseModel):
    """Response model for emissions calculation"""
    perMode: Dict[str, PerModeResult]
    totals: CalculationTotals

