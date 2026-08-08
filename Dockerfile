# 1. Start with a lightweight Python base
FROM python:3.11-slim

# 2. Install R and Linux system dependencies required by rvest, readr, plumber & PostgreSQL
RUN apt-get update && apt-get install -y \
    r-base \
    libxml2-dev \
    libcurl4-openssl-dev \
    libssl-dev \
    libpq-dev \
    libgomp1 \
    libsodium-dev \
    gcc \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*
# 3. Set working directory inside the container
WORKDIR /app

# 4. Copy Python requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Install your exact R package stack
RUN R -e "install.packages(c('plumber', 'dplyr', 'stringr', 'rvest', 'tidyr', 'readr', 'lightgbm', 'httr', 'jsonlite'), repos='http://cran.rstudio.com/')"

# 6. Copy application code (FastAPI scripts, R scripts, models)
COPY . .

# 7. Expose the port for Azure Container Apps
EXPOSE 8000

# 8. Launch the API server (Correctly pointing to fastapi_py.py!)
# Copy the startup script and give it execution permissions
COPY start.sh .
RUN chmod +x start.sh

# Launch both servers using the script
CMD ["./start.sh"]