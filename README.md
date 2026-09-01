# Tremor – Solar

`Solar` is a website template from [Tremor](https://tremor.so). It's built
using [`Tremor`](https://tremor.so/docs/getting-started/installation) and
[Next.js](https://nextjs.org).

# Volora

**Instant, defensible rental valuations for the Cape Town property market.**

Paste a Property24 URL. Get a rental estimate with a confidence band in seconds — built on a model trained on live Cape Town listings, not national averages or stale assumptions.

🔗 [vlok.vercel.app](https://vlok.vercel.app)

---

## Why Volora exists

Cape Town's rental market moves fast and locally — a Sea Point one-bedroom and a Claremont one-bedroom are not the same asset, and generic national AVMs treat them like they are. Agents currently price by gut feel, a handful of recent comps, and whatever the last listing on the street did. That's slow, inconsistent, and hard to defend to a landlord who thinks their unit is worth 15% more than it is.

Volora exists to give agents a number they can stand behind in a client meeting — not a black box, a **defensible estimate with a stated confidence range**, built on a model that knows Cape Town suburb-by-suburb.

---

## What it does

1. **Input**: a Property24 listing URL
2. **Pipeline**: matches it against live local comps → runs it through a LightGBM model trained on ~9K Cape Town listings
3. **Output**: a rental valuation + confidence band, bench marked  and aggregated suburb level statistics against real comparable stock in the same suburb tier


---

## Who it's for

- **Real estate agents** (primary, paying customer) — a fast second opinion before they price a mandate, and a tool that makes them look sharper in front of landlords
- **Tenants / consumers** (freemium layer) — a sanity check before they sign

---

## Tech stack

| Layer | Tool |
|---|---|
| Scraping pipeline | R / Plumber |
| Database | Supabase (PostgreSQL) |
| Model | LightGBM (Python) |
| Inference API | FastAPI on Azure Container Apps |
| Frontend | Next.js / TypeScript on Vercel |
| Suburb quality signal | StreetSignal data |
| Mapping | Mapbox |

---

## Current state

- Model: LightGBM, R² ~0.77–0.80, MAE ~13% against live listings
- Deployed and live at vlok.vercel.app
- Currently in **pilot phase** with Cape Town agents 

