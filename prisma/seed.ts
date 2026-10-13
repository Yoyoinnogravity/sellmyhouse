import Database from "better-sqlite3";
import {
  formatFieldError,
  validatePropertyBatch,
  type AplsMetadata,
  type AplsTenure,
  type ContactType,
  type PropertySource,
} from "../src/lib/propertyStandard.ts";

type AgentSeed = {
  name: string;
  agency: string;
  phone: string;
  email: string;
  country: string;
  city?: string;
  isAvailable?: boolean;
};

type SolicitorSeed = {
  name: string;
  firm: string;
  phone: string;
  email: string;
  country: string;
};

type ExampleDraft = {
  title: string;
  price: number;
  currency: string;
  location: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  builtUp: number;
  landSize: number | null;
  tenure: AplsTenure;
  description: string;
  contactType: ContactType;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  agentEmail: string | null;
  solicitorEmail: string | null;
  areaUnit: "sqft" | "sqm";
  furnishing: string;
  yearBuilt: number;
  parking: number;
  region: "Asia" | "Global";
};

type ExampleListing = {
  title: string;
  price: number;
  currency: string;
  location: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  builtUp: number;
  landSize: number | null;
  tenure: AplsTenure;
  images: string[];
  description: string;
  contactType: ContactType;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  source: PropertySource;
  solicitorId: number | null;
  agentId: number | null;
  metadata: AplsMetadata;
};

type AgencyRow = {
  name: string;
  country: string;
};

type CountRow = {
  count: number;
};

type IdRow = {
  id: number;
};

const db = new Database("prisma/dev.db");

const agents: AgentSeed[] = [
  {
    name: "Ada Chen",
    agency: "Harbour & Co",
    phone: "555-0101",
    email: "ada@harbour.example",
    country: "Northside",
  },
  {
    name: "Ben Ortiz",
    agency: "Lane & Lane",
    phone: "555-0144",
    email: "ben@lane.example",
    country: "Riverside",
  },
  {
    name: "Priya Shah",
    agency: "Open Door",
    phone: "555-0190",
    email: "priya@opendoor.example",
    country: "Central",
  },
  {
    name: "Aina Rahman",
    agency: "Straits Homes",
    phone: "+60 3-2141 2201",
    email: "aina@straits.example",
    country: "Malaysia",
    city: "Kuala Lumpur",
  },
  {
    name: "Wei Lim",
    agency: "Merlion Realty",
    phone: "+65 6234 1108",
    email: "wei@merlion.example",
    country: "Singapore",
    city: "Tiong Bahru",
  },
  {
    name: "Niran Suk",
    agency: "Chao Phraya Estates",
    phone: "+66 2-118 4402",
    email: "niran@chaophraya.example",
    country: "Thailand",
    city: "Chiang Mai",
  },
  {
    name: "Sari Wijaya",
    agency: "Nusantara Homes",
    phone: "+62 21-550 1180",
    email: "sari@nusantara.example",
    country: "Indonesia",
    city: "Bandung",
  },
  {
    name: "Liza Cruz",
    agency: "Isla Properties",
    phone: "+63 2-8891 2204",
    email: "liza@isla.example",
    country: "Philippines",
    city: "Cebu City",
  },
  {
    name: "Linh Tran",
    agency: "Saigon Homes",
    phone: "+84 28 3822 1104",
    email: "linh@saigon.example",
    country: "Vietnam",
    city: "Da Nang",
  },
  {
    name: "Mei Cheung",
    agency: "Harbour Peak",
    phone: "+852 2801 4412",
    email: "mei@harbourpeak.example",
    country: "Hong Kong",
    city: "Kennedy Town",
  },
  {
    name: "Oliver Grant",
    agency: "Thames & Co",
    phone: "+44 20 7946 0958",
    email: "oliver@thames.example",
    country: "United Kingdom",
    city: "Islington",
  },
  {
    name: "Maya Brooks",
    agency: "Pacific Listing Co",
    phone: "+1 415 555 0148",
    email: "maya.brooks@pacific.example",
    country: "United States",
    city: "Park Slope",
  },
  {
    name: "Hannah Cole",
    agency: "Southern Cross Realty",
    phone: "+61 2 8310 4402",
    email: "hannah@southerncross.example",
    country: "Australia",
    city: "Fremantle",
  },
  {
    name: "Haruto Sato",
    agency: "Edo Residences",
    phone: "+81 3 4520 1180",
    email: "haruto@edo.example",
    country: "Japan",
    city: "Nakagyo",
  },
  {
    name: "Layla Hassan",
    agency: "Gulf Keys",
    phone: "+971 4 330 2218",
    email: "layla@gulfkeys.example",
    country: "United Arab Emirates",
    city: "Khalifa City",
  },
  {
    name: "Thabo Nkosi",
    agency: "Cape Listing Co",
    phone: "+27 21 461 2204",
    email: "thabo@capelisting.example",
    country: "South Africa",
    city: "Gardens",
  },
  {
    name: "Nurul Hakim",
    agency: "Straits Homes",
    phone: "+60 4-261 3301",
    email: "nurul@straits.example",
    country: "Malaysia",
    city: "George Town",
  },
  {
    name: "Daniel Teoh",
    agency: "Penang Keys",
    phone: "+60 4-228 4410",
    email: "daniel.teoh@penangkeys.example",
    country: "Malaysia",
    city: "George Town",
  },
  {
    name: "Siti Rahman",
    agency: "Island Desk",
    phone: "+60 4-263 1180",
    email: "siti@islanddesk.example",
    country: "Malaysia",
    city: "George Town",
  },
  {
    name: "Hana Yusof",
    agency: "Straits Homes",
    phone: "+60 3-2166 2204",
    email: "hana@straits.example",
    country: "Malaysia",
    city: "Kuala Lumpur",
  },
  {
    name: "Omar Latif",
    agency: "Closed Listings",
    phone: "+60 4-210 1188",
    email: "omar.latif@closed.example",
    country: "Malaysia",
    city: "George Town",
    isAvailable: false,
  },
];

