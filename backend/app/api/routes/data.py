"""
API routes for data loading
Country data, constants, etc.
"""
from fastapi import APIRouter, HTTPException
from typing import List
from app.core.data_loader import get_data_loader
from app.api.models.schemas import CountryData, FuelDistribution

router = APIRouter()


@router.get("/countries", response_model=List[str])
async def get_countries():
    """
    Get list of available countries
    
    Returns:
        List of country names
    """
    try:
        data_loader = get_data_loader()
        return data_loader.get_country_list()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading countries: {str(e)}")


@router.get("/country/{country}/data", response_model=CountryData)
async def get_country_data(country: str):
    """
    Get country-specific data (age, fuel distribution, electricity CO2)
    
    Args:
        country: Country name
        
    Returns:
        Country data including average age, fuel distribution, and electricity CO2
    """
    try:
        data_loader = get_data_loader()
        country_data = data_loader.get_country_data(country)
        
        return CountryData(
            averageAge=country_data["averageAge"],
            fuelDistribution=FuelDistribution(**country_data["fuelDistribution"]),
            electricityCo2=country_data["electricityCo2"]
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading country data: {str(e)}")


@router.get("/country-constants/co2-emissions")
async def get_co2_emissions():
    """
    Get CO2 emissions per km from new passenger cars table
    
    Returns:
        CO2 emissions data as JSON
    """
    try:
        data_loader = get_data_loader()
        df = data_loader.car_co2
        
        # Convert to dictionary format
        return {
            "columns": df.columns.tolist(),
            "data": df.to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading CO2 emissions data: {str(e)}")


@router.get("/country-constants/electricity-intensity")
async def get_electricity_intensity():
    """
    Get GHG emission intensity of electricity production table
    
    Returns:
        Electricity intensity data as JSON
    """
    try:
        data_loader = get_data_loader()
        df = data_loader.elec_co2_country
        
        # Convert to dictionary format
        return {
            "columns": df.columns.tolist(),
            "data": df.to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading electricity intensity data: {str(e)}")

