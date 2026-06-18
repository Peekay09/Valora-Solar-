library(rvest)
library(tibble)
library(tidyverse)
library(randomForest)
library(httr)
library(jsonlite)
library(DBI)
library(RPostgres)
library(stringr)





trg_url<-data.frame(url=c("https://www.property24.com/houses-to-rent/alias/northern-suburbs/22/western-cape/9",
                          "https://www.property24.com/apartments-to-rent/alias/northern-suburbs/22/western-cape/9",
                          "https://www.property24.com/townhouses-to-rent/alias/northern-suburbs/22/western-cape/9",
                          "https://www.property24.com/houses-to-rent/alias/southern-suburbs/25/western-cape/9",
                          "https://www.property24.com/apartments-to-rent/alias/southern-suburbs/25/western-cape/9",
                          "https://www.property24.com/townhouses-to-rent/alias/southern-suburbs/25/western-cape/9",
                          "https://www.property24.com/houses-to-rent/cape-town-city-centre/cape-town/western-cape/9138",
                          "https://www.property24.com/apartments-to-rent/cape-town-city-centre/cape-town/western-cape/9138",
                          "https://www.property24.com/townhouses-to-rent/cape-town-city-centre/cape-town/western-cape/9138",
                          "https://www.property24.com/houses-to-rent/alias/southern-peninsula/24/western-cape/9",
                          "https://www.property24.com/apartments-to-rent/alias/southern-peninsula/24/western-cape/9",
                          "https://www.property24.com/townhouses-to-rent/alias/southern-peninsula/24/western-cape/9",
                          "https://www.property24.com/houses-to-rent/alias/cape-flats/18/western-cape/9",
                          "https://www.property24.com/apartments-to-rent/alias/cape-flats/18/western-cape/9",
                          "https://www.property24.com/townhouses-to-rent/alias/cape-flats/18/western-cape/9",
                          "https://www.property24.com/houses-to-rent/alias/helderberg/23/western-cape/9",
                          "https://www.property24.com/apartments-to-rent/alias/helderberg/23/western-cape/9",
                          "https://www.property24.com/townhouses-to-rent/alias/helderberg/23/western-cape/9",
                          "https://www.property24.com/houses-to-rent/alias/blaauwberg-coast/21/western-cape/9",
                          "https://www.property24.com/apartments-to-rent/alias/blaauwberg-coast/21/western-cape/9",
                          "https://www.property24.com/townhouses-to-rent/alias/blaauwberg-coast/21/western-cape/9",
                          "https://www.property24.com/houses-to-rent/alias/atlantic-seaboard/20/western-cape/9",
                          "https://www.property24.com/apartments-to-rent/alias/atlantic-seaboard/20/western-cape/9",
                          "https://www.property24.com/townhouses-to-rent/alias/atlantic-seaboard/20/western-cape/9"),
                    
                    type=c("house","apt","townhouse","house","apartment","townhouse","house","apt","townhouse","house","apt","townhouse","house","apt","townhouse","house","apt","townhouse","house","apt","townhouse","house","apt","townhouse"),
                    suburb=c("Northern Suburbs","Northern Suburbs","Northern Suburb","Sorthern Sububs","Southern Suburb","Southern Suburb","CTCC","CTCC","CTCC","S penisula","S penisula","S penisula","Cape Flats","Cape Flats","Cape Flats","Helderberg","Helderberg","Helderberg","Blaauwbergstrand","Blaauwbergstrand","Blaauwbergstrand","Atlantic","Atlantic","Atlantic"))

supabase<-dbConnect(RPostgres::Postgres(),dbname= 'postgres',host= "aws-0-eu-west-1.pooler.supabase.com",port=5432,user = "postgres.nmxwfsqpgtrrmqfqlgfo",password = Sys.getenv('SUPERKEY'))



