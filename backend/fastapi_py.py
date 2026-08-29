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
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup

import re
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="fastapi_py")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://vlok.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
# Initialize Supabase
# Replace these strings with your actual Supabase project credentials
SUPABASE_URL = "https://nmxwfsqpgtrrmqfqlgfo.supabase.co"
SUPABASE_KEY = "sb_publishable_zoN9OBRiq6xvoXoUEYIpzA_N5gRf77K"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
 
# Initialize the API
 
# Allow the React frontend to communicate with this backend
# Allow the React frontend to communicate with this backend

 
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
lookup_db2 = supabase.table('FINAL DAILY RENTAL DATA2').select('*').limit(15000).execute()
PRICE_CUTOFF_LOG = 11.409782
lookup_db = pd.DataFrame(lookup_db2.data)
lookup_db = enforce_dtypes(lookup_db)
lookup_db['price'] = pd.to_numeric(lookup_db['price'], errors='coerce')
lookup_db['beds'] = pd.to_numeric(lookup_db['beds'], errors='coerce')
lookup_db = lookup_db[lookup_db['price'] <= PRICE_CUTOFF_LOG].copy()
train_db = lookup_db
label_encoders = joblib.load('label_encoders.joblib')
mod4_lower = joblib.load('mod4_lgbm_model_lower_q10.joblib')
mod4_upper = joblib.load('mod4_lgbm_model_upper_q90.joblib')
for model in [mod4, mod4_lower, mod4_upper]:
    model._fitted_with_feature_names = False

suburb_counts = (
    train_db['location']
    .dropna()
    .astype(str)
    .str.lower()
    .str.strip()
    .value_counts()
    .to_dict()
)

def encode_with_label_encoders(df: pd.DataFrame, encoders: dict) -> pd.DataFrame:
    df = df.copy()
    for col, enc in encoders.items():
        if col in df.columns:
            known_classes = set(enc.classes_)
            fallback = enc.classes_[0]
            df[col] = df[col].astype(str).apply(lambda x: x if x in known_classes else fallback)
            df[col] = enc.transform(df[col])
    return df


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


_train_encoded = encode_with_label_encoders(train_db, label_encoders)
_train_encoded = _train_encoded.reindex(columns=mod4.feature_name_, fill_value=0)
train_db['predicted_price'] = np.exp(mod4.predict(_train_encoded))
train_db['actual_price'] = np.exp(train_db['price'])
train_db['verdict'] = train_db.apply(lambda r: get_deal_status(r['predicted_price'], r['actual_price']), axis=1)


def get_suburb_listing_count(location: str) -> int:
    if not location:
        return 0
    return suburb_counts.get(location.lower().strip(), 0)
 
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
    is_pet_friendly:bool
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
def get_market_pulse_from_verdicts(sub_df: pd.DataFrame) -> list:
   
    total = len(sub_df)
    if total < 5:
        return [15, 55, 30]

    deal_count = sub_df['verdict'].isin(['BARGAIN']).sum()
    steep_count = sub_df['verdict'].isin(['STEEP', 'ROBBERY']).sum()

    deal_pct = int(round((deal_count / total) * 100))
    steep_pct = int(round((steep_count / total) * 100))
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
 
    lower_cols = mod4_lower.feature_name_
    upper_cols = mod4_upper.feature_name_
 
    lower_input = input_encoded.reindex(columns=lower_cols, fill_value=0)
    upper_input = input_encoded.reindex(columns=upper_cols, fill_value=0)
 
    log_lower = mod4_lower.predict(lower_input)[0]
    log_upper = mod4_upper.predict(upper_input)[0]
 
    lower_price = np.exp(log_lower)
    upper_price = np.exp(log_upper)
 
    # guard against quantile crossing, most likely on thin-data suburbs
    if upper_price < lower_price:
        lower_price, upper_price = upper_price, lower_price

    
    point_price = max(lower_price, min(point_price, upper_price))
 
    interval_width_pct = ((upper_price - lower_price) / point_price) * 100 if point_price > 0 else 0
 
    return point_price, lower_price, upper_price, interval_width_pct


