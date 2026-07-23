from urllib.parse import urlparse

from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import requests
import pandas as pd
import numpy as np
from fastapi.middleware.cors import CORSMiddleware
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
from supabase import create_client, Client
import os
import random
from fastapi import Query
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup
import re
 
# Initialize Supabase
# Replace these strings with your actual Supabase project credentials
SUPABASE_URL = "https://nmxwfsqpgtrrmqfqlgfo.supabase.co"
SUPABASE_KEY = "sb_publishable_zoN9OBRiq6xvoXoUEYIpzA_N5gRf77K"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
 
# Initialize the API
app = FastAPI(title="fastapi_py")
 
# Allow the React frontend to communicate with this backend
# Allow the React frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    # Be specific here to avoid the Starlette security crash
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
def enforce_dtypes(df: pd.DataFrame) -> pd.DataFrame:
    NUMERIC_COLS = [
    'bath', 'gar', 'erf_size', 'taxi_routes', 'safety_score',
    'healthcare_facilities_5km', 'school_count',
    'civic_responsiveness_percentile', 'beds',
    'median_gv', 'property_percentile', 'floor'
]
    BOOL_COLS = [
    'has_pool', 'has_internet', 'has_sercurity', 'is_furnished', 'has_backup',
    'is_HouseShare', 'has_ocean_view', 'has_mountain_view', 'is_gated', 'has_garden',
    'mentions_renovated', 'mentions_luxury', 'has_balcony', 'has_patio'
]
    df = df.copy()
    for col in NUMERIC_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    for col in BOOL_COLS:
        if col in df.columns:
            df[col] = (
                df[col].astype(str).str.lower()
                .map({'true': 1, 'false': 0, '1': 1, '0': 0, 'nan': 0})
                .fillna(0)
                .astype(int)
            )
    return df


# Load your institutional-grade model and column structures
mod4 = joblib.load('mod4_lgbm_model.joblib')
mod4_columns = joblib.load('mod4_columns.joblib')
lookup_db2 = supabase.table('FINAL DAILY RENTAL DATA2').select('*').limit(50000).execute()
lookup_db = pd.DataFrame(lookup_db2.data)
lookup_db = enforce_dtypes(lookup_db)
lookup_db['price'] = pd.to_numeric(lookup_db['price'], errors='coerce')
lookup_db['beds'] = pd.to_numeric(lookup_db['beds'], errors='coerce')
train_db = lookup_db
label_encoders = joblib.load('label_encoders.joblib')
mod4_lower = joblib.load('mod4_lgbm_model_lower_q10.joblib')
mod4_upper = joblib.load('mod4_lgbm_model_upper_q90.joblib')
 

suburb_counts = (
    train_db['location']
    .dropna()
    .astype(str)
    .str.lower()
    .str.strip()
    .value_counts()
    .to_dict()
)
 
def get_suburb_listing_count(location: str) -> int:
    if not location:
        return 0
    return suburb_counts.get(location.lower().strip(), 0)
 
# Define the exact data structure React will send us
class PropertyInput(BaseModel):
    proptype: str
    location: str
    beds: int
    bath: int
    floor:int
    gar: int
    erf_size:int
    has_pool: bool
    lease_term:str
    has_internet: bool
    has_sercurity: bool
    is_furnished: bool
    has_backup: bool
    is_HouseShare: bool
    has_balcony: bool
    has_patio: bool
    has_ocean_view:bool
    has_mountain_view:bool
    is_gated:bool
    has_garden: bool
    has_study:bool
    mentions_renovated: bool
    mentions_luxury: bool
    asking_price: float = 0.0
    

 
# ==========================================
# GEOCODING ENGINE SETUP
# ==========================================
# 1. INITIALIZE THE FREE API
geolocator = Nominatim(user_agent="volora_arbitrage_engine")
 
# 2. THE RATE LIMITER
geocode_api = RateLimiter(geolocator.geocode, min_delay_seconds=1)
 
# 3. THE SMART CACHE
coord_cache = {}
 