for(i in 1:nrow(trg_url)){
  cur_url= trg_url$url[i]
  cur_type=trg_url$type[i]
  cur_area=trg_url$suburb[i]
  
  final_raw<-tibble()
  final_bed<-tibble()
  final_feat<-tibble()
  final_type<-tibble()
  final_span<-tibble()
  final_location<-tibble()
  final_houseshare<-tibble()
  
  
  pg_num<-1
  sesh_url<-session(cur_url)
  prop<-tibble()
  
  
  
  while(!is.null(sesh_url)){
    message(paste('scraping',pg_num))
    
    listing<-sesh_url%>%html_elements(css = '.p24_regularTile') 
    
    
    text_price<-listing%>%html_element(css  = '.p24_price')%>%html_text(trim =T)
    text_room<-listing%>%html_element(css = '.p24_icons')%>%html_text(trim = T)
    text_location<-listing%>%html_element(css ='.p24_location')%>%html_text()
    text_span<-listing%>%html_element(css = '.p24_size')%>%html_text(trim = T)
    text_HS<-listing%>%html_element(css = '.p24_sharedRentalBadge')%>%html_text()
    text_listings_url<-listing%>%html_element(css = 'a')%>%html_attr('href')
    
    
    final_raw<-bind_rows(final_raw,tibble(price=text_price))
    final_bed<-bind_rows(final_bed,tibble(bed=text_room))
    final_span<-bind_rows(final_span,tibble(size=text_span))
    final_location<-bind_rows(final_location,tibble(location=text_location))
    
    
    prop_raw<-tibble(price=text_price,bed=text_room,location=text_location,HS=text_HS,prop_url=text_listings_url)
    
    
    
    
    prop<-bind_rows(prop_raw,prop)
    
    sesh_url<-tryCatch({
      sesh_url%>%session_follow_link(xpath = '//div[contains(@class, "p24_pager")]//a[contains(concat( " ", @class, " " ), concat( " ", "pull-right", " " ))]')
    },error=function(e) NULL)
    
    
    if(is.null(sesh_url)){
      message('end of road ')
      break     
    }
    
    pg_num<-pg_num+1
    Sys.sleep(runif(1, min=2, max=10))
  }
  
  if(nrow(prop) == 0){next}
  
  bed_raw<-prop%>%mutate(bed=str_squish(bed),bed=str_sub(bed,start =5 ))
  bedrooms_final3<-prop%>%mutate(bed=str_squish(bed))%>%separate(col = bed,into = c('beds','bath','gar','span',"span_xtra",'span_leftovers'),sep = " ",fill = 'right')
  bed3.1<-bedrooms_final3%>%mutate(span=case_when(span<9 & str_detect(span_xtra,'\\d') ~as.numeric(paste0(span,span_xtra)) ,T~as.numeric(span)))
  bedrooms_final4<-bed3.1%>%mutate(across(c(beds,gar,bath,span),as.character))%>%mutate(across(c(beds,bath,gar,span),parse_number))
  
  bd_draft<-bedrooms_final4%>%mutate(span=case_when(12<beds~beds,12<bath~bath,15<gar~gar,T~span))
  bd_draft1<-bd_draft%>%mutate(beds=case_when(beds==span~'0909',T~as.character(beds)))
  bd_draft2<-bd_draft1%>%mutate(bath=case_when(bath==span~'0909',T~as.character(bath)))
  bd_draft3<-bd_draft2%>%mutate(gar=case_when(gar==span~'0909',T~as.character(gar)))
  final_span2<-final_span%>%mutate(size=str_sub(size,end = -3))
  
  
  final_1.1<-bd_draft3%>%mutate(price=str_remove_all(price,' '))
  final_1.2<-final_1.1%>%mutate(across(price,~ifelse(str_detect(price,'From'),NA,price)))
  final_raw2<-final_1.2%>%filter(str_detect(price,"\\d"))%>%mutate(price=case_when(str_detect(price,'perweek')~as.numeric(parse_number(price))*4,str_detect(price,'perday')~as.numeric(parse_number(price))*30,T~parse_number(price)))
  
  df_NA<-final_raw2%>%mutate(beds=case_when(beds=="0909"~NA,T~beds),span=case_when(span=="0909"~NA,T~span),gar=case_when(gar=="0909"~NA,T~gar),bath=case_when(bath=="0909"~NA,T~bath))
  df_NA<-df_NA%>%mutate(across(c(beds,bath,span,gar),as.numeric))
  
  file_name <- paste0(cur_type, "_", cur_area)
  
  dbWriteTable(supabase,name = file_name,value = df_NA,overwrite=T)
  
  
}


trg_dbfiles<-tibble(file=c("apt_CTCC","house_CTCC","townhouse_CTCC","apt_S penisula","house_S penisula","townhouse_S penisula","apartment_Southern Suburb","house_Sorthern Sububs",
                           "townhouse_Southern Suburb","apt_Northern Suburbs","house_Northern Suburbs","townhouse_Northern Suburb","apt_Atlantic","house_Atlantic","townhouse_Atlantic",
                           "apt_Blaauwbergstrand","house_Blaauwbergstrand","townhouse_Blaauwbergstrand","apt_Cape Flats",'house_Cape Flats',"apt_Helderberg",
                           "house_Helderberg","townhouse_Helderberg"),
                    name=c("APT_ctcc","house_ctcc","to_ctcc","APT_peninsula","house_peninsula","to_peninsula","APT_southern","house_southern",
                           "to_southern","APT_northern","house_northern","to_northern","APT_atlantic","house_atlantic","to_atlantic",
                           "APT_BBstrand","house_BBstrand","to_BBstrand","APT_Capeflats",'house_Capeflats',"APT_helderberg",
                           "house_helderberg","to_helderberg"))               

test_tibble<-tibble()
train_ALL<-tibble()


