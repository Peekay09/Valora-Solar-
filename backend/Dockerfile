FROM python:3.11-slim

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
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN R -e "install.packages(c('plumber', 'dplyr', 'stringr', 'rvest', 'tidyr', 'readr', 'lightgbm', 'httr', 'jsonlite','digest'), repos='http://cran.rstudio.com/')"

COPY . .

EXPOSE 8000

COPY start.sh .
RUN chmod +x start.sh

CMD ["./start.sh"]