# ==========================================
# HELPER FUNCTIONS
# ==========================================
def get_market_pulse(location: str, df: pd.DataFrame) -> list:
    suburb_data = df[df['location'].str.lower() == location.lower()].copy()
    
    if len(suburb_data) < 5:
        return [15, 55, 30] 
        
    suburb_data['actual_price'] = np.exp(suburb_data['price'])
    total_listings = len(suburb_data)
 
    median_price = suburb_data['actual_price'].median()
    
    deals = len(suburb_data[suburb_data['actual_price'] <= (median_price * 0.67)])
    steep = len(suburb_data[suburb_data['actual_price'] >= (median_price * 1.33)])
    
    deal_pct = int(round((deals / total_listings) * 100))
    steep_pct = int(round((steep / total_listings) * 100))
    fair_pct = 100 - deal_pct - steep_pct 
    
    return [deal_pct, fair_pct, steep_pct]
 
def get_city_pulse(df: pd.DataFrame) -> list:
    city_data = df.copy()
    city_data['actual_price'] = np.exp(city_data['price'])
    total_listings = len(city_data)
 
    if total_listings == 0:
        return [18, 61, 21]
 
    median_price = city_data['actual_price'].median()
    
    steep = len(city_data[city_data['actual_price'] >= (median_price * 1.33)])
    deals = len(city_data[city_data['actual_price'] <= (median_price * 0.67)])
    
    deal_pct = int(round((deals / total_listings) * 100))
    steep_pct = int(round((steep / total_listings) * 100))
    fair_pct = 100 - deal_pct - steep_pct 
    
    return [deal_pct, fair_pct, steep_pct]
 
def get_deal_status(pred_price: float, ask_price: float) -> str:
    if ask_price <= 0:
        return "N/A"
        
    price_diff = pred_price - ask_price
    underprice_prct = (price_diff / pred_price) * 100
 
    if underprice_prct >= 25 :
        return 'BARGAIN'
    elif underprice_prct >= 15:
        return 'DEAL'
    elif underprice_prct > -15 and underprice_prct < 15:
        return 'FAIR'
    elif underprice_prct > -25:
        return 'STEEP'
    elif underprice_prct <= -25:
        return 'ROBBERY'
    else:
        return 'N/A'
 
def calculate_volora_rental_score(percent_diff, safety_score, civic_score, prop_percentile):
    clamped_diff = max(min(percent_diff, 40.0), -40.0)
    arbitrage_norm = ((clamped_diff + 40) / 80) * 100 
    safety_norm = float(safety_score) if safety_score else 50.0
    civic_norm = float(civic_score) if civic_score else 50.0
    percentile_norm = float(prop_percentile) if prop_percentile else 50.0
 
    final_score = (
        (arbitrage_norm * 0.55) +
        (safety_norm * 0.25) +
        (civic_norm * 0.15) +
        (percentile_norm * 0.05)
    )
 
    return max(min(round(final_score), 100), 0)
 
def get_suburb_coordinates(suburb_name: str):
    """Smart geocoder that checks memory before asking the API."""
    if suburb_name in coord_cache:
        return coord_cache[suburb_name]
    
    try:
        query = f"{suburb_name}, Cape Town, South Africa"
        location = geocode_api(query)
        
        if location:
            coords = {"lat": location.latitude, "lng": location.longitude}
            coord_cache[suburb_name] = coords 
            print(f"API SUCCESS: {suburb_name} -> {coords}")
            return coords
            
    except Exception as e:
        print(f"API FAILED for {suburb_name}: {e}")
 
    return {"lat": -33.9249, "lng": 18.4241}
 
# ================================================================
# PIM — NEW: confidence tiering. This is the whole point of the
# quantile models. Interval width alone isn't enough — a wide
# interval on a sparse suburb and a wide interval on a dense one
# mean different things, so comp density gates the tier alongside
# the model's own uncertainty.
# ================================================================
def get_confidence_tier(suburb_listing_count: int) -> dict:
    if suburb_listing_count > 200:
        return {"tier": "Absolutely Positive", "label": f"Backed by {suburb_listing_count} listings."}

    if suburb_listing_count > 100:
        return {"tier": "Significant Assurance", "label": f"Backed by {suburb_listing_count} listings."}

    if suburb_listing_count > 30:
        return {"tier": "Directionally Correct", "label": f"Backed by {suburb_listing_count} listings."}

    if suburb_listing_count > 5:
        return {"tier": "Limited Assurance", "label": f"Backed by {suburb_listing_count} listings."}

    return {"tier": "Significant Doubt", "label": "Wide range — treat as a starting point, not a fixed number."}
 