###########################################################################################################################


@app.post("/api/predict")
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
        "is_pet_friendly":int(prop.is_pet_friendly),
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
    expected_columns = mod4.feature_name_
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
    matches = train_db[train_db['location'].str.lower().str.strip() == prop.location.lower().strip()]
    pulse_array = get_market_pulse_from_verdicts(matches)
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
        response = supabase.table('FINAL DAILY RENTAL DATA2').select('*').limit(15000).execute()
        data_list = response.data
        num_df = len(data_list)
 
        if num_df == 0:
            return {"listings": [], "statbar": [{"total_count": 0}, {"arb_count": 0}, {"avg_rent": 0}, {"sq_meter": 0}]}
 
        # 2. Convert to DataFrame safely to do fast math
        df = pd.DataFrame(data_list)
        df = enforce_dtypes(df)
        df['price'] = pd.to_numeric(df['price'], errors='coerce')
        df['floor'] = pd.to_numeric(df['floor'], errors='coerce')
        df = df[df['price'] <= PRICE_CUTOFF_LOG].copy()
        num_df = len(df)
 
        # Reverse log to actual Rands
        
 
        # ==========================================
        # 3. TRUE ARBITRAGE CALCULATION (ML PREDICTION)
        # ==========================================
        
        # A. One-hot encode the entire dataframe at once
        df_encoded = encode_with_label_encoders(df, label_encoders)
        expected_columns = mod4.feature_name_
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
        arb_count = int(df['deal_verdict'].isin(['BARGAIN']).sum())
 
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
 
