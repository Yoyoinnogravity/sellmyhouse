// The published listing file format (template: /listing-template.csv and
// /listing-template.xlsx). Column names are matched loosely by uploadParse.ts,
// so these are the recommended names, not the only ones accepted.
export type FormatColumn = { name: string; required: boolean; help: string };

export const LISTING_COLUMNS: FormatColumn[] = [
  { name: "price", required: true, help: "Asking price as a number. 450000, 450,000, RM 450,000 and 1.2m all work." },
  { name: "currency", required: false, help: "3-letter code: MYR, SGD, USD, GBP, EUR, AUD, THB… Read from the price if left blank (RM, S$, £, €)." },
  { name: "location", required: true, help: "Town and country, e.g. Ipoh, Perak, Malaysia. *Or leave blank and fill latitude and longitude." },
  { name: "latitude", required: false, help: "Map pin, decimal degrees, e.g. 4.5975. Puts the listing on the exact spot on the world map." },
  { name: "longitude", required: false, help: "Map pin, decimal degrees, e.g. 101.0901." },
  { name: "contact_name", required: true, help: "Seller's or realtor's name, shown to buyers." },
  { name: "contact_phone", required: false, help: "With country code if possible, e.g. +60 12 345 6789. Shown with Call and WhatsApp buttons." },
  { name: "contact_email", required: false, help: "Shown with an Email button." },
  { name: "agency", required: false, help: "Realtors only: your agency name. Leave blank for a private sale." },
  { name: "title", required: false, help: "Short headline. Left blank, we write one, e.g. 3-bedroom house in Ipoh." },
  { name: "property_type", required: false, help: "House, Condominium, Apartment, Terrace, Semi-detached, Bungalow, Villa, Townhouse, Land…" },
  { name: "bedrooms", required: false, help: "Whole number. Studio = 0." },
  { name: "bathrooms", required: false, help: "Whole number." },
  { name: "built_up", required: false, help: "Floor area as a number. Units can go in the cell (1,200 sqft) or in area_unit." },
  { name: "land_size", required: false, help: "Land or plot area as a number." },
  { name: "area_unit", required: false, help: "sq ft, sq m, acres or hectares." },
  { name: "tenure", required: false, help: "Freehold, Leasehold, or your local term (e.g. 99-year leasehold, Strata)." },
  { name: "description", required: false, help: "Up to 2,000 characters." },
  { name: "image_urls", required: false, help: "Up to 12 photo links (https://…), separated by spaces or |. Or use columns image_1, image_2…" },
  { name: "reference", required: false, help: "Your own listing ID, so you can match listings back to your system." },
  { name: "listing_url", required: false, help: "Link to the listing on your own website." },
];
