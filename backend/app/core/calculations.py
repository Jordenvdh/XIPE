"""
Emission calculation engine
Ports calculation logic from 4Calculations.py
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Any
from app.core.data_loader import get_data_loader


# Constants for traditional mode types
TRAD_TYPES = ["private_car", "pt_road", "pt_rail", "cycling", "walking"]

# Constants for shared mode types (NMS types)
NMS_TYPES = ["Car", "Bike", "Moped", "e-Scooter", "Other"]


def calculate_emissions(
    country: str,
    inhabitants: int,
    modal_split: Dict[str, Any],
    shared_modes: List[Dict[str, Any]],
    variables: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Main calculation function for emissions
    
    Args:
        country: Country name
        inhabitants: Number of inhabitants
        modal_split: Modal split data
        shared_modes: List of shared mobility services
        variables: All variable tables (general, traditional modes, shared services)
        
    Returns:
        Dictionary with calculation results
    """
    # Get data loader
    data_loader = get_data_loader()
    
    # Get country-specific data
    country_data = data_loader.get_country_data(country)
    car_age = country_data["averageAge"]
    fuel_dist = country_data["fuelDistribution"]
    
    # Calculate car year from age
    car_year = round(2024 - car_age, 0)
    
    # Prepare variable dataframes
    df_var_nms = _prepare_nms_variables(shared_modes, variables["sharedServices"], modal_split)
    df_var_trad = _prepare_trad_variables(variables["traditionalModes"])
    df_var_gen = _prepare_general_variables(variables["general"], country_data, car_age, fuel_dist)
    
    # Update default values based on country and modal split
    _update_defaults_from_dashboard(
        df_var_nms, df_var_trad, df_var_gen, country, car_year, fuel_dist, modal_split
    )
    
    # Perform calculations
    results = _perform_calculations(
        df_var_nms, df_var_trad, df_var_gen, inhabitants
    )
    
    return results