for (i in 1:nrow(trg_dbfiles)){
  cur=trg_dbfiles$file[i]
  cur_name=trg_dbfiles$name[i]
  space<-paste0('')
  
  
  
  df_raw2 <-dbGetQuery(supabase,paste0('select * from "',cur,'"')) %>%mutate(across(c(price,span,beds,bath,gar),as.numeric))
  train_data<-df_raw2%>%mutate(price=log(price))
  
  
  
  
  
  
  
  
  
  
  
  df_raw<-train_data%>%mutate(across(c(beds,span,bath,gar),as.numeric))%>%summarise(avgbed=mean(beds,na.rm=T),avgbth=mean(bath,na.rm=T),avggar=mean(gar,na.rm=T),avgspan=mean(span,na.rm = T))
  df_raw3<-train_data%>%select(-span_xtra,-span_leftovers)
  df_raw3<-df_raw3%>%mutate(beds=case_when(is.na(beds)~as.numeric(df_raw$avgbed),T~beds),bath=case_when(is.na(bath)~as.numeric(df_raw$avgbth),T~bath),gar=case_when(is.na(gar)~as.numeric(df_raw$avggar),T~gar),span=case_when(is.na(span)~as.numeric(df_raw$avgspan),T~span))
  df_raw4<-df_raw3%>%mutate(across(c(beds,bath,span,gar),round),price=as.character(price),price=str_remove_all(price,' '),price=parse_number(price))
  df_raw5<-df_raw4%>%mutate(span=case_when(span<10~0,T~as.numeric(span)),span=round(span,digits = 2))
  df_raw6<-df_raw5%>%mutate(is_HouseShare=ifelse(is.na(HS),0,1))%>%select(-HS)
  df_raw7<-df_raw6%>%mutate(beds=case_when(beds==0~0.5,T~beds),type=cur_name)
  df_raw7<-df_raw7%>%mutate(proptype=case_when(str_detect(type,'house')~'house',str_detect(type,'APT')~'Apartment',str_detect(type,'to')~'townhouse',T~type),region=case_when(str_detect(type,'atlantic')~'Atlantic',
                                                                                                                                                                              str_detect(type,'helderberg')~'helderberg',
                                                                                                                                                                              str_detect(type,'BBstrand')~'Blaauwbergstrand',
                                                                                                                                                                              str_detect(type,'Capeflats')~'cape flats',
                                                                                                                                                                              str_detect(type,'peninsula')~'S penisula',
                                                                                                                                                                              str_detect(type,'ctcc')~'Cape Town City Centre',
                                                                                                                                                                              str_detect(type,'southern')~'Southern suburbs',
                                                                                                                                                                              str_detect(type,'northern')~'Northern Suburb',T~'unknown'))
  
  
  df_raw7<-df_raw7%>%mutate(location=as.character(location))
  
  train_ALL<-bind_rows(train_ALL,df_raw7)
  
}

# ==============================================================================
# 1. DATABASE MAINTENANCE: PRICE TRACKING & RETURNING LISTINGS
# ==============================================================================
cat("\n=== STARTING VOLORA CDC & DEDUPLICATION ===\n")

