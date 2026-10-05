"""
API routes for variables management
Get and save variable tables

Security considerations:
- Input validation: All inputs validated via Pydantic schemas
- Error handling: Generic error messages to avoid information disclosure
- Logging: Variable access and modifications are logged
- Storage: In-memory storage (consider database for production)
"""
import logging
from fastapi import APIRouter, HTTPException, Query
from typing import Dict, List
from app.api.models.schemas import (
    VariableRow,
    GeneralVariables,
    TraditionalModesVariables,
    SharedServicesVariables,
    AllVariables
)
from app.core.data_loader import get_data_loader

# Security logging setup
# Log security-relevant events (variable access, modifications, etc.)
security_logger = logging.getLogger("security")

router = APIRouter()

# OWASP #5 - Broken Access Control: This API is read-only. User-entered values are
# saved in the visitor's own browser, never in shared server memory, so one visitor
# can neither see nor overwrite another visitor's inputs.


@router.get("/general", response_model=GeneralVariables)
async def get_general_variables():
    """
    Get general variables
    
    Returns:
        General variables table
    """
    # Default values (Austria defaults as fallback)
    default_general = [
        {"variable": "Average CO2 emission intensity for electricity generation (gCO2/kWh)", "userInput": 0.0, "defaultValue": 96.0},
        {"variable": "Well-to-Tank emissions fraction of Well-to-Wheel emissions ICE cars (%)", "userInput": 0.0, "defaultValue": 20.0},
        {"variable": "Average age of the car fleet (years)", "userInput": 0.0, "defaultValue": 9.3},
        {"variable": "Percentage of petrol cars in the current fleet (%)", "userInput": 0.0, "defaultValue": 42.2},
        {"variable": "Percentage of diesel cars in the current fleet (%)", "userInput": 0.0, "defaultValue": 49.9},
        {"variable": "Percentage of electric cars in the current fleet (%)", "userInput": 0.0, "defaultValue": 7.8}
    ]
    
    return GeneralVariables(variables=[VariableRow(**v) for v in default_general])


@router.get("/general-defaults", response_model=List[VariableRow])
async def get_general_defaults(country: str = Query(..., description="Country name matching emission datasets")):
    """
    Get country-specific default variables for general variables.
    
    This mirrors the logic used in the calculation engine:
    - Electricity CO2 intensity is country-specific
    - Average car fleet age is country-specific
    - Fuel distribution (petrol/diesel/ev percentages) is country-specific
    - Well-to-Tank emissions fraction is universal (20%)
    
    Security:
    - OWASP #1 - Injection Prevention: Country name validated
    - OWASP #10 - Logging: Access attempts logged
    """
    # Import sanitization function from data.py
    from app.api.routes.data import _sanitize_country_name
    
    try:
        # OWASP #1 - Injection Prevention: Sanitize and validate country name
        sanitized_country = _sanitize_country_name(country)
        data_loader = get_data_loader()
        
        # Get country-specific data
        country_data = data_loader.get_country_data(sanitized_country)
        car_age = country_data["averageAge"]
        fuel_dist = country_data["fuelDistribution"]
        electricity_co2 = country_data["electricityCo2"]
        
        # Return country-specific defaults
        # Note: Well-to-Tank emissions fraction (20%) is universal, not country-specific
        return [
            VariableRow(
                variable="Average CO2 emission intensity for electricity generation (gCO2/kWh)",
                userInput=0.0,
                defaultValue=float(electricity_co2)
            ),
            VariableRow(
                variable="Well-to-Tank emissions fraction of Well-to-Wheel emissions ICE cars (%)",
                userInput=0.0,
                defaultValue=20.0  # Universal value
            ),
            VariableRow(
                variable="Average age of the car fleet (years)",
                userInput=0.0,
                defaultValue=float(car_age)
            ),
            VariableRow(
                variable="Percentage of petrol cars in the current fleet (%)",
                userInput=0.0,
                defaultValue=float(fuel_dist["petrol"])
            ),
            VariableRow(
                variable="Percentage of diesel cars in the current fleet (%)",
                userInput=0.0,
                defaultValue=float(fuel_dist["diesel"])
            ),
            VariableRow(
                variable="Percentage of electric cars in the current fleet (%)",
                userInput=0.0,
                defaultValue=float(fuel_dist["ev"])
            ),
        ]
    except Exception as e:
        security_logger.error(
            f"Error fetching general defaults for country {country[:50]!r}: {type(e).__name__}"
        )
        raise HTTPException(
            status_code=400,
            detail="Failed to fetch general defaults. Please check the country name."
        )


