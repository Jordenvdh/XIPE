"""
API routes for variables management
Get and save variable tables
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, List, Any
from app.api.models.schemas import (
    VariableRow,
    GeneralVariables,
    TraditionalModesVariables,
    SharedServicesVariables,
    AllVariables
)
from app.core.data_loader import get_data_loader

router = APIRouter()

# In-memory storage for variables (in production, use a database)
_variables_storage: Dict[str, Any] = {}


@router.get("/general", response_model=GeneralVariables)
async def get_general_variables():
    """
    Get general variables
    
    Returns:
        General variables table
    """
    if "general" in _variables_storage:
        return GeneralVariables(variables=_variables_storage["general"])
    
    # Return default values if not set
    default_general = [
        {"variable": "Average CO2 emission intensity for electricity generation (gCO2/kWh)", "userInput": 0.0, "defaultValue": 96.0},
        {"variable": "Well-to-Tank emissions fraction of Well-to-Wheel emissions ICE cars (%)", "userInput": 0.0, "defaultValue": 20.0},
        {"variable": "Average age of the car fleet (years)", "userInput": 0.0, "defaultValue": 9.3},
        {"variable": "Percentage of petrol cars in the current fleet (%)", "userInput": 0.0, "defaultValue": 42.2},
        {"variable": "Percentage of diesel cars in the current fleet (%)", "userInput": 0.0, "defaultValue": 49.9},
        {"variable": "Percentage of electric cars in the current fleet (%)", "userInput": 0.0, "defaultValue": 7.8}
    ]
    
    return GeneralVariables(variables=[VariableRow(**v) for v in default_general])


@router.post("/general")
async def save_general_variables(variables: GeneralVariables):
    """
    Save general variables
    
    Args:
        variables: General variables to save
        
    Returns:
        Success message
    """
    _variables_storage["general"] = [v.dict() for v in variables.variables]
    return {"message": "General variables saved successfully"}


@router.get("/traditional-modes", response_model=TraditionalModesVariables)
async def get_traditional_modes_variables():
    """
    Get traditional modes variables
    
    Returns:
        All traditional modes variables
    """
    # Return saved values from storage if they exist, otherwise return empty arrays
    if "traditionalModes" in _variables_storage:
        stored = _variables_storage["traditionalModes"]
        return TraditionalModesVariables(
            privateCar=[VariableRow(**v) for v in stored.get("private_car", [])],
            ptRoad=[VariableRow(**v) for v in stored.get("pt_road", [])],
            ptRail=[VariableRow(**v) for v in stored.get("pt_rail", [])],
            activeTransport=[VariableRow(**v) for v in stored.get("active_transport", [])]
        )
    
    # Return empty arrays if nothing is saved
    return TraditionalModesVariables(
        privateCar=[],
        ptRoad=[],
        ptRail=[],
        activeTransport=[]
    )


@router.post("/traditional-modes/{mode}")
async def save_traditional_mode_variables(mode: str, variables: List[VariableRow]):
    """
    Save variables for a specific traditional mode
    
    Args:
        mode: Mode name (private_car, pt_road, pt_rail, active_transport)
        variables: Variables to save
        
    Returns:
        Success message
    """
    if mode not in ["private_car", "pt_road", "pt_rail", "active_transport"]:
        raise HTTPException(status_code=400, detail=f"Invalid mode: {mode}")
    
    if "traditionalModes" not in _variables_storage:
        _variables_storage["traditionalModes"] = {}
    
    _variables_storage["traditionalModes"][mode] = [v.dict() for v in variables]
    return {"message": f"{mode} variables saved successfully"}


@router.get("/traditional-modes/private-car-defaults", response_model=List[VariableRow])
async def get_private_car_defaults(country: str = Query(..., description="Country name matching emission datasets")):
    """
    Get country-specific default variables for the private car mode.

    This mirrors the logic used in the calculation engine:
    - CO2 TTW is taken from the EU new car CO2 dataset for the country,
      corrected for NEDC / WLTP underestimation based on fleet age.
    - NOx and PM are derived from emission limit data, weighted by the
      country fuel mix (petrol / diesel shares) and converted to mg/km.

    The life‑cycle emission factor remains the original default (55 gCO2/km),
    as in the original XIPE implementation.
    """
    try:
        data_loader = get_data_loader()

        # Country-specific fleet stats
        country_data = data_loader.get_country_data(country)
        car_age = country_data["averageAge"]
        fuel_dist = country_data["fuelDistribution"]

        # Convert average age to approximate registration year
        # Same approach as in the calculation engine
        car_year = round(2024 - car_age, 0)

        # Determine index in CO2 / emission tables
        year_list = data_loader.get_year_list()
        max_year = year_list.max()
        year_index = int(max_year - car_year)

        # Base TTW CO2 factor for new cars in this country (g/km)
        default_co2_car = float(data_loader.car_co2.loc[year_index, country])

        # Apply NEDC/WLTP underestimation correction factors
        if car_year <= 2020:
            # NEDC test cycle underestimates real‑world by ~40%
            default_co2_car *= 1.4
        else:
            # WLTP underestimates real‑world by ~14%
            default_co2_car *= 1.14

        # NOx and PM emission limits (g/km) per fuel from emission dataset
        petrol_nox = float(data_loader.air_emission.loc[year_index, "petrol_nox"])
        diesel_nox = float(data_loader.air_emission.loc[year_index, "diesel_nox"])
        petrol_pm = float(data_loader.air_emission.loc[year_index, "petrol_pm"])
        diesel_pm = float(data_loader.air_emission.loc[year_index, "diesel_pm"])

        # Weighted fleet-average tailpipe emissions in mg/km
        petrol_share = float(fuel_dist["petrol"]) / 100.0
        diesel_share = float(fuel_dist["diesel"]) / 100.0

        default_nox_car = (
            petrol_share * petrol_nox + diesel_share * diesel_nox
        ) * 1000.0
        default_pm_car = (
            petrol_share * petrol_pm + diesel_share * diesel_pm
        ) * 1000.0

        # Build rows in the same order as used on the frontend
        rows: List[VariableRow] = [
            VariableRow(
                variable="CO2 emission factors Tank-to-Wheel (gr/km)",
                userInput=0.0,
                defaultValue=default_co2_car,
            ),
            VariableRow(
                variable="Average NOx emissions (mg/km)",
                userInput=0.0,
                defaultValue=default_nox_car,
            ),
            VariableRow(
                variable="Average PM emissions (mg/km)",
                userInput=0.0,
                defaultValue=default_pm_car,
            ),
            VariableRow(
                variable="Emission factor for life-cycle phases excluding use phase (gCO2/km)",
                userInput=0.0,
                defaultValue=55.0,
            ),
        ]

        return rows
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to compute private car defaults for {country}: {exc}")


@router.get("/shared-services", response_model=Dict[str, List[VariableRow]])
async def get_shared_services_variables():
    """
    Get shared services variables
    
    Returns:
        All shared services variables
    """
    if "sharedServices" in _variables_storage:
        return {
            k: [VariableRow(**v) for v in vars_list]
            for k, vars_list in _variables_storage["sharedServices"].items()
        }
    
    return {}


@router.post("/shared-services/{service}")
async def save_shared_service_variables(service: str, variables: List[VariableRow]):
    """
    Save variables for a specific shared service
    
    Args:
        service: Service name (ice_car, ice_moped, bike, e_car, etc.)
        variables: Variables to save
        
    Returns:
        Success message
    """
    if "sharedServices" not in _variables_storage:
        _variables_storage["sharedServices"] = {}
    
    _variables_storage["sharedServices"][service] = [v.dict() for v in variables]
    return {"message": f"{service} variables saved successfully"}




