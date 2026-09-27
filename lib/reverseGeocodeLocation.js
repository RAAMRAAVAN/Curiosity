const locationCache = new Map();
let geocodeQueue = Promise.resolve();
let lastRequestAt = 0;

function buildLocationName(address = {}, displayName = '') {
  const parts = [
    address.house_number,
    address.road,
    address.neighbourhood,
    address.suburb,
    address.locality,
    address.village,
    address.hamlet,
    address.city_district,
    address.city || address.town || address.municipality,
    address.county,
    address.state,
    address.postcode,
  ].filter(Boolean);
  const uniqueParts = [...new Set(parts.map((part) => String(part).trim()))].filter(Boolean);
  if (uniqueParts.length >= 2) return uniqueParts.slice(0, 6).join(', ');

  return displayName
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && part.toLowerCase() !== 'india')
    .slice(0, 6)
    .join(', ') || uniqueParts.join(', ') || 'Nearby area';
}

export function reverseGeocodeLocation(latitude, longitude) {
  if (latitude == null || longitude == null) return Promise.resolve('');
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return Promise.resolve('');

  const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  if (locationCache.has(key)) return locationCache.get(key);

  const request = geocodeQueue.then(async () => {
    const delay = Math.max(0, 1000 - (Date.now() - lastRequestAt));
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    lastRequestAt = Date.now();

    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        lat: String(lat),
        lon: String(lon),
        zoom: '18',
        addressdetails: '1',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
        headers: { 'Accept-Language': 'en' },
      });
      if (!response.ok) return '';
      const data = await response.json();
      return buildLocationName(data?.address || {}, data?.display_name || '');
    } catch {
      return '';
    }
  });

  geocodeQueue = request.then(() => undefined, () => undefined);
  locationCache.set(key, request);
  return request;
}