const insertAgent = db.prepare(
  `INSERT INTO Agent (name, agency, phone, email, country)
   SELECT @name, @agency, @phone, @email, @country
   WHERE NOT EXISTS (SELECT 1 FROM Agent WHERE email = @email)`,
);

const seedAgents = db.transaction(() => {
  for (const agent of agents) {
    insertAgent.run({
      name: agent.name,
      agency: agent.agency,
      phone: agent.phone,
      email: agent.email,
      country: agent.country,
    });
  }
});

const placeAgents = db.transaction(() => {
  const placeAgent = db.prepare(
    `UPDATE Agent
     SET city = @city, isAvailable = @isAvailable
     WHERE email = @email`,
  );
  for (const agent of agents) {
    placeAgent.run({
      email: agent.email,
      city: agent.city ?? null,
      isAvailable: agent.isAvailable === false ? 0 : 1,
    });
  }
});

const linkAgencies = db.transaction(() => {
  const agencies = db
    .prepare("SELECT DISTINCT agency AS name, country FROM Agent")
    .all() as AgencyRow[];
  const insertAgency = db.prepare(
    `INSERT INTO Agency (name, country)
     SELECT @name, @country
     WHERE NOT EXISTS (
       SELECT 1 FROM Agency WHERE name = @name AND country = @country
     )`,
  );
  for (const agency of agencies) {
    insertAgency.run(agency);
  }
  db.prepare(
    `UPDATE Agent
     SET agencyId = (
       SELECT id FROM Agency
       WHERE Agency.name = Agent.agency AND Agency.country = Agent.country
     )
     WHERE agencyId IS NULL`,
  ).run();
});

const solicitors: SolicitorSeed[] = [
  {
    name: "Maya Chen",
    firm: "Harbour Law",
    phone: "555-0201",
    email: "maya@harbourlaw.example",
    country: "Northside",
  },
  {
    name: "Owen Blake",
    firm: "Riverside Legal",
    phone: "555-0244",
    email: "owen@riversidelegal.example",
    country: "Riverside",
  },
  {
    name: "Nina Kapoor",
    firm: "Central Chambers",
    phone: "555-0290",
    email: "nina@centralchambers.example",
    country: "Central",
  },
  {
    name: "Ivy Moss",
    firm: "Moss & Co",
    phone: "555-0212",
    email: "ivy@moss.example",
    country: "Australia",
  },
  {
    name: "Farid Hassan",
    firm: "Straits Chambers",
    phone: "+60 3-2166 4410",
    email: "farid@straitslaw.example",
    country: "Malaysia",
  },
  {
    name: "Grace Tan",
    firm: "Merlion Legal",
    phone: "+65 6532 2208",
    email: "grace@merlionlaw.example",
    country: "Singapore",
  },
  {
    name: "Pim Siri",
    firm: "Chao Phraya Law",
    phone: "+66 2-441 8801",
    email: "pim@chaophrayalaw.example",
    country: "Thailand",
  },
  {
    name: "Budi Santoso",
    firm: "Nusantara Legal",
    phone: "+62 21-570 3340",
    email: "budi@nusantaralaw.example",
    country: "Indonesia",
  },
  {
    name: "Clara Lim",
    firm: "Isla Chambers",
    phone: "+63 2-8701 4419",
    email: "clara@islachambers.example",
    country: "Philippines",
  },
  {
    name: "Minh Pham",
    firm: "Saigon Counsel",
    phone: "+84 28 3911 2206",
    email: "minh@saigoncounsel.example",
    country: "Vietnam",
  },
  {
    name: "Elaine Ho",
    firm: "Peak Legal",
    phone: "+852 2521 3308",
    email: "elaine@peaklegal.example",
    country: "Hong Kong",
  },
  {
    name: "James Whitaker",
    firm: "Thames Counsel",
    phone: "+44 20 7946 1180",
    email: "james@thamescounsel.example",
    country: "United Kingdom",
  },
  {
    name: "Elena Ruiz",
    firm: "Pacific Counsel",
    phone: "+1 212 555 0194",
    email: "elena@pacificcounsel.example",
    country: "United States",
  },
  {
    name: "Yuki Abe",
    firm: "Edo Counsel",
    phone: "+81 3 5210 4488",
    email: "yuki@edocounsel.example",
    country: "Japan",
  },
  {
    name: "Omar Faris",
    firm: "Gulf Counsel",
    phone: "+971 4 441 2206",
    email: "omar@gulfcounsel.example",
    country: "United Arab Emirates",
  },
  {
    name: "Naledi Dlamini",
    firm: "Cape Counsel",
    phone: "+27 21 418 3302",
    email: "naledi@capecounsel.example",
    country: "South Africa",
  },
];

