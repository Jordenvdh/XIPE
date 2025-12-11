# XIPE Backend API

FastAPI backend for the XIPE (Cross Impact Performance Emissions) model calculations.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Ensure CSV data files are in `app/data/`:
   - `co2_emissions_new_cars_EU.csv`
   - `acea_vehicle_data.csv`
   - `air_emission_limits.csv`

4. Run the server:
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

API documentation (Swagger UI) available at `http://localhost:8000/docs`

## API Endpoints

### Data Endpoints
- `GET /api/countries` - Get list of countries
- `GET /api/country/{country}/data` - Get country-specific data
- `GET /api/country-constants/co2-emissions` - Get CO2 emissions table
- `GET /api/country-constants/electricity-intensity` - Get electricity intensity table

### Variables Endpoints
- `GET /api/variables/general` - Get general variables
- `POST /api/variables/general` - Save general variables
- `GET /api/variables/traditional-modes` - Get traditional modes variables
- `POST /api/variables/traditional-modes/{mode}` - Save traditional mode variables
- `GET /api/variables/shared-services` - Get shared services variables
- `POST /api/variables/shared-services/{service}` - Save shared service variables

### Calculation Endpoints
- `POST /api/calculations/emissions` - Calculate emissions

## Environment Variables

Create a `.env` file in the backend directory:

```
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Development

The backend uses FastAPI with automatic API documentation. Visit `/docs` for interactive API testing.