def _prepare_nms_variables(
    shared_modes: List[Dict[str, Any]],
    shared_services_vars: Dict[str, Any],
    modal_split: Dict[str, Any]
) -> pd.DataFrame:
    """
    Prepare New Mobility Services (NMS) variables dataframe
    
    Combines all shared service variables into one dataframe
    Updates defaults with modal split values before processing
    """
    """
    Prepare New Mobility Services (NMS) variables dataframe
    
    Combines all shared service variables into one dataframe
    """
    # Variable names list (from introduction.py)
    lst_var_nms = [
        "Average number of trips per day",
        "Average Tank-to-Wheel CO2 emissions (g/km)",
        "Average NOx emissions (mg/km)",
        "Average PM emissions (mg/km)",
        "Average efficiency of the electric vehicle (kWh/km)",
        "Emission factor for life-cycle phases excluding use phase (gCO2/km)",
        "Replaces private car by (%)",
        "Replaces PT road by (%)",
        "Replaces PT rail by (%)",
        "Replaces cycling by (%)",
        "Replaces walking by (%)",
        "Average trip distance of the shared mode when replacing car (km)",
        "Average trip distance of the shared mode when replacing PT road (km)",
        "Average trip distance of the shared mode when replacing PT rail (km)",
        "Average trip distance of the shared mode when replacing cycling (km)",
        "Average trip distance of the shared mode when replacing walking (km)"
    ]
    
    # Create template dataframe
    df_template = pd.DataFrame({"variable": lst_var_nms})
    
    # Map shared modes to variable names
    nms_var_map = {
        "Car": "ICEcar",
        "Bike": "bike",
        "Moped": "ICEmoped",
        "e-Scooter": "escooter",
        "Other": "other"
    }
    
    # Calculate number of vehicles for each type
    numbers_nms = {}
    for mode in shared_modes:
        mode_name = mode["mode"]
        # Ensure numeric types
        num_veh = float(mode["numVehicles"]) if mode["numVehicles"] is not None else 0.0
        perc_ev = float(mode["percentageElectric"]) if mode["percentageElectric"] is not None else 0.0
        
        # ICE versions
        if mode_name == "Car":
            numbers_nms["ICEcar"] = num_veh * ((100 - perc_ev) / 100)
            numbers_nms["ecar"] = num_veh * (perc_ev / 100)
        elif mode_name == "Bike":
            numbers_nms["bike"] = num_veh * ((100 - perc_ev) / 100)
            numbers_nms["ebike"] = num_veh * (perc_ev / 100)
        elif mode_name == "Moped":
            numbers_nms["ICEmoped"] = num_veh * ((100 - perc_ev) / 100)
            numbers_nms["emoped"] = num_veh * (perc_ev / 100)
        elif mode_name == "e-Scooter":
            numbers_nms["escooter"] = num_veh  # Always electric
        elif mode_name == "Other":
            numbers_nms["other"] = num_veh * ((100 - perc_ev) / 100)
            numbers_nms["eother"] = num_veh * (perc_ev / 100)
    
    # Combine all NMS variable dataframes
    # Map from var_nms_* keys to mode names (matching original Streamlit code)
    nms_key_mapping = {
        "var_nms_ICEcar": "ICEcar",
        "var_nms_ICEmoped": "ICEmoped",
        "var_nms_bike": "bike",
        "var_nms_ev": "ecar",  # ev maps to ecar
        "var_nms_ebike": "ebike",
        "var_nms_emoped": "emoped",
        "var_nms_escooter": "escooter",
        "var_nms_other": "other",
        "var_nms_eother": "eother",
    }
    
    var_nms_all = {}
    for var_name, var_data in shared_services_vars.items():
        # Map the key to the correct mode name
        mode_key = nms_key_mapping.get(var_name, var_name.replace("var_nms_", ""))
        var_nms_all[mode_key] = pd.DataFrame(var_data)
    
    # Debug: Check what modes we have
    print(f"DEBUG: var_nms_all keys: {list(var_nms_all.keys())}")
    print(f"DEBUG: shared_services_vars keys: {list(shared_services_vars.keys())}")
    
    # Update defaults with modal split values (matching original Dashboard logic)
    # Extract modal split values
    ms_pcar = modal_split.get("ms_pcar", 0.0)
    ms_road = modal_split.get("ms_road", 0.0)
    ms_rail = modal_split.get("ms_rail", 0.0)
    ms_cyc = modal_split.get("ms_cyc", 0.0)
    ms_walk = modal_split.get("ms_walk", 0.0)
    dist_pcar = modal_split.get("dist_pcar", 0.0)
    dist_road = modal_split.get("dist_road", 0.0)
    dist_rail = modal_split.get("dist_rail", 0.0)
    dist_cyc = modal_split.get("dist_cyc", 0.0)
    dist_walk = modal_split.get("dist_walk", 0.0)
    
    # Define default inputs for each mode (matching original Dashboard.py lines 216-227)
    default_inputs_map = {
        "ICEcar": [5.00, 133.38, 60.00, 4.50, 55.00, ms_pcar, ms_road, ms_rail, ms_cyc, ms_walk, dist_pcar, dist_road, dist_rail, dist_cyc, dist_walk],
        "ICEmoped": [5.00, 37.00, 60.00, 4.50, 31.00, ms_pcar, ms_road, ms_rail, ms_cyc, ms_walk, dist_pcar, dist_road, dist_rail, dist_cyc, dist_walk],
        "bike": [4.00, 58.00, ms_pcar, ms_road, ms_rail, ms_cyc, ms_walk, dist_cyc, dist_cyc, dist_cyc, dist_cyc, dist_walk],
        "ecar": [5.00, 0.17, 81.00, ms_pcar, ms_road, ms_rail, ms_cyc, ms_walk, dist_pcar, dist_road, dist_rail, dist_cyc, dist_walk],
        "ebike": [4.00, 0.0103, 71.00, ms_pcar, ms_road, ms_rail, ms_cyc, ms_walk, dist_cyc*1.5, dist_cyc*1.5, dist_cyc*1.5, dist_cyc, dist_walk],
        "emoped": [5.00, 0.033, 59.00, ms_pcar, ms_road, ms_rail, ms_cyc, ms_walk, dist_pcar, dist_road, dist_rail, dist_cyc, dist_walk],
        "escooter": [5.00, 0.016, 100.00, ms_pcar, ms_road, ms_rail, ms_cyc, ms_walk, dist_cyc, dist_cyc, dist_cyc, dist_cyc, dist_walk],
        "other": [0.0, 0.0, 0.0, 0.0, 0.0, ms_pcar, ms_road, ms_rail, ms_cyc, ms_walk, dist_pcar, dist_road, dist_rail, dist_cyc, dist_walk],
        "eother": [0.0, 0.0, 0.0, ms_pcar, ms_road, ms_rail, ms_cyc, ms_walk, dist_pcar, dist_road, dist_rail, dist_cyc, dist_walk]
    }
    
    # Process each dataframe
    var_nms_inputs = {}
    for name, df in var_nms_all.items():
        df_new = df.copy()
        df_new["variable"] = df_new["variable"].str.strip()
        
        # Update defaults with modal split values if defaults exist for this mode
        if name in default_inputs_map:
            default_values = default_inputs_map[name]
            
            # Special handling for escooter: it has a different variable structure
            # escooter uses lst_var_nms[:1] + lst_var_nms[4:] (skips indices 1-3: CO2 TTW, NOx, PM)
            if name == "escooter":
                # Map defaults to escooter's variable structure
                # default_values: [5.00, 0.016, 100.00, ms_pcar, ms_road, ms_rail, ms_cyc, ms_walk, dist_cyc, dist_cyc, dist_cyc, dist_cyc, dist_walk]
                # escooter variables: [trips/day, efficiency, LCA, replaces_car%, replaces_road%, replaces_rail%, replaces_cyc%, replaces_walk%, dist_car, dist_road, dist_rail, dist_cyc, dist_walk]
                # Map by matching variable names to lst_var_nms indices
                var_to_lst_idx_map = {}  # Map variable name to lst_var_nms index
                for idx, var_name in enumerate(lst_var_nms):
                    var_to_lst_idx_map[var_name] = idx
                
                # For escooter, map defaults based on variable name
                for idx, row in df_new.iterrows():
                    var_name = row["variable"]
                    lst_idx = var_to_lst_idx_map.get(var_name, -1)
                    
                    if lst_idx == 0:  # "Average number of trips per day"
                        df_new.at[idx, "defaultValue"] = default_values[0]  # 5.00
                    elif lst_idx == 4:  # "Average efficiency of the electric vehicle (kWh/km)"
                        df_new.at[idx, "defaultValue"] = default_values[1]  # 0.016
                    elif lst_idx == 5:  # "Emission factor for life-cycle phases excluding use phase (gCO2/km)"
                        df_new.at[idx, "defaultValue"] = default_values[2]  # 100.00
                    elif lst_idx == 6:  # "Replaces private car by (%)"
                        df_new.at[idx, "defaultValue"] = default_values[3]  # ms_pcar
                    elif lst_idx == 7:  # "Replaces PT road by (%)"
                        df_new.at[idx, "defaultValue"] = default_values[4]  # ms_road
                    elif lst_idx == 8:  # "Replaces PT rail by (%)"
                        df_new.at[idx, "defaultValue"] = default_values[5]  # ms_rail
                    elif lst_idx == 9:  # "Replaces cycling by (%)"
                        df_new.at[idx, "defaultValue"] = default_values[6]  # ms_cyc
                    elif lst_idx == 10:  # "Replaces walking by (%)"
                        df_new.at[idx, "defaultValue"] = default_values[7]  # ms_walk
                    elif lst_idx == 11:  # "Average trip distance when replacing car (km)"
                        df_new.at[idx, "defaultValue"] = default_values[8]  # dist_cyc
                    elif lst_idx == 12:  # "Average trip distance when replacing PT road (km)"
                        df_new.at[idx, "defaultValue"] = default_values[9]  # dist_cyc
                    elif lst_idx == 13:  # "Average trip distance when replacing PT rail (km)"
                        df_new.at[idx, "defaultValue"] = default_values[10]  # dist_cyc
                    elif lst_idx == 14:  # "Average trip distance when replacing cycling (km)"
                        df_new.at[idx, "defaultValue"] = default_values[11]  # dist_cyc
                    elif lst_idx == 15:  # "Average trip distance when replacing walking (km)"
                        df_new.at[idx, "defaultValue"] = default_values[12]  # dist_walk
            else:
                # For other modes, match defaults to variables by position
                for idx, default_val in enumerate(default_values):
                    if idx < len(df_new):
                        df_new.at[idx, "defaultValue"] = default_val
        
        # Use defaults if user input is zero
        if df_new["userInput"].sum() == 0:
            df_new["userInput"] = df_new["defaultValue"]
        
        df_new = df_new.drop(columns=["defaultValue"])
        df_new = df_new.rename(columns={"userInput": name})
        
        # Merge with template
        df_merged = df_template.merge(df_new, on="variable", how="left")
        var_nms_inputs[name] = df_merged
    
    # Combine all dataframes
    df_var_nms = df_template.copy()
    for df in var_nms_inputs.values():
        # Remove duplicate columns from df before merging to prevent "duplicate labels" error
        df = df.loc[:, ~df.columns.duplicated()]
        df_var_nms = df_var_nms.merge(df, on="variable", how="left", suffixes=('', '_dup'))
        # Remove any duplicate columns created by merge (those ending with '_dup')
        df_var_nms = df_var_nms.loc[:, ~df_var_nms.columns.str.endswith('_dup')]
    
    # Debug: Check if we have any data columns
    data_cols = [col for col in df_var_nms.columns if col != "variable"]
    print(f"DEBUG: df_var_nms columns after merge: {data_cols}")
    if len(data_cols) == 0:
        print("WARNING: No data columns found in df_var_nms after merge!")
        print(f"DEBUG: var_nms_inputs keys: {list(var_nms_inputs.keys())}")
        print(f"DEBUG: var_nms_all keys: {list(var_nms_all.keys())}")
    
    # Add number of vehicles row
    # Ensure all expected columns exist (even if they have 0 vehicles)
    expected_columns = ["ICEcar", "ICEmoped", "bike", "ecar", "ebike", "emoped", "escooter", "other", "eother"]
    
    # Ensure all values in numbers_nms are numeric
    numbers_nms_clean = {}
    for key, value in numbers_nms.items():
        numbers_nms_clean[key] = float(value) if value is not None else 0.0
    
    # Add missing columns with 0.0
    for col in expected_columns:
        if col not in numbers_nms_clean:
            numbers_nms_clean[col] = 0.0
    
    numbers_nms_clean["variable"] = "Number of vehicles"
    df_numbers_nms = pd.DataFrame([numbers_nms_clean])
    
    # Ensure df_var_nms has all expected columns (add missing ones with NaN/0)
    for col in expected_columns:
        if col not in df_var_nms.columns:
            df_var_nms[col] = 0.0
    
    # Debug: Check numbers_nms before adding
    print(f"DEBUG: numbers_nms_clean keys: {list(numbers_nms_clean.keys())}")
    print(f"DEBUG: numbers_nms_clean values: {numbers_nms_clean}")
    print(f"DEBUG: df_var_nms columns before concat: {list(df_var_nms.columns)}")
    
    # Check for duplicate columns before concat
    if df_var_nms.columns.duplicated().any():
        df_var_nms = df_var_nms.loc[:, ~df_var_nms.columns.duplicated()]
    if df_numbers_nms.columns.duplicated().any():
        df_numbers_nms = df_numbers_nms.loc[:, ~df_numbers_nms.columns.duplicated()]
    
    df_var_nms = pd.concat([df_numbers_nms, df_var_nms], ignore_index=True)
    
    # Check for duplicate columns after concat and remove them
    if df_var_nms.columns.duplicated().any():
        df_var_nms = df_var_nms.loc[:, ~df_var_nms.columns.duplicated()]
    
    # Debug: Check after concat
    print(f"DEBUG: df_var_nms shape after concat: {df_var_nms.shape}")
    print(f"DEBUG: df_var_nms row 0 (vehicles): {df_var_nms.iloc[0].to_dict()}")
    
    # Convert all numeric columns to numeric type (excluding 'variable' column)
    numeric_cols = [col for col in df_var_nms.columns if col != "variable"]
    for col in numeric_cols:
        df_var_nms[col] = pd.to_numeric(df_var_nms[col], errors='coerce').fillna(0)
    
    return df_var_nms