const insertSolicitor = db.prepare(
  `INSERT INTO Solicitor (name, firm, phone, email, country)
   SELECT @name, @firm, @phone, @email, @country
   WHERE NOT EXISTS (SELECT 1 FROM Solicitor WHERE email = @email)`,
);

const seedSolicitors = db.transaction(() => {
  for (const solicitor of solicitors) {
    insertSolicitor.run(solicitor);
  }
});

const retiredTitles = [
  "Kota Kinabalu bungalow",
  "Sentosa cove apartment",
  "Hua Hin beach house",
  "Menteng townhouse",
  "Davao family home",
];

const drafts: ExampleDraft[] = [
  {
    title: "George Town terrace",
    price: 890_000,
    currency: "MYR",
    location: "George Town, Penang, Malaysia",
    propertyType: "Terrace",
    bedrooms: 4,
    bathrooms: 3,
    builtUp: 2200,
    landSize: 1600,
    tenure: "Freehold",
    description:
      "A renovated George Town terrace with a rear courtyard, original shutters, and a short walk to the jetty.",
    contactType: "direct",
    contactName: "Farah Aziz",
    contactPhone: "+60 12-441 2208",
    contactEmail: "farah@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqft",
    furnishing: "partly furnished",
    yearBuilt: 1998,
    parking: 2,
    region: "Asia",
  },
  {
    title: "KLCC apartment",
    price: 1_450_000,
    currency: "MYR",
    location: "Kuala Lumpur, Malaysia",
    propertyType: "Apartment",
    bedrooms: 3,
    bathrooms: 2,
    builtUp: 1450,
    landSize: null,
    tenure: "Freehold",
    description:
      "A high-floor KLCC apartment with city views, a covered parking bay, and access to the park.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "aina@straits.example",
    solicitorEmail: "farid@straitslaw.example",
    areaUnit: "sqft",
    furnishing: "unfurnished",
    yearBuilt: 2016,
    parking: 1,
    region: "Asia",
  },
  {
    title: "Johor Bahru semi-detached",
    price: 720_000,
    currency: "MYR",
    location: "Johor Bahru, Malaysia",
    propertyType: "Semi-detached",
    bedrooms: 4,
    bathrooms: 4,
    builtUp: 2800,
    landSize: 3200,
    tenure: "Freehold",
    description:
      "A family semi-detached in Johor Bahru with a wet kitchen, helper room, and a gated car porch.",
    contactType: "direct",
    contactName: "Hafiz Omar",
    contactPhone: "+60 16-552 1184",
    contactEmail: "hafiz@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqft",
    furnishing: "furnished",
    yearBuilt: 2004,
    parking: 2,
    region: "Asia",
  },
  {
    title: "Tiong Bahru walk-up",
    price: 1_680_000,
    currency: "SGD",
    location: "Tiong Bahru, Singapore",
    propertyType: "Walk-up",
    bedrooms: 2,
    bathrooms: 1,
    builtUp: 860,
    landSize: null,
    tenure: "Leasehold",
    description:
      "A pre-war Tiong Bahru walk-up with mosaic floors, a compact kitchen, and neighbourhood shops downstairs.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "wei@merlion.example",
    solicitorEmail: "grace@merlionlaw.example",
    areaUnit: "sqft",
    furnishing: "partly furnished",
    yearBuilt: 1982,
    parking: 0,
    region: "Asia",
  },
  {
    title: "Bukit Timah detached",
    price: 4_200_000,
    currency: "SGD",
    location: "Bukit Timah, Singapore",
    propertyType: "Detached",
    bedrooms: 5,
    bathrooms: 5,
    builtUp: 6400,
    landSize: 8200,
    tenure: "Freehold",
    description:
      "A freehold Bukit Timah detached house with a pool, a study, and room for two cars.",
    contactType: "direct",
    contactName: "Mei Tan",
    contactPhone: "+65 8123 4408",
    contactEmail: "mei@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqft",
    furnishing: "unfurnished",
    yearBuilt: 2011,
    parking: 2,
    region: "Asia",
  },
  {
    title: "Tampines executive flat",
    price: 980_000,
    currency: "SGD",
    location: "Tampines, Singapore",
    propertyType: "Flat",
    bedrooms: 4,
    bathrooms: 2,
    builtUp: 1300,
    landSize: null,
    tenure: "Leasehold",
    description:
      "An executive flat in Tampines near the MRT, with a renovated kitchen and a household shelter.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "wei@merlion.example",
    solicitorEmail: "grace@merlionlaw.example",
    areaUnit: "sqft",
    furnishing: "partly furnished",
    yearBuilt: 1996,
    parking: 1,
    region: "Asia",
  },
  {
    title: "Chiang Mai villa",
    price: 8_900_000,
    currency: "THB",
    location: "Chiang Mai, Thailand",
    propertyType: "Villa",
    bedrooms: 3,
    bathrooms: 3,
    builtUp: 280,
    landSize: 640,
    tenure: "Freehold",
    description:
      "A walled Chiang Mai villa with a sala, a plunge pool, and rice fields beyond the garden.",
    contactType: "direct",
    contactName: "Anong Chai",
    contactPhone: "+66 81 234 5601",
    contactEmail: "anong@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqm",
    furnishing: "furnished",
    yearBuilt: 2014,
    parking: 2,
    region: "Asia",
  },
  {
    title: "Sukhumvit condo",
    price: 12_500_000,
    currency: "THB",
    location: "Sukhumvit, Bangkok, Thailand",
    propertyType: "Condominium",
    bedrooms: 2,
    bathrooms: 2,
    builtUp: 86,
    landSize: null,
    tenure: "Freehold",
    description:
      "A Sukhumvit condominium close to the BTS, with a balcony and a shared pool.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "niran@chaophraya.example",
    solicitorEmail: "pim@chaophrayalaw.example",
    areaUnit: "sqm",
    furnishing: "furnished",
    yearBuilt: 2019,
    parking: 1,
    region: "Asia",
  },
  {
    title: "Phuket pool villa",
    price: 18_500_000,
    currency: "THB",
    location: "Phuket, Thailand",
    propertyType: "Villa",
    bedrooms: 4,
    bathrooms: 4,
    builtUp: 420,
    landSize: 900,
    tenure: "Leasehold",
    description:
      "A west-coast Phuket villa on a leasehold plot, with a private pool and a separate guest room.",
    contactType: "direct",
    contactName: "Kanya Siri",
    contactPhone: "+66 89 441 2207",
    contactEmail: "kanya@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqm",
    furnishing: "furnished",
    yearBuilt: 2018,
    parking: 2,
    region: "Asia",
  },
  {
    title: "Bandung hillside house",
    price: 1_250_000_000,
    currency: "IDR",
    location: "Bandung, Indonesia",
    propertyType: "House",
    bedrooms: 3,
    bathrooms: 2,
    builtUp: 140,
    landSize: 180,
    tenure: "Freehold",
    description:
      "A hillside house in Bandung with a garden terrace and cooler evenings than the city centre.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "sari@nusantara.example",
    solicitorEmail: "budi@nusantaralaw.example",
    areaUnit: "sqm",
    furnishing: "unfurnished",
    yearBuilt: 2006,
    parking: 1,
    region: "Asia",
  },
  {
    title: "Seminyak villa",
    price: 1_650_000_000,
    currency: "IDR",
    location: "Seminyak, Bali, Indonesia",
    propertyType: "Villa",
    bedrooms: 4,
    bathrooms: 4,
    builtUp: 320,
    landSize: 500,
    tenure: "Leasehold",
    description:
      "A Seminyak villa on a leasehold title, with an open living pavilion and a staff room.",
    contactType: "direct",
    contactName: "Made Arta",
    contactPhone: "+62 813 2201 4488",
    contactEmail: "made@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqm",
    furnishing: "furnished",
    yearBuilt: 2017,
    parking: 2,
    region: "Asia",
  },
  {
    title: "Surabaya family home",
    price: 980_000_000,
    currency: "IDR",
    location: "Surabaya, Indonesia",
    propertyType: "House",
    bedrooms: 4,
    bathrooms: 3,
    builtUp: 180,
    landSize: 200,
    tenure: "Freehold",
    description:
      "A family home in Surabaya with a carport, a service kitchen, and a small rear garden.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "sari@nusantara.example",
    solicitorEmail: "budi@nusantaralaw.example",
    areaUnit: "sqm",
    furnishing: "partly furnished",
    yearBuilt: 1999,
    parking: 2,
    region: "Asia",
  },
  {
    title: "Cebu city house",
    price: 8_500_000,
    currency: "PHP",
    location: "Cebu City, Philippines",
    propertyType: "House",
    bedrooms: 4,
    bathrooms: 3,
    builtUp: 220,
    landSize: 300,
    tenure: "Freehold",
    description:
      "A Cebu City house in a quiet subdivision, with a dirty kitchen and a covered carport.",
    contactType: "direct",
    contactName: "Marco Reyes",
    contactPhone: "+63 917 555 0134",
    contactEmail: "marco@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqm",
    furnishing: "unfurnished",
    yearBuilt: 2008,
    parking: 2,
    region: "Asia",
  },
  {
    title: "Makati condo",
    price: 15_200_000,
    currency: "PHP",
    location: "Makati, Manila, Philippines",
    propertyType: "Condominium",
    bedrooms: 2,
    bathrooms: 2,
    builtUp: 78,
    landSize: null,
    tenure: "Freehold",
    description:
      "A Makati condominium near the offices, with a balcony and building security.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "liza@isla.example",
    solicitorEmail: "clara@islachambers.example",
    areaUnit: "sqm",
    furnishing: "furnished",
    yearBuilt: 2020,
    parking: 1,
    region: "Asia",
  },
  {
    title: "Tagaytay retreat",
    price: 11_800_000,
    currency: "PHP",
    location: "Tagaytay, Philippines",
    propertyType: "House",
    bedrooms: 3,
    bathrooms: 3,
    builtUp: 260,
    landSize: 800,
    tenure: "Freehold",
    description:
      "A Tagaytay retreat with a wide deck, cooler weather, and a view toward the ridge.",
    contactType: "direct",
    contactName: "Rosa Villanueva",
    contactPhone: "+63 918 220 4419",
    contactEmail: "rosa@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqm",
    furnishing: "furnished",
    yearBuilt: 2012,
    parking: 2,
    region: "Asia",
  },
  {
    title: "Hanoi Old Quarter studio",
    price: 1_850_000_000,
    currency: "VND",
    location: "Hoan Kiem, Hanoi, Vietnam",
    propertyType: "Studio",
    bedrooms: 1,
    bathrooms: 1,
    builtUp: 38,
    landSize: null,
    tenure: "Leasehold",
    description:
      "A compact Old Quarter studio above a quiet lane, suitable as a city base.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "linh@saigon.example",
    solicitorEmail: "minh@saigoncounsel.example",
    areaUnit: "sqm",
    furnishing: "furnished",
    yearBuilt: 2015,
    parking: 0,
    region: "Asia",
  },
  {
    title: "Da Nang riverside apartment",
    price: 1_420_000_000,
    currency: "VND",
    location: "Da Nang, Vietnam",
    propertyType: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    builtUp: 72,
    landSize: null,
    tenure: "Leasehold",
    description:
      "A Da Nang apartment facing the Han River, with two bedrooms and a shared gym.",
    contactType: "direct",
    contactName: "Lan Vo",
    contactPhone: "+84 90 441 2208",
    contactEmail: "lan@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqm",
    furnishing: "partly furnished",
    yearBuilt: 2018,
    parking: 1,
    region: "Asia",
  },
  {
    title: "Can Tho garden house",
    price: 890_000_000,
    currency: "VND",
    location: "Can Tho, Vietnam",
    propertyType: "House",
    bedrooms: 3,
    bathrooms: 2,
    builtUp: 110,
    landSize: 160,
    tenure: "Freehold",
    description:
      "A Can Tho garden house set back from the road, with fruit trees and a covered terrace.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "linh@saigon.example",
    solicitorEmail: "minh@saigoncounsel.example",
    areaUnit: "sqm",
    furnishing: "unfurnished",
    yearBuilt: 2001,
    parking: 1,
    region: "Asia",
  },
  {
    title: "Kennedy Town walk-up",
    price: 7_800_000,
    currency: "HKD",
    location: "Kennedy Town, Hong Kong",
    propertyType: "Walk-up",
    bedrooms: 2,
    bathrooms: 1,
    builtUp: 480,
    landSize: null,
    tenure: "Leasehold",
    description:
      "A Kennedy Town walk-up near the tram, with a compact galley kitchen and harbour light.",
    contactType: "direct",
    contactName: "Wing Chan",
    contactPhone: "+852 9123 4408",
    contactEmail: "wing@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqft",
    furnishing: "unfurnished",
    yearBuilt: 1978,
    parking: 0,
    region: "Asia",
  },
  {
    title: "Tai Po village house",
    price: 6_200_000,
    currency: "HKD",
    location: "Tai Po, Hong Kong",
    propertyType: "House",
    bedrooms: 3,
    bathrooms: 2,
    builtUp: 1100,
    landSize: 1800,
    tenure: "Leasehold",
    description:
      "A New Territories village house in Tai Po with a roof terrace and space for one car.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "mei@harbourpeak.example",
    solicitorEmail: "elaine@peaklegal.example",
    areaUnit: "sqft",
    furnishing: "partly furnished",
    yearBuilt: 1992,
    parking: 1,
    region: "Asia",
  },
  {
    title: "Islington townhouse",
    price: 1_250_000,
    currency: "GBP",
    location: "Islington, London, United Kingdom",
    propertyType: "Townhouse",
    bedrooms: 4,
    bathrooms: 3,
    builtUp: 2100,
    landSize: 900,
    tenure: "Freehold",
    description:
      "A Victorian townhouse in Islington with a rear garden, a cellar, and a top-floor study.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "oliver@thames.example",
    solicitorEmail: "james@thamescounsel.example",
    areaUnit: "sqft",
    furnishing: "unfurnished",
    yearBuilt: 1890,
    parking: 0,
    region: "Global",
  },
  {
    title: "Edinburgh tenement",
    price: 420_000,
    currency: "GBP",
    location: "Marchmont, Edinburgh, United Kingdom",
    propertyType: "Tenement",
    bedrooms: 2,
    bathrooms: 1,
    builtUp: 780,
    landSize: null,
    tenure: "Leasehold",
    description:
      "A Marchmont tenement flat with high ceilings, a bay window, and shared garden access.",
    contactType: "direct",
    contactName: "Fiona Reid",
    contactPhone: "+44 131 496 2208",
    contactEmail: "fiona@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqft",
    furnishing: "partly furnished",
    yearBuilt: 1905,
    parking: 0,
    region: "Global",
  },
  {
    title: "Bristol harbourside flat",
    price: 475_000,
    currency: "GBP",
    location: "Harbourside, Bristol, United Kingdom",
    propertyType: "Flat",
    bedrooms: 2,
    bathrooms: 2,
    builtUp: 860,
    landSize: null,
    tenure: "Leasehold",
    description:
      "A harbourside flat in Bristol with a balcony, allocated parking, and a short walk to the station.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "oliver@thames.example",
    solicitorEmail: "james@thamescounsel.example",
    areaUnit: "sqft",
    furnishing: "unfurnished",
    yearBuilt: 2015,
    parking: 1,
    region: "Global",
  },
  {
    title: "Cotswold stone cottage",
    price: 890_000,
    currency: "GBP",
    location: "Bourton, Cotswolds, United Kingdom",
    propertyType: "Cottage",
    bedrooms: 3,
    bathrooms: 2,
    builtUp: 1400,
    landSize: 4200,
    tenure: "Freehold",
    description:
      "A stone cottage in the Cotswolds with an inglenook, a large garden, and a detached garage.",
    contactType: "direct",
    contactName: "Helen Ward",
    contactPhone: "+44 1451 220 418",
    contactEmail: "helen@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqft",
    furnishing: "partly furnished",
    yearBuilt: 1840,
    parking: 2,
    region: "Global",
  },
  {
    title: "Austin bungalow",
    price: 685_000,
    currency: "USD",
    location: "Hyde Park, Austin, United States",
    propertyType: "Bungalow",
    bedrooms: 3,
    bathrooms: 2,
    builtUp: 1600,
    landSize: 6500,
    tenure: "Freehold",
    description:
      "A Hyde Park bungalow in Austin with a front porch, updated wiring, and a large pecan tree.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "maya.brooks@pacific.example",
    solicitorEmail: "elena@pacificcounsel.example",
    areaUnit: "sqft",
    furnishing: "unfurnished",
    yearBuilt: 1948,
    parking: 1,
    region: "Global",
  },
  {
    title: "Brooklyn brownstone",
    price: 2_450_000,
    currency: "USD",
    location: "Park Slope, Brooklyn, United States",
    propertyType: "Brownstone",
    bedrooms: 4,
    bathrooms: 3,
    builtUp: 2800,
    landSize: 1800,
    tenure: "Freehold",
    description:
      "A Park Slope brownstone with a garden floor, original stairs, and a rear garden.",
    contactType: "direct",
    contactName: "Daniel Cho",
    contactPhone: "+1 718 555 0142",
    contactEmail: "daniel@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqft",
    furnishing: "unfurnished",
    yearBuilt: 1895,
    parking: 0,
    region: "Global",
  },
  {
    title: "Seattle craftsman",
    price: 975_000,
    currency: "USD",
    location: "Ballard, Seattle, United States",
    propertyType: "Craftsman",
    bedrooms: 4,
    bathrooms: 3,
    builtUp: 2200,
    landSize: 4800,
    tenure: "Freehold",
    description:
      "A Ballard craftsman with a wide porch, a finished attic, and an alley garage.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "maya.brooks@pacific.example",
    solicitorEmail: "elena@pacificcounsel.example",
    areaUnit: "sqft",
    furnishing: "partly furnished",
    yearBuilt: 1924,
    parking: 1,
    region: "Global",
  },
  {
    title: "Miami waterfront condo",
    price: 890_000,
    currency: "USD",
    location: "Edgewater, Miami, United States",
    propertyType: "Condominium",
    bedrooms: 2,
    bathrooms: 2,
    builtUp: 1100,
    landSize: null,
    tenure: "Freehold",
    description:
      "An Edgewater condominium with a water view, hurricane windows, and a valet garage.",
    contactType: "direct",
    contactName: "Sofia Alvarez",
    contactPhone: "+1 305 555 0176",
    contactEmail: "sofia@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqft",
    furnishing: "furnished",
    yearBuilt: 2007,
    parking: 1,
    region: "Global",
  },
  {
    title: "Bondi apartment",
    price: 1_850_000,
    currency: "AUD",
    location: "Bondi, Sydney, Australia",
    propertyType: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    builtUp: 95,
    landSize: null,
    tenure: "Freehold",
    description:
      "A Bondi apartment a few streets back from the beach, with a lock-up garage and a balcony.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "hannah@southerncross.example",
    solicitorEmail: "ivy@moss.example",
    areaUnit: "sqm",
    furnishing: "unfurnished",
    yearBuilt: 2016,
    parking: 1,
    region: "Global",
  },
  {
    title: "Fremantle cottage",
    price: 920_000,
    currency: "AUD",
    location: "Fremantle, Australia",
    propertyType: "Cottage",
    bedrooms: 3,
    bathrooms: 1,
    builtUp: 140,
    landSize: 320,
    tenure: "Freehold",
    description:
      "A limestone cottage in Fremantle with jarrah floors, a rear lean-to, and a small yard.",
    contactType: "direct",
    contactName: "Patrick Nolan",
    contactPhone: "+61 8 9335 2201",
    contactEmail: "patrick@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqm",
    furnishing: "partly furnished",
    yearBuilt: 1910,
    parking: 1,
    region: "Global",
  },
  {
    title: "Hobart weatherboard",
    price: 740_000,
    currency: "AUD",
    location: "North Hobart, Australia",
    propertyType: "House",
    bedrooms: 3,
    bathrooms: 2,
    builtUp: 160,
    landSize: 540,
    tenure: "Freehold",
    description:
      "A weatherboard house in North Hobart with a sunroom, a wood heater, and a sloping garden.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "hannah@southerncross.example",
    solicitorEmail: "ivy@moss.example",
    areaUnit: "sqm",
    furnishing: "unfurnished",
    yearBuilt: 1968,
    parking: 2,
    region: "Global",
  },
  {
    title: "Kyoto machiya",
    price: 78_000_000,
    currency: "JPY",
    location: "Nakagyo, Kyoto, Japan",
    propertyType: "Machiya",
    bedrooms: 3,
    bathrooms: 1,
    builtUp: 120,
    landSize: 90,
    tenure: "Freehold",
    description:
      "A restored Kyoto machiya with a tsubo-niwa courtyard, timber posts, and a modern bath.",
    contactType: "direct",
    contactName: "Aoi Mori",
    contactPhone: "+81 75 441 2208",
    contactEmail: "aoi@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqm",
    furnishing: "unfurnished",
    yearBuilt: 1932,
    parking: 0,
    region: "Global",
  },
  {
    title: "Osaka city condo",
    price: 45_800_000,
    currency: "JPY",
    location: "Namba, Osaka, Japan",
    propertyType: "Condominium",
    bedrooms: 2,
    bathrooms: 1,
    builtUp: 68,
    landSize: null,
    tenure: "Freehold",
    description:
      "An Osaka condominium near Namba station, with a south balcony and a bicycle locker.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "haruto@edo.example",
    solicitorEmail: "yuki@edocounsel.example",
    areaUnit: "sqm",
    furnishing: "unfurnished",
    yearBuilt: 2009,
    parking: 0,
    region: "Global",
  },
  {
    title: "Sapporo family home",
    price: 32_000_000,
    currency: "JPY",
    location: "Chuo, Sapporo, Japan",
    propertyType: "House",
    bedrooms: 4,
    bathrooms: 2,
    builtUp: 140,
    landSize: 220,
    tenure: "Freehold",
    description:
      "A Sapporo family home with insulated walls, a snow porch, and a compact garden.",
    contactType: "direct",
    contactName: "Kenji Arai",
    contactPhone: "+81 11 221 4406",
    contactEmail: "kenji@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqm",
    furnishing: "partly furnished",
    yearBuilt: 1998,
    parking: 1,
    region: "Global",
  },
  {
    title: "Dubai Marina apartment",
    price: 2_100_000,
    currency: "AED",
    location: "Dubai Marina, United Arab Emirates",
    propertyType: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    builtUp: 1200,
    landSize: null,
    tenure: "Leasehold",
    description:
      "A Dubai Marina apartment with a marina view, built-in wardrobes, and a covered parking space.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "layla@gulfkeys.example",
    solicitorEmail: "omar@gulfcounsel.example",
    areaUnit: "sqft",
    furnishing: "furnished",
    yearBuilt: 2018,
    parking: 1,
    region: "Global",
  },
  {
    title: "Abu Dhabi villa",
    price: 4_500_000,
    currency: "AED",
    location: "Khalifa City, Abu Dhabi, United Arab Emirates",
    propertyType: "Villa",
    bedrooms: 5,
    bathrooms: 6,
    builtUp: 5200,
    landSize: 6000,
    tenure: "Leasehold",
    description:
      "A Khalifa City villa with a maid's room, a private pool, and a double garage.",
    contactType: "direct",
    contactName: "Noor Al Farsi",
    contactPhone: "+971 50 441 2208",
    contactEmail: "noor@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqft",
    furnishing: "unfurnished",
    yearBuilt: 2021,
    parking: 2,
    region: "Global",
  },
  {
    title: "Sharjah townhouse",
    price: 980_000,
    currency: "AED",
    location: "Al Zahia, Sharjah, United Arab Emirates",
    propertyType: "Townhouse",
    bedrooms: 3,
    bathrooms: 3,
    builtUp: 1900,
    landSize: 1400,
    tenure: "Leasehold",
    description:
      "A Sharjah townhouse in Al Zahia with a small yard, a store room, and community parks.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "layla@gulfkeys.example",
    solicitorEmail: "omar@gulfcounsel.example",
    areaUnit: "sqft",
    furnishing: "unfurnished",
    yearBuilt: 2019,
    parking: 2,
    region: "Global",
  },
  {
    title: "Cape Town Victorian",
    price: 8_750_000,
    currency: "ZAR",
    location: "Gardens, Cape Town, South Africa",
    propertyType: "Victorian",
    bedrooms: 4,
    bathrooms: 3,
    builtUp: 280,
    landSize: 400,
    tenure: "Freehold",
    description:
      "A Victorian house in Gardens with a stoep, Oregon pine floors, and Table Mountain views.",
    contactType: "direct",
    contactName: "Lerato Maseko",
    contactPhone: "+27 82 441 2208",
    contactEmail: "lerato@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqm",
    furnishing: "partly furnished",
    yearBuilt: 1902,
    parking: 1,
    region: "Global",
  },
  {
    title: "Johannesburg family home",
    price: 3_200_000,
    currency: "ZAR",
    location: "Parkhurst, Johannesburg, South Africa",
    propertyType: "House",
    bedrooms: 3,
    bathrooms: 2,
    builtUp: 180,
    landSize: 500,
    tenure: "Freehold",
    description:
      "A Parkhurst family home with a braai patio, a staff room, and a single garage.",
    contactType: "agent",
    contactName: null,
    contactPhone: null,
    contactEmail: null,
    agentEmail: "thabo@capelisting.example",
    solicitorEmail: "naledi@capecounsel.example",
    areaUnit: "sqm",
    furnishing: "unfurnished",
    yearBuilt: 1986,
    parking: 2,
    region: "Global",
  },
  {
    title: "Durban beach apartment",
    price: 4_100_000,
    currency: "ZAR",
    location: "Umhlanga, Durban, South Africa",
    propertyType: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    builtUp: 110,
    landSize: null,
    tenure: "Freehold",
    description:
      "An Umhlanga apartment with a sea glimpse, a balcony, and secure basement parking.",
    contactType: "direct",
    contactName: "Priya Naidoo",
    contactPhone: "+27 83 220 4419",
    contactEmail: "priya.naidoo@example.com",
    agentEmail: null,
    solicitorEmail: null,
    areaUnit: "sqm",
    furnishing: "furnished",
    yearBuilt: 2014,
    parking: 1,
    region: "Global",
  },
];

