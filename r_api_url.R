library(plumber)
library(dplyr)
library(stringr)
library(rvest)   
library(tidyr)
library(readr)

#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  res$setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type")
  
  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 200
    return(list())
  } else {
    plumber::forward()
  }
}

#* Scrape and clean Property24 data
#* @param url
#* @post /clean-url
function(url, suburb="", macro_suburb="", region="", res) {
  
  if (missing(url)) {
    return(list(status = "Success"))
  }
  
  tryCatch({
    
    urlpage <- read_html(url)
    
    prc             <- urlpage %>% html_elements(xpath = '//*[contains(concat( " ", @class, " " ), concat( " ", "m-flex", " " ))]') %>% html_text(trim = T)
    baseicon        <- urlpage %>% html_elements(xpath = '//*[contains(concat( " ", @class, " " ), concat( " ", "p24_icons", " " ))]') %>% html_text(trim = T)
    dascript        <- urlpage %>% html_element(xpath = '//*[contains(concat( " ", @class, " " ), concat( " ", "p24_expandedText", " " ))]') %>% html_text(trim = T)
    text_feat2      <- urlpage %>% html_element(xpath = '//*[contains(concat( " ", @class, " " ), concat( " ", "p24_keyFeaturesWrapper", " " ))]') %>% html_text(trim = T)
    text_floorspan2 <- urlpage %>% html_element(xpath = "//div[contains(text(), 'Floor Size')]/following-sibling::div/div") %>% html_text(trim=T)
    text_erf2       <- urlpage %>% html_element(xpath = "//div[contains(text(), 'Erf Size')]/following-sibling::div/div") %>% html_text(trim = TRUE)
    text_deposit2   <- urlpage %>% html_element(xpath = "//div[contains(text(), 'Deposit Requirements')]/following-sibling::div/div") %>% html_text(trim=T)
    text_leaseperiod2 <- urlpage %>% html_element(xpath ="//div[contains(text(), 'Lease Period')]/following-sibling::div/div") %>% html_text(trim = T)
    text_type       <- urlpage %>% html_element(xpath = '//h1') %>% html_text()
    text_HS2        <- urlpage %>% html_element(css = '.p24_sharedRentalBadge') %>% html_text()
    
    df_url <- tibble(
      price = prc, feat = text_feat2, desc = dascript, struc = baseicon, 
      floor = text_floorspan2, erf_size = text_erf2, deposit = text_deposit2, 
      lease = text_leaseperiod2, HS = text_HS2, type = text_type
    )
    
    df_url <- df_url %>% 
      mutate(struc = str_squish(struc)) %>% 
      separate(struc, into = c('beds', 'bath', 'gar', 'leftover'), sep = ' ', fill = 'right', extra = 'drop')
    
    df_url <- df_url %>% 
      mutate(across(c(beds, bath, gar, leftover, floor, erf_size), ~ suppressWarnings(readr::parse_number(as.character(.)))))
    
    # YOUR EXACT LOGIC RESTORED: Using a numeric dummy (909090) instead of string ("0909")
    df_url <- df_url %>% mutate(leftover = case_when(12 < beds ~ beds, 12 < bath ~ bath, 15 < gar ~ gar, TRUE ~ leftover))
    df_url <- df_url %>% mutate(beds = case_when(beds == leftover ~ 909090, TRUE ~ beds))
    df_url <- df_url %>% mutate(bath = case_when(bath == leftover ~ 909090, TRUE ~ bath))
    df_url <- df_url %>% mutate(gar = case_when(gar == leftover ~ 909090, TRUE ~ gar))
    
    df_url <- df_url %>% mutate(price = str_remove_all(price, ' '))
    df_url <- df_url %>% mutate(across(price, ~ ifelse(str_detect(price, 'From'), NA, price)))
    df_url <- df_url %>% filter(str_detect(price, "\\d")) %>% mutate(price = case_when(
      str_detect(price, 'perweek') ~ as.numeric(suppressWarnings(readr::parse_number(price))) * 4,
      str_detect(price, 'perday')  ~ as.numeric(suppressWarnings(readr::parse_number(price))) * 30,
      TRUE                        ~ suppressWarnings(readr::parse_number(price))
    ))
    
    # YOUR EXACT LOGIC RESTORED: Clearing out the dummy numeric value using NA_real_ (which R accepts for numbers)
    df_url <- df_url %>% mutate(
      beds     = case_when(beds == 909090 ~ NA_real_, TRUE ~ beds),
      leftover = case_when(leftover == 909090 ~ NA_real_, TRUE ~ leftover),
      gar      = case_when(gar == 909090 ~ NA_real_, TRUE ~ gar),
      bath     = case_when(bath == 909090 ~ NA_real_, TRUE ~ bath)
    )
    
    df_url <- df_url %>% mutate(across(c(beds, bath, leftover, gar), ~ suppressWarnings(as.numeric(.))))
    
    df_url <- df_url %>% select(-leftover)
    
    df_url <- df_url %>% mutate(
      across(c(beds, bath, gar), round),
      price = as.character(price),
      price = str_remove_all(price, ' '),
      price = suppressWarnings(readr::parse_number(price))
    )
    
    df_url <- df_url %>% mutate(is_HouseShare = ifelse(is.na(HS), 0, 1)) %>% select(-HS)
    df_url <- df_url %>% mutate(beds = case_when(beds == 0 ~ 0.5, TRUE ~ beds))
    
    df_url <- df_url %>% mutate(type = case_when(
      str_detect(type, '(?i)house')     ~ 'house',
      str_detect(type, '(?i)apartment') ~ 'Apartment',
      str_detect(type, '(?i)townhouse') ~ 'townhouse',
      TRUE                              ~ NA_character_
    ))
    
    df_url <- df_url %>%
      mutate(
        lease = case_when(
          str_detect(tolower(lease), "year|annual|long|12|13|14|24|1\\s*yr|1\\+") ~ "Long Term",
          str_detect(tolower(lease), "6|7|8|9|10|11") & !str_detect(tolower(lease), "1-6|1 - 6|1 to 6") ~ "Long Term",
          str_detect(tolower(lease), "short|daily|night|month.*to.*month|monthly|flexible") ~ "Short Term",
          str_detect(tolower(lease), "\\b(1|2|3|4|5|4\\.5|2\\.5)\\b") ~ "Short Term",
          str_detect(tolower(lease), "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec") ~ "Short Term",
          is.na(lease) | str_detect(tolower(lease), "na|n/a") ~ NA_character_,
          TRUE ~ NA_character_
        )
      )
    
    df_url <- df_url %>%
      mutate(
        feat_clean = coalesce(as.character(feat), ""),
        desc_clean = coalesce(as.character(desc), ""),
        
        is_furnished        = as.integer(str_detect(feat_clean, '(?i)(?<!un)(?<!not )\\bfurnished\\b')),
        has_pool           = as.integer(str_detect(feat_clean, '(?i)(?<!no )(?<!not )\\bpool\\b(?! table)')),
        has_internet      = as.integer(str_detect(desc_clean, '(?i)fibre-ready|wifi|wi-fi'))|| as.integer(str_detect(feat_clean, '(?i)(?<!no )(?<!not )(internet|fibre)')),

        has_inverter       = as.integer(str_detect(feat_clean, '(?i)(?<!no )(?<!not )inverter')),
        has_solar_panels   = as.integer(str_detect(feat_clean, '(?i)(?<!no )(?<!not )solar panels')),
        has_garden         = as.integer(str_detect(feat_clean, '(?i)garden')),
        has_backup         = has_inverter + has_solar_panels,
        mentions_houseshare = as.integer(str_detect(desc_clean, '(?i)house[- ]?share|room to rent|room available|shared house|shared accommodation|shared living|single room|private room|roommate|room only|rent a room|sharing (house|home|property)|co[- ]?living|communal living|bachelor room|lodger')),
        has_sercurity      = as.integer(str_detect(desc_clean, '(?i)24-hour security|24-hour manned security|24/7 security|security estate|secure estate|guard|access control|boom gate|electric fence|armed response')),
        in_estate          = as.integer(str_detect(desc_clean, '(?i)\\bestate\\b')),
        in_complex         = as.integer(str_detect(desc_clean, '(?i)\\bcomplex\\b')),
        has_mountain_view  = as.integer(str_detect(desc_clean, "(?i)mountain views?|table mountain views?|lion'?s head")),
        has_ocean_view     = as.integer(str_detect(desc_clean, '(?i)sea views?|ocean views?|sea-facing|beachfront|panoramic views?')),
        is_top_floor       = as.integer(str_detect(desc_clean, '(?i)top floor|penthouse|highest floor')),
        near_promenade     = as.integer(str_detect(desc_clean, '(?i)promenade')),
        has_study          = as.integer(str_detect(desc_clean, '(?i)\\bstudy\\b|home office|study nook|study room')),
        mentions_renovated  = as.integer(str_detect(desc_clean, '(?i)newly renovated|renovations?|refurbished|remodel(l)?ed|upgraded (kitchen|bathroom|finishes|interior)|fully renovated')),
        mentions_luxury     = as.integer(str_detect(desc_clean, '(?i)\\bluxur(y|ious)\\b|high[- ]end finishes|premium finishes|exclusive (development|estate|residence)|exquisite|opulent|state[- ]of[- ]the[- ]art|top[- ]of[- ]the[- ]range|five[- ]star|5[- ]star|designer (kitchen|finishes)')),
        mentions_new_build  = as.integer(str_detect(desc_clean, '(?i)brand new (house|apartment|unit|development|build|property|complex|townhouse)|first tenant|newly built|new building|off[- ]plan|new build')),
        is_HouseShare      = ifelse(is_HouseShare == 1 | mentions_houseshare == 1, 1, 0),
        is_gated           = ifelse(in_estate == 1 | in_complex == 1, 1, 0),
        has_balcony        = as.integer(str_detect(desc_clean, '(?i)\\bbalcon(y|ies)\\b|private balcony|balcony (with|overlooking)')),
        has_patio          = as.integer(str_detect(desc_clean, '(?i)\\bpatio\\b|courtyard patio|braai patio')),
        floor_level        = case_when(
          str_detect(desc_clean, '(?i)ground floor|street level|bottom floor') ~ 0L,
          str_detect(desc_clean, '(?i)\\b1st floor|first floor\\b') ~ 1L,
          str_detect(desc_clean, '(?i)\\b2nd floor|second floor\\b') ~ 2L,
          str_detect(desc_clean, '(?i)\\b3rd floor|third floor\\b') ~ 3L,
          str_detect(desc_clean, '(?i)\\b4th floor|fourth floor\\b') ~ 4L,
          str_detect(desc_clean, '(?i)\\b5th floor|fifth floor\\b') ~ 5L,
          str_detect(desc_clean, '(?i)\\d{1,2}(st|nd|rd|th) floor') ~ as.integer(str_extract(desc_clean, '(?i)\\d{1,2}(?=(st|nd|rd|th) floor)')),
          TRUE ~ NA_integer_
        )
      ) %>%
      mutate(
        floor = case_when(
          !is.na(floor) & !is.na(erf_size) & floor <= erf_size   ~ floor,
          !is.na(floor) & !is.na(erf_size) & floor > erf_size    ~ erf_size, # FIXED: was erfsize
          !is.na(floor) & is.na(erf_size)                        ~ floor,
          is.na(floor) & !is.na(erf_size) & type == 'Apartment'  ~ erf_size,
          is.na(floor) & !is.na(erf_size)                        ~ erf_size / 2, # FIXED: was erf_ize
          TRUE                                                   ~ floor
        ),
        erf_size = case_when(
          !is.na(erf_size) & !is.na(floor) & erf_size >= floor & type == 'Apartment' ~ floor,
          !is.na(erf_size) & !is.na(floor) & erf_size >= floor                       ~ erf_size,
          !is.na(erf_size) & !is.na(floor) & floor > erf_size                        ~ floor,
          !is.na(erf_size) & is.na(floor)                                            ~ erf_size,
          is.na(erf_size) & !is.na(floor)                                            ~ floor, 
          TRUE                                                                       ~ erf_size
        )
      ) %>%
      mutate(
        floor    = suppressWarnings(as.numeric(floor)),
        erf_size = suppressWarnings(as.numeric(erf_size))
      )
    
    return(df_url)
    
  }, error = function(e) {
    res$status <- 400
    return(list(error = paste("Failed to scrape property:", e$message)))
  })
}