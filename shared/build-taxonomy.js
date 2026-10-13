// Builds shared/taxonomy.json from Razorpay's published onboarding taxonomy
// (Sub-merchant Onboarding API appendix: 20 categories, ~330 sub-categories) and Razorpay's
// Terms, Part A §17 "Prohibited products and services" (45 items).
//
// Status rules are explicit here so a reviewer can audit them. The rules are a product
// reading of public documents, not Razorpay's internal policy. "needs_review" means a human
// reviewer decides and the seller should NOT be told "you'll be approved".
//
// Run: node shared/build-taxonomy.js

const fs = require("fs");
const path = require("path");

// category -> sub-category codes, verbatim from the appendix (duplicates removed).
const RAW = {
  financial_services: "mutual_fund lending cryptocurrency insurance nbfc cooperatives pension_fund forex securities commodities accounting financial_advisor crowdfunding trading betting get_rich_schemes moneysend_funding wire_transfers_and_money_orders tax_preparation_services tax_payments digital_goods atms",
  education: "college schools university professional_courses distance_learning day_care coaching elearning vocational_and_trade_schools sporting_clubs dance_halls_studios_and_schools correspondence_schools",
  healthcare: "pharmacy clinic hospital lab dietician fitness health_coaching health_products drug_stores healthcare_marketplace osteopaths medical_equipment_and_supply_stores podiatrists_and_chiropodists dentists_and_orthodontists hardware_stores ophthalmologists orthopedic_goods_stores testing_laboratories doctors health_practitioners_medical_services",
  ecommerce: "ecommerce_marketplace agriculture books electronics_and_furniture coupons rental fashion_and_lifestyle gifting grocery baby_products office_supplies wholesale religious_products pet_products sports_products arts_and_collectibles sexual_wellness_products drop_shipping crypto_machinery tobacco weapons_and_ammunitions stamps_and_coins_stores office_equipment automobile_parts_and_equipements garden_supply_stores household_appliance_stores non_durable_goods pawn_shops electrical_parts_and_equipment wig_and_toupee_shops gift_novelty_and_souvenir_shops duty_free_stores office_and_commercial_furniture dry_goods books_and_publications camera_and_photographic_stores record_shops meat_supply_stores leather_goods_and_luggage snowmobile_dealers men_and_boys_clothing_stores paint_supply_stores automotive_parts jewellery_and_watch_stores auto_store_home_supply_stores tent_stores shoe_stores_retail petroleum_and_petroleum_products department_stores automotive_tire_stores sport_apparel_stores variety_stores chemicals_and_allied_products commercial_equipments fireplace_parts_and_accessories family_clothing_stores fabric_and_sewing_stores home_supply_warehouse art_supply_stores camper_recreational_and_utility_trailer_dealers clocks_and_silverware_stores discount_stores school_supplies_and_stationery second_hand_stores watch_and_jewellery_repair_stores liquor_stores boat_dealers opticians_optical_goods_and_eyeglasse_stores wholesale_footwear_stores cosmetic_stores home_furnishing_stores antique_stores plumbing_and_heating_equipment telecommunication_equipment_stores women_clothing florists computer_software_stores building_matrial_stores candy_nut_confectionery_shops glass_and_wallpaper_stores commercial_photography_and_graphic_design_services video_game_supply_stores fuel_dealers drapery_and_window_coverings_stores hearing_aids_stores automotive_paint_shops durable_goods_stores uniforms_and_commercial_clothing_stores fur_shops industrial_supplies bicycle_stores motorcycle_shops_and_dealers children_and_infants_wear_stores women_accessory_stores construction_materials books_periodicals_and_newspaper floor_covering_stores crystal_and_glassware_stores accessory_and_apparel_stores hardware_equipment_and_supply_stores computers_peripheral_equipment_software automobile_and_truck_dealers aircraft_and_farm_equipment_dealers antique_shops_sales_and_repairs music_stores furniture_and_home_furnishing_store",
  services: "repair_and_cleaning interior_design_and_architect movers_and_packers legal event_planning service_centre consulting ad_and_marketing services_classifieds multi_level_marketing construction_services architectural_services car_washes motor_home_rentals stenographic_and_secretarial_support_services chiropractors automotive_service_shops shoe_repair_shops telecommunication_service fines security_agencies tailors type_setting_and_engraving_services small_appliance_repair_shops photography_labs dry_cleaners massage_parlors electronic_repair_shops cleaning_and_sanitation_services nursing_care_facilities direct_marketing lottery veterinary_services affliated_auto_rental alimony_and_child_support airport_flying_fields golf_courses tire_retreading_and_repair_shops television_cable_services recreational_and_sporting_camps barber_and_beauty_shops agricultural_cooperatives carpentry_contractors wrecking_and_salvaging_services automobile_towing_services video_tape_rental_stores miscellaneous_repair_shops motor_homes_and_parts horse_or_dog_racing laundry_services electrical_contractors debt_marriage_personal_counseling_service air_conditioning_and_refrigeration_repair_shops credit_reporting_agencies heating_and_plumbing_contractors carpet_and_upholstery_cleaning_services swimming_pools roofing_and_metal_work_contractors internet_service_providers recreational_camps masonry_contractors exterminating_and_disinfecting_services ambulance_services funeral_services_and_crematories metal_service_centres copying_and_blueprinting_services fuel_dispensers welding_repair mobile_home_dealers concrete_work_contractors boat_rentals personal_shoppers_and_shopping_clubs door_to_door_sales travel_related_direct_marketing lottery_and_betting bands_orchestras_and_miscellaneous_entertainers furniture_repair_and_refinishing contractors direct_marketing_and_subscription_merchants typewriter_stores_sales_service_and_rentals recreation_services direct_marketing_insurance_services business_services inbound_telemarketing_merchants public_warehousing outbound_telemarketing_merchants clothing_rental_stores transportation_services electric_razor_stores service_stations photographic_studio professional_services",
  housing: "developer facility_management rwa coworking realestate_classifieds space_rental",
  not_for_profit: "charity educational religious personal",
  social: "matchmaking social_network messaging professional_network neighbourhood_network political_organizations automobile_associations_and_clubs country_and_athletic_clubs associations_and_membership",
  media_and_entertainment: "video_on_demand music_streaming multiplex content_and_publishing ticketing news video_game_arcades video_tape_production_and_distribution bowling_alleys billiard_and_pool_establishments amusement_parks_and_circuses ticket_agencies",
  gaming: "game_developer esports online_casino fantasy_sports gaming_marketplace",
  it_and_software: "saas paas iaas consulting_and_outsourcing web_development technical_support data_processing",
  food: "online_food_ordering restaurant food_court catering alcohol restaurant_search_and_booking dairy_products bakeries",
  utilities: "electricity gas telecom water cable broadband dth internet_provider bill_and_recharge_aggregators",
  government: "central state intra_government_purchases goverment_postal_services",
  logistics: "freight courier warehousing distribution end_to_end_logistics courier_services",
  tours_and_travel: "aviation accommodation ota travel_agency tourist_attractions_and_exhibits timeshares aquariums_dolphinariums_and_seaquariums",
  transport: "cab_hailing bus train_and_metro automobile_rentals cruise_lines parking_lots_and_garages transportation bridge_and_road_tolls freight_transport truck_and_utility_trailer_rentals",
  others: "others",
};