def predict_with_bounds(input_encoded: pd.DataFrame):
    
    log_point = mod4.predict(input_encoded)[0]
    point_price = np.exp(log_point)
 
    lower_cols = mod4_lower.feature_names_in_
    upper_cols = mod4_upper.feature_names_in_
 
    lower_input = input_encoded.reindex(columns=lower_cols, fill_value=0)
    upper_input = input_encoded.reindex(columns=upper_cols, fill_value=0)
 
    log_lower = mod4_lower.predict(lower_input)[0]
    log_upper = mod4_upper.predict(upper_input)[0]
 
    lower_price = np.exp(log_lower)
    upper_price = np.exp(log_upper)
 
    # guard against quantile crossing, most likely on thin-data suburbs
    if upper_price < lower_price:
        lower_price, upper_price = upper_price, lower_price
 
    interval_width_pct = ((upper_price - lower_price) / point_price) * 100 if point_price > 0 else 0
 
    return point_price, lower_price, upper_price, interval_width_pct


def encode_with_label_encoders(df: pd.DataFrame, encoders: dict) -> pd.DataFrame:
    df = df.copy()
    for col, enc in encoders.items():
        if col in df.columns:
            known_classes = set(enc.classes_)
            fallback = enc.classes_[0]
            df[col] = df[col].astype(str).apply(lambda x: x if x in known_classes else fallback)
            df[col] = enc.transform(df[col])
    return df


# ==========================================
# ENDPOINTS
# ==========================================
 
@app.post("/predict")
def predict_price(prop: PropertyInput):
    clean_input_location = prop.location.lower().strip()

    # 1. Try exact match on 'location' first (fast path, most common case)
    location_data = lookup_db[
        lookup_db['location'].astype(str).str.lower().str.strip() == clean_input_location
    ]

    # 2. NEW: fall back to macro_suburb, same pattern already used in /api/clickedsuburb
    if location_data.empty and 'macro_suburb' in lookup_db.columns:
        location_data = lookup_db[
            lookup_db['macro_suburb'].astype(str).str.lower().str.strip() == clean_input_location
        ]

    # 3. NEW: fall back to a "starts with" / substring match for near-misses
    #    (e.g. "Wynberg" typed when only "Wynberg Upper" rows exist, or trailing
    #    whitespace / punctuation differences between frontend and DB)
    if location_data.empty:
        location_data = lookup_db[
            lookup_db['location'].astype(str).str.lower().str.strip()
            .str.contains(clean_input_location, na=False)
        ]

    if location_data.empty:
        return {
            "message": "Error: Location not found in database. Please check the suburb name and try again."
        }
        
    clean_proptype = prop.proptype.title()
    clean_location= prop.location.title()
    clean_lease= prop.lease_term.title()
 
    input_df = pd.DataFrame([{
        'beds': prop.beds,
        'bath': prop.bath,              # was 'baths'
        'erf_size': prop.erf_size,
        'floor': prop.floor,
        'gar': prop.gar,
        'location': clean_location,
        'proptype': clean_proptype,
        'lease_term': clean_lease,
        'has_pool': int(prop.has_pool),
        'is_gated': int(prop.is_gated),
        'has_study': int(prop.has_study),
        'has_garden': int(prop.has_garden),
        'mentions_renovated': int(prop.mentions_renovated),   # was 'mention_renovation'
        'mentions_luxury': int(prop.mentions_luxury),         # was 'mention_luxury'
        'has_balcony': int(prop.has_balcony),                 # was missing
        'has_patio': int(prop.has_patio),                     # was missing
        'has_internet': int(prop.has_internet),
        'is_furnished': int(prop.is_furnished),
        'has_backup': int(prop.has_backup),
        'is_HouseShare': int(prop.is_HouseShare),
        'has_sercurity': int(prop.has_sercurity),
        'has_ocean_view': int(prop.has_ocean_view),
        'has_mountain_view': int(prop.has_mountain_view),
        "macro_suburb": location_data['macro_suburb'].values[0],
        "property_percentile": location_data['property_percentile'].values[0],
        "safety_score": location_data['safety_score'].values[0],
        "school_count": location_data['school_count'].values[0],
        "region": location_data['region'].values[0],
        "healthcare_facilities_5km": location_data['healthcare_facilities_5km'].values[0],
        "civic_responsiveness_percentile": location_data['civic_responsiveness_percentile'].values[0],
        "taxi_routes": location_data['taxi_routes'].values[0],
        "median_gv": location_data['median_gv'].values[0]
    }])

    
    input_encoded = encode_with_label_encoders(input_df, label_encoders)
    expected_columns = mod4.feature_names_in_
    input_encoded = input_encoded.reindex(columns=expected_columns, fill_value=0)
    
    actual_rands, lower_price, high_price, interval_width_pct = predict_with_bounds(input_encoded)
 
    
    suburb_listing_count = get_suburb_listing_count(prop.location)
    confidence = get_confidence_tier(suburb_listing_count)
 
    deal_category = get_deal_status(actual_rands, prop.asking_price)
 
    price_difference = 0.0
    percentage_difference = 0.0
    
    if prop.asking_price > 0:
        price_difference = actual_rands - prop.asking_price
        percentage_difference = (price_difference / actual_rands) * 100
 
    deal_score = calculate_volora_rental_score(
        percent_diff=percentage_difference,
        safety_score=location_data['safety_score'].values[0],
        civic_score=location_data['civic_responsiveness_percentile'].values[0],
        prop_percentile=location_data['property_percentile'].values[0]
    )
    
    pulse_array = get_market_pulse(prop.location, train_db)
    city_pulse_array = get_city_pulse(train_db)
 
    return {
        "message": "Success",
        "predicted_value": round(actual_rands, 2),
        "lower_bound": round(lower_price, 2),
        "upper_bound": round(high_price, 2),
        "confidence_tier": confidence["tier"],          # PIM — NEW
        "confidence_label": confidence["label"],        # PIM — NEW
        "interval_width_pct": round(interval_width_pct, 1),  # PIM — NEW
        "deal_status": deal_category,
        "deal_score": deal_score,
        "price_diff": round(price_difference, 2),
        "percent_diff": round(percentage_difference, 2),
        "market_pulse": pulse_array,
        "city_pulse": city_pulse_array, 
        'suburb_listing_count': suburb_listing_count
    }
 