def _prepare_trad_variables(trad_vars: Dict[str, Any]) -> pd.DataFrame:
    """
    Prepare Traditional Modes variables dataframe
    """
    # Variable names list
    lst_var_trad = [
        "CO2 emission factors Tank-to-Wheel (gr/km)",
        "Average NOx emissions (mg/km)",
        "Average PM emissions (mg/km)",
        "Average efficiency of public transport rail (kWh/km)",
        "Emission factor for life-cycle phases excluding use phase (gCO2/km)"
    ]
    
    # Create template
    df_template = pd.DataFrame({"variable": lst_var_trad})
    
    # Process each traditional mode
    var_trad_all = {}
    for mode_type in TRAD_TYPES:
        if mode_type in trad_vars:
            var_trad_all[mode_type] = pd.DataFrame(trad_vars[mode_type])
    
    # Process dataframes
    var_trad_inputs = {}
    for name, df in var_trad_all.items():
        df_new = df.copy()
        df_new["variable"] = df_new["variable"].str.strip()
        df_new["userInput"] = np.where(
            df_new["userInput"] == 0, df_new["defaultValue"], df_new["userInput"]
        )
        df_new = df_new.drop(columns=["defaultValue"])
        df_new = df_new.rename(columns={"userInput": name})
        
        # For cycling and walking, they only have the LCA emission factor variable
        # So we need to ensure the merge works correctly even if df_new has fewer rows
        df_merged = df_template.merge(df_new, on="variable", how="left")
        var_trad_inputs[name] = df_merged
    
    # Combine
    df_var_trad = df_template.copy()
    for name, df in var_trad_inputs.items():
        if df is None or len(df) == 0:
            continue
        # Remove duplicate columns from df before merging to prevent "duplicate labels" error
        df = df.loc[:, ~df.columns.duplicated()]
        df_var_trad = df_var_trad.merge(df, on="variable", how="left", suffixes=('', '_dup'))
        # Remove any duplicate columns created by merge (those ending with '_dup')
        df_var_trad = df_var_trad.loc[:, ~df_var_trad.columns.str.endswith('_dup')]
    
    # Debug: Check if we have columns
    if len(df_var_trad.columns) <= 1:
        raise ValueError(
            f"df_var_trad has only {len(df_var_trad.columns)} column(s) after merging. "
            f"Expected at least 5 columns (variable + 4 mode columns). "
            f"var_trad_all keys: {list(var_trad_all.keys())}, "
            f"var_trad_inputs keys: {list(var_trad_inputs.keys())}, "
            f"TRAD_TYPES: {TRAD_TYPES}, "
            f"trad_vars keys: {list(trad_vars.keys())}"
        )
    
    # Ensure we still have all 5 rows after merging
    if len(df_var_trad) != 5:
        raise ValueError(
            f"df_var_trad should have 5 rows but has {len(df_var_trad)}. "
            f"Template had {len(df_template)} rows. "
            f"var_trad_inputs keys: {list(var_trad_inputs.keys())}"
        )
    
    # Convert all numeric columns to numeric type (excluding 'variable' column)
    numeric_cols = [col for col in df_var_trad.columns if col != "variable"]
    for col in numeric_cols:
        df_var_trad[col] = pd.to_numeric(df_var_trad[col], errors='coerce').fillna(0)
    
    return df_var_trad


def _prepare_general_variables(
    general_vars: List[Dict[str, Any]],
    country_data: Dict[str, Any],
    car_age: float,
    fuel_dist: Dict[str, float]
) -> pd.DataFrame:
    """
    Prepare general variables dataframe
    """
    df_var_gen = pd.DataFrame(general_vars)
    df_var_gen["variable"] = df_var_gen["variable"].str.strip()
    
    # Use defaults if user input is zero
    df_var_gen["userInput"] = np.where(
        df_var_gen["userInput"] == 0, df_var_gen["defaultValue"], df_var_gen["userInput"]
    )
    
    # Update defaults based on country
    df_var_gen.at[0, "defaultValue"] = country_data["electricityCo2"]
    df_var_gen.at[2, "defaultValue"] = car_age
    df_var_gen.at[3, "defaultValue"] = fuel_dist["petrol"]
    df_var_gen.at[4, "defaultValue"] = fuel_dist["diesel"]
    df_var_gen.at[5, "defaultValue"] = fuel_dist["ev"]
    
    df_var_gen = df_var_gen.drop(columns=["defaultValue"])
    df_var_gen = df_var_gen.rename(columns={"userInput": "general"})
    
    # Convert numeric column to numeric type
    df_var_gen["general"] = pd.to_numeric(df_var_gen["general"], errors='coerce').fillna(0)
    
    return df_var_gen


def _update_defaults_from_dashboard(
    df_var_nms: pd.DataFrame,
    df_var_trad: pd.DataFrame,
    df_var_gen: pd.DataFrame,
    country: str,
    car_year: float,
    fuel_dist: Dict[str, float],
    modal_split: Dict[str, Any]
):
    """
    Update default values based on dashboard inputs
    """
    data_loader = get_data_loader()
    year_list = data_loader.get_year_list()
    
    # Update private car CO2 emission factor
    max_year = year_list.max()
    year_index = int(max_year - car_year)
    
    default_co2_car = data_loader.car_co2.loc[year_index, country]
    
    # Apply NEDC/WLTP correction factors
    if car_year <= 2020:
        default_co2_car = default_co2_car * 1.4  # NEDC underestimation
    else:
        default_co2_car = default_co2_car * 1.14  # WLTP underestimation
    
    # Update NOx and PM based on fuel distribution
    petrol_nox = data_loader.air_emission.loc[year_index, "petrol_nox"]
    diesel_nox = data_loader.air_emission.loc[year_index, "diesel_nox"]
    petrol_pm = data_loader.air_emission.loc[year_index, "petrol_pm"]
    diesel_pm = data_loader.air_emission.loc[year_index, "diesel_pm"]
    
    default_nox_car = (fuel_dist["petrol"] / 100 * petrol_nox + 
                      fuel_dist["diesel"] / 100 * diesel_nox) * 1000
    default_pm_car = (fuel_dist["petrol"] / 100 * petrol_pm + 
                     fuel_dist["diesel"] / 100 * diesel_pm) * 1000
    
    # Update traditional modes dataframe
    if "private_car" in df_var_trad.columns:
        df_var_trad.at[0, "private_car"] = default_co2_car
        df_var_trad.at[1, "private_car"] = default_nox_car
        df_var_trad.at[2, "private_car"] = default_pm_car


