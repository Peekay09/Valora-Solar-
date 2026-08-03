# 1. Start with a mini-computer that already has R and Plumber installed
FROM rstudio/plumber

# 2. Install the exact R packages your scraper needs to work
RUN R -e "install.packages(c('rvest', 'httr', 'jsonlite', 'stringr','RPostgres','DBI','dplyr','tibble','tidyverse'))"

# 3. Copy everything from your GitHub folder into this mini-computer
COPY . /app

# 4. Set the working directory to that folder
WORKDIR /app

# 5. Open port 8080 so the internet (and your Next.js app) can talk to it
EXPOSE 8080

# 6. The final command to turn the Plumber API on
ENTRYPOINT ["R", "-e", "pr <- plumber::plumb('plumber.R'); pr$run(host='0.0.0.0', port=8080)"]