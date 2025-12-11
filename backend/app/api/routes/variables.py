"""
API routes for variables management
Get and save variable tables
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, List, Any
from app.api.models.schemas import (
    VariableRow,
    GeneralVariables,
    TraditionalModesVariables,
    SharedServicesVariables,
    AllVariables
)

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
    # Return defaults if not set
    # This would normally load from storage or database
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