def _perform_calculations(
    df_var_nms: pd.DataFrame,
    df_var_trad: pd.DataFrame,
    df_var_gen: pd.DataFrame,
    inhabitants: int
) -> Dict[str, Any]:
    """
    Perform all emission calculations
    
    This is the core calculation logic ported from 4Calculations.py
    """
    # Define expected columns early
    expected_columns = ["ICEcar", "ICEmoped", "bike", "ecar", "ebike", "emoped", "escooter", "other", "eother"]
    
    # Get data columns for df_var_nms (to avoid reindexing issues with [1:])
    data_cols_nms = [col for col in df_var_nms.columns if col != "variable"]
    
    # Create calculation dataframe
    column_names = df_var_nms.columns.tolist()
    # Check for duplicate column names and handle them
    if len(column_names) != len(set(column_names)):
        # Remove duplicates while preserving order
        seen = set()
        unique_columns = []
        for col in column_names:
            if col not in seen:
                unique_columns.append(col)
                seen.add(col)
        column_names = unique_columns
        # Also ensure df_var_nms doesn't have duplicate columns
        df_var_nms = df_var_nms.loc[:, ~df_var_nms.columns.duplicated()]
    
    df_calc = pd.DataFrame(columns=column_names)
    
    # Ensure we're working with numeric data only (exclude 'variable' column)
    numeric_cols = [col for col in column_names if col != "variable"]
    
    # Get traditional mode numeric columns (for df_var_trad operations)
    trad_numeric_cols = [col for col in df_var_trad.columns if col != "variable"]
    
    # Calculate total trips
    # Row 0: "Number of vehicles"
    # Row 1: "Average number of trips per day"
    # Get numeric columns only (skip 'variable' column which is at index 0)
    row0_numeric = df_var_nms.iloc[0][numeric_cols]
    row1_numeric = df_var_nms.iloc[1][numeric_cols]
    
    # Debug: Print first few values to check data
    print(f"DEBUG: Row 0 (vehicles) sample: {row0_numeric.head(3).to_dict()}")
    print(f"DEBUG: Row 1 (trips/day) sample: {row1_numeric.head(3).to_dict()}")
    
    # Ensure numeric types
    row0_numeric = pd.to_numeric(row0_numeric, errors='coerce').fillna(0)
    row1_numeric = pd.to_numeric(row1_numeric, errors='coerce').fillna(0)
    
    total_trips = row0_numeric * row1_numeric
    print(f"DEBUG: Total trips sample: {total_trips.head(3).to_dict()}")
    new_row = pd.concat([pd.Series({"variable": "total_trips"}), total_trips])
    df_calc.loc[len(df_calc)] = new_row
    
    # Calculate replaced trips
    for i, name in zip(range(7, 12), TRAD_TYPES):
        calc_row_numeric = pd.to_numeric(df_calc.iloc[0][numeric_cols], errors='coerce').fillna(0)
        nms_row_numeric = pd.to_numeric(df_var_nms.iloc[i][numeric_cols], errors='coerce').fillna(0)
        result = calc_row_numeric * (nms_row_numeric / 100)
        new_row = pd.concat([pd.Series({"variable": f"replaced_trip_{name}"}), result])
        df_calc.loc[len(df_calc)] = new_row
    
    # Calculate decreased mileage
    # Uses replaced_trip rows (indices 1-5) as input
    for i, name in zip(range(0, 5), TRAD_TYPES):
        calc_row_numeric = pd.to_numeric(df_calc.iloc[i + 1][numeric_cols], errors='coerce').fillna(0)
        nms_row_numeric = pd.to_numeric(df_var_nms.iloc[i + 12][numeric_cols], errors='coerce').fillna(0)
        result = calc_row_numeric * nms_row_numeric * -1
        new_row = pd.concat([pd.Series({"variable": f"decreased_distance_{name}"}), result])
        df_calc.loc[len(df_calc)] = new_row
    
    # Calculate emission factor for rail
    # df_var_gen has structure: variable, general (column index 1)
    # df_var_trad has structure: variable, private_car, pt_road, pt_rail, cycling, walking
    # Row 3 (index 3) is "Average efficiency of public transport rail (kWh/km)"
    # Column 3 (index 3) is "pt_rail"
    gen_val = pd.to_numeric(df_var_gen.iloc[0, 1], errors='coerce')
    # Check if df_var_trad has enough rows and columns
    if len(df_var_trad) <= 3 or len(df_var_trad.columns) <= 3:
        raise ValueError(f"df_var_trad has incorrect shape: {df_var_trad.shape}. Expected at least 4 rows and 4 columns.")
    trad_val = pd.to_numeric(df_var_trad.iloc[3, 3], errors='coerce')
    emission_factor_rail = float(gen_val) * float(trad_val)
    
    # Calculate CO2 emission TTW
    # Use trad_numeric_cols for df_var_trad operations (not numeric_cols which has NMS columns)
    co2_factors_raw = df_var_trad.iloc[0][trad_numeric_cols].tolist()
    co2_factors = [pd.to_numeric(val, errors='coerce') for val in co2_factors_raw]
    co2_factors[2] = emission_factor_rail
    
    # Count current rows to determine starting index
    # Row 0: total_trips
    # Rows 1-5: replaced_trip_* (5 rows)
    # Rows 6-10: decreased_distance_* (5 rows)
    # Next rows will be co2_saved_* starting at index 11
    current_row_count = len(df_calc)
    
    # Get data columns once to avoid reindexing issues
    data_cols_calc = [col for col in df_calc.columns if col != "variable"]
    
    for i, name in zip(range(0, 5), TRAD_TYPES):
        # Use decreased_distance rows (indices 6-10) as input
        # Match original exactly: (df_calc.iloc[i+6, 1:] * co2_factors[i])/1000
        # Use column names instead of [1:] to avoid reindexing issues
        calc_row = df_calc.iloc[i + 6][data_cols_calc]
        # Convert to numeric to ensure we can multiply (original may have implicit conversion)
        calc_row = pd.to_numeric(calc_row, errors='coerce').fillna(0)
        factor = float(co2_factors[i]) if i < len(co2_factors) else 0.0
        result = (calc_row * factor) / 1000
        if i <= 1:
            new_row = pd.concat([pd.Series({"variable": f"co2_saved_TTW_{name}"}), result])
        else:
            new_row = pd.concat([pd.Series({"variable": f"co2_saved_WTT_{name}"}), result])
        df_calc.loc[len(df_calc)] = new_row
    
    # Calculate CO2 emission WTT for private car and PT road
    # These are calculated from the TTW values (rows 11 and 12)
    # Matching original code: df_calc.iloc[i+11, 1:] * ((1/(1-(df_var_gen.iloc[1,1]/100)))-1)
    wtt_factor = float(pd.to_numeric(df_var_gen.iloc[1, 1], errors='coerce'))
    wtt_multiplier = ((1 / (1 - (wtt_factor / 100))) - 1)
    
    # Verify we have the correct number of rows before this calculation
    # Should have: row 0 (total_trips) + 5 (replaced_trip) + 5 (decreased_distance) + 5 (co2_saved) = 16 rows
    expected_row_count = 1 + 5 + 5 + 5  # total_trips + replaced_trip + decreased_distance + co2_saved
    if len(df_calc) != expected_row_count:
        raise ValueError(f"Expected {expected_row_count} rows in df_calc before WTT calculation, but found {len(df_calc)}")
    
    for i, name in zip(range(0, 2), TRAD_TYPES):
        # Reference the TTW rows we just created
        # Row 11 = co2_saved_TTW_private_car (i=0, from first loop)
        # Row 12 = co2_saved_TTW_pt_road (i=1, from first loop)
        tt_row_index = 11 + i  # 11 for i=0, 12 for i=1
        
        # Verify row index is valid
        if tt_row_index >= len(df_calc):
            raise ValueError(f"Row index {tt_row_index} is out of bounds. df_calc has {len(df_calc)} rows.")
        
        # Get the TTW row and calculate WTT
        # Match original exactly: df_calc.iloc[i+11, 1:] * ((1/(1-(df_var_gen.iloc[1,1]/100)))-1)
        # Use column names instead of [1:] to avoid reindexing issues
        calc_row = df_calc.iloc[tt_row_index][data_cols_calc]
        # Convert to numeric to ensure we can multiply (original may have implicit conversion)
        calc_row = pd.to_numeric(calc_row, errors='coerce').fillna(0)
        result = calc_row * wtt_multiplier
        
        new_row = pd.concat([pd.Series({"variable": f"co2_saved_WTT_{name}"}), result])
        df_calc.loc[len(df_calc)] = new_row
    
    # Calculate kilometres travelled by NMS
    # Match original: df_calc.iloc[1:6, 1:] and df_var_nms.iloc[12:17, 1:]
    # Use column names instead of [1:] to avoid reindexing issues
    # data_cols_nms is already defined at the top of the function
    trips_df = df_calc.iloc[1:6][data_cols_calc].reset_index(drop=True)
    trip_dist_df = df_var_nms.iloc[12:17][data_cols_nms].reset_index(drop=True)
    # Debug: modal split percentages (rows 7-11) per mode
    modal_split_df = df_var_nms.iloc[7:12][data_cols_nms].reset_index(drop=True)
    print(f"DEBUG: modal_split (rows 7-11) per mode: {modal_split_df.to_dict(orient='list')}")
    # Convert to numeric
    trips_df = trips_df.apply(pd.to_numeric, errors='coerce').fillna(0)
    trip_dist_df = trip_dist_df.apply(pd.to_numeric, errors='coerce').fillna(0)
    
    # Ensure both DataFrames have all expected columns
    for col in expected_columns:
        if col not in trips_df.columns:
            trips_df[col] = 0.0
        if col not in trip_dist_df.columns:
            trip_dist_df[col] = 0.0
    
    total_km_travelled = (trips_df * trip_dist_df).sum()
    print(f"DEBUG: total_km_travelled per mode: {total_km_travelled.to_dict()}")
    
    # Ensure total_km_travelled has all expected columns
    total_km_dict = total_km_travelled.to_dict()
    for col in expected_columns:
        if col not in total_km_dict:
            total_km_dict[col] = 0.0
    total_km_travelled = pd.Series(total_km_dict)
    
    new_row = pd.concat([pd.Series({"variable": "total_km_travelled"}), total_km_travelled])
    df_calc.loc[len(df_calc)] = new_row
    
    # Calculate emissions from NMS
    # Match original: df_var_gen.iloc[0,1] and df_var_nms.iloc[5, 1:]
    # Use column names instead of [1:] to avoid reindexing issues
    gen_val_nms = pd.to_numeric(df_var_gen.iloc[0, 1], errors='coerce')
    nms_row = df_var_nms.iloc[5][data_cols_nms]
    nms_row_numeric = pd.to_numeric(nms_row, errors='coerce').fillna(0)
    avg_co2_nms = float(gen_val_nms) * nms_row_numeric
    new_row = pd.concat([pd.Series({"variable": "ev_emission_factor"}), avg_co2_nms])
    df_calc.loc[len(df_calc)] = new_row
    
    # Calculate TTW CO2
    # Match original: df_calc.iloc[18, 1:] * df_var_nms.iloc[2, 1:]
    # Row 18 in df_calc is total_km_travelled
    # Row 2 in df_var_nms is "CO2 emission factors Tank-to-Wheel (gr/km)" for ICE vehicles
    # Use column names instead of [1:] to avoid reindexing issues
    calc_row = df_calc.iloc[18][data_cols_calc]
    calc_row_numeric = pd.to_numeric(calc_row, errors='coerce').fillna(0)
    nms_row = df_var_nms.iloc[2][data_cols_nms]
    nms_row_numeric = pd.to_numeric(nms_row, errors='coerce').fillna(0)
    # Debug: verify TTW emission factors per mode (row 2)
    print(f"DEBUG: df_var_nms row 2 (TTW emission factors) -> {nms_row_numeric.to_dict()}")
    
    # Debug: Check what row 2 in df_var_nms represents
    print(f"DEBUG: df_var_nms row 2 variable name: {df_var_nms.iloc[2].get('variable', 'N/A')}")
    print(f"DEBUG: df_var_nms row 2 (emission factor) ICEcar value: {nms_row_numeric.get('ICEcar', 'N/A')}")
    print(f"DEBUG: df_calc row 18 (total_km_travelled) ICEcar value: {calc_row_numeric.get('ICEcar', 'N/A')}")
    
    
    # Ensure both have all expected columns
    calc_row_dict = calc_row_numeric.to_dict()
    nms_row_dict = nms_row_numeric.to_dict()
    for col in expected_columns:
        if col not in calc_row_dict:
            calc_row_dict[col] = 0.0
        if col not in nms_row_dict:
            nms_row_dict[col] = 0.0
    calc_row_numeric = pd.Series(calc_row_dict)
    nms_row_numeric = pd.Series(nms_row_dict)
    
    ttw_ice_co2 = (calc_row_numeric * nms_row_numeric) / 1000
    
    # Ensure ttw_ice_co2 has all expected columns
    ttw_ice_co2_dict = ttw_ice_co2.to_dict()
    for col in expected_columns:
        if col not in ttw_ice_co2_dict:
            ttw_ice_co2_dict[col] = 0.0
    ttw_ice_co2 = pd.Series(ttw_ice_co2_dict)
    
    new_row = pd.concat([pd.Series({"variable": "ttw_co2"}), ttw_ice_co2])
    df_calc.loc[len(df_calc)] = new_row
    
    # Calculate WTT CO2
    wtt_factor_val = float(pd.to_numeric(df_var_gen.iloc[1, 1], errors='coerce'))
    wtt_multiplier_val = ((1 / (1 - (wtt_factor_val / 100))) - 1)
    print(f"DEBUG: wtt_factor_val: {wtt_factor_val}")
    print(f"DEBUG: wtt_multiplier_val calculation: ((1 / (1 - ({wtt_factor_val} / 100))) - 1) = {wtt_multiplier_val}")
    wtt_ice_co2 = ttw_ice_co2 * wtt_multiplier_val
    print(f"DEBUG: wtt_ice_co2 calculation for ICEcar: {ttw_ice_co2.get('ICEcar', 0.0)} * {wtt_multiplier_val} = {wtt_ice_co2.get('ICEcar', 0.0)}")
    
    # Ensure wtt_ice_co2 has all expected columns
    wtt_ice_co2_dict = wtt_ice_co2.to_dict() if hasattr(wtt_ice_co2, 'to_dict') else dict(wtt_ice_co2)
    for col in expected_columns:
        if col not in wtt_ice_co2_dict:
            wtt_ice_co2_dict[col] = 0.0
    wtt_ice_co2 = pd.Series(wtt_ice_co2_dict)
    
    # Match original: df_calc.iloc[18, 1:] and df_calc.iloc[19, 1:]
    # Use column names instead of [1:] to avoid reindexing issues
    calc_row_18 = df_calc.iloc[18][data_cols_calc]
    calc_row_19 = df_calc.iloc[19][data_cols_calc]
    calc_row_numeric_18 = pd.to_numeric(calc_row_18, errors='coerce').fillna(0)
    calc_row_numeric_19 = pd.to_numeric(calc_row_19, errors='coerce').fillna(0)
    
    # Ensure both have all expected columns
    calc_row_18_dict = calc_row_numeric_18.to_dict()
    calc_row_19_dict = calc_row_numeric_19.to_dict()
    for col in expected_columns:
        if col not in calc_row_18_dict:
            calc_row_18_dict[col] = 0.0
        if col not in calc_row_19_dict:
            calc_row_19_dict[col] = 0.0
    calc_row_numeric_18 = pd.Series(calc_row_18_dict)
    calc_row_numeric_19 = pd.Series(calc_row_19_dict)
    
    wtt_ev_co2 = (calc_row_numeric_18 * calc_row_numeric_19) / 1000
    
    wtt_ev_co2 = wtt_ev_co2.astype("float64")
    wtt_ice_co2 = wtt_ice_co2.astype("float64")
    
    # Match original: wtt_co2 = wtt_ev_co2.where(wtt_ev_co2.ne(0.0)).fillna(wtt_ice_co2)
    # But for ICE vehicles, wtt_ice_co2 might be too high. Let's check if we should set it to zero
    # Actually, the original code uses fillna(wtt_ice_co2), so it should use wtt_ice_co2 for ICE vehicles
    # But maybe the issue is that wtt_ice_co2 itself is wrong?
    # Let's try setting wtt_co2 to zero for ICE vehicles where wtt_ev_co2 is zero
    # Actually, wait - let me check the original logic more carefully
    # The original uses: wtt_co2 = wtt_ev_co2.where(wtt_ev_co2.ne(0.0)).fillna(wtt_ice_co2)
    # This means: use wtt_ev_co2 if not zero, otherwise use wtt_ice_co2
    # But maybe for ICE vehicles, we should use 0 instead of wtt_ice_co2?
    # Let me check: if wtt_ev_co2 is 0, it means there's no electric vehicle, so maybe wtt_co2 should be 0?
    # But that doesn't match the original code...
    # Actually, I think the issue might be that wtt_ice_co2 should only be used for the TTW calculation,
    # not for the WTT calculation. Let me check if wtt_co2 for ICE should be 0.
    # Match original: wtt_co2 = wtt_ev_co2.where(wtt_ev_co2.ne(0.0)).fillna(wtt_ice_co2)
    # The expected value is 1.65, but we're getting 11.78.
    # Expected: 1.65 = WTT_trad (-64.08) + WTT_nms (should be 65.73)
    # Actual: 11.78 = WTT_trad (-64.08) + WTT_nms (75.86)
    # So WTT_nms is too high by 10.13 (75.86 - 65.73 = 10.13)
    # 
    # Let me check if maybe wtt_ice_co2 should be calculated differently.
    # The original calculates: wtt_ice_co2 = ttw_ice_co2 * ((1/(1-(df_var_gen.iloc[1,1]/100)))-1)
    # We're calculating: wtt_ice_co2 = ttw_ice_co2 * wtt_multiplier_val
    # Where wtt_multiplier_val = ((1 / (1 - (wtt_factor_val / 100))) - 1)
    # This should be the same.
    #
    # Match original: wtt_co2 = wtt_ev_co2.where(wtt_ev_co2.ne(0.0)).fillna(wtt_ice_co2)
    # The user says ALL modes are wrong for Well-to-Tank.
    # Looking at the debug output, all WTT_nms values are too high.
    # The calculation matches the original code exactly, so maybe there's a different issue.
    # Let me check if maybe the issue is in how we're using wtt_co2 in the results,
    # or if there's a different interpretation of the original code.
    wtt_co2 = wtt_ev_co2.where(wtt_ev_co2.ne(0.0)).fillna(wtt_ice_co2).infer_objects(copy=False)
    
    # Debug: Check wtt_co2 calculation for ICEcar
    print(f"DEBUG: wtt_ev_co2 for ICEcar: {wtt_ev_co2.get('ICEcar', 0.0)}")
    print(f"DEBUG: wtt_ice_co2 for ICEcar: {wtt_ice_co2.get('ICEcar', 0.0)}")
    print(f"DEBUG: wtt_co2 for ICEcar (after fill): {wtt_co2.get('ICEcar', 0.0)}")
    print(f"DEBUG: ttw_ice_co2 for ICEcar: {ttw_ice_co2.get('ICEcar', 0.0)}")
    print(f"DEBUG: wtt_multiplier_val: {wtt_multiplier_val}")
    print(f"DEBUG: Expected WTT_nms for Car: 65.73 (to get total of 1.65)")
    print(f"DEBUG: Actual WTT_nms for Car: {wtt_co2.get('ICEcar', 0.0)}")
    print(f"DEBUG: Difference: {wtt_co2.get('ICEcar', 0.0) - 65.73}")
    
    # Ensure wtt_co2 has all expected columns
    wtt_co2_dict = wtt_co2.to_dict()
    for col in expected_columns:
        if col not in wtt_co2_dict:
            wtt_co2_dict[col] = 0.0
    wtt_co2 = pd.Series(wtt_co2_dict)
    
    print(f"DEBUG: wtt_co2 for ICEcar (after fill): {wtt_co2.get('ICEcar', 0.0)}")
    
    new_row = pd.concat([pd.Series({"variable": "wtt_co2"}), wtt_co2])
    df_calc.loc[len(df_calc)] = new_row
    
    # Ensure all expected columns exist in column_names
    all_columns = list(set(column_names + expected_columns))
    if "variable" not in all_columns:
        all_columns.insert(0, "variable")
    
    # Create results dataframe with all expected columns
    df_results = pd.DataFrame(columns=all_columns)
    
    # Calculate average CO2 emission change
    # Row structure after all calculations:
    # Row 0: total_trips
    # Rows 1-5: replaced_trip_* (5 rows)
    # Rows 6-10: decreased_distance_* (5 rows)
    # Rows 11-12: co2_saved_TTW_* (2 rows: private_car, pt_road)
    # Rows 13-15: co2_saved_WTT_* (3 rows: pt_rail, cycling, walking) - from first loop, i=2,3,4
    # Rows 16-17: co2_saved_WTT_* (2 rows: private_car, pt_road - calculated from rows 11-12) - from second loop
    # So trad_wtt_df should sum rows 13-18 (6 rows total: 3 from first loop + 2 from second loop)
    # But wait, the original uses iloc[13:18] which is rows 13-17 (5 rows), not 13-18
    # Let me check: after first loop we have 5 rows (11-15), after second loop we have 2 more (16-17)
    # So total is 7 rows (11-17), and WTT should be rows 13-17 (5 rows: 13,14,15,16,17)
    # Match original: df_calc.iloc[11:13, 1:].sum() - uses columns 1 onwards (skip "variable" column)
    # CRITICAL: Remove duplicate columns BEFORE any indexing operations
    if df_calc.columns.duplicated().any():
        # Remove duplicate columns, keeping first occurrence
        df_calc = df_calc.loc[:, ~df_calc.columns.duplicated()]
        # Also update column_names to reflect the change
        column_names = df_calc.columns.tolist()
    
    # Get all columns except "variable" to avoid [1:] reindexing issues with duplicate labels
    # This is equivalent to [1:] but safer when there might be duplicate column names
    data_cols = [col for col in df_calc.columns if col != "variable"]
    
    # Match original exactly: df_calc.iloc[11:13, 1:].sum() and df_calc.iloc[13:18, 1:].sum()
    # Row structure:
    # After first loop (i=0-4): rows 11-15
    #   - Row 11: co2_saved_TTW_private_car (i=0)
    #   - Row 12: co2_saved_TTW_pt_road (i=1)
    #   - Row 13: co2_saved_WTT_pt_rail (i=2)
    #   - Row 14: co2_saved_WTT_cycling (i=3)
    #   - Row 15: co2_saved_WTT_walking (i=4)
    # After second loop (i=0-1): rows 16-17
    #   - Row 16: co2_saved_WTT_private_car (i=0, calculated from row 11)
    #   - Row 17: co2_saved_WTT_pt_road (i=1, calculated from row 12)
    # So trad_ttw_df = rows 11-12 (2 rows)
    # And trad_wtt_df = rows 13-17 (5 rows: 13,14,15,16,17)
    # Use column names instead of [1:] to avoid reindexing issues
    trad_ttw_df = df_calc.iloc[11:13][data_cols].apply(pd.to_numeric, errors='coerce').fillna(0)
    trad_wtt_df = df_calc.iloc[13:18][data_cols].apply(pd.to_numeric, errors='coerce').fillna(0)
    
    
    # Sum across rows (axis=0, default) to get totals per column - matching original
    avg_co2_TTW_trad = trad_ttw_df.sum()
    avg_co2_WTT_trad = trad_wtt_df.sum()
    avg_co2_TTW_nms = ttw_ice_co2
    avg_co2_WTT_nms = wtt_co2
    
    results_dict = {
        "avg_co2_TTW_trad": avg_co2_TTW_trad,
        "avg_co2_WTT_trad": avg_co2_WTT_trad,
        "avg_co2_TTW_nms": avg_co2_TTW_nms,
        "avg_co2_WTT_nms": avg_co2_WTT_nms
    }
    
    for name, result in results_dict.items():
        # Ensure result Series has all expected columns
        result_dict = result.to_dict() if hasattr(result, 'to_dict') else dict(result)
        # Fill in missing columns with 0.0
        for col in expected_columns:
            if col not in result_dict:
                result_dict[col] = 0.0
        result_series = pd.Series(result_dict)
        new_row = pd.concat([pd.Series({"variable": name}), result_series])
        df_results.loc[len(df_results)] = new_row
    
    # Calculate CO2 LCA phase
    # decreased_distance has NMS columns (ICEcar, ecar, etc.) and 5 rows (one per traditional mode)
    decreased_distance_df = df_calc.iloc[6:11][numeric_cols].reset_index(drop=True)
    decreased_distance_df = decreased_distance_df.apply(pd.to_numeric, errors='coerce').fillna(0)
    
    # Ensure decreased_distance_df has all expected NMS columns
    for col in expected_columns:
        if col not in decreased_distance_df.columns:
            decreased_distance_df[col] = 0.0
    
    # emission_fact_lca has traditional mode columns (private_car, pt_road, etc.) - one value per mode
    # We need to broadcast this to NMS columns
    trad_nms_cols = df_var_trad.columns.tolist()
    trad_nms_cols = [col for col in trad_nms_cols if col != "variable"]
    emission_fact_lca_trad = df_var_trad.iloc[4][trad_nms_cols].reset_index(drop=True)
    emission_fact_lca_trad = pd.to_numeric(emission_fact_lca_trad, errors='coerce').fillna(0)
    
    # Multiply decreased_distance (NMS cols) with emission_fact_lca (broadcast per row)
    # Each row of decreased_distance corresponds to a traditional mode
    # We multiply each row by the corresponding traditional mode emission factor
    avg_co2_lca = decreased_distance_df.copy()
    for idx, trad_col in enumerate(trad_nms_cols):
        if idx < len(avg_co2_lca):
            emission_factor = float(emission_fact_lca_trad.iloc[idx]) / 1000
            avg_co2_lca.iloc[idx] = avg_co2_lca.iloc[idx] * emission_factor
    
    # Add NMS LCA row
    km_by_nms = pd.to_numeric(df_calc.iloc[18][numeric_cols], errors='coerce').fillna(0)
    # Ensure km_by_nms has all expected columns
    km_by_nms_dict = km_by_nms.to_dict()
    for col in expected_columns:
        if col not in km_by_nms_dict:
            km_by_nms_dict[col] = 0.0
    
    emission_fact_lca_nms = pd.to_numeric(df_var_nms.iloc[6][numeric_cols], errors='coerce').fillna(0)
    # Ensure emission_fact_lca_nms has all expected columns
    emission_fact_lca_nms_dict = emission_fact_lca_nms.to_dict()
    for col in expected_columns:
        if col not in emission_fact_lca_nms_dict:
            emission_fact_lca_nms_dict[col] = 0.0
    
    # Calculate avg_co2_lca_nms: multiply emission_fact_lca_nms by total_km_travelled
    # Both should have the same columns (expected_columns)
    avg_co2_lca_nms_dict = {}
    for col in expected_columns:
        emission_val = emission_fact_lca_nms_dict.get(col, 0.0)
        km_val = total_km_dict.get(col, 0.0)
        avg_co2_lca_nms_dict[col] = (emission_val * km_val) / 1000
    avg_co2_lca_nms_series = pd.Series(avg_co2_lca_nms_dict)
    avg_co2_lca.loc[len(avg_co2_lca)] = avg_co2_lca_nms_series
    
    # Calculate NOx and PM (same pattern as CO2 LCA)
    emission_fact_nox_trad = df_var_trad.iloc[1][trad_nms_cols]
    emission_fact_nox_trad = pd.to_numeric(emission_fact_nox_trad, errors='coerce').fillna(0)
    
    avg_nox = decreased_distance_df.copy()
    for idx in range(len(avg_nox)):
        if idx < len(emission_fact_nox_trad):
            emission_factor = float(emission_fact_nox_trad.iloc[idx]) / 1000
            avg_nox.iloc[idx] = avg_nox.iloc[idx] * emission_factor
    
    emission_fact_nox_nms = pd.to_numeric(df_var_nms.iloc[3][numeric_cols], errors='coerce').fillna(0)
    emission_fact_nox_nms_dict = emission_fact_nox_nms.to_dict()
    for col in expected_columns:
        if col not in emission_fact_nox_nms_dict:
            emission_fact_nox_nms_dict[col] = 0.0
    
    avg_nox_nms_dict = {}
    for col in expected_columns:
        emission_val = emission_fact_nox_nms_dict.get(col, 0.0)
        km_val = total_km_dict.get(col, 0.0)
        avg_nox_nms_dict[col] = (emission_val * km_val) / 1000
    avg_nox_nms_series = pd.Series(avg_nox_nms_dict)
    avg_nox.loc[len(avg_nox)] = avg_nox_nms_series
    
    emission_fact_pm_trad = df_var_trad.iloc[2][trad_nms_cols]
    emission_fact_pm_trad = pd.to_numeric(emission_fact_pm_trad, errors='coerce').fillna(0)
    
    avg_pm = decreased_distance_df.copy()
    for idx in range(len(avg_pm)):
        if idx < len(emission_fact_pm_trad):
            emission_factor = float(emission_fact_pm_trad.iloc[idx]) / 1000
            avg_pm.iloc[idx] = avg_pm.iloc[idx] * emission_factor
    
    emission_fact_pm_nms = pd.to_numeric(df_var_nms.iloc[4][numeric_cols], errors='coerce').fillna(0)
    emission_fact_pm_nms_dict = emission_fact_pm_nms.to_dict()
    for col in expected_columns:
        if col not in emission_fact_pm_nms_dict:
            emission_fact_pm_nms_dict[col] = 0.0
    
    avg_pm_nms_dict = {}
    for col in expected_columns:
        emission_val = emission_fact_pm_nms_dict.get(col, 0.0)
        km_val = total_km_dict.get(col, 0.0)
        avg_pm_nms_dict[col] = (emission_val * km_val) / 1000
    avg_pm_nms_series = pd.Series(avg_pm_nms_dict)
    avg_pm.loc[len(avg_pm)] = avg_pm_nms_series
    
    # Ensure all DataFrames have all expected columns before formatting
    for col in expected_columns:
        if col not in avg_co2_lca.columns:
            avg_co2_lca[col] = 0.0
        if col not in avg_nox.columns:
            avg_nox[col] = 0.0
        if col not in avg_pm.columns:
            avg_pm[col] = 0.0
    
    # Format results for API response
    return _format_results(
        df_results, avg_co2_lca, avg_nox, avg_pm, inhabitants
    )