const CATEGORY_LABEL = {
  financial_services: "Financial services", education: "Education", healthcare: "Healthcare", ecommerce: "E-commerce & retail",
  services: "Services", housing: "Housing & real estate", not_for_profit: "Not for profit", social: "Social & community",
  media_and_entertainment: "Media & entertainment", gaming: "Gaming", it_and_software: "IT & software", food: "Food & beverages",
  utilities: "Utilities", government: "Government", logistics: "Logistics", tours_and_travel: "Tours & travel", transport: "Transport", others: "Other",
};

// ---- Status rules -------------------------------------------------------------------------
// not_supported: on Razorpay's prohibited list (Terms Part A §17) or banned by Indian law.
const NOT_SUPPORTED = {
  "financial_services.cryptocurrency": "Terms §17: virtual currency, crypto products, NFTs",
  "financial_services.betting": "Terms §17: gaming/gambling, sports bets",
  "financial_services.get_rich_schemes": "Terms §17: get-rich-quick and pyramid schemes",
  "financial_services.wire_transfers_and_money_orders": "Terms §17: unlicensed money service / value-transfer businesses",
  "financial_services.moneysend_funding": "Terms §17: money laundering / unlicensed MSB",
  "financial_services.securities": "Terms §17: securities and government bonds",
  "ecommerce.tobacco": "Terms §17: tobacco, cigarettes and related products",
  "ecommerce.weapons_and_ammunitions": "Terms §17: firearms, ammunition, knives, armaments",
  "ecommerce.drop_shipping": "Terms §17: drop-shipped merchandise",
  "ecommerce.crypto_machinery": "Terms §17: crypto products",
  "ecommerce.liquor_stores": "Terms §17: alcohol and alcoholic beverages",
  "ecommerce.duty_free_stores": "Terms §17: alcohol/tobacco; regulated goods",
  "ecommerce.fur_shops": "Terms §17: hides, skins and other animal parts",
  "ecommerce.pawn_shops": "Terms §17: businesses in legally ambiguous scope; regulated goods",
  "food.alcohol": "Terms §17: alcohol and alcoholic beverages",
  "services.lottery": "Terms §17: lotteries, sweepstakes and games of chance",
  "services.lottery_and_betting": "Terms §17: lotteries and betting",
  "services.horse_or_dog_racing": "Terms §17: betting and games of chance",
  "services.multi_level_marketing": "Terms §17: multi-level marketing collection fees, matrix schemes",
  "services.massage_parlors": "Terms §17: services prone to buy-and-deny chargebacks (adult-adjacent)",
  "services.door_to_door_sales": "Terms §17: work-at-home / door-to-door schemes with potential to deceive",
  "services.outbound_telemarketing_merchants": "Terms §17: database providers for tele-callers; TRAI-prohibited activities",
  "services.credit_reporting_agencies": "Terms §17: regulated / legally ambiguous scope",
  "gaming.online_casino": "Terms §17: online gambling",
  "ecommerce.sexual_wellness_products": "Terms §17: adult goods and services",
};

