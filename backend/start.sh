#!/bin/bash

# 1. Turn on the R Plumber API in the background (using port 8001)
Rscript -e "pr <- plumber::plumb('r_api_url.R'); pr\$run(host='127.0.0.1', port=8001)" &

# 2. Turn on the FastAPI server in the foreground (using port 8000)
uvicorn fastapi_py:app --host 0.0.0.0 --port 8000