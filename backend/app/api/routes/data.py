"""
API routes for data loading
Country data, constants, etc.

Security considerations:
- Input validation: Country names are validated against allowed list
- Error handling: Generic error messages to avoid information disclosure
- Logging: Security-relevant events are logged
"""
import logging
import re
from fastapi import APIRouter, HTTPException
from typing import List
from app.core.data_loader import get_data_loader
from app.api.models.schemas import CountryData, FuelDistribution

# Security logging setup
# Log security-relevant events (access attempts, errors, etc.)
security_logger = logging.getLogger("security")

router = APIRouter()


def _sanitize_country_name(country: str) -> str:
    """
    Sanitize and validate country name input
    
    OWASP #1 - Injection Prevention: Validate and sanitize user input
    Only allows alphanumeric characters, spaces, and common punctuation
    
    Args:
        country: Raw country name input
        
    Returns:
        Sanitized country name
        
    Raises:
        HTTPException: If country name contains invalid characters
    """
    # Remove leading/trailing whitespace
    sanitized = country.strip()
    
    # Validate: Only allow alphanumeric, spaces, hyphens, and apostrophes
    # This prevents injection attacks while allowing legitimate country names
    if not re.match(r"^[a-zA-Z0-9\s\-']+$", sanitized):
        security_logger.warning(f"Invalid country name format attempted: {country[:50]}")
        raise HTTPException(
            status_code=400, 
            detail="Invalid country name format"
        )
    
    return sanitized


@router.get("/countries", response_model=List[str])
async def get_countries():
    """
    Get list of available countries
    
    Returns:
        List of country names
    
    Security:
    - No user input required, safe to expose
    - Returns read-only data
    """
    try:
        data_loader = get_data_loader()
        countries = data_loader.get_country_list()
        
        # Log successful access (for monitoring)
        security_logger.info("Countries list accessed")
        
        return countries
    except ValueError as e:
        # OWASP #10 - Logging: Log data loading errors for debugging
        security_logger.error(f"Error loading countries - data not loaded: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Error loading countries. Data files may be missing or inaccessible."
        )
    except Exception as e:
        # OWASP #3 - Sensitive Data Exposure: Don't expose internal error details
        # OWASP #10 - Logging: Log full error details server-side for debugging
        security_logger.error(f"Error loading countries: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Error loading countries. Please try again later."
        )


@router.get("/country/{country}/data", response_model=CountryData)
async def get_country_data(country: str):
    """
    Get country-specific data (age, fuel distribution, electricity CO2)
    
    Args:
        country: Country name (validated and sanitized)
        
    Returns:
        Country data including average age, fuel distribution, and electricity CO2
        
    Security:
    - Input validation: Country name is sanitized and validated
    - Error handling: Generic error messages to prevent information disclosure
    - Logging: Access attempts and failures are logged
    """
    try:
        # OWASP #1 - Injection Prevention: Sanitize and validate input
        sanitized_country = _sanitize_country_name(country)
        
        data_loader = get_data_loader()
        country_data = data_loader.get_country_data(sanitized_country)
        
        # Log successful access
        security_logger.info(f"Country data accessed: {sanitized_country}")
        
        return CountryData(
            averageAge=country_data["averageAge"],
            fuelDistribution=FuelDistribution(**country_data["fuelDistribution"]),
            electricityCo2=country_data["electricityCo2"]
        )
    except ValueError as e:
        # OWASP #10 - Logging: Log access denial attempts
        security_logger.warning(f"Country not found: {country[:50]}")
        raise HTTPException(status_code=404, detail="Country not found")
    except HTTPException:
        # Re-raise HTTP exceptions (like validation errors)
        raise
    except Exception as e:
        # OWASP #3 - Sensitive Data Exposure: Generic error message
        # OWASP #10 - Logging: Log errors for monitoring
        security_logger.error(f"Error loading country data for '{country[:50]}': {type(e).__name__}")
        raise HTTPException(
            status_code=500, 
            detail="Error loading country data. Please try again later."
        )


@router.get("/country-constants/co2-emissions")
async def get_co2_emissions():
    """
    Get CO2 emissions per km from new passenger cars table
    
    Returns:
        CO2 emissions data as JSON
        
    Security:
    - Read-only endpoint, no user input
    - Returns public reference data
    """
    try:
        data_loader = get_data_loader()
        df = data_loader.car_co2
        
        # Convert to dictionary format
        # OWASP #8 - Insecure Deserialization: Using safe JSON serialization
        return {
            "columns": df.columns.tolist(),
            "data": df.to_dict(orient="records")
        }
    except Exception as e:
        # OWASP #3 - Sensitive Data Exposure: Generic error message
        security_logger.error(f"Error loading CO2 emissions data: {type(e).__name__}")
        raise HTTPException(
            status_code=500, 
            detail="Error loading CO2 emissions data. Please try again later."
        )


@router.get("/country-constants/electricity-intensity")
async def get_electricity_intensity():
    """
    Get GHG emission intensity of electricity production table
    
    Returns:
        Electricity intensity data as JSON
        
    Security:
    - Read-only endpoint, no user input
    - Returns public reference data
    """
    try:
        data_loader = get_data_loader()
        df = data_loader.elec_co2_country
        
        # Convert to dictionary format
        # OWASP #8 - Insecure Deserialization: Using safe JSON serialization
        return {
            "columns": df.columns.tolist(),
            "data": df.to_dict(orient="records")
        }
    except Exception as e:
        # OWASP #3 - Sensitive Data Exposure: Generic error message
        security_logger.error(f"Error loading electricity intensity data: {type(e).__name__}")
        raise HTTPException(
            status_code=500, 
            detail="Error loading electricity intensity data. Please try again later."
        )








