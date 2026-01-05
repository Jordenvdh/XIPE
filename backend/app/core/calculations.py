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
        # Skip if var_data is empty or None
        if not var_data or len(var_data) == 0:
            continue
        # Map the key to the correct mode name
        mode_key = nms_key_mapping.get(var_name, var_name.replace("var_nms_", ""))
        try:
            df = pd.DataFrame(var_data)
            # Validate that DataFrame has required columns
            required_cols = ["variable", "userInput", "defaultValue"]
            if not all(col in df.columns for col in required_cols):
                import logging
                logging.warning(f"DataFrame for {var_name} missing required columns. Has: {list(df.columns)}, needs: {required_cols}")
                continue
            var_nms_all[mode_key] = df
        except Exception as e:
            # Log error but continue with other modes
            import logging
            logging.warning(f"Error creating DataFrame for {var_name}: {e}")
            continue
    
    # Process each dataframe
    var_nms_inputs = {}
    for name, df in var_nms_all.items():
        df_new = df.copy()
        df_new["variable"] = df_new["variable"].str.strip()
        
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
        df_var_nms = df_var_nms.merge(df, on="variable", how="left")
    
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
    
    df_var_nms = pd.concat([df_numbers_nms, df_var_nms], ignore_index=True)
    
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
        if mode_type in trad_vars and trad_vars[mode_type] and len(trad_vars[mode_type]) > 0:
            try:
                df = pd.DataFrame(trad_vars[mode_type])
                # Validate that DataFrame has required columns
                required_cols = ["variable", "userInput", "defaultValue"]
                if not all(col in df.columns for col in required_cols):
                    import logging
                    logging.warning(f"Traditional mode {mode_type} DataFrame missing required columns. Has: {list(df.columns)}, needs: {required_cols}")
                    continue
                # Ensure DataFrame is not empty
                if len(df) == 0:
                    import logging
                    logging.warning(f"Traditional mode {mode_type} DataFrame is empty")
                    continue
                var_trad_all[mode_type] = df
            except Exception as e:
                import logging
                logging.warning(f"Error creating DataFrame for traditional mode {mode_type}: {e}")
                continue
    
    # Ensure all required modes are present (raise error if critical ones are missing)
    if len(var_trad_all) == 0:
        raise ValueError("No traditional modes variables provided. At least one mode must have variables.")
    
    # Check for critical modes
    critical_modes = ["pt_road", "pt_rail", "cycling", "walking"]
    missing_critical = [m for m in critical_modes if m not in var_trad_all]
    if missing_critical:
        raise ValueError(f"Missing required traditional modes: {missing_critical}")
    
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
        df_var_trad = df_var_trad.merge(df, on="variable", how="left")
    
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
    # Create calculation dataframe
    column_names = df_var_nms.columns.tolist()
    df_calc = pd.DataFrame(columns=column_names)
    
    # Ensure we're working with numeric data only (exclude 'variable' column)
    numeric_cols = [col for col in column_names if col != "variable"]
    
    # Calculate total trips
    # Get numeric columns only (skip 'variable' column which is at index 0)
    row0_numeric = df_var_nms.iloc[0][numeric_cols]
    row1_numeric = df_var_nms.iloc[1][numeric_cols]
    
    # Ensure numeric types
    row0_numeric = pd.to_numeric(row0_numeric, errors='coerce').fillna(0)
    row1_numeric = pd.to_numeric(row1_numeric, errors='coerce').fillna(0)
    
    total_trips = row0_numeric * row1_numeric
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
    co2_factors_raw = df_var_trad.iloc[0][numeric_cols].tolist()
    co2_factors = [pd.to_numeric(val, errors='coerce') for val in co2_factors_raw]
    co2_factors[2] = emission_factor_rail
    
    for i, name in zip(range(0, 5), TRAD_TYPES):
        calc_row_numeric = pd.to_numeric(df_calc.iloc[i + 6][numeric_cols], errors='coerce').fillna(0)
        factor = float(co2_factors[i]) if i < len(co2_factors) else 0.0
        result = (calc_row_numeric * factor) / 1000
        if i <= 1:
            new_row = pd.concat([pd.Series({"variable": f"co2_saved_TTW_{name}"}), result])
        else:
            new_row = pd.concat([pd.Series({"variable": f"co2_saved_WTT_{name}"}), result])
        df_calc.loc[len(df_calc)] = new_row
    
    # Calculate CO2 emission WTT
    wtt_factor = float(pd.to_numeric(df_var_gen.iloc[1, 1], errors='coerce'))
    wtt_multiplier = ((1 / (1 - (wtt_factor / 100))) - 1)
    for i, name in zip(range(0, 2), TRAD_TYPES):
        calc_row_numeric = pd.to_numeric(df_calc.iloc[i + 11][numeric_cols], errors='coerce').fillna(0)
        result = calc_row_numeric * wtt_multiplier
        new_row = pd.concat([pd.Series({"variable": f"co2_saved_WTT_{name}"}), result])
        df_calc.loc[len(df_calc)] = new_row
    
    # Calculate kilometres travelled by NMS
    trips_df = df_calc.iloc[1:6][numeric_cols].reset_index(drop=True)
    trip_dist_df = df_var_nms.iloc[12:17][numeric_cols].reset_index(drop=True)
    # Convert to numeric
    trips_df = trips_df.apply(pd.to_numeric, errors='coerce').fillna(0)
    trip_dist_df = trip_dist_df.apply(pd.to_numeric, errors='coerce').fillna(0)
    total_km_travelled = (trips_df * trip_dist_df).sum()
    new_row = pd.concat([pd.Series({"variable": "total_km_travelled"}), total_km_travelled])
    df_calc.loc[len(df_calc)] = new_row
    
    # Calculate emissions from NMS
    gen_val_nms = pd.to_numeric(df_var_gen.iloc[0, 1], errors='coerce')
    nms_row_numeric = pd.to_numeric(df_var_nms.iloc[5][numeric_cols], errors='coerce').fillna(0)
    avg_co2_nms = float(gen_val_nms) * nms_row_numeric
    new_row = pd.concat([pd.Series({"variable": "ev_emission_factor"}), avg_co2_nms])
    df_calc.loc[len(df_calc)] = new_row
    
    # Calculate TTW CO2
    # For ICE vehicles: use row 2 (TTW CO2 emissions)
    # For EV vehicles: use row 5 (efficiency) * electricity emission factor = ev_emission_factor (row 19)
    calc_row_numeric = pd.to_numeric(df_calc.iloc[18][numeric_cols], errors='coerce').fillna(0)
    nms_row_numeric_ice = pd.to_numeric(df_var_nms.iloc[2][numeric_cols], errors='coerce').fillna(0)
    ttw_ice_co2 = (calc_row_numeric * nms_row_numeric_ice) / 1000
    
    # TTW for EVs uses the ev_emission_factor (already calculated from efficiency * electricity CO2)
    calc_row_numeric_18 = pd.to_numeric(df_calc.iloc[18][numeric_cols], errors='coerce').fillna(0)
    calc_row_numeric_19 = pd.to_numeric(df_calc.iloc[19][numeric_cols], errors='coerce').fillna(0)
    ttw_ev_co2 = (calc_row_numeric_18 * calc_row_numeric_19) / 1000
    
    # Combine ICE and EV TTW: use EV where it's non-zero, otherwise use ICE
    ttw_ev_co2 = ttw_ev_co2.astype("float64")
    ttw_ice_co2 = ttw_ice_co2.astype("float64")
    ttw_co2 = ttw_ev_co2.where(ttw_ev_co2.ne(0.0)).fillna(ttw_ice_co2).infer_objects(copy=False)
    new_row = pd.concat([pd.Series({"variable": "ttw_co2"}), ttw_co2])
    df_calc.loc[len(df_calc)] = new_row
    
    # Calculate WTT CO2
    wtt_factor_val = float(pd.to_numeric(df_var_gen.iloc[1, 1], errors='coerce'))
    wtt_multiplier_val = ((1 / (1 - (wtt_factor_val / 100))) - 1)
    wtt_ice_co2 = ttw_ice_co2 * wtt_multiplier_val
    # WTT for EVs uses the same ev_emission_factor as TTW
    wtt_ev_co2 = (calc_row_numeric_18 * calc_row_numeric_19) / 1000
    
    wtt_ev_co2 = wtt_ev_co2.astype("float64")
    wtt_ice_co2 = wtt_ice_co2.astype("float64")
    
    wtt_co2 = wtt_ev_co2.where(wtt_ev_co2.ne(0.0)).fillna(wtt_ice_co2).infer_objects(copy=False)
    new_row = pd.concat([pd.Series({"variable": "wtt_co2"}), wtt_co2])
    df_calc.loc[len(df_calc)] = new_row
    
    # Create results dataframe
    df_results = pd.DataFrame(columns=column_names)
    
    # Calculate average CO2 emission change
    trad_ttw_df = df_calc.iloc[11:13][numeric_cols].apply(pd.to_numeric, errors='coerce').fillna(0)
    trad_wtt_df = df_calc.iloc[13:18][numeric_cols].apply(pd.to_numeric, errors='coerce').fillna(0)
    avg_co2_TTW_trad = trad_ttw_df.sum()
    avg_co2_WTT_trad = trad_wtt_df.sum()
    avg_co2_TTW_nms = ttw_co2  # Use combined TTW (ICE + EV)
    avg_co2_WTT_nms = wtt_co2
    
    results_dict = {
        "avg_co2_TTW_trad": avg_co2_TTW_trad,
        "avg_co2_WTT_trad": avg_co2_WTT_trad,
        "avg_co2_TTW_nms": avg_co2_TTW_nms,
        "avg_co2_WTT_nms": avg_co2_WTT_nms
    }
    
    for name, result in results_dict.items():
        new_row = pd.concat([pd.Series({"variable": name}), result])
        df_results.loc[len(df_results)] = new_row
    
    # Calculate CO2 LCA phase
    decreased_distance_df = df_calc.iloc[6:11][numeric_cols].reset_index(drop=True)
    decreased_distance_df = decreased_distance_df.apply(pd.to_numeric, errors='coerce').fillna(0)
    emission_fact_lca_df = df_var_trad.iloc[4][numeric_cols].reset_index(drop=True)
    emission_fact_lca_df = pd.to_numeric(emission_fact_lca_df, errors='coerce').fillna(0)
    
    avg_co2_lca = decreased_distance_df.mul((emission_fact_lca_df / 1000), axis=0)
    
    km_by_nms = pd.to_numeric(df_calc.iloc[18][numeric_cols], errors='coerce').fillna(0)
    emission_fact_lca_nms = pd.to_numeric(df_var_nms.iloc[6][numeric_cols], errors='coerce').fillna(0)
    
    avg_co2_lca_nms = (emission_fact_lca_nms.values * total_km_travelled.values) / 1000
    avg_co2_lca.loc[len(avg_co2_lca)] = avg_co2_lca_nms
    
    # Calculate NOx and PM
    emission_fact_nox_df = df_var_trad.iloc[1][numeric_cols].reset_index(drop=True)
    emission_fact_nox_df = pd.to_numeric(emission_fact_nox_df, errors='coerce').fillna(0)
    avg_nox = decreased_distance_df.mul((emission_fact_nox_df / 1000), axis=0)
    emission_fact_nox_nms = pd.to_numeric(df_var_nms.iloc[3][numeric_cols], errors='coerce').fillna(0)
    avg_nox_nms = (emission_fact_nox_nms.values * total_km_travelled.values) / 1000
    avg_nox.loc[len(avg_nox)] = avg_nox_nms
    
    emission_fact_pm_df = df_var_trad.iloc[2][numeric_cols].reset_index(drop=True)
    emission_fact_pm_df = pd.to_numeric(emission_fact_pm_df, errors='coerce').fillna(0)
    avg_pm = decreased_distance_df.mul((emission_fact_pm_df / 1000), axis=0)
    emission_fact_pm_nms = pd.to_numeric(df_var_nms.iloc[4][numeric_cols], errors='coerce').fillna(0)
    avg_pm_nms = (emission_fact_pm_nms.values * total_km_travelled.values) / 1000
    avg_pm.loc[len(avg_pm)] = avg_pm_nms
    
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
    # Per-mode results
    per_mode = {}
    for mode in NMS_TYPES:
        # CO2 use phase
        sum_co2 = df_results.filter(regex=mode.lower()).sum(axis=1)
        ttw_total = sum_co2.iloc[0] + sum_co2.iloc[2]
        wtt_total = sum_co2.iloc[1] + sum_co2.iloc[3]
        
        # CO2 LCA
        sum_lca = avg_co2_lca.filter(regex=mode.lower()).sum(axis=1)
        lca_total = sum_lca.sum()
        
        # NOx
        sum_nox = avg_nox.filter(regex=mode.lower()).sum(axis=1)
        nox_total = sum_nox.sum()
        
        # PM
        sum_pm = avg_pm.filter(regex=mode.lower()).sum(axis=1)
        pm_total = sum_pm.sum()
        
        per_mode[mode] = {
            "ttw": float(ttw_total),
            "wtt": float(wtt_total),
            "lca": float(lca_total),
            "total": float(ttw_total + wtt_total + lca_total),
            "nox": float(nox_total),
            "pm": float(pm_total)
        }
    
    # Total results
    # CO2 totals
    co2_per_mode = [per_mode[mode]["total"] for mode in NMS_TYPES]
    co2_kg_per_day = sum(co2_per_mode)
    co2_ton_per_year = co2_per_day / 1000 * 365.25
    co2_ton_per_year_per_1000 = co2_ton_per_year / inhabitants * 1000
    
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
                "kgPerDay": float(co2_kg_per_day),
                "tonPerYear": float(co2_ton_per_year),
                "tonPerYearPer1000": float(co2_ton_per_year_per_1000)
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