function placeholder(title: string, index: number) {
  return `https://placehold.co/1200x800/0f172a/f8fafc/png?text=${encodeURIComponent(`${title} ${index}`)}`;
}

function idFor(table: "Agent" | "Solicitor", email: string) {
  const row = db
    .prepare(`SELECT id FROM ${table} WHERE email = ?`)
    .get(email) as IdRow | undefined;
  if (!row) {
    throw new Error(`Missing seeded ${table.toLowerCase()} ${email}`);
  }
  return row.id;
}

function seedProperties() {
  const listings = drafts.map((draft) => ({
    title: draft.title,
    price: draft.price,
    currency: draft.currency,
    location: draft.location,
    propertyType: draft.propertyType,
    bedrooms: draft.bedrooms,
    bathrooms: draft.bathrooms,
    builtUp: draft.builtUp,
    landSize: draft.landSize,
    tenure: draft.tenure,
    images: [placeholder(draft.title, 1), placeholder(draft.title, 2)],
    description: draft.description,
    contactType: draft.contactType,
    contactName: draft.contactName,
    contactPhone: draft.contactPhone,
    contactEmail: draft.contactEmail,
    source: draft.contactType === "agent" ? "agency" : "imported",
    solicitorId: draft.solicitorEmail ? idFor("Solicitor", draft.solicitorEmail) : null,
    agentId: draft.agentEmail ? idFor("Agent", draft.agentEmail) : null,
    metadata: {
      areaUnit: draft.areaUnit,
      furnishing: draft.furnishing,
      yearBuilt: draft.yearBuilt,
      parking: draft.parking,
      region: draft.region,
    },
  }));

  const validated = validatePropertyBatch(listings, {
    requireAgentId: true,
    bulk: true,
  });
  if (!validated.ok) {
    throw new Error(validated.errors.map(formatFieldError).join(" "));
  }

  const removeRetired = db.prepare(
    `DELETE FROM Property WHERE title IN (${retiredTitles.map(() => "?").join(", ")})`,
  );
  removeRetired.run(...retiredTitles);

  const insertProperty = db.prepare(
    `INSERT INTO Property (
       title, price, currency, location, propertyType, bedrooms, bathrooms,
       builtUp, landSize, tenure, images, description, contactType,
       contactName, contactPhone, contactEmail, source, solicitorId, agentId,
       metadata, image
     )
     SELECT @title, @price, @currency, @location, @propertyType, @bedrooms, @bathrooms,
            @builtUp, @landSize, @tenure, @images, @description, @contactType,
            @contactName, @contactPhone, @contactEmail, @source, @solicitorId, @agentId,
            @metadata, @image
     WHERE NOT EXISTS (SELECT 1 FROM Property WHERE title = @title)`,
  );
  const updateProperty = db.prepare(
    `UPDATE Property
     SET price = @price,
         currency = @currency,
         location = @location,
         propertyType = @propertyType,
         bedrooms = @bedrooms,
         bathrooms = @bathrooms,
         builtUp = @builtUp,
         landSize = @landSize,
         tenure = @tenure,
         images = @images,
         description = @description,
         contactType = @contactType,
         contactName = @contactName,
         contactPhone = @contactPhone,
         contactEmail = @contactEmail,
         source = @source,
         solicitorId = @solicitorId,
         agentId = @agentId,
         metadata = @metadata,
         image = @image
     WHERE title = @title`,
  );

  const write = db.transaction((rows: ExampleListing[]) => {
    for (const listing of rows) {
      const stored = {
        title: listing.title,
        price: listing.price,
        currency: listing.currency,
        location: listing.location,
        propertyType: listing.propertyType,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        builtUp: listing.builtUp,
        landSize: listing.landSize,
        tenure: listing.tenure,
        images: JSON.stringify(listing.images),
        description: listing.description,
        contactType: listing.contactType,
        contactName: listing.contactName,
        contactPhone: listing.contactPhone,
        contactEmail: listing.contactEmail,
        source: listing.source,
        solicitorId: listing.solicitorId,
        agentId: listing.agentId,
        metadata: JSON.stringify(listing.metadata),
        image: listing.images[0] ?? null,
      };
      insertProperty.run(stored);
      updateProperty.run(stored);
    }
  });

  write(validated.value);
}

seedAgents();
placeAgents();
linkAgencies();
seedSolicitors();
seedProperties();

const agentCount = db
  .prepare("SELECT COUNT(*) AS count FROM Agent")
  .get() as CountRow;
const solicitorCount = db
  .prepare("SELECT COUNT(*) AS count FROM Solicitor")
  .get() as CountRow;
const titles = drafts.map((draft) => draft.title);
const propertyCount = db
  .prepare(
    `SELECT COUNT(*) AS count FROM Property WHERE title IN (${titles.map(() => "?").join(", ")})`,
  )
  .get(...titles) as CountRow;

console.log(`Agents in database: ${agentCount.count}`);
console.log(`Solicitors in database: ${solicitorCount.count}`);
console.log(`Example properties in database: ${propertyCount.count}`);
