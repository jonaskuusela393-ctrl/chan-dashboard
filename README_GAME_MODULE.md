# Halo: Earth Command

Open `/game` while signed in as the admin account.

The module stores its campaign in the current browser's localStorage. Use **export save** to download a portable JSON save before clearing browser data or changing devices.

## Surface map

The surface map uses OpenStreetMap raster tiles. It therefore displays real countries, roads, towns, cities and local labels as the player zooms in. It is recolored with a green terminal filter; it is not a satellite-imagery layer.

The place-search box calls the dashboard's existing `/api/business/geocode` endpoint. Configure one of these Vercel environment variables:

```env
GOOGLE_GEOCODING_API_KEY=...
# or GOOGLE_MAPS_API_KEY / GOOGLE_PLACES_API_KEY
```

The map still pans and zooms worldwide without a Google key; only text place search needs that key.

## Canon and speculation labels

- `canon`: directly supported place or fact.
- `canon-inferred`: canon place with approximate map coordinates or conservative missing detail.
- `speculative`: original 26th-century extrapolation based on current geography and Halo's human technology. It is not official Halo lore.

## Main references used for the first Earth database

- Halo Waypoint, *The New Halo Encyclopedia is Out Today*: UEG as humanity's central governing body.
- Halo Waypoint, *Canon Fodder: High-Value Histories*: Solemn Penance and ground deployment to Old Mombasa.
- Halo Waypoint, *Moonrise Over Mombasa*: post-war Mombasa reconstruction and transport/economic importance.
- Halopedia, *Earth*: Battle for Earth chronology and known Earth locations.
- Halopedia, *New Mombasa* and *Mombasa Tether*: city, tether and port context.
- Halopedia, *Sydney* and *HIGHCOM Facility Bravo-6*: UEG/UNSC headquarters.
- Halopedia, *Quito Space Tether*: Quito tether and terminus.

This fan project is not endorsed by Microsoft or Halo Studios. Halo names and setting elements belong to their respective owners.