// needs_review: legal, but a licence, registration or bank-partner approval is checked by a human.
const NEEDS_REVIEW = {
  "financial_services.*": "Regulated financial activity; licence and bank-partner approval checked by a reviewer",
  "healthcare.pharmacy": "Drug licence (Form 20/21) and FSSAI/CDSCO checks by a reviewer",
  "healthcare.drug_stores": "Drug licence checked by a reviewer",
  "healthcare.health_products": "Claims about cures are prohibited; product list checked by a reviewer",
  "healthcare.healthcare_marketplace": "Marketplace model and licences checked by a reviewer",
  "ecommerce.petroleum_and_petroleum_products": "Regulated goods; dealer licence checked",
  "ecommerce.fuel_dealers": "Regulated goods; dealer licence checked",
  "ecommerce.chemicals_and_allied_products": "Hazardous materials are prohibited; product list checked",
  "ecommerce.agriculture": "Pesticides are regulated; product list checked",
  "ecommerce.meat_supply_stores": "FSSAI licence and live-animal rules checked",
  "ecommerce.stamps_and_coins_stores": "Counterfeit risk; stock provenance checked",
  "ecommerce.antique_stores": "Provenance and endangered-species rules checked",
  "ecommerce.antique_shops_sales_and_repairs": "Provenance and endangered-species rules checked",
  "ecommerce.second_hand_stores": "Provenance checked",
  "ecommerce.coupons": "Monetisable credits are restricted; model checked",
  "ecommerce.ecommerce_marketplace": "Marketplace: seller KYC model checked by a reviewer",
  "ecommerce.wholesale": "B2B volumes; invoices checked",
  "services.direct_marketing": "Direct-marketing and subscription models checked",
  "services.direct_marketing_and_subscription_merchants": "Subscription billing model checked",
  "services.direct_marketing_insurance_services": "Insurance distribution needs IRDAI licence",
  "services.travel_related_direct_marketing": "Timeshare and travel-club models checked",
  "services.inbound_telemarketing_merchants": "TRAI rules checked",
  "services.personal_shoppers_and_shopping_clubs": "Membership-club models checked",
  "services.debt_marriage_personal_counseling_service": "Counselling and debt services checked",
  "services.security_agencies": "PSARA licence checked",
  "services.fines": "Collection on behalf of an authority checked",
  "services.alimony_and_child_support": "Court-related payments checked",
  "services.ambulance_services": "Healthcare licensing checked",
  "services.nursing_care_facilities": "Healthcare licensing checked",
  "services.telecommunication_service": "TRAI licensing checked",
  "services.internet_service_providers": "DoT licensing checked",
  "services.television_cable_services": "Licensing checked",
  "services.wrecking_and_salvaging_services": "Regulated goods checked",
  "not_for_profit.*": "12A/80G and FCRA checks by a reviewer; donations are handled as a separate model",
  "social.matchmaking": "Terms §17 lists online matchmaking as legally ambiguous; reviewer decides",
  "social.political_organizations": "Political funding rules checked",
  "gaming.fantasy_sports": "Real-money fantasy is reviewed state by state",
  "gaming.gaming_marketplace": "In-game credits that can be monetised are restricted; model checked",
  "gaming.esports": "Prize-money models checked",
  "media_and_entertainment.video_on_demand": "Content and mature-material rules checked",
  "media_and_entertainment.content_and_publishing": "Content rules checked",
  "media_and_entertainment.news": "Content rules checked",
  "tours_and_travel.timeshares": "Timeshare models checked",
  "tours_and_travel.ota": "Agent-model and IATA status checked",
  "tours_and_travel.travel_agency": "Advance-collection risk; cancellation terms checked",
  "transport.cruise_lines": "Advance-collection risk checked",
  "housing.developer": "RERA registration checked",
  "housing.realestate_classifieds": "Listing model checked",
  "utilities.bill_and_recharge_aggregators": "Aggregator model checked",
  "government.*": "Government entity documents checked",
  "others.others": "Not in the standard list; a reviewer reads the description",
  "education.day_care": "Child-care licensing checked",
  "food.dairy_products": "FSSAI licence checked",
  "healthcare.lab": "NABL/registration checked",
  "healthcare.testing_laboratories": "Registration checked",
  "financial_services.accounting": "Professional service; fine, but listed under financial services so a reviewer confirms scope",
  "financial_services.tax_preparation_services": "Professional service; reviewer confirms scope",
};
// Explicit supported overrides inside otherwise-reviewed categories.
const SUPPORTED_OVERRIDE = new Set(["financial_services.accounting", "financial_services.tax_preparation_services"]);