@app.get("/api/training-listings")
def get_recent_map_listings():
    """Grabs a randomized pool of recent listings LIVE from Supabase and calculates true ML arbitrage stats."""
    try:
        # 1. Grab a large pool (300 rows) safely
        response = supabase.table('FINAL DAILY RENTAL DATA2').select('*').limit(50000).execute()
        data_list = response.data
        num_df = len(data_list)
 
        if num_df == 0:
            return {"listings": [], "statbar": [{"total_count": 0}, {"arb_count": 0}, {"avg_rent": 0}, {"sq_meter": 0}]}
 
        # 2. Convert to DataFrame safely to do fast math
        df = pd.DataFrame(data_list)
        df = enforce_dtypes(df)
        df['price'] = pd.to_numeric(df['price'], errors='coerce')
        df['floor'] = pd.to_numeric(df['floor'], errors='coerce')
 
        # Reverse log to actual Rands
        
 
        # ==========================================
        # 3. TRUE ARBITRAGE CALCULATION (ML PREDICTION)
        # ==========================================
        
        # A. One-hot encode the entire dataframe at once
        df_encoded = encode_with_label_encoders(df, label_encoders)
        expected_columns = mod4.feature_names_in_
        df_encoded = df_encoded.reindex(columns=expected_columns, fill_value=0)
 
        # C. Predict on the whole batch simultaneously (Lightning fast!)
        df['log_pred'] = mod4.predict(df_encoded)
        df['predicted_price'] = np.exp(df['log_pred'])
        df['actual_price'] = np.exp(df['price'])
 
        # D. Apply your exact status function to create a new column
        df['deal_verdict'] = df.apply(
            lambda row: get_deal_status(row['predicted_price'], row['actual_price']), 
            axis=1
        )
 
        # E. Count the true verified deals instantly
        arb_count = int(df['deal_verdict'].isin(['BARGAIN', 'DEAL']).sum())
 
        # ==========================================
 
        # 4. Calculate Global Stats Safely
        avg_rent = int(df['actual_price'].mean())
        total_price = df['actual_price'].sum()
        total_floor = df['floor'].sum()
        square_meter_price = int(total_price / total_floor) if total_floor > 0 else 0
 
        # 5. FORCE THE SHUFFLE for the Map Markers (Using clean Pandas sampling)
        sample_size = min(15, len(df))
        recent_15_df = df.sample(n=sample_size)
        
        enriched_data = []
        
        for index, row in recent_15_df.iterrows():
            suburb = str(row['location']).strip() if pd.notna(row['location']) else ''
            if not suburb: continue
            
            actual_price = row['actual_price']
            
            # THE FIX: Use the actual ML prediction we just calculated in Step 3!
            expected_value = row['predicted_price']
                
            location_data = lookup_db[lookup_db['location'].str.lower() == suburb.lower()]
            
            if not location_data.empty:
                safety = location_data['safety_score'].values[0]
                civic = location_data['civic_responsiveness_percentile'].values[0]
                prop_perc = location_data['property_percentile'].values[0]
            else:
                safety, civic, prop_perc = 50.0, 50.0, 50.0 
 
            # Calculate variance using the ML prediction
            percent_diff = ((expected_value - actual_price) / expected_value) * 100 if expected_value > 0 else 0
 
            score = calculate_volora_rental_score(
                percent_diff=percent_diff,
                safety_score=safety,
                civic_score=civic,
                prop_percentile=prop_perc
            )
            
            coords = get_suburb_coordinates(suburb)
            
            enriched_data.append({
                "suburb": suburb,
                "lat": coords["lat"],
                "lng": coords["lng"],
                "price": actual_price,
                "predicted_value": expected_value,
                "deal_score": score,
            })
 
        # 6. Format Statbar EXACTLY how your React array expects it (Indices 0, 1, 2, 3)
        statbar_data = [
            {"total_count": num_df},
            {"arb_count": arb_count},
            {"avg_rent": avg_rent},
            {"sq_meter": square_meter_price} 
        ]
            
        return {
            "listings": enriched_data, 
            "statbar": statbar_data 
        }
 
    except Exception as e:
        print(f"CRITICAL SUPABASE/MATH ERROR: {e}")
        # MUST send exact fallback formatting so React doesn't crash on undefined indices
        return {"listings": [], "statbar": [{"total_count": 0}, {"arb_count": 0}, {"avg_rent": 0}, {"sq_meter": 0}]}
 
 
