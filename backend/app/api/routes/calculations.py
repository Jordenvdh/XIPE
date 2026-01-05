"""
API routes for emissions calculations

Security considerations:
- Input validation: All inputs validated via Pydantic schemas
- Error handling: Generic error messages to avoid information disclosure
- Logging: Security-relevant events (calculations, errors) are logged
- Rate limiting: Consider adding rate limiting for production
"""
import logging
from fastapi import APIRouter, HTTPException
from app.api.models.schemas import CalculationRequest, CalculationResponse
from app.core.calculations import calculate_emissions

# Security logging setup
# Log security-relevant events (calculations, errors, etc.)
security_logger = logging.getLogger("security")

router = APIRouter()


@router.post("/emissions", response_model=CalculationResponse)
async def calculate_emissions_endpoint(request: CalculationRequest):
    """
    Calculate emissions based on input data
    
    Args:
        request: Calculation request with all input data (validated via Pydantic)
        
    Returns:
        Calculation results with per-mode and total emissions
        
    Security:
    - OWASP #1 - Injection Prevention: Input validated via Pydantic schemas
    - OWASP #3 - Sensitive Data Exposure: Generic error messages
    - OWASP #10 - Logging: Calculation requests and errors are logged
    - Input validation: All numeric values validated (ranges, types)
    """
    # OWASP #10 - Logging: Log calculation requests for monitoring
    security_logger.info(
        f"Calculation request received: country={request.country}, "
        f"inhabitants={request.inhabitants}"
    )
    
    try:
        # Convert request to calculation function format
        modal_split_dict = {
            "ms_pcar": request.modalSplit.privateCar.split,
            "dist_pcar": request.modalSplit.privateCar.distance,
            "ms_road": request.modalSplit.publicTransport.road.split,
            "dist_road": request.modalSplit.publicTransport.road.distance,
            "ms_rail": request.modalSplit.publicTransport.rail.split,
            "dist_rail": request.modalSplit.publicTransport.rail.distance,
            "ms_cyc": request.modalSplit.activeModes.cycling.split,
            "dist_cyc": request.modalSplit.activeModes.cycling.distance,
            "ms_walk": request.modalSplit.activeModes.walking.split,
            "dist_walk": request.modalSplit.activeModes.walking.distance,
        }
        
        # Convert shared modes
        shared_modes_list = [
            {
                "mode": mode.mode,
                "numVehicles": mode.numVehicles,
                "percentageElectric": mode.percentageElectric
            }
            for mode in request.sharedModes
        ]
        
        # Convert variables
        # Map frontend camelCase keys to backend snake_case keys
        trad_modes_mapping = {
            "privateCar": "private_car",
            "ptRoad": "pt_road",
            "ptRail": "pt_rail",
            "activeTransport": None  # Will be split into cycling and walking
        }
        
        # Default traditional modes variables (from original Streamlit code)
        default_trad_modes = {
            "private_car": [
                {"variable": "CO2 emission factors Tank-to-Wheel (gr/km)", "userInput": 0.0, "defaultValue": 118.6},
                {"variable": "Average NOx emissions (mg/km)", "userInput": 0.0, "defaultValue": 69.0},
                {"variable": "Average PM emissions (mg/km)", "userInput": 0.0, "defaultValue": 4.5},
                {"variable": "Emission factor for life-cycle phases excluding use phase (gCO2/km)", "userInput": 0.0, "defaultValue": 55.0},
            ],
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
        
        # Convert traditional modes variables
        traditional_modes_dict = {}
        
        # If traditionalModes is empty, use defaults
        if not request.variables.traditionalModes or len(request.variables.traditionalModes) == 0:
            traditional_modes_dict = default_trad_modes.copy()
        else:
            # Process provided variables
            for frontend_key, vars_list in request.variables.traditionalModes.items():
                # Skip empty arrays
                if not vars_list or len(vars_list) == 0:
                    continue
                    
                backend_key = trad_modes_mapping.get(frontend_key)
                if backend_key is None:
                    # Handle activeTransport - split into cycling and walking
                    if frontend_key == "activeTransport":
                        # Split activeTransport into cycling (first row) and walking (second row)
                        vars_data = [v.dict() for v in vars_list]
                        if len(vars_data) >= 2:
                            # First variable is cycling, second is walking
                            traditional_modes_dict["cycling"] = [vars_data[0]]
                            traditional_modes_dict["walking"] = [vars_data[1]]
                        elif len(vars_data) == 1:
                            # Only one variable, use for both (fallback)
                            traditional_modes_dict["cycling"] = [vars_data[0]]
                            traditional_modes_dict["walking"] = [vars_data[0]]
                    else:
                        # Unknown key, skip or use as-is
                        continue
                else:
                    traditional_modes_dict[backend_key] = [v.dict() for v in vars_list]
            
            # Fill in any missing modes with defaults, or if mode exists but is empty
            for mode_key in ["private_car", "pt_road", "pt_rail", "cycling", "walking"]:
                if mode_key not in traditional_modes_dict or len(traditional_modes_dict.get(mode_key, [])) == 0:
                    traditional_modes_dict[mode_key] = default_trad_modes[mode_key]
        
        # Default shared services variables (all zeros from original code)
        # These are needed even if no shared modes are configured
        default_shared_services = {
            "var_nms_ICEcar": [
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
            "var_nms_ICEmoped": [
                {"variable": "Average number of trips per day", "userInput": 0.0, "defaultValue": 0.0},
                {"variable": "Average Tank-to-Wheel CO2 emissions (g/km)", "userInput": 0.0, "defaultValue": 0.0},
                {"variable": "Average NOx emissions (mg/km)", "userInput": 0.0, "defaultValue": 0.0},
                {"variable": "Average PM emissions (mg/km)", "userInput": 0.0, "defaultValue": 0.0},
                {"variable": "Emission factor for life-cycle phases excluding use phase (gCO2/km)", "userInput": 0.0, "defaultValue": 0.001},
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
            "var_nms_bike": [
                {"variable": "Average number of trips per day", "userInput": 0.0, "defaultValue": 0.0},
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
            "var_nms_ev": [
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
            "var_nms_ebike": [
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
            "var_nms_emoped": [
                {"variable": "Average number of trips per day", "userInput": 0.0, "defaultValue": 0.1},
                {"variable": "Average Tank-to-Wheel CO2 emissions (g/km)", "userInput": 0.0, "defaultValue": 0.0},
                {"variable": "Average NOx emissions (mg/km)", "userInput": 0.0, "defaultValue": 0.1},
                {"variable": "Average PM emissions (mg/km)", "userInput": 0.0, "defaultValue": 0.1},
                {"variable": "Average efficiency of the electric vehicle (kWh/km)", "userInput": 0.0, "defaultValue": 0.1},
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
            "var_nms_escooter": [
                {"variable": "Average number of trips per day", "userInput": 0.0, "defaultValue": 0.2},
                {"variable": "Average efficiency of the electric vehicle (kWh/km)", "userInput": 0.0, "defaultValue": 0.2},
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
            "var_nms_other": [
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
            "var_nms_eother": [
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
        
        # Map frontend shared service keys (used on the Variables → Shared Modes page)
        # to the internal var_nms_* keys expected by the calculation engine.
        shared_services_key_map = {
            "ice_car": "var_nms_ICEcar",
            "ice_moped": "var_nms_ICEmoped",
            "bike": "var_nms_bike",
            "e_car": "var_nms_ev",
            "e_bike": "var_nms_ebike",
            "e_moped": "var_nms_emoped",
            "e_scooter": "var_nms_escooter",
            "other": "var_nms_other",
            "e_other": "var_nms_eother",
        }

        # Process shared services
        shared_services_dict: Dict[str, list] = {}
        if not request.variables.sharedServices or len(request.variables.sharedServices) == 0:
            # Use defaults for all shared service types
            shared_services_dict = default_shared_services.copy()
        else:
            # Use provided values (mapped to var_nms_* keys), and fill in missing ones with defaults
            for frontend_key, vars_list in request.variables.sharedServices.items():
                backend_key = shared_services_key_map.get(frontend_key, frontend_key)
                shared_services_dict[backend_key] = [v.dict() for v in vars_list]
            
            # Fill in any missing shared service types with defaults
            for service_key, default_rows in default_shared_services.items():
                if service_key not in shared_services_dict:
                    shared_services_dict[service_key] = default_rows
        
        variables_dict = {
            "general": [v.dict() for v in request.variables.general],
            "traditionalModes": traditional_modes_dict,
            "sharedServices": shared_services_dict
        }
        
        # Perform calculation
        # OWASP #1 - Injection Prevention: All inputs validated before calculation
        results = calculate_emissions(
            country=request.country,
            inhabitants=request.inhabitants,
            modal_split=modal_split_dict,
            shared_modes=shared_modes_list,
            variables=variables_dict
        )
        
        # Format response
        # OWASP #10 - Logging: Log successful calculations
        security_logger.info(
            f"Calculation completed successfully: country={request.country}"
        )
        
        return CalculationResponse(**results)
        
    except ValueError as e:
        # OWASP #3 - Sensitive Data Exposure: Don't expose full error details
        # OWASP #10 - Logging: Log validation errors
        security_logger.warning(
            f"Calculation validation error: country={request.country}, "
            f"error={str(e)[:100]}"
        )
        raise HTTPException(
            status_code=400, 
            detail="Invalid input data. Please check your input values."
        )
    except Exception as e:
        # OWASP #3 - Sensitive Data Exposure: Generic error message
        # OWASP #10 - Logging: Log errors with limited detail
        import traceback
        error_traceback = traceback.format_exc()
        # Log full error internally for debugging
        security_logger.error(
            f"Calculation error: country={request.country}, "
            f"error_type={type(e).__name__}, "
            f"error_message={str(e)[:200]}, "
            f"traceback={error_traceback[:500]}"
        )
        # Return generic error to client (but include error type for debugging in development)
        error_detail = f"An error occurred during calculation: {type(e).__name__}"
        raise HTTPException(
            status_code=500, 
            detail=error_detail
        )