// Extra documents by sub-category or category (on top of PAN, bank proof, address).
const EXTRA_DOCS = {
  "food.*": ["FSSAI registration or licence"],
  "healthcare.pharmacy": ["Drug licence (Form 20/21)"],
  "healthcare.drug_stores": ["Drug licence (Form 20/21)"],
  "healthcare.clinic": ["Clinic registration / practitioner registration"],
  "healthcare.hospital": ["Hospital registration"],
  "healthcare.doctors": ["Medical council registration"],
  "healthcare.dentists_and_orthodontists": ["Dental council registration"],
  "healthcare.lab": ["Lab registration"],
  "education.college": ["Affiliation / recognition letter"],
  "education.university": ["UGC recognition"],
  "education.schools": ["School recognition certificate"],
  "financial_services.insurance": ["IRDAI licence"],
  "financial_services.lending": ["RBI NBFC registration or lending licence"],
  "financial_services.nbfc": ["RBI NBFC registration"],
  "financial_services.mutual_fund": ["SEBI / AMFI registration"],
  "financial_services.forex": ["RBI authorised-dealer licence"],
  "not_for_profit.*": ["12A and 80G certificates", "FCRA certificate if receiving foreign donations"],
  "tours_and_travel.travel_agency": ["IATA / Ministry of Tourism recognition if any"],
  "logistics.*": ["Transport / GST registration"],
  "housing.developer": ["RERA registration"],
  "services.security_agencies": ["PSARA licence"],
  "ecommerce.wholesale": ["GST registration", "Purchase invoices from suppliers"],
};
// Reseller document: when the seller buys finished goods from others, a purchase invoice is asked.
const RESELLER_CATEGORIES = new Set(["ecommerce"]);