def safe_sum_price(df_or_tuple):
    """Safely extracts and sums prices whether input is a DataFrame, Series, or Tuple."""
    if df_or_tuple is None or len(df_or_tuple) == 0:
        return 0
    # If it's a Pandas DataFrame holding 'actual_price'
    if hasattr(df_or_tuple, 'get') or hasattr(df_or_tuple, '__getitem__'):
        try:
            prices = df_or_tuple['actual_price']
            return sum(float(p) for p in prices if p is not None)
        except (KeyError, TypeError):
            pass
    # If it's a raw tuple or list of numbers/tuples
    try:
        return sum(float(x[0] if isinstance(x, (tuple, list)) else x) for x in df_or_tuple if x is not None)
    except Exception:
        return 0
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
    four_bed=0
    five_bed=0
    zero_bed=0
    sqrent_four=0
    sqrent_five=0
    sqrent_05=0
    avgrent_four=0
    avgrent_five=0
    avgrent_05=0
    dom_chart_data = [{"range": l, "count": 0} for l in ['0-7', '8-14', '15-30', '30+']]
    scatter_data = []
    avg_var=0
    market_pulse = [0, 0, 0]
    mac_top6_data = []
    mac_velo = 0
    outliers_excluded = 0
    outlier_chart_data = []
    macro_deal_score_mean = 0
    bias_chart_data = {"values": [], "avg_bias": 0, "direction": "balanced"}
    _empty_deposit = {"chart": [], "coverage_pct": 0}
    deposit_overall = _empty_deposit
    deposit_b05 = _empty_deposit
    deposit_b1 = _empty_deposit
    deposit_b2 = _empty_deposit
    deposit_b3 = _empty_deposit
    deposit_b4 = _empty_deposit
    deposit_b5 = _empty_deposit
    b5_velo=0
    avg_med=0
    b4_velo=0
    b3_velo=0
    b2_velo=0
    b1_velo=0
    b05_velo=0
    b05_var=0
    b1_var=0
    b2_var=0
    b3_var=0
    b4_var=0
    b5_var=0
    b05_med=0
    b1_med=0
    b2_med=0
    b3_med=0
    b4_med=0
    b5_med=0


    try:
        # 2. Fetch Data
        response = supabase.table('FINAL DAILY RENTAL DATA2').select('*').limit(15000).execute()
        
        # Defensive check: ensure data exists
        if not response.data:
        
            return {"suburb": suburb, "sub_count": 0, "sub_arb": 0, "sub_rent": 0, "sub_score": 0, "sub_square": 0}
            
        df = pd.DataFrame(response.data)
        df = enforce_dtypes(df)
        df['price'] = pd.to_numeric(df['price'], errors='coerce')
        df['floor'] = pd.to_numeric(df['floor'], errors='coerce')
        df['beds'] = pd.to_numeric(df['beds'], errors='coerce')
        df = df[df['price'] <= PRICE_CUTOFF_LOG].copy()
 
        # 3. Filter for the clicked suburb safely (Case and space insensitive)
        safe_suburb = suburb.lower().strip()
        sub_df = df[df['location'].astype(str).str.lower().str.strip() == safe_suburb].copy()
        if sub_df.empty:
            sub_df = df[df['macro_suburb'].astype(str).str.lower().str.strip() == safe_suburb].copy()


        if not sub_df.empty:
            # Pull the macro_suburb this suburb belongs to (take the first non-null value found)
            matched_macro = sub_df['macro_suburb'].dropna().iloc[0] if sub_df['macro_suburb'].notna().any() else None

            if matched_macro:
                mac_df = df[df['macro_suburb'].astype(str).str.lower().str.strip() == str(matched_macro).lower().strip()].copy()
            else:
                mac_df = pd.DataFrame()
        else:
            mac_df = pd.DataFrame()

        num_sub = len(sub_df)
 
        # 4. Only run calculations if we actually found listings for this suburb
        if num_sub > 0:
            # Count bedroom distributions in the suburb safely
            zero_bed=int((sub_df['beds'] == 0.5).sum()) 
            one_bed = int((sub_df['beds'] == 1).sum())
            two_bed = int((sub_df['beds'] == 2).sum())
            three_bed = int((sub_df['beds'] == 3).sum())
            four_bed=int((sub_df['beds']==4).sum())
            five_bed=int((sub_df['beds']==5).sum())
 
            # Predict only on the suburb subset
            df_encoded = encode_with_label_encoders(sub_df, label_encoders)
            expected_columns = mod4.feature_name_
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
            b4_df=sub_df[sub_df['beds']==4]
            b5_df=sub_df[sub_df['beds']==5]
            b05_df=sub_df[sub_df['beds']==0.5]
            # Calculate medians safely (If no 3-beds exist, it returns 0 instead of crashing)
            avgrent_one = safe_int(b1_df['actual_price'].median()) 
            avgrent_two = safe_int(b2_df['actual_price'].median()) 
            avgrent_three = safe_int(b3_df['actual_price'].median())
            avgrent_four = safe_int(b4_df['actual_price'].median())
            avgrent_five = safe_int(b5_df['actual_price'].median())
            avgrent_05 = safe_int(b05_df['actual_price'].median())

            # Calculate total square meterage rates safely
            total_price = sub_df['actual_price'].sum()
            total_floor = sub_df['floor'].sum()
            square = int(total_price / total_floor) if total_floor > 0 else 0

            # Calculate bedroom specific square meterage rates safely by checking floor totals
            floor1 = b1_df['floor'].sum()
            floor2 = b2_df['floor'].sum()
            floor3 = b3_df['floor'].sum()
            floor4 = b4_df['floor'].sum()
            floor5 = b5_df['floor'].sum()
            floor05 = b05_df['floor'].sum()

            # Convert columns to numeric
            b1_df['actual_price'] = pd.to_numeric(b1_df['actual_price'], errors='coerce')
            b1_df['floor'] = pd.to_numeric(b1_df['floor'], errors='coerce') # Use your actual floor column name

            b2_df['actual_price'] = pd.to_numeric(b2_df['actual_price'], errors='coerce')
            b2_df['floor'] = pd.to_numeric(b2_df['floor'], errors='coerce') # Use your actual floor column name
            
            b3_df['actual_price'] = pd.to_numeric(b3_df['actual_price'], errors='coerce')
            b3_df['floor'] = pd.to_numeric(b3_df['floor'], errors='coerce') # Use your actual floor column name

            
            b4_df['actual_price'] = pd.to_numeric(b4_df['actual_price'], errors='coerce')
            b4_df['floor'] = pd.to_numeric(b4_df['floor'], errors='coerce') # Use your actual floor column name

            b5_df['actual_price'] = pd.to_numeric(b5_df['actual_price'], errors='coerce')
            b5_df['floor'] = pd.to_numeric(b5_df['floor'], errors='coerce') # Use your actual floor column name

            b05_df['actual_price'] = pd.to_numeric(b05_df['actual_price'], errors='coerce')
            b05_df['floor'] = pd.to_numeric(b05_df['floor'], errors='coerce') # Use your actual floor column name

            sqrent_05   = int(safe_sum_price(b05_df) / floor05) if floor05 > 0 else 0
            sqrent_one  = int(safe_sum_price(b1_df)   / floor1)  if floor1 > 0  else 0
            sqrent_two  = int(safe_sum_price(b2_df)   / floor2)  if floor2 > 0  else 0
            sqrent_three= int(safe_sum_price(b3_df)   / floor3)  if floor3 > 0  else 0
            sqrent_four = int(safe_sum_price(b4_df)   / floor4)  if floor4 > 0  else 0
            sqrent_five = int(safe_sum_price(b5_df)   / floor5) if floor5 > 0 else 0

    
            sub_df['first_seen_date'] = pd.to_datetime(sub_df['first_seen_date'], format='mixed', errors='coerce')
            sub_df['last_seen_date'] = pd.to_datetime(sub_df['last_seen_date'], format='mixed', errors='coerce')
            sub_df['days_on_market'] = (sub_df['last_seen_date'] - sub_df['first_seen_date']).dt.days
            sub_df['days_on_market'] = pd.to_numeric(sub_df['days_on_market'], errors='coerce')
            sub_velo=round(sub_df['days_on_market'].mean(),1) if not sub_df.empty else 0 

            b05_df['first_seen_date'] = pd.to_datetime(b05_df['first_seen_date'], format='mixed', errors='coerce')
            b05_df['last_seen_date'] = pd.to_datetime(b05_df['last_seen_date'], format='mixed', errors='coerce')
            b05_df['days_on_market'] = (b05_df['last_seen_date'] - b05_df['first_seen_date']).dt.days
            b05_df['days_on_market'] = pd.to_numeric(b05_df['days_on_market'], errors='coerce')
            b05_velo=round(b05_df['days_on_market'].mean(),1) if not b05_df.empty else 0 

            b1_df['first_seen_date'] = pd.to_datetime(b1_df['first_seen_date'], format='mixed', errors='coerce')
            b1_df['last_seen_date'] = pd.to_datetime(b1_df['last_seen_date'], format='mixed', errors='coerce')
            b1_df['days_on_market'] = (b1_df['last_seen_date'] - b1_df['first_seen_date']).dt.days
            b1_df['days_on_market'] = pd.to_numeric(b1_df['days_on_market'], errors='coerce')
            b1_velo=round(b1_df['days_on_market'].mean()) if not b1_df.empty else 0  

            b2_df['first_seen_date'] = pd.to_datetime(b2_df['first_seen_date'], format='mixed', errors='coerce')
            b2_df['last_seen_date'] = pd.to_datetime(b2_df['last_seen_date'], format='mixed', errors='coerce')
            b2_df['days_on_market'] = (b2_df['last_seen_date'] - b2_df['first_seen_date']).dt.days
            b2_df['days_on_market'] = pd.to_numeric(b2_df['days_on_market'], errors='coerce')
            b2_velo=round(b2_df['days_on_market'].mean(),1) if not b2_df.empty else 0   

            b3_df['first_seen_date'] = pd.to_datetime(b3_df['first_seen_date'], format='mixed', errors='coerce')
            b3_df['last_seen_date'] = pd.to_datetime(b3_df['last_seen_date'], format='mixed', errors='coerce')
            b3_df['days_on_market'] = (b3_df['last_seen_date'] - b3_df['first_seen_date']).dt.days
            b3_df['days_on_market'] = pd.to_numeric(b3_df['days_on_market'], errors='coerce')
            b3_velo=round(b3_df['days_on_market'].mean(),1) if not b3_df.empty else 0 

            b4_df['first_seen_date'] = pd.to_datetime(b4_df['first_seen_date'], format='mixed', errors='coerce')
            b4_df['last_seen_date'] = pd.to_datetime(b4_df['last_seen_date'], format='mixed', errors='coerce')
            b4_df['days_on_market'] = (b4_df['last_seen_date'] - b4_df['first_seen_date']).dt.days
            b4_df['days_on_market'] = pd.to_numeric(b4_df['days_on_market'], errors='coerce')
            b4_velo=round(b4_df['days_on_market'].mean(),1) if not b4_df.empty else 0

            b5_df['first_seen_date'] = pd.to_datetime(b5_df['first_seen_date'], format='mixed', errors='coerce')
            b5_df['last_seen_date'] = pd.to_datetime(b5_df['last_seen_date'], format='mixed', errors='coerce')
            b5_df['days_on_market'] = (b5_df['last_seen_date'] - b5_df['first_seen_date']).dt.days
            b5_df['days_on_market'] = pd.to_numeric(b5_df['days_on_market'], errors='coerce')

            b5_velo =round(b5_df['days_on_market'].mean(),1) if not b5_df.empty else 0

            bins = [0, 7, 14, 30, float('inf')]
            labels = ['0-7', '8-14', '15-30', '30+']
            sub_df['dom_bucket'] = pd.cut(sub_df['days_on_market'], bins=bins, labels=labels, right=True)

            dom_bucket_counts = (
                sub_df['dom_bucket']
                .value_counts()
                .reindex(labels, fill_value=0)
            )
            print("MIN First Seen:", sub_df['first_seen_date'].min())
            print("MAX Last Seen:", sub_df['last_seen_date'].max())
            dom_chart_data = [{"range": label, "count": int(dom_bucket_counts[label])} for label in labels]

            q1 = sub_df['actual_price'].quantile(0.25)
            q3 = sub_df['actual_price'].quantile(0.75)
            iqr = q3 - q1
            lower_fence = q1 - 1.5 * iqr
            upper_fence = q3 + 1.5 * iqr

            scatter_df = sub_df[
                (sub_df['actual_price'] >= lower_fence) &
                (sub_df['actual_price'] <= upper_fence)
            ].copy()

            outliers_excluded: int = len(sub_df) - len(scatter_df)

            scatter_data = scatter_df[['actual_price', 'predicted_price', 'verdict']].dropna().to_dict(orient='records')
            scatter_data = [
                {
                    "asking": round(row['actual_price'], 0),
                    "predicted": round(row['predicted_price'], 0),
                    "verdict": row['verdict']
                }
                for row in scatter_data
            ]
            avg_var = round(sub_df['perk'].mean(), 2) if not sub_df['perk'].empty else 0
            avg_med= round(sub_df['perk'].median(), 2) if not sub_df['perk'].empty else 0
            b05_var = round(b05_df['perk'].mean(), 2) if not b05_df['perk'].empty else 0
            b1_var = round(b1_df['perk'].mean(), 2) if not b1_df['perk'].empty else 0
            b2_var = round(b2_df['perk'].mean(), 2) if not b2_df['perk'].empty else 0
            b3_var = round(b3_df['perk'].mean(), 2) if not b3_df['perk'].empty else 0
            b4_var = round(b4_df['perk'].mean(), 2) if not b4_df['perk'].empty else 0
            b5_var = round(b5_df['perk'].mean(), 2) if not b5_df['perk'].empty else 0
            b05_med = round(b05_df['perk'].median(), 2) if not b05_df['perk'].empty else 0
            b1_med = round(b1_df['perk'].median(), 2) if not b1_df['perk'].empty else 0
            b2_med = round(b2_df['perk'].median(), 2) if not b2_df['perk'].empty else 0
            b3_med = round(b3_df['perk'].median(), 2) if not b3_df['perk'].empty else 0
            b4_med = round(b4_df['perk'].median(), 2) if not b4_df['perk'].empty else 0
            b5_med = round(b5_df['perk'].median(), 2) if not b5_df['perk'].empty else 0




            market_pulse =get_market_pulse_from_verdicts(sub_df)  # [deal_pct, fair_pct, steep_pct]

            verdict_counts = sub_df['verdict'].value_counts()

            mac_df['first_seen_date']= pd.to_datetime(mac_df['first_seen_date'], format='mixed', errors='coerce')
            mac_df['last_seen_date']= pd.to_datetime(mac_df['last_seen_date'], format='mixed', errors='coerce')
            mac_df['days_on_market'] = (mac_df['last_seen_date'] - mac_df['first_seen_date']).dt.days
            mac_df['days_on_market'] = pd.to_numeric(mac_df['days_on_market'], errors='coerce')
            mac_df_filtered = mac_df[mac_df['days_on_market'] > 0].dropna(subset=['days_on_market'])

            # Group by the individual 'location' (suburb) within this macro_suburb region,
            # keep only the fastest-moving listing per location
            mac_fastest_per_suburb = (
                mac_df_filtered
                .sort_values('days_on_market', ascending=True)
                .groupby('location', as_index=False)
                .first()
            )

            # Now take the top 6 across those grouped/deduped locations
            mac_top6 = mac_fastest_per_suburb.sort_values('days_on_market', ascending=True).head(6).copy()
            mac_velo = mac_top6['days_on_market'].mean() if not mac_top6.empty else 0
            mac_avg = mac_df['days_on_market'].mean() if not mac_df.empty else 0

            mac_top6_data = [
                {
                    "days_on_market": int(row['days_on_market']) if pd.notna(row['days_on_market']) else None,
                    'location':str(row['location']),
                    "vs_macro_avg_pct": round(((mac_avg - row['days_on_market']) / mac_avg) * 100, 1) if mac_avg > 0 else 0,
                }   
                for _, row in mac_top6.iterrows()
            ]
            print(f"MAC_DF total rows: {len(mac_df)}, after DOM filter: {len(mac_df_filtered)}, unique locations: {mac_df_filtered['location'].nunique()}")

            df_encoded2 = encode_with_label_encoders(mac_df, label_encoders)
            expected_columns = mod4.feature_name_
            df_encoded2 = df_encoded2.reindex(columns=expected_columns, fill_value=0)        
            mac_df['log_pred'] = mod4.predict(df_encoded2)
            mac_df['predicted_price'] = np.exp(mac_df['log_pred'])
            mac_df['actual_price'] = np.exp(mac_df['price']) 
            mac_df['perk'] = ((mac_df['predicted_price'] - mac_df['actual_price']) / mac_df['predicted_price']) * 100

            if {'safety_score', 'civic_responsiveness_percentile', 'property_percentile'}.issubset(mac_df.columns):
                safety = mac_df['safety_score'].mean()
                civic = mac_df['civic_responsiveness_percentile'].mean()
                prop_perc = mac_df['property_percentile'].mean()

                if pd.isna(safety):
                    safety = 50.0
                if pd.isna(civic):
                    civic = 50.0
                if pd.isna(prop_perc):
                    prop_perc = 50.0
            else:
                safety, civic, prop_perc = 50.0, 50.0, 50.0
 
            # Calculate variance using the ML prediction
            percent_diff = mac_df['perk'].mean()
 
            score = calculate_volora_rental_score(
                percent_diff=percent_diff,
                safety_score=safety,
                civic_score=civic,
                prop_percentile=prop_perc
            )
            mac_df['deal_sheet'] = mac_df.apply(
                    lambda row: calculate_volora_rental_score(
                        percent_diff=row['perk'],
                        safety_score=row.get('safety_score', np.nan),
                        civic_score=row.get('civic_responsiveness_percentile', np.nan),
                        prop_percentile=row.get('property_percentile', np.nan)
                    ),
                    axis=1
                )            
            suburb_scores = mac_df.groupby('location')['deal_sheet'].mean().dropna() if {'location', 'deal_sheet'}.issubset(mac_df.columns) else pd.Series(dtype=float).head(6)

            if len(suburb_scores) > 1:
                macro_mean = suburb_scores.mean()
                macro_std = suburb_scores.std()

                outlier_chart_data = [
                    {
                        "location": loc,
                        "deal_score": round(score, 1),
                        "is_outlier": bool(score > macro_mean + macro_std or score < macro_mean - macro_std)
                    }
                    for loc, score in suburb_scores.sort_values(ascending=False).items()
                ]
            else:
                outlier_chart_data = []

            macro_deal_score_mean = round(suburb_scores.mean(), 1) if not suburb_scores.empty else 0
            perk_std = sub_df['perk'].std()
            perk_n = sub_df['perk'].count()
            perk_sem = perk_std / (perk_n ** 0.5) if perk_n > 0 else 0

            # flag as biased only if avg deviates more than ~1.5 standard errors from zero
            bias_threshold = 1.5 * perk_sem if perk_sem > 0 else 2

            perk_values = sub_df['perk'].dropna().tolist()
            bias_direction = (
                "underestimates" if avg_var < -bias_threshold
                else "overestimates" if avg_var > bias_threshold
                else "balanced"
            )

            bias_chart_data = {
                "values": [round(v, 1) for v in perk_values],
                "avg_bias": avg_var,
                "direction": bias_direction,
                "bias_threshold": round(bias_threshold, 2)
            }

            def get_deposit_chart(seg_df):
                if seg_df.empty:
                    return {"chart": [], "coverage_pct": 0}

                seg_df = seg_df.copy()
                lease_labels = ['Short Term', 'Long Term']
                seg_df['lease_term_clean'] = seg_df['lease_term'].astype(str).str.strip().str.title()

                lease_counts = seg_df['lease_term_clean'].value_counts().reindex(lease_labels, fill_value=0)
                chart = [{"range": l, "count": int(lease_counts[l])} for l in lease_labels]

                coverage_pct = round((seg_df['lease_term_clean'].isin(lease_labels).sum() / len(seg_df)) * 100, 1) if len(seg_df) > 0 else 0

                return {"chart": chart, "coverage_pct": coverage_pct}

            deposit_overall = get_deposit_chart(sub_df)
            deposit_b05 = get_deposit_chart(b05_df)
            deposit_b1 = get_deposit_chart(b1_df)
            deposit_b2 = get_deposit_chart(b2_df)
            deposit_b3 = get_deposit_chart(b3_df)
            deposit_b4 = get_deposit_chart(b4_df)
            deposit_b5 = get_deposit_chart(b5_df)

        # 5. Re turn JSON to React (Variables will be 0 if the suburb was empty)
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
            'three_bed': three_bed,
            'sqrent_four':sqrent_four,
            'sqrent_five':sqrent_five,
            'sqrent_half':sqrent_05,
            'avgrent_four': avgrent_four,
            'avgrent_five': avgrent_five,
            'avgrent_half': avgrent_05,
            'four_bed':four_bed,
            'five_bed':five_bed,
            'half_bed':zero_bed,
            'dom_chart_data': dom_chart_data,
            "scatter_data": scatter_data,
            'avg_var': avg_var,
            'avg_med': avg_med,
            "outliers_excluded": outliers_excluded,
            "market_pulse": market_pulse,
            "mac_top6": mac_top6_data, 
            "mac_velo": mac_velo,
            "outlier_chart_data": outlier_chart_data,
            "macro_deal_score_mean": macro_deal_score_mean,
            "bias_chart_data": bias_chart_data,
            'b5_velo':b5_velo,
            'b4_velo':b4_velo,
            'b3_velo':b3_velo,
            'b2_velo':b2_velo,
            'b1_velo':b1_velo,
            'b05_velo':b05_velo,
            'b05_var': b05_var,
            'b1_var':b1_var,
            'b2_var':b2_var,
            'b3_var':b3_var,
            'b4_var':b4_var,
            'b5_var':b5_var,
            'b05_med': b05_med,
            'b1_med':b1_med,
            'b2_med':b2_med,
            'b3_med':b3_med,
            'b4_med':b4_med,
            'b5_med':b5_med,
            'deposit_overall': deposit_overall,
            'deposit_b05': deposit_b05,
            'deposit_b1': deposit_b1,
            'deposit_b2': deposit_b2,
            'deposit_b3': deposit_b3,
            'deposit_b4': deposit_b4,
            'deposit_b5': deposit_b5

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
    is_pet_friedndly : int = 0
    has_balcony: int = 0         
    has_patio: int = 0
    deposit: str = "0"           # FIXED: Matched type hint to string