# Pull the latest known prices and URLs for all active listings
existing_data <- dbGetQuery(supabase, '
  SELECT DISTINCT ON (url) 
    url, 
    price AS price_old 
  FROM "FINAL DAILY RENTAL DATA" 
  ORDER BY url, date_scraped DESC
')

# A. DETECT PRICE CHANGES (Drops & Hikes)
price_changes <- train_ALL %>%
  rename(url = prop_url) %>%
  inner_join(existing_data, by = "url") %>%
  filter(price != price_old) %>%
  mutate(
    price_new  = price,
    price_diff = price - price_old,
    price_drop = price_diff < 0,
    pct_change = round((price_diff / price_old) * 100, 2),
    date_changed = as.character(Sys.Date())
  ) %>%
  select(url, location, price_new, price_old, price_diff, price_drop, pct_change, date_changed)

if (nrow(price_changes) > 0) {
  # 1. Write the history log to your tracking table
  dbWriteTable(supabase, "price_tracking_df", price_changes, append = TRUE)
  
  # 2. Update the master table to reflect the live price and increment the drop counter
  for (j in 1:nrow(price_changes)) {
    dbExecute(supabase, sprintf(
      'UPDATE "FINAL DAILY RENTAL DATA" 
       SET price = %f, 
           price_drop_count = price_drop_count + 1 
       WHERE url = \'%s\'',
      price_changes$price_new[j], price_changes$url[j]
    ))
  }
  cat(sprintf("Detected and logged %d price changes (Drops: %d | Hikes: %d).\n", 
              nrow(price_changes), sum(price_changes$price_drop), sum(!price_changes$price_drop)))
} else {
  cat("No price changes detected today.\n")
}

# B. UPDATE DAYS ON MARKET (For all returning listings)
returning_listings <- train_ALL %>% filter(prop_url %in% existing_data$url)

if (nrow(returning_listings) > 0) {
  ids_sql <- paste0("('", paste(returning_listings$prop_url, collapse = "','"), "')")
  dbExecute(supabase, sprintf(
    'UPDATE "FINAL DAILY RENTAL DATA"
     SET days_on_market = days_on_market + 1,
         last_seen_date = \'%s\'
     WHERE url IN %s',
    Sys.Date(), ids_sql
  ))
  cat(sprintf("Updated days_on_market for %d returning listings.\n", nrow(returning_listings)))
}

# C. GHOST DECAY (Market cleared flag)
today_urls_sql <- paste0("('", paste(train_ALL$prop_url, collapse = "','"), "')")
dbExecute(supabase, sprintf(
  'UPDATE "FINAL DAILY RENTAL DATA"
   SET market_cleared = TRUE,
       days_on_market = days_on_market + 1
   WHERE url NOT IN %s
     AND market_cleared = FALSE
     AND last_seen_date < CURRENT_DATE - INTERVAL \'45 days\'',
  today_urls_sql
))

# ==============================================================================
# 2. ISOLATE BRAND NEW LISTINGS FOR SCRAPER API
# ==============================================================================
train_ALL_new <- train_ALL %>%
  filter(!prop_url %in% existing_urls$url)

cat(sprintf("\n=== API OPTIMIZATION ===\n"))
cat(sprintf("Total scraped today: %d\n", nrow(train_ALL)))
cat(sprintf("Already in DB (Skipping ScraperAPI): %d\n", nrow(train_ALL) - nrow(train_ALL_new)))
cat(sprintf("New listings to deep-scrape: %d\n\n", nrow(train_ALL_new)))

if(nrow(train_ALL_new) == 0) {
  cat("No new listings today. Pipeline finished successfully! 🎉\n")
  quit(save = "no") # Safely stops the script here
}

# ==============================================================================
# 3. SCRAPER API DEEP-SCRAPE (ONLY ON NEW URLS)
# ==============================================================================
trg_propurl <- tibble(url = train_ALL_new$prop_url)
trg_propurl2 <- trg_propurl %>%
  mutate(url = paste0('https://www.property24.com', url)) %>%
  mutate(url = str_remove_all(url, ' '))

final_feat_new <- tibble()
my_api_key <- Sys.getenv('APISUPERKEY')

for (i in 1:nrow(trg_propurl2)){
  message('Deep scraping ', i, ' of ', nrow(trg_propurl2))
  cur_url = trg_propurl2$url[i]
  curr_url = trg_propurl$url[i]
  
  ScraperAPI_url <- paste0("http://api.scraperapi.com/?api_key=", my_api_key, "&url=", URLencode(cur_url))
  
  page_response <- tryCatch({
    GET(ScraperAPI_url, timeout(10))
  }, error = function(e) { NULL })
  
  if (!is.null(page_response) && status_code(page_response) == 200) {
    html_url <- read_html(page_response)
    
    text_feat <- html_url %>% html_element(xpath = '//*[contains(concat( " ", @class, " " ), concat( " ", "p24_keyFeaturesWrapper", " " ))]') %>% html_text(trim = T)
    text_floorspan <- html_url %>% html_element(xpath = "//div[contains(text(), 'Floor Size')]/following-sibling::div/div") %>% html_text(trim=T)
    text_erf <- html_url %>% html_element(xpath = "//div[contains(text(), 'Erf Size')]/following-sibling::div/div") %>% html_text(trim = TRUE)
    text_deposit <- html_url %>% html_element(xpath = "//div[contains(text(), 'Deposit Requirements')]/following-sibling::div/div") %>% html_text(trim=T)
    text_desc <- html_url %>% html_element(xpath = '//*[contains(concat( " ", @class, " " ), concat( " ", "p24_expandedText", " " ))]') %>% html_text(trim = T)
    text_leaseperiod <- html_url %>% html_element(xpath ="//div[contains(text(), 'Lease Period')]/following-sibling::div/div") %>% html_text(trim = T)
    
    df <- tibble(feat=text_feat, floorspan=text_floorspan, url=curr_url, erf=text_erf, deposit=text_deposit, desc=text_desc, lease_period=text_leaseperiod)
    final_feat_new <- bind_rows(final_feat_new, df)
  } else {
    message('dead at index ', i)
  }
  
  Sys.sleep(runif(1, min = 1, max = 1))
}
message("🎉 Deep Scraping Complete!")

# ==============================================================================
# 4. FULL CLEANING & FEATURE ENGINEERING
# ==============================================================================
# Function to clean lease data
clean_lease_data <- function(df) {
  df %>%
    mutate(
      lease_term = case_when(
        str_detect(tolower(lease_period), "year|annual|long|12|13|14|24|1\\s*yr|1\\+") ~ "Long Term",
        str_detect(tolower(lease_period), "6|7|8|9|10|11") & !str_detect(tolower(lease_period), "1-6|1 - 6|1 to 6") ~ "Long Term",
        str_detect(tolower(lease_period), "short|daily|night|month.*to.*month|monthly|flexible") ~ "Short Term",
        str_detect(tolower(lease_period), "\\b(1|2|3|4|5|4\\.5|2\\.5)\\b") ~ "Short Term",
        str_detect(tolower(lease_period), "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec") ~ "Short Term",
        is.na(lease_period) | str_detect(tolower(lease_period), "na|n/a") ~ NA_character_,
        TRUE ~ "Short Term"
      )
    )
}

# Pull StreetSignal API data
API <- GET('https://streetsignal.co.za/api//v1/suburbs.json')
api_text <- content(API, 'text', encoding = 'utf-8')
streetsignal_suburb_df <- fromJSON(api_text) %>% rename(location = name)

# Merge and clean
new_fully_cleaned <- train_ALL_new %>%
  rename(url = prop_url) %>%
  select(-any_of(c("floorspan", "erf"))) %>%
  inner_join(final_feat_new, by = 'url') %>%
  
  mutate(
    feat_clean = coalesce(as.character(feat), ""),
    desc_clean = coalesce(as.character(desc), ""),
    is_furnished      = as.integer(str_detect(feat_clean, '(?i)Furnished')),
    has_pool          = as.integer(str_detect(feat_clean, '(?i)Pool')),
    has_internet      = as.integer(str_detect(feat_clean, '(?i)Internet')),
    has_inverter      = as.integer(str_detect(feat_clean, '(?i)Inverter')),
    has_solar_panels  = as.integer(str_detect(feat_clean, '(?i)Solar Panels')),
    has_backup        = has_inverter + has_solar_panels,
    has_sercurity     = as.integer(str_detect(desc_clean, '(?i)24-hour security|24-hour manned security|24/7 security|secure estate|estate')),
    has_mountain_view = as.integer(str_detect(desc_clean, '(?i)mountain views|table mountain views')),
    has_ocean_view    = as.integer(str_detect(desc_clean, '(?i)sea views|ocean views|sea-facing|beachfront|panoramic view')),
    is_modern         = as.integer(str_detect(desc_clean, '(?i)newly renovated|modern|renovated|contemporary|luxary'))
  ) %>%
  mutate(
    floorspan = parse_number(as.character(str_remove_all(floorspan, ' '))),
    erf       = parse_number(as.character(str_remove_all(erf, ' ')))
  ) %>%
  group_by(proptype, location) %>%
  mutate(
    fl_location_avg  = mean(floorspan, na.rm = TRUE),
    erf_location_avg = mean(erf,       na.rm = TRUE)
  ) %>%
  mutate(
    floor = case_when(
      floorspan <= erf                                        ~ floorspan,
      floorspan > erf                                         ~ erf,
      !is.na(floorspan) & is.na(erf)                          ~ floorspan,
      !is.na(erf) & is.na(floorspan) & proptype == 'Apartment'~ erf,
      !is.na(erf) & is.na(floorspan)                          ~ erf / 2,
      TRUE                                                    ~ fl_location_avg
    ),
    erf_size = case_when(
      erf >= floorspan                                        ~ erf,
      floorspan > erf                                         ~ floorspan,
      !is.na(erf) & is.na(floorspan)                          ~ erf,
      proptype == 'Apartment'                                 ~ floor,
      TRUE                                                    ~ erf_location_avg
    )
  ) %>%
  ungroup() %>%
  select(-fl_location_avg, -erf_location_avg, -feat_clean, -desc_clean, -desc, -feat) %>%
  
  # Apply Suburb Mappings
  mutate(
    macro_suburb = case_when(
      location %in% c("Aurora", "Clara Anna Fontein", "D'urbanvale", "Durbanville Central", "Durbanville Hills", "Eversdal", "Eversdal Heights", "Goedemoed", "Kenridge", "Kenridge Heights", "Pinehurst", "Protea Valley", "Proteaville", "Sonstraal", "Sonstraal East", "Sonstraal Heights", "Stellenberg", "Stellenridge", "Stellenryk", "Uitzicht", "Valmary Park", "Van Riebeeckshof", "Vierlanden", "Welgedacht", "Wellway Park East") ~ 'Durbanville',
      location %in% c("Amanda Glen", "Blommendal", "Blomtuin", "Bo Oakdale", "Boston","Tyger Waterfront","Ridgeworth", "Chrismar", "De Bron", "Door De Kraal", "Hoheizen", "Kempenville","Bellville Central","Oakdale", "Loevenstein", "Loucharmante", "Oakglen", "Oostersee","Tyger Waterfront","Tygerfalls","Tyger Valley", "Oude Westhof", "Welgemoed") ~ "Bellville",
      location %in% c("Bracken Heights", "Brackenfell Central", "Brackenfell South", "De Oude Spruit", "Drostdy Park", "Eden Park", "Ferndale", "Hoogstede", "Morgenster", "Morgenster Heights", "Protea Heights", "Protea Village", "Sonkring", "Welgelee") ~ "Brackenfell",
      location %in% c("Avalon Estate", "Belmont Park", "Bonnie Brae", "Buh Rein Estate", "Camelot", "Kraaifontein East", "Langeberg Heights", "Langeberg Ridge", "Le Coste Estate", "Peerless Park East", "Peerless Park North", "Scottsdene", "Windsor Park", "Zonnendal", "Zoo Park") ~ "Kraaifontein",
      location %in% c("Aan de Wijnlanden", "Amandelrug", "Amandelsig", "Bardale Village", "Bergsig", "Beverly Park", "De Wijnlanden Residential Estate", "Eikenbosch", "Forest Glade", "Gaylee", "Haasendal", "Hagley","Kuilsrivier Industria", "Heather Park", "Highbury", "Highbury Park", "Hillcrest Heights", "Jagtershof", "Jakarandas", "Klipdam", "Kuils River South", "Riverton", "Rouxville", "Rustdal", "Soneike", "Stellendale", "Sunset Glen", "The Conifers") ~ "Kuils River",
      location %in% c("Avondale", "Bothasig", "Burgundy Estate", "Churchill Estate", "De Tijger", "Edgemead", "Goodwood Central", "Goodwood Estate", "Halali", "Hamilton Estate", "Kleinbosch", "Monte Vista","Parow North", "Panorama", "Parow Central", "Parow Valley", "Plattekloof","Parow East", "Plattekloof 2", "Plattekloof 3", "Plattekloof Glen", "Ravensmead", "Richwood", "Ruyterwacht", "Townsend Estate", "Tygerdal", "Vasco Estate", "Welgelegen", "Welgelegen 1") ~ "Parow",
      location %in% c("Bonteheuwel", "Kensington", "Maitland", "Montana", "Pinelands", "The Hague", "Thornton", "Tuscany Glen") ~ "Other",
      location %in% c("Constantia", "Constantia Heights", "Constantia Hill Estate", "Bel Ombre", "Zwaanswyk", "The Vines Estate","Bishopscourt", "Bishopscourt Village") ~ "Constantia",
      location %in% c("Rondebosch","Rondebosch Park Estate", "Rondebosch East","Rosebank", "Rondebosch Village","Newlands") ~ "Rondebosch & Newlands",
      location %in% c("Claremont", "Claremont Upper","Claremont Vlliage", "Harfield Village", "Kenilworth", "Kenilworth Upper") ~ "Claremont & Kenilworth",
      location %in% c("Tokai", "Stonehurst Mountain Estate", "Silvertree Estate", "Kirstenhof", "Westlake", "Steenberg Golf Estate") ~ "Tokai & Steenberg",
      location %in% c("Observatory", "Mowbray", "Salt River") ~ "Observatory",
      location %in% c("Plumstead", "Diep River", "Southfield", "Elfindale") ~ "Plumstead",
      location %in% c("Ottery", "Wetton", "Ferness Estate", "Grassy Park", "Lotus River", "Retreat", "Kewtown") ~ "Ottery/Cape Flats",
      location %in% c("Wynberg", "Wynberg Upper", "Kenwyn") ~ "Wynberg",
      location %in% c("Greenpoint","Fresnaye","Gardens","Cape Town City Centre") ~ 'Cape Town City Centre',
      location %in% c("Seapoint","Green Point","Clifton","Camps Bay","Bantry Bay","Bakoven","Sea Point","Mouille Point","Foreshore","Three Anchor Bay") ~ 'Atlantic Seaboard',
      location %in% c("Chapman's Bay Estate", "Chapmans Peak", "Crofters Valley", "Noordhaven", "Noordhoek Manor") ~ "Noordhoek",
      location %in% c("Bellvue", "Belvedere", "Clovelly", "Fish Hoek", "Milkwood Park", "Peers Hill Estate", "Stonehaven Estate", "Sun Valley", "Sunnydale") ~ "Fish Hoek",
      location %in% c("Froggy Farm", "Glencairn", "Glencairn Heights", "Harbour Heights", "Murdock Valley", "Red Hill", "San Michel", "Seaforth", "Simons Kloof", "Simons Town Central", "The Boulders", "Welcome Glen") ~ "Simons Town",
      location %in% c("Bluewater Estate", "Capri", "Imhoffs Gift", "Klein Slangkop", "Kommetjie", "Lake Michelle Security and Eco Estate") ~ "Kommetjie",
      location %in% c("Scarborough") ~ "Scarborough",
      location %in% c("Athlone", "Belgravia", "Bridgetown", "Crawford", "Gatesville", "Gleemoor", "Heideveld", "Penlyn Estate", "Rylands", "Vanguard", "Welcome") ~ "Athlone",
      location %in% c("Bay View", "Colorado Park", "Lentegeur", "Portlands", "Strandfontein", "Strandfontein Village", "Westridge") ~ "Mitchells Plain",
      location %in% c("Strand ", "Greenways Golf Estate", "Lochnerhof", "Mansfield", "Rusthof", "Twin Palms", "Westridge", "Broadlands Village") ~ "Strand",
      location %in% c("Gordons Bay Central", "Gordons Bay Village", "Anchorage Park", "Gordon Heights", "Harbour Island", "Steenbras View") ~ "Gordon's Bay",
      location %in% c("Erinvale Golf Estate", "Schonenberg", "Somerset Lakes") ~ "Erinvale & Other Estates",
      location %in% c("Sitari Country Estate", "Croydon Vineyard Estate", "Kelderhof Country Village") ~ "Country/Eco Estates",
      location %in% c("Briza", "Bel'aire", "Bakkershoogte", "La Concorde", "La Sandra", "Montclair") ~ "Briza ",
      location %in% c("Mountainside", "Dennegeur") ~ "Mountainside & Dennegeur",
      location %in% c("Admirals Park", "Dornhill", "Fernwood", "Goedehoop", "Golden Acre", "Guldenland", "Helderberg Estate", "Helderberg Village", "Helderrand","Somerset West Mall Triangle", "Schapenberg Estate", "Somerset Heights", "Southfork", "Steynsrust", "Tre Donne Estate", "Whispering Pines", "Somerset West Central") ~ "Somerset Central",
      location %in% c("Table View", "Sunridge", "West Riding") ~ "Table View",
      location %in% c("Bloubergstrand", "Beachfront", "Blouberg Rise", "Blouberg Sands") ~ "Bloubergstrand",
      location %in% c("Milnerton Central", "Milnerton Ridge", "Brooklyn", "Lagoon Beach", "Paarden Eiland", "Rugby", "Sanddrift", "Sunset Beach", "Sunset Links", "Tijgerhof", "Woodbridge Island") ~ "Milnerton",
      location %in% c("Century City", "Summer Greens") ~ "Century City",
      location %in% c("Parklands", "Parklands East", "Parklands North") ~ "Parklands",
      location %in% c("Sandown", "Sandown Estate", "Rivergate", "Sagewood") ~ "Sandown",
      location %in% c("Melkbosstrand Central", "Atlantic Beach Golf Estate", "Duynefontein", "Van Riebeeckstrand") ~ "Melkbosstrand",
      location %in% c("Atlantis Central", "Atlantis Industrial", "Saxonsea", "Sherwood") ~ "Atlantis",
      TRUE ~ 'unknown'
    ),
    
    # StreetSignal location standardization
    location = case_when(
      location=="D'urbanvale"~"D'Urbanvale", location=='Buh Rein Estate'~'Buh-Rein Estate', location=='Avondale'~'Avondale Parow', location=='Aan de Wijnlanden'~'Aan De Wijnlanden Estate', location=="Bel'aire"~"Bel'Aire", location=='Bellville Central'~'Bellville CBD', location=='Bishopscourt Village'~'Bishopscourt', location=='Bloubergstrand'~'Blaauwbergstrand', location=='Claremont Upper'~'Claremont', location=='Constantia Heights'~'Constantia', location=='Durbanville Central'~'Durbanville', location=='Eden Park'~'Edenpark', location=='Erinvale Golf Estate'~'Erinvale Estate', location=='Glencairn Heights'~'Glencairn', location=='Eikenbosch'~'Eikenbosch Kuils River', location=='Goodwood Central'~'Goodwood Ext 1', location=='Glenlilly'~'Glenlily', location=='Gordons Bay Central'~'Gordons Bay', location=='Greenways Golf Estate'~'Greenways', location=='High Riding Country Estate'~'High Riding', location=='Gordon Strand Estate'~'Gordons Strand Estate', location=='Joostenbergvlakte'~'Joostenbergvlakte Smallholdings', location=='Kelderhof Country Village'~'Kelderhof', location=='Kenilworth Upper'~'Kenilworth', location=='Kleinbron Estate'~'Kleinbron', location=='Kleinbron Park'~'Kleinbron', location=='Klipheuwel'~'Klipheuwel Housing Scheme', location=='Kuils River South'~'Kuilsrivier South Smallholdings', location=='Kuilsrivier Industria'~'Kuilsrivier South Smallholdings', location=='Langeberg Heights'~'Langeberg Hoogte', location=='Longdown'~'Longdown Estate', location=='Melkbosstrand Central'~'Melkbosch Strand', location=='Milnerton Central'~'Milnerton', location=='Noordhaven'~'Noordhoek', location=='Oostersee'~'Oosterzee-Bellville', location=='Jakarandas'~'Jacarandas', location=='Paardevlei'~'Paarde Vlei', location=='Parklands East'~'Parklands', location=='Parklands North'~'Parklands', location=='Parow Central'~'Parow', location=='Plattekloof'~'Plattekloof 1', location=='Portlands'~'Portland', location=='Rondebosch Village'~'Rondebosch', location=='San Michel'~"Simon's Town", location=='Seaforth'~"Simon's Town", location=='Simons Kloof'~"Simon's Town", location=='Simons Town Central'~"Simon's Town", location=='Somerset Heights'~'Somerset West', location=='Somerset West Central'~'Somerset West', location=='Soneike'~'Soneike I', location=='Steenberg Golf Estate'~'Steenberg', location=='Strand Central'~'Strand', location=='Strand North'~'Strand', location=='Strand South'~'Strand', location=='Tre Donne Estate'~'Tre Donne', location=='Tyger Valley'~'Tygervalley', location=='Tyger Waterfront'~'Tygervalley Waterfront', location=='Vredenberg'~'Vredenberg-Bellville', location=='Welgelegen 1'~'Welgelegen', location=='Westridge'~'Westridge - Mitchells Plain', location=='Wynberg Upper'~'Wynberg', location=='Strandfontein Village'~'Strandfontein', location=='Welgelegen 3'~'Welgelegen', location=='Chapmans Peak'~'Noordhoek', location=='Crofters Valley'~'Noordhoek', location=='Somerset West Mall Triangle'~'Somerset West', location=='Zwaanswyk'~'Constantia',
      TRUE ~ location
    )
  ) %>%
  
  # Join StreetSignal and process final columns
  left_join(streetsignal_suburb_df, by = 'location') %>%
  mutate(
    safety_score = ifelse(is.na(safety_score), 50, safety_score),
    taxi_routes = ifelse(is.na(taxi_routes), 0, taxi_routes),
    risk_profile = ifelse(is.na(risk_profile), 'Moderate reported crime', risk_profile),
    school_count = ifelse(is.na(school_count), 0, school_count),
    healthcare_facilities_5km = ifelse(is.na(healthcare_facilities_5km), 0, healthcare_facilities_5km)
  ) %>%
  group_by(macro_suburb) %>%
  mutate(
    median_gv = ifelse(is.na(median_gv), median(median_gv, na.rm = TRUE), median_gv),
    civic_responsiveness_percentile = ifelse(is.na(civic_responsiveness_percentile), median(civic_responsiveness_percentile, na.rm = TRUE), civic_responsiveness_percentile),
    property_percentile = ifelse(is.na(property_percentile), median(property_percentile, na.rm = TRUE), property_percentile)
  ) %>%
  ungroup() %>%
  mutate(
    median_gv = ifelse(is.na(median_gv), median(median_gv, na.rm = TRUE), median_gv),
    civic_responsiveness_percentile = ifelse(is.na(civic_responsiveness_percentile), 50, civic_responsiveness_percentile),
    property_percentile = ifelse(is.na(property_percentile), 50, property_percentile),
    has_backup = ifelse(has_inverter == 1 | has_solar_panels == 1, 1, 0)
  ) %>%
  select(-any_of(c("coordinates", "slug"))) %>%
  group_by(macro_suburb, proptype) %>%
  mutate(
    flavg = mean(floor, na.rm = TRUE),
    erfavg = mean(erf_size, na.rm = TRUE),
    floor = ifelse(is.na(floor), flavg, floor),
    erf_size = ifelse(is.na(erf_size), erfavg, erf_size)
  ) %>%
  ungroup() %>%
  
  # Final Volora Pipeline States
  clean_lease_data() %>%
  mutate(
    days_on_market = 0,
    price_drop_count = 0, # Note: Price diffs logic is handled separately in dedup if you add it back, but new ones are 0
    market_cleared = FALSE,
    first_seen_date = Sys.Date(),
    last_seen_date = Sys.Date(),
    date_scraped = as.character(Sys.Date())
  )

# ==============================================================================
# 5. ATOMIC APPEND TO DATABASE
# ==============================================================================
cat(sprintf("Ready to append %d fully cleaned NEW listings to the database.\n", nrow(new_fully_cleaned)))

dbBegin(supabase)
tryCatch({
  dbWriteTable(supabase, "FINAL DAILY RENTAL DATA", new_fully_cleaned, append = TRUE)
  dbCommit(supabase)
  cat("✅ PIPELINE SUCCESS: Database securely updated.\n")
}, error = function(e) {
  dbRollback(supabase)
  cat(sprintf("❌ PIPELINE FAILED - Rolled back changes: %s\n", e$message))
})