// Hinglish / colloquial keywords for the sub-categories small sellers actually describe.
// (Everything else is retrievable through its label words.)
const KEYWORDS = {
  "ecommerce.jewellery_and_watch_stores": "jewellery jewelry gold silver chandi sona haar necklace earrings jhumka bangles kangan ring mangalsutra artificial imitation oxidised beads watch ghadi",
  "ecommerce.fashion_and_lifestyle": "kapde clothes dress kurti saree sari lehenga suit salwar boutique fashion garments stitching readymade instagram reseller",
  "ecommerce.women_clothing": "kurti saree sari lehenga suit salwar dupatta ladies women garments boutique",
  "ecommerce.men_and_boys_clothing_stores": "shirt tshirt jeans kurta pajama men gents boys garments",
  "ecommerce.children_and_infants_wear_stores": "kids baby bachon ke kapde frock",
  "ecommerce.shoe_stores_retail": "shoes chappal sandal juti jooti footwear sneakers",
  "ecommerce.cosmetic_stores": "cosmetics makeup lipstick beauty products skincare mehndi henna nail",
  "ecommerce.gifting": "gift gifting hamper return gifts diwali rakhi customised personalised mug frame",
  "ecommerce.arts_and_collectibles": "painting art handicraft handmade craft resin candles macrame pottery terracotta madhubani",
  "ecommerce.home_furnishing_stores": "home decor cushion bedsheet curtain rug carpet wall hanging",
  "ecommerce.furniture_and_home_furnishing_store": "furniture sofa bed table chair almirah wooden",
  "ecommerce.grocery": "grocery kirana rashan ration atta dal rice masala spices dry fruits organic",
  "ecommerce.religious_products": "puja pooja samagri idol murti rudraksh agarbatti diya temple",
  "ecommerce.books": "books kitab notes stationery second hand",
  "ecommerce.school_supplies_and_stationery": "stationery pen notebook copy school supplies",
  "ecommerce.electronics_and_furniture": "electronics mobile phone accessories charger earphones gadgets laptop",
  "ecommerce.telecommunication_equipment_stores": "mobile phone accessories cover charger earphones",
  "ecommerce.computers_peripheral_equipment_software": "laptop computer keyboard mouse refurbished",
  "ecommerce.hardware_equipment_and_supply_stores": "hardware tools drill nuts bolts paint plumbing sanitary",
  "ecommerce.building_matrial_stores": "cement bricks sand tiles building material",
  "ecommerce.pet_products": "pet dog cat food accessories aquarium fish",
  "ecommerce.sports_products": "sports cricket bat ball gym equipment yoga mat",
  "ecommerce.baby_products": "baby diapers toys kids",
  "ecommerce.agriculture": "seeds beej khad fertilizer nursery plants kheti agri",
  "ecommerce.garden_supply_stores": "plants nursery gamla pots gardening seeds",
  "ecommerce.florists": "flowers phool bouquet",
  "ecommerce.candy_nut_confectionery_shops": "chocolates candy toffee sweets mithai dry fruits",
  "ecommerce.meat_supply_stores": "meat chicken mutton fish eggs non veg",
  "ecommerce.automobile_parts_and_equipements": "car bike spare parts auto parts accessories",
  "ecommerce.bicycle_stores": "cycle bicycle",
  "ecommerce.camera_and_photographic_stores": "camera lens photography equipment",
  "ecommerce.music_stores": "guitar tabla harmonium musical instruments",
  "ecommerce.wholesale": "wholesale thok bulk b2b distributor",
  "ecommerce.ecommerce_marketplace": "marketplace multi vendor sellers platform",
  "ecommerce.drop_shipping": "dropshipping drop shipping aliexpress supplier ships directly",
  "ecommerce.tobacco": "cigarette tobacco gutka vape e-cigarette hookah beedi",
  "ecommerce.sexual_wellness_products": "adult sex toys condoms lingerie intimate",
  "ecommerce.liquor_stores": "wine beer whisky daru sharab liquor",
  "ecommerce.second_hand_stores": "second hand used purana old refurbished thrift",
  "ecommerce.rental": "rent kiraya rental lease costume camera",
  "ecommerce.coupons": "coupons vouchers gift cards discount codes",
  "ecommerce.industrial_supplies": "industrial machinery spare parts factory",
  "ecommerce.fabric_and_sewing_stores": "fabric cloth kapda thaan sewing tailoring material",
  "ecommerce.leather_goods_and_luggage": "bags purse wallet belt leather luggage",
  "ecommerce.women_accessory_stores": "accessories bags clips hair accessories scrunchies",
  "ecommerce.crypto_machinery": "mining rig crypto miner",
  "ecommerce.weapons_and_ammunitions": "knife gun airgun ammunition pepper spray",
  "food.bakeries": "cake cakes cookies bakery bake biscuits brownies cupcakes homemade ghar ka",
  "food.online_food_ordering": "tiffin dabba home food homemade achaar pickle papad masala ladoo mithai sweets snacks namkeen cloud kitchen delivery",
  "food.restaurant": "restaurant dhaba cafe hotel khana canteen",
  "food.catering": "catering caterer shaadi party bulk orders",
  "food.dairy_products": "milk doodh paneer ghee curd dahi dairy",
  "food.alcohol": "beer wine liquor bar sharab daru",
  "education.coaching": "tuition coaching classes teach padhana padhai students batch jee neet",
  "education.elearning": "online course courses udemy recorded video lectures",
  "education.professional_courses": "certification skill course training",
  "education.dance_halls_studios_and_schools": "dance classes zumba music classes singing",
  "education.vocational_and_trade_schools": "computer course tailoring course beautician training skill",
  "education.sporting_clubs": "cricket academy football coaching sports club",
  "education.day_care": "creche day care playschool",
  "services.consulting": "consulting consultant advice strategy",
  "services.professional_services": "freelance freelancer professional services ca lawyer",
  "services.ad_and_marketing": "digital marketing social media management ads agency instagram growth",
  "services.event_planning": "event planner wedding shaadi decoration dj",
  "services.barber_and_beauty_shops": "salon parlour parlor beauty makeup artist mehndi bridal hair",
  "services.tailors": "tailor darzi stitching silai boutique alteration",
  "services.repair_and_cleaning": "repair cleaning service plumber electrician",
  "services.electronic_repair_shops": "mobile repair laptop repair phone repair",
  "services.photographic_studio": "photographer photography studio wedding shoot videography",
  "services.commercial_photography": "photography",
  "services.interior_design_and_architect": "interior design architect",
  "services.legal": "lawyer advocate legal vakil",
  "services.laundry_services": "laundry dhobi ironing press",
  "services.dry_cleaners": "dry clean",
  "services.movers_and_packers": "packers movers shifting",
  "services.veterinary_services": "vet veterinary pet doctor",
  "services.massage_parlors": "massage spa body massage",
  "services.multi_level_marketing": "mlm network marketing downline referral income join under me",
  "services.lottery": "lottery lucky draw",
  "services.lottery_and_betting": "betting satta matka",
  "services.direct_marketing_and_subscription_merchants": "subscription monthly plan membership",
  "services.debt_marriage_personal_counseling_service": "counselling counseling astrology astrologer jyotish kundli horoscope tarot vastu numerology pandit puja online",
  "services.fines": "challan fine penalty",
  "services.security_agencies": "security guards agency",
  "services.cleaning_and_sanitation_services": "housekeeping cleaning pest control",
  "services.business_services": "business services bpo outsourcing",
  "services.car_washes": "car wash detailing",
  "services.automotive_service_shops": "car service garage mechanic bike service",
  "services.transportation_services": "transport tempo truck",
  "it_and_software.saas": "saas software subscription app startup tool",
  "it_and_software.web_development": "website development web developer app development coding",
  "it_and_software.consulting_and_outsourcing": "it services software consulting",
  "it_and_software.technical_support": "tech support",
  "healthcare.pharmacy": "medicines dawai pharmacy medical store chemist",
  "healthcare.drug_stores": "medical store chemist dawai",
  "healthcare.clinic": "clinic doctor consultation opd",
  "healthcare.fitness": "gym fitness trainer yoga personal training",
  "healthcare.dietician": "diet dietician nutrition weight loss plan",
  "healthcare.health_coaching": "wellness coach health coach",
  "healthcare.health_products": "ayurvedic supplements protein herbal products cure",
  "healthcare.doctors": "doctor consultation",
  "healthcare.lab": "pathology lab blood test",
  "healthcare.medical_equipment_and_supply_stores": "medical equipment wheelchair bp machine surgical",
  "healthcare.opticians_optical_goods_and_eyeglasse_stores": "chashma spectacles optical",
  "financial_services.cryptocurrency": "crypto bitcoin usdt nft token",
  "financial_services.trading": "trading tips stock tips calls telegram",
  "financial_services.lending": "loan udhaar lending credit",
  "financial_services.insurance": "insurance bima policy",
  "financial_services.forex": "forex currency exchange dollar",
  "financial_services.crowdfunding": "crowdfunding fundraiser donations collect contributions pay what you want",
  "financial_services.get_rich_schemes": "double your money guaranteed returns scheme investment plan",
  "financial_services.digital_goods": "digital goods game credits top up diamonds uc",
  "financial_services.accounting": "accounting bookkeeping gst filing ca",
  "financial_services.tax_preparation_services": "itr filing tax return",
  "financial_services.betting": "betting satta dream11 bet",
  "gaming.online_casino": "casino rummy poker teen patti real money",
  "gaming.fantasy_sports": "fantasy cricket fantasy sports dream11 style",
  "gaming.game_developer": "game developer indie game",
  "gaming.gaming_marketplace": "game credits skins top up",
  "gaming.esports": "esports tournament bgmi free fire entry fee prize",
  "media_and_entertainment.content_and_publishing": "youtube content creator blog podcast newsletter ebook",
  "media_and_entertainment.ticketing": "tickets event passes show",
  "media_and_entertainment.video_on_demand": "ott videos streaming",
  "not_for_profit.charity": "ngo charity donation daan trust",
  "not_for_profit.religious": "temple mandir masjid church trust donation",
  "social.matchmaking": "matrimony rishta matchmaking dating",
  "social.associations_and_membership": "club membership association society",
  "housing.rwa": "society maintenance rwa apartment",
  "housing.coworking": "coworking office space",
  "housing.space_rental": "pg hostel room rent rental",
  "housing.developer": "builder flats plots real estate",
  "tours_and_travel.travel_agency": "travel agent tour package trip holiday",
  "tours_and_travel.accommodation": "homestay hotel resort guest house",
  "transport.cab_hailing": "cab taxi",
  "transport.automobile_rentals": "car rental bike rental self drive",
  "logistics.courier": "courier parcel delivery",
  "utilities.bill_and_recharge_aggregators": "recharge bill payment",
  "others.others": "other something else",
};

