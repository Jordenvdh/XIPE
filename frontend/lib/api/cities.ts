/**
 * City search API using Nominatim (OpenStreetMap)
 * Free public API, no API key required
 */

export interface CityResult {
  name: string;
  displayName: string;
  country: string;
  countryCode: string;
}

/**
 * European country codes for filtering
 */
const EUROPEAN_COUNTRIES = [
  'AD', 'AL', 'AT', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ',
  'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU',
  'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD', 'ME',
  'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'SE', 'SI',
  'SK', 'SM', 'TR', 'UA', 'VA', 'XK'
].join(',');

/**
 * Search for European cities using Nominatim API
 * @param query Search query (city name)
 * @param limit Maximum number of results (default: 10)
 * @param countryCode Optional ISO country code to filter by (e.g., 'AT' for Austria)
 * @returns Promise with array of city results
 */
export async function searchEuropeanCities(
  query: string,
  limit: number = 10,
  countryCode?: string
): Promise<CityResult[]> {
  if (!query || query.length < 2) {
    return [];
  }

  try {
    // Use Nominatim API (OpenStreetMap) - free and public
    // Try searching with query as a prefix first (e.g., "Am*" pattern)
    // Nominatim doesn't support wildcards, but we can search for the query
    // and then filter client-side for prefix matches
    
    // First, try a more specific search with the query as a city name
    const prefixQuery = `${query}*`; // Help Nominatim understand we want prefix matches
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}` +
      `&format=json` +
      `&addressdetails=1` +
      `&limit=100` + // Request many results to find cities starting with query
      `&countrycodes=${countryCode || EUROPEAN_COUNTRIES}` + // Filter by specific country if provided
      `&featuretype=city,town,municipality` + // Include cities, towns, and municipalities
      `&accept-language=en`,
      {
        headers: {
          'User-Agent': 'XIPE Model Application', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    // Transform Nominatim results to our format
    const cities: CityResult[] = data
      .map((item: any) => {
        const address = item.address || {};
        // Prioritize city name extraction - prefer actual city/town names over administrative divisions
        let cityName = address.city || 
                      address.town || 
                      address.village || 
                      address.municipality ||
                      '';
        
        // Clean up administrative prefixes from address fields
        if (cityName) {
          cityName = cityName.replace(/^(Bezirk|District|Province|Provincia|Province of|County of|Region|Regione|Comune|Gemeinde)\s+/i, '').trim();
        }
        
        // If we didn't get a good city name from address fields, try display_name
        if (!cityName || cityName.length === 0) {
          const displayParts = item.display_name.split(',');
          // The actual city name is usually in the first part, but might have administrative prefixes
          cityName = displayParts[0].trim();
          
          // Remove common administrative prefixes
          cityName = cityName.replace(/^(Bezirk|District|Province|Provincia|Province of|County of|Region|Regione|Comune|Gemeinde)\s+/i, '').trim();
          
          // If still empty or looks like an administrative division, try second part
          if (!cityName || cityName.length === 0 || /^(bezirk|district|province|county|region)/i.test(cityName)) {
            if (displayParts.length > 1) {
              cityName = displayParts[1].trim();
              cityName = cityName.replace(/^(Bezirk|District|Province|Provincia|Province of|County of|Region|Regione|Comune|Gemeinde)\s+/i, '').trim();
            }
          }
        }
        
        return {
          name: cityName,
          displayName: item.display_name,
          country: address.country || '',
          countryCode: address.country_code?.toUpperCase() || '',
        };
      })
      .filter((city: CityResult) => city.name && city.name.length > 0); // Remove empty names

    // Remove duplicates (same city name and country)
    const uniqueCities = cities.filter((city, index, self) =>
      index === self.findIndex((c) => 
        c.name.toLowerCase() === city.name.toLowerCase() &&
        c.countryCode === city.countryCode
      )
    );

    // Filter and prioritize cities that start with the query
    const lowerQuery = query.toLowerCase().trim();
    
    // First, get cities that start with the query (exact prefix match)
    // Also check if the query appears at the start after removing common prefixes
    const citiesStartingWithQuery = uniqueCities.filter(city => {
      const cityNameLower = city.name.toLowerCase().trim();
      
      // Direct prefix match
      if (cityNameLower.startsWith(lowerQuery)) {
        return true;
      }
      
      // Check if city name starts with query after removing common prefixes
      const cleanedName = cityNameLower.replace(/^(bezirk|district|province|provincia|province of|county of|region|regione|comune|gemeinde)\s+/i, '');
      if (cleanedName.startsWith(lowerQuery)) {
        return true;
      }
      
      return false;
    });
    
    // Sort cities starting with query alphabetically, prioritizing shorter names
    citiesStartingWithQuery.sort((a, b) => {
      // Prioritize shorter names (more likely to be actual city names)
      const aLen = a.name.length;
      const bLen = b.name.length;
      if (aLen !== bLen) {
        return aLen - bLen;
      }
      return a.name.localeCompare(b.name);
    });

    // If we have at least one city starting with the query, return only those
    if (citiesStartingWithQuery.length > 0) {
      return citiesStartingWithQuery.slice(0, limit);
    }
    
    // Fallback: if no cities start with query, show cities containing query
    const citiesContainingQuery = uniqueCities.filter(city => 
      city.name.toLowerCase().includes(lowerQuery)
    );
    
    citiesContainingQuery.sort((a, b) => {
      // Prioritize shorter names
      const aLen = a.name.length;
      const bLen = b.name.length;
      if (aLen !== bLen) {
        return aLen - bLen;
      }
      return a.name.localeCompare(b.name);
    });
    
    return citiesContainingQuery.slice(0, limit);
  } catch (error) {
    console.error('Error searching cities:', error);
    return [];
  }
}