@app.post("/api/predict-quick")
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
        'is_pet_friendly': prop.is_pet_friedndly,                     
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
    expected_columns = mod4.feature_name_
    input_encoded = input_encoded.reindex(columns=expected_columns, fill_value=0)
    
    actual_rands, lower_price, high_price, interval_width_pct = predict_with_bounds(input_encoded)

    Listing_input=input_df.iloc[0].to_dict() 


    # 5. Calculate Scores
    percentage_difference = 0.0
    price_difference = 0.0

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
    # Location + proptype already enforced here
    potential_matches = lookup_db[
        (lookup_db['location'].str.lower().str.strip() == clean_input_location) &
        (lookup_db['proptype'].str.lower() == clean_proptype.lower())
    ].copy()

    matched_urls = []

    if not potential_matches.empty:
        # --- 2. Define matching rules ---

        # Floor: bypass if input floor not given, else strict 7 sqm radius
        if input_val['floor'] > 0:
            floor_match = abs(potential_matches['floor'] - input_val['floor']) <= 7
        else:
            floor_match = pd.Series(True, index=potential_matches.index)

        # Must sit inside Volora's predicted bounds — hard rule
        price_bounds = (np.exp(potential_matches['price']) >= lower_price) & (np.exp(potential_matches['price']) <= high_price)

        # Rule: Exact matches for binary/categorical features (used for % score only)
        exact_features = [
            'gar', 'has_pool', 'is_gated', 'has_study',
            'has_garden', 'mentions_renovated', 'mentions_luxury',
            'mentions_new_build', 'has_balcony', 'has_patio', 'has_internet',
            'is_furnished', 'has_backup', 'is_HouseShare', 'has_sercurity',
            'has_ocean_view', 'has_mountain_view', 'near_promenade'
        ]

        match_scores = pd.DataFrame(index=potential_matches.index)
        for feat in exact_features:
            db_col = 'bed' if feat == 'beds' else feat
            if db_col in potential_matches.columns and feat in input_df.columns:
                match_scores[feat] = potential_matches[db_col] == input_val[feat]

        match_scores['floor_flex'] = floor_match
        match_scores['price_bounds'] = price_bounds

        # --- 3. Calculate the percentage score ---
        total_features_checked = len(match_scores.columns)
        potential_matches['match_percentage'] = (match_scores.sum(axis=1) / total_features_checked) * 100

        # --- 4. Hard rules: floor, bounds, location/proptype (already filtered),
        #         same beds, same bath — THEN 65% feature match threshold ---
        strong_matches = potential_matches[
            (potential_matches['match_percentage'] >= 65.0) &
            (potential_matches['beds'] == input_val['beds']) &
            (potential_matches['bath'] == input_val['bath']) &
            (price_bounds) &
            (floor_match)
        ]

        if not strong_matches.empty:
            strong_matches = strong_matches.sort_values(by='match_percentage', ascending=False)
            strong_matches = strong_matches.sort_values(by='last_seen_date', ascending=False)
            strong_matches = strong_matches.head(6)
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
        'matches': matched_urls 
    }



@app.post("/clean-url")
async def proxy_clean_url(request: Request):
    try:
        # 1. Grab the JSON payload sent from Next.js
        payload = await request.json()
        
        # 2. Forward that exact payload to the R Plumber server running in the background
        # (Make sure the "/clean-url" part matches whatever you named the route inside your r_api_url.R file!)
        r_response = requests.post("http://127.0.0.1:8001/clean-url", json=payload, timeout=30)
        
        # 3. Send the R script's response directly back to Next.js
        return r_response.json()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"R Pipeline Failed: {str(e)}")