'use client';

/**
 * City Autocomplete Component
 * Provides autocomplete functionality for European cities using Nominatim API
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { searchEuropeanCities, CityResult } from '@/lib/api/cities';
import { getCountryCode } from '@/lib/data/country-codes';

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  country?: string; // Country name to filter cities by
}

export default function CityAutocomplete({
  value,
  onChange,
  label,
  placeholder = 'Type the name of the city',
  disabled = false,
  country,
}: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CityResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Get country code if country is provided
      const countryCode = country ? getCountryCode(country) : undefined;
      const results = await searchEuropeanCities(query, 5, countryCode); // Show 5 results
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setHighlightedIndex(-1);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, [country]);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for debounced search
    debounceTimerRef.current = setTimeout(() => {
      performSearch(inputValue);
    }, 300); // 300ms debounce delay
  };

  // Handle city selection
  const handleSelectCity = (city: CityResult) => {
    onChange(city.name);
    setShowSuggestions(false);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectCity(suggestions[highlightedIndex]);
        } else if (suggestions.length === 1) {
          // If only one suggestion, select it
          handleSelectCity(suggestions[0]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="mb-4 relative">
      <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value.length >= 2) {
              performSearch(value);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-white dark:bg-dark-surface border border-gray-300 dark:border-gray-600 rounded px-4 py-2 text-gray-900 dark:text-light-text focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
          autoComplete="off"
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-surface border border-gray-300 dark:border-gray-600 rounded-md shadow-lg px-4 py-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">Searching cities...</div>
          </div>
        )}

        {/* Suggestions Dropdown */}
        {showSuggestions && !isLoading && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-surface border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {suggestions.map((city, index) => (
              <button
                key={`${city.name}-${city.countryCode}-${index}`}
                type="button"
                onClick={() => handleSelectCity(city)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full text-left px-4 py-2 text-gray-900 dark:text-light-text hover:bg-brand-blue/10 dark:hover:bg-brand-blue/20 transition-colors ${
                  index === highlightedIndex
                    ? 'bg-brand-blue/20 dark:bg-brand-blue/30'
                    : ''
                }`}
              >
                <div className="font-medium">{city.name}</div>
                {city.country && (
                  <div className="text-xs text-gray-600 dark:text-gray-400">{city.country}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