@router.get("/traditional-modes", response_model=TraditionalModesVariables)
async def get_traditional_modes_variables():
    """
    Get traditional modes variables
    
    Returns:
        All traditional modes variables with defaults if none saved
    """
    # Default traditional modes variables (matching calculations.py)
    default_trad_modes = {
        "pt_road": [
            {"variable": "CO2 emission factors Tank-to-Wheel (gr/km)", "userInput": 0.0, "defaultValue": 63.0},
            {"variable": "Average NOx emissions (mg/km)", "userInput": 0.0, "defaultValue": 30.67},
            {"variable": "Average PM emissions (mg/km)", "userInput": 0.0, "defaultValue": 0.67},
            {"variable": "Emission factor for life-cycle phases excluding use phase (gCO2/km)", "userInput": 0.0, "defaultValue": 20.0},
        ],
        "pt_rail": [
            {"variable": "Average efficiency of public transport rail (kWh/km)", "userInput": 0.0, "defaultValue": 0.09},
            {"variable": "Emission factor for life-cycle phases excluding use phase (gCO2/km)", "userInput": 0.0, "defaultValue": 13.0},
        ],
        "cycling": [
            {"variable": "Emission factor for life-cycle phases excluding use phase (gCO2/km)", "userInput": 0.0, "defaultValue": 17.0},
        ],
        "walking": [
            {"variable": "Emission factor for life-cycle phases excluding use phase (gCO2/km)", "userInput": 0.0, "defaultValue": 0.0},
        ],
    }
    
    return TraditionalModesVariables(
        privateCar=[],
        ptRoad=[VariableRow(**v) for v in default_trad_modes["pt_road"]],
        ptRail=[VariableRow(**v) for v in default_trad_modes["pt_rail"]],
        activeTransport=[VariableRow(**v) for v in default_trad_modes["cycling"]] + [VariableRow(**v) for v in default_trad_modes["walking"]]
    )


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
    
    Security:
    - OWASP #1 - Injection Prevention: Country name validated
    - OWASP #10 - Logging: Access attempts logged
    """
    # Import sanitization function from data.py
    from app.api.routes.data import _sanitize_country_name
    
    try:
        # OWASP #1 - Injection Prevention: Sanitize and validate country name
        sanitized_country = _sanitize_country_name(country)
        data_loader = get_data_loader()

        # Country-specific fleet stats
        # Use sanitized country name
        country_data = data_loader.get_country_data(sanitized_country)
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

        # OWASP #10 - Logging: Log successful access
        security_logger.info(f"Private car defaults accessed: {sanitized_country}")
        
        return rows
    except HTTPException:
        # Re-raise HTTP exceptions (like validation errors)
        raise
    except Exception as exc:
        # OWASP #3 - Sensitive Data Exposure: Generic error message
        # OWASP #10 - Logging: Log errors
        security_logger.error(
            f"Error computing private car defaults for {country[:50]!r}: {type(exc).__name__}"
        )
        raise HTTPException(
            status_code=400, 
            detail="Failed to compute private car defaults. Please check the country name."
        )


@router.get("/shared-services", response_model=Dict[str, List[VariableRow]])
async def get_shared_services_variables():
    """
    Get shared services variables
    
    Returns:
        All shared services variables with defaults if none saved
    """
    # Default shared services variables from original Streamlit code (XIPE-main/pages/1_📊_Dashboard.py)
    # Note: Replacement percentages and trip distances are set dynamically from dashboard modal split,
    # so they remain 0.0 here and get updated during calculations
    default_shared_services = {
        "ice_car": [
            {"variable": "Average number of trips per day", "userInput": 0.0, "defaultValue": 5.00},
            {"variable": "Average Tank-to-Wheel CO2 emissions (g/km)", "userInput": 0.0, "defaultValue": 133.38},
            {"variable": "Average NOx emissions (mg/km)", "userInput": 0.0, "defaultValue": 60.00},
            {"variable": "Average PM emissions (mg/km)", "userInput": 0.0, "defaultValue": 4.50},
            {"variable": "Emission factor for life-cycle phases excluding use phase (gCO2/km)", "userInput": 0.0, "defaultValue": 55.00},
            {"variable": "Replaces private car by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT road by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT rail by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces cycling by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces walking by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing car (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT road (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT rail (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing cycling (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing walking (km)", "userInput": 0.0, "defaultValue": 0.0},
        ],
        "ice_moped": [
            {"variable": "Average number of trips per day", "userInput": 0.0, "defaultValue": 5.00},
            {"variable": "Average Tank-to-Wheel CO2 emissions (g/km)", "userInput": 0.0, "defaultValue": 37.00},
            {"variable": "Average NOx emissions (mg/km)", "userInput": 0.0, "defaultValue": 60.00},
            {"variable": "Average PM emissions (mg/km)", "userInput": 0.0, "defaultValue": 4.50},
            {"variable": "Emission factor for life-cycle phases excluding use phase (gCO2/km)", "userInput": 0.0, "defaultValue": 31.00},
            {"variable": "Replaces private car by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT road by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT rail by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces cycling by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces walking by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing car (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT road (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT rail (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing cycling (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing walking (km)", "userInput": 0.0, "defaultValue": 0.0},
        ],
        "bike": [
            {"variable": "Average number of trips per day", "userInput": 0.0, "defaultValue": 4.00},
            {"variable": "Emission factor for life-cycle phases excluding use phase (gCO2/km)", "userInput": 0.0, "defaultValue": 58.00},
            {"variable": "Replaces private car by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT road by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT rail by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces cycling by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces walking by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing car (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT road (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT rail (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing cycling (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing walking (km)", "userInput": 0.0, "defaultValue": 0.0},
        ],
        "e_car": [
            {"variable": "Average number of trips per day", "userInput": 0.0, "defaultValue": 5.00},
            {"variable": "Average efficiency of the electric vehicle (kWh/km)", "userInput": 0.0, "defaultValue": 0.17},
            {"variable": "Emission factor for life-cycle phases excluding use phase (gCO2/km)", "userInput": 0.0, "defaultValue": 81.00},
            {"variable": "Replaces private car by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT road by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT rail by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces cycling by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces walking by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing car (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT road (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT rail (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing cycling (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing walking (km)", "userInput": 0.0, "defaultValue": 0.0},
        ],
        "e_bike": [
            {"variable": "Average number of trips per day", "userInput": 0.0, "defaultValue": 4.00},
            {"variable": "Average efficiency of the electric vehicle (kWh/km)", "userInput": 0.0, "defaultValue": 0.0103},
            {"variable": "Emission factor for life-cycle phases excluding use phase (gCO2/km)", "userInput": 0.0, "defaultValue": 71.00},
            {"variable": "Replaces private car by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT road by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT rail by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces cycling by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces walking by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing car (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT road (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT rail (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing cycling (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing walking (km)", "userInput": 0.0, "defaultValue": 0.0},
        ],
        "e_moped": [
            {"variable": "Average number of trips per day", "userInput": 0.0, "defaultValue": 5.00},
            {"variable": "Average Tank-to-Wheel CO2 emissions (g/km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average NOx emissions (mg/km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average PM emissions (mg/km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average efficiency of the electric vehicle (kWh/km)", "userInput": 0.0, "defaultValue": 0.033},
            {"variable": "Emission factor for life-cycle phases excluding use phase (gCO2/km)", "userInput": 0.0, "defaultValue": 59.00},
            {"variable": "Replaces private car by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT road by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT rail by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces cycling by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces walking by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing car (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT road (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT rail (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing cycling (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing walking (km)", "userInput": 0.0, "defaultValue": 0.0},
        ],
        "e_scooter": [
            {"variable": "Average number of trips per day", "userInput": 0.0, "defaultValue": 5.00},
            {"variable": "Average efficiency of the electric vehicle (kWh/km)", "userInput": 0.0, "defaultValue": 0.016},
            {"variable": "Average NOx emissions (mg/km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average PM emissions (mg/km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Emission factor for life-cycle phases excluding use phase (gCO2/km)", "userInput": 0.0, "defaultValue": 100.00},
            {"variable": "Replaces private car by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT road by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT rail by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces cycling by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces walking by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing car (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT road (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT rail (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing cycling (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing walking (km)", "userInput": 0.0, "defaultValue": 0.0},
        ],
        "other": [
            {"variable": "Average number of trips per day", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average Tank-to-Wheel CO2 emissions (g/km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average NOx emissions (mg/km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average PM emissions (mg/km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Emission factor for life-cycle phases excluding use phase (gCO2/km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces private car by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT road by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT rail by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces cycling by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces walking by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing car (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT road (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT rail (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing cycling (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing walking (km)", "userInput": 0.0, "defaultValue": 0.0},
        ],
        "e_other": [
            {"variable": "Average number of trips per day", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average efficiency of the electric vehicle (kWh/km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Emission factor for life-cycle phases excluding use phase (gCO2/km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces private car by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT road by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces PT rail by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces cycling by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Replaces walking by (%)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing car (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT road (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing PT rail (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing cycling (km)", "userInput": 0.0, "defaultValue": 0.0},
            {"variable": "Average trip distance of the shared mode when replacing walking (km)", "userInput": 0.0, "defaultValue": 0.0},
        ],
    }
    
    return {
        k: [VariableRow(**v) for v in vars_list]
        for k, vars_list in default_shared_services.items()
    }