def _format_results(
    df_results: pd.DataFrame,
    avg_co2_lca: pd.DataFrame,
    avg_nox: pd.DataFrame,
    avg_pm: pd.DataFrame,
    inhabitants: int
) -> Dict[str, Any]:
    """
    Format calculation results for API response
    """
    # Verify df_results has exactly 4 rows (TTW_trad, WTT_trad, TTW_nms, WTT_nms)
    if len(df_results) != 4:
        raise ValueError(f"df_results must have exactly 4 rows, but has {len(df_results)} rows")
    
    # Verify row order
    expected_rows = ["avg_co2_TTW_trad", "avg_co2_WTT_trad", "avg_co2_TTW_nms", "avg_co2_WTT_nms"]
    for i, expected_name in enumerate(expected_rows):
        actual_name = df_results.iloc[i]["variable"]
        if actual_name != expected_name:
            raise ValueError(f"df_results row {i} should be '{expected_name}' but is '{actual_name}'")
    
    # Per-mode results
    per_mode = {}
    
    for mode in NMS_TYPES:
        # CO2 use phase - filter columns matching mode name
        # Use mode.lower() like the original code, but handle special cases
        if mode == "e-Scooter":
            # e-Scooter -> "e-scooter" but column is "escooter" (no hyphen)
            filter_pattern = r"escooter"
        else:
            # Use lowercase like original: "Car" -> "car" matches "ICEcar" and "ecar"
            filter_pattern = mode.lower()
        
        sum_co2_filtered = df_results.filter(regex=filter_pattern, axis=1)
        
        # Debug: Print df_results structure for all modes
        print(f"DEBUG: {mode} mode - filter_pattern: {filter_pattern}")
        print(f"DEBUG: {mode} mode - sum_co2_filtered columns: {list(sum_co2_filtered.columns) if not sum_co2_filtered.empty else 'empty'}")
        if not sum_co2_filtered.empty:
            print(f"DEBUG: {mode} mode - sum_co2_filtered row 1 (WTT_trad): {sum_co2_filtered.iloc[1].to_dict()}")
            print(f"DEBUG: {mode} mode - sum_co2_filtered row 3 (WTT_nms): {sum_co2_filtered.iloc[3].to_dict()}")
        
        if sum_co2_filtered.empty or len(sum_co2_filtered.columns) == 0:
            # No columns matched, set to zero
            ttw_total = 0.0
            wtt_total = 0.0
        else:
            # Sum across columns (axis=1) to get a Series with 4 values (one per row)
            sum_co2 = sum_co2_filtered.sum(axis=1)
            if mode == "Car":
                print(f"DEBUG: Car mode - sum_co2 values: {sum_co2.to_dict()}")
            if len(sum_co2) == 4:
                # Row 0: TTW_trad, Row 1: WTT_trad, Row 2: TTW_nms, Row 3: WTT_nms
                ttw_total = float(sum_co2.iloc[0] + sum_co2.iloc[2])  # TTW_trad + TTW_nms
                wtt_total = float(sum_co2.iloc[1] + sum_co2.iloc[3])  # WTT_trad + WTT_nms
                if mode == "Car":
                    print(f"DEBUG: Car mode - wtt_total calculation: {sum_co2.iloc[1]} + {sum_co2.iloc[3]} = {wtt_total}")
                
            else:
                # Fallback if structure is different
                ttw_total = float(sum_co2.sum()) if len(sum_co2) > 0 else 0.0
                wtt_total = 0.0
        
        # CO2 LCA
        sum_lca_filtered = avg_co2_lca.filter(regex=filter_pattern, axis=1)
        lca_total = float(sum_lca_filtered.sum().sum()) if not sum_lca_filtered.empty else 0.0
        
        # NOx
        sum_nox_filtered = avg_nox.filter(regex=filter_pattern, axis=1)
        nox_total = float(sum_nox_filtered.sum().sum()) if not sum_nox_filtered.empty else 0.0
        
        # PM
        sum_pm_filtered = avg_pm.filter(regex=filter_pattern, axis=1)
        pm_total = float(sum_pm_filtered.sum().sum()) if not sum_pm_filtered.empty else 0.0
        
        per_mode[mode] = {
            "ttw": float(ttw_total),
            "wtt": float(wtt_total),
            "lca": float(lca_total),
            "total": float(ttw_total + wtt_total + lca_total),
            "nox": float(nox_total),
            "pm": float(pm_total)
        }
        
    
    # Total results - matching original code structure
    # Sum per-mode results for each category
    ttw_kg_per_day = sum([per_mode[mode]["ttw"] for mode in NMS_TYPES])
    wtt_kg_per_day = sum([per_mode[mode]["wtt"] for mode in NMS_TYPES])
    lca_kg_per_day = sum([per_mode[mode]["lca"] for mode in NMS_TYPES])
    total_kg_per_day = sum([per_mode[mode]["total"] for mode in NMS_TYPES])
    
    # Convert to ton/year
    ttw_ton_per_year = ttw_kg_per_day / 1000 * 365.25
    wtt_ton_per_year = wtt_kg_per_day / 1000 * 365.25
    lca_ton_per_year = lca_kg_per_day / 1000 * 365.25
    total_ton_per_year = total_kg_per_day / 1000 * 365.25
    
    # Convert to ton/year/1000 inhabitants
    ttw_ton_per_year_per_1000 = ttw_ton_per_year / inhabitants * 1000
    wtt_ton_per_year_per_1000 = wtt_ton_per_year / inhabitants * 1000
    lca_ton_per_year_per_1000 = lca_ton_per_year / inhabitants * 1000
    total_ton_per_year_per_1000 = total_ton_per_year / inhabitants * 1000
    
    # Air quality totals
    nox_g_per_day = sum([per_mode[mode]["nox"] for mode in NMS_TYPES])
    nox_kg_per_year = nox_g_per_day / 1000 * 365.25
    nox_kg_per_year_per_1000 = nox_kg_per_year / inhabitants * 1000
    
    pm_g_per_day = sum([per_mode[mode]["pm"] for mode in NMS_TYPES])
    pm_kg_per_year = pm_g_per_day / 1000 * 365.25
    pm_kg_per_year_per_1000 = pm_kg_per_year / inhabitants * 1000
    
    return {
        "perMode": per_mode,
        "totals": {
            "co2": {
                "total": {
                    "kgPerDay": float(total_kg_per_day),
                    "tonPerYear": float(total_ton_per_year),
                    "tonPerYearPer1000": float(total_ton_per_year_per_1000)
                },
                "tankToWheel": {
                    "kgPerDay": float(ttw_kg_per_day),
                    "tonPerYear": float(ttw_ton_per_year),
                    "tonPerYearPer1000": float(ttw_ton_per_year_per_1000)
                },
                "wellToTank": {
                    "kgPerDay": float(wtt_kg_per_day),
                    "tonPerYear": float(wtt_ton_per_year),
                    "tonPerYearPer1000": float(wtt_ton_per_year_per_1000)
                },
                "lifeCycle": {
                    "kgPerDay": float(lca_kg_per_day),
                    "tonPerYear": float(lca_ton_per_year),
                    "tonPerYearPer1000": float(lca_ton_per_year_per_1000)
                }
            },
            "airQuality": {
                "nox": {
                    "gPerDay": float(nox_g_per_day),
                    "kgPerYear": float(nox_kg_per_year),
                    "kgPerYearPer1000": float(nox_kg_per_year_per_1000)
                },
                "pm": {
                    "gPerDay": float(pm_g_per_day),
                    "kgPerYear": float(pm_kg_per_year),
                    "kgPerYearPer1000": float(pm_kg_per_year_per_1000)
                }
            }
        }
    }