// ---- Build -------------------------------------------------------------------------------
const humanise = (code) => {
  const fixes = { equipements: "equipment", matrial: "material", eyeglasse: "eyeglass", affliated: "affiliated", goverment: "government", ota: "online travel agency", rwa: "resident welfare association (RWA)", dth: "DTH", saas: "SaaS", paas: "PaaS", iaas: "IaaS", nbfc: "NBFC", atms: "ATMs" };
  return code.split("_").map((w) => fixes[w] || w).join(" ").replace(/^\w/, (c) => c.toUpperCase()).replace(/\bAnd\b/g, "and");
};
const match = (map, id) => {
  const [cat] = id.split(".");
  return map[id] !== undefined ? map[id] : map[`${cat}.*`];
};

const rows = [];
for (const [cat, list] of Object.entries(RAW)) {
  const seen = new Set();
  for (const sub of list.split(/\s+/)) {
    if (!sub || seen.has(sub)) continue;
    seen.add(sub);
    const id = `${cat}.${sub}`;
    let status = "supported", reason = null;
    if (NOT_SUPPORTED[id]) { status = "not_supported"; reason = NOT_SUPPORTED[id]; }
    else if (!SUPPORTED_OVERRIDE.has(id) && match(NEEDS_REVIEW, id) !== undefined) { status = "needs_review"; reason = match(NEEDS_REVIEW, id); }
    const row = {
      id, category: cat, categoryLabel: CATEGORY_LABEL[cat], label: sub === "others" ? "Something else" : humanise(sub), status,
    };
    if (reason) row.reason = reason;
    const extra = match(EXTRA_DOCS, id); if (extra) row.extraDocs = extra;
    if (RESELLER_CATEGORIES.has(cat) && status === "supported") row.resellerDoc = true;
    if (KEYWORDS[id]) row.keywords = KEYWORDS[id];
    rows.push(row);
  }
}

fs.writeFileSync(path.join(__dirname, "taxonomy.json"), JSON.stringify(rows, null, 1));
const n = (s) => rows.filter((r) => r.status === s).length;
console.log(`taxonomy.json: ${rows.length} sub-categories across ${Object.keys(RAW).length} categories — supported ${n("supported")}, needs_review ${n("needs_review")}, not_supported ${n("not_supported")}`);