@app.get("/api/clickedsuburb")
async def get_suburb_stats(suburb: str = Query(..., description="The name of the clicked suburb")):
    # 1. INITIALIZE VARIABLES FIRST (This fixes the 'referenced before assignment' error)
    num_sub = 0
    num_arb = 0
    avg_rent = 0
    avg_deal_score = 0
    square = 0
    one_bed=0
    two_bed=0
    three_bed=0
    avgrent_one=0
    avgrent_two=0
    avgrent_three=0
    sqrent_one=0
    sqrent_two=0
    sqrent_three=0
 
    try:
        # 2. Fetch Data
        response = supabase.table('FINAL DAILY RENTAL DATA2').select('*').limit(50000).execute()
        
        # Defensive check: ensure data exists
        if not response.data:
        
            return {"suburb": suburb, "sub_count": 0, "sub_arb": 0, "sub_rent": 0, "sub_score": 0, "sub_square": 0}
            
        df = pd.DataFrame(response.data)
        df = enforce_dtypes(df)
        df['price'] = pd.to_numeric(df['price'], errors='coerce')
        df['floor'] = pd.to_numeric(df['floor'], errors='coerce')
        df['beds'] = pd.to_numeric(df['beds'], errors='coerce')
 
        # 3. Filter for the clicked suburb safely (Case and space insensitive)
        safe_suburb = suburb.lower().strip()
        sub_df = df[df['location'].astype(str).str.lower().str.strip() == safe_suburb].copy()
        if sub_df.empty:
            sub_df = df[df['macro_suburb'].astype(str).str.lower().str.strip() == safe_suburb].copy()
 
        
        num_sub = len(sub_df)
 
        # 4. Only run calculations if we actually found listings for this suburb
        if num_sub > 0:
            # Count bedroom distributions in the suburb safely
            one_bed = int((sub_df['beds'] == 1).sum())
            two_bed = int((sub_df['beds'] == 2).sum())
            three_bed = int((sub_df['beds'] == 3).sum())
 
            # Predict only on the suburb subset
            df_encoded = encode_with_label_encoders(sub_df, label_encoders)
            expected_columns = mod4.feature_names_in_
            df_encoded = df_encoded.reindex(columns=expected_columns, fill_value=0)
            sub_df['log_pred'] = mod4.predict(df_encoded)
            sub_df['predicted_price'] = np.exp(sub_df['log_pred'])
            sub_df['actual_price'] = np.exp(sub_df['price']) 
 
            # Calculate Suburb Metrics using .apply() to avoid Pandas Series errors
            # AFTER (matches the function signature: predicted first, actual/asking second)
            sub_df['verdict'] = sub_df.apply(lambda x: get_deal_status(x['predicted_price'], x['actual_price']), axis=1)            
            # Count bargains
            num_arb = int((sub_df['verdict'] == 'BARGAIN').sum())
 
            sub_df['perk'] = ((sub_df['predicted_price'] - sub_df['actual_price']) / sub_df['predicted_price']) * 100
 
            # Use .apply() to evaluate one row at a time
            sub_df['deal_score'] = sub_df.apply(
                lambda row: calculate_volora_rental_score(
                    percent_diff=row['perk'],
                    safety_score=row.get('safety_score', np.nan),
                    civic_score=row.get('civic_responsiveness_percentile', np.nan),
                    prop_percentile=row.get('property_percentile', np.nan)
                ), axis=1
            )
 
            # --- THE FIX: A safe integer conversion helper ---
            def safe_int(val):
                if pd.isna(val) or np.isinf(val):
                    return 0
                return int(val)

            # Get averages safely
            avg_deal_score = safe_int(np.nanmean(sub_df['deal_score']))
            
            # Use np.nanmedian to ignore empty overall values
            avg_rent = safe_int(np.nanmedian(sub_df['actual_price']))

            # Filter the dataframes
            b1_df = sub_df[sub_df['beds'] == 1]
            b2_df = sub_df[sub_df['beds'] == 2]
            b3_df = sub_df[sub_df['beds'] == 3]

            # Calculate medians safely (If no 3-beds exist, it returns 0 instead of crashing)
            avgrent_one = safe_int(b1_df['actual_price'].median()) 
            avgrent_two = safe_int(b2_df['actual_price'].median()) 
            avgrent_three = safe_int(b3_df['actual_price'].median())

            # Calculate total square meterage rates safely
            total_price = sub_df['actual_price'].sum()
            total_floor = sub_df['floor'].sum()
            square = int(total_price / total_floor) if total_floor > 0 else 0

            # Calculate bedroom specific square meterage rates safely by checking floor totals
            floor1 = b1_df['floor'].sum()
            floor2 = b2_df['floor'].sum()
            floor3 = b3_df['floor'].sum()
            
            sqrent_one = int(b1_df['actual_price'].sum() / floor1) if floor1 > 0 else 0
            sqrent_two = int(b2_df['actual_price'].sum() / floor2) if floor2 > 0 else 0
            sqrent_three = int(b3_df['actual_price'].sum() / floor3) if floor3 > 0 else 0
        # 5. Return JSON to React (Variables will be 0 if the suburb was empty)
        return {
            "suburb": suburb,
            "sub_count": num_sub,
            "sub_arb": num_arb,
            "sub_rent": avg_rent,
            "sub_score": avg_deal_score,
            "sub_square": square,
            'sqrent_one': sqrent_one,
            'sqrent_two': sqrent_two,
            'sqrent_three': sqrent_three,
            'avgrent_one': avgrent_one,
            'avgrent_two': avgrent_two,
            'avgrent_three' : avgrent_three,
            'one_bed': one_bed,
            'two_bed': two_bed,
            'three_bed': three_bed 
        }
 
    except Exception as e:
        print(f"CRITICAL SUBURB STATS ERROR: {e}")
        return {"suburb": suburb, "sub_count": 0, "sub_arb": 0, "sub_rent": 0, "sub_score": 0, "sub_square": 0}

@app.get("/api/locations")
def get_valid_locations():
    locations = (
        train_db['location']
        .dropna()
        .astype(str)
        .str.strip()
        .unique()
        .tolist()
    )
    return {"locations": sorted(locations)}



class AnalyzeRequest(BaseModel):
    url: str

class QuickAnalyzeInput(BaseModel):
    suburb: str
    macro_suburb: str = ""
    region: str = ""
    asking_price: float = 0.0
    beds: float = 0
    bath: float = 0
    gar: float = 0
    property_type: str = "House"
    is_furnished: int = 0
    has_pool: int = 0
    has_backup: int = 0
    floor_level: float = 0
    floor_size: float = 0
    floor: float = 0
    erf_size: float = 0
    has_garden: int = 0
    lease_term: str = 'Long Term' 
    has_sercurity: int = 0
    has_mountain_view: int = 0
    has_ocean_view: int = 0
    has_internet: int = 0
    is_top_floor: int = 0        
    near_promenade: int = 0      
    has_study: int = 0
    mentions_renovated: int = 0
    mentions_luxury: int = 0
    mentions_new_build: int = 0  
    is_HouseShare: int = 0
    is_gated: int = 0
    has_balcony: int = 0         
    has_patio: int = 0           
    deposit: str = "0"           # FIXED: Matched type hint to string




@app.post("/predict-quick")
def predict_quick_price(prop: QuickAnalyzeInput):
    clean_input_location = prop.suburb.lower().strip()

    # 1. Look up the location data from your Supabase DB using the provided suburb
    location_data = lookup_db[
        lookup_db['location'].astype(str).str.lower().str.strip() == clean_input_location
    ]

    if location_data.empty and 'macro_suburb' in lookup_db.columns:
        location_data = lookup_db[
            lookup_db['macro_suburb'].astype(str).str.lower().str.strip() == clean_input_location
        ]

    if location_data.empty:
        location_data = lookup_db[
            lookup_db['location'].astype(str).str.lower().str.strip()
            .str.contains(clean_input_location, na=False)
        ]

    if location_data.empty:
        return {"message": "Error: Location not found in database."}

    # 2. Format the fields for the model
    clean_proptype = prop.property_type.title() if prop.property_type else "House"
    clean_location = prop.suburb.title()

    # 3. Build the DataFrame specifically handling the new inputs & filling defaults for missing ones
    input_df = pd.DataFrame([{
        'beds': prop.beds,
        'bath': prop.bath,
        'erf_size': prop.erf_size,
        'floor': prop.floor,
        'floor_size': prop.floor_size,
        'gar': prop.gar,
        'location': clean_location,
        'proptype': clean_proptype,
        'lease_term': prop.lease_term,
        'has_pool': prop.has_pool,
        'is_gated': prop.is_gated,                     
        'has_study': prop.has_study,                   
        'has_garden': prop.has_garden,                 
        'mentions_renovated': prop.mentions_renovated, 
        'mentions_luxury': prop.mentions_luxury,       
        'mentions_new_build': prop.mentions_new_build, 
        'has_balcony': prop.has_balcony,               
        'has_patio': prop.has_patio,                   
        'has_internet': prop.has_internet,                         
        'is_furnished': prop.is_furnished,
        'has_backup': prop.has_backup,
        'is_HouseShare': prop.is_HouseShare,           
        'has_sercurity': prop.has_sercurity,           
        'has_ocean_view': prop.has_ocean_view,         
        'has_mountain_view': prop.has_mountain_view,   
        'is_top_floor': prop.is_top_floor,             
        'near_promenade': prop.near_promenade,         
        "macro_suburb": location_data['macro_suburb'].values[0],
        "property_percentile": location_data['property_percentile'].values[0],
        "safety_score": location_data['safety_score'].values[0],
        "school_count": location_data['school_count'].values[0],
        "region": location_data['region'].values[0],
        "healthcare_facilities_5km": location_data['healthcare_facilities_5km'].values[0],
        "civic_responsiveness_percentile": location_data['civic_responsiveness_percentile'].values[0],
        "taxi_routes": location_data['taxi_routes'].values[0],
        "median_gv": location_data['median_gv'].values[0]
    }])
    
    print("MODEL INPUTS:", input_df.iloc[0].to_dict())
    
    # 4. Predict
    input_encoded = encode_with_label_encoders(input_df, label_encoders)
    expected_columns = mod4.feature_names_in_
    input_encoded = input_encoded.reindex(columns=expected_columns, fill_value=0)
    
    actual_rands, lower_price, high_price, interval_width_pct = predict_with_bounds(input_encoded)

    Listing_input=input_df.iloc[0].to_dict() 


    # 5. Calculate Scores
    percentage_difference = 0.0
    if prop.asking_price > 0:
        price_difference = actual_rands - prop.asking_price
        percentage_difference = (price_difference / actual_rands) * 100

    deal_score = calculate_volora_rental_score(
        percent_diff=percentage_difference,
        safety_score=location_data['safety_score'].values[0],
        civic_score=location_data['civic_responsiveness_percentile'].values[0],
        prop_percentile=location_data['property_percentile'].values[0]
    )

   # Ensure the asking price is a clean float (removes 'R', spaces, and commas)
    input_price = prop.asking_price
    if isinstance(input_price, str):
        input_price = float(str(input_price).replace('R', '').replace(' ', '').replace(',', ''))
    
    # Extract scalar values from input_df for comparison
    input_val = input_df.iloc[0]

    # --- 1. Filter by mandatory baseline features (Must Match) ---
    # We only want to compare against properties in the exact same location and type
    potential_matches = lookup_db[
        (lookup_db['location'].str.lower().str.strip() == clean_input_location) &
        (lookup_db['proptype'].str.lower() == clean_proptype.lower())
    ].copy()

    if not potential_matches.empty:
        # --- 2. Define our flexible matching rules ---
        
        # Rule A: Price must be within R7,500
        # (Assuming your lookup_db['price'] is stored as the raw number, not log)
        price_match = abs(potential_matches['price'] - input_price) <= 7500
        
        # Rule B: Floor size must be within 7 square meters
        floor_match = abs(potential_matches['floor'] - input_val['floor']) <= 7
        
        # Rule C: Exact matches for binary/categorical features
        exact_features = [
            'beds', 'bath', 'gar', 'has_pool', 'is_gated', 'has_study', 
            'has_garden', 'mentions_renovated', 'mentions_luxury', 
            'mentions_new_build', 'has_balcony', 'has_patio', 'has_internet', 
            'is_furnished', 'has_backup', 'is_HouseShare', 'has_sercurity', 
            'has_ocean_view', 'has_mountain_view', 'near_promenade'
        ]
        
        # Create a DataFrame of True/False for every exact feature match
        match_scores = pd.DataFrame(index=potential_matches.index)
        for feat in exact_features:
            # Map frontend names to DB names if they differ (e.g. 'beds' vs 'bed')
            db_col = 'bed' if feat == 'beds' else feat 
            
            if db_col in potential_matches.columns and feat in input_df.columns:
                match_scores[feat] = potential_matches[db_col] == input_val[feat]

        # Add our flexible rules to the scoring matrix
        match_scores['price_flex'] = price_match
        match_scores['floor_flex'] = floor_match
        
        # --- 3. Calculate the percentage score ---
        # Total columns checked
        total_features_checked = len(match_scores.columns)
        
        # Sum the True values across the rows to get total matches per property
        potential_matches['match_percentage'] = (match_scores.sum(axis=1) / total_features_checked) * 100

        # --- 4. Filter for matches >= 76% ---
        strong_matches = potential_matches[potential_matches['match_percentage'] >= 75.0]

        if not strong_matches.empty:
            
            # Sort by the highest match percentage first
            strong_matches = strong_matches.sort_values(by='match_percentage', ascending=False)
            
            # Extract the URLs
            matched_urls = strong_matches['url'].tolist()
            
            
            # You can now attach `matched_urls` to your FastAPI return dictionary!
    # 6. Return exact keys Next.js expects
    return {
        "message": "Success",
        "estimated_value": round(actual_rands, 2),
        "deal_score": deal_score,
        "lower_bound": round(lower_price, 2),
        "upper_bound": round(high_price, 2),
        "percent_diff": round(percentage_difference, 2),
        'price_diff': round(price_difference, 2),
        "listing_input": Listing_input,
        'matches': matched_urls if 'matched_urls' in locals() else []
    }