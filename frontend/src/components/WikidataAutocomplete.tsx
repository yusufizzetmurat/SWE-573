import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { Input } from './ui/input';
import { wikidataAPI, WikidataItem, Tag } from '../lib/api';
import { logger } from '../lib/logger';

interface WikidataAutocompleteProps {
  onSelect: (tag: Tag) => void;
  placeholder?: string;
  disabled?: boolean;
  existingTags?: Tag[];
}

export function WikidataAutocomplete({
  onSelect,
  placeholder = 'Search for tags (e.g., cooking, music, tutoring)',
  disabled = false,
  existingTags = [],
}: WikidataAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WikidataItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const searchWikidata = useCallback(async (searchQuery: string) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      const items = await wikidataAPI.search(searchQuery.trim(), 10, abortControllerRef.current.signal);
      
      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }
      
      // Filter out items that are already selected
      const existingIds = new Set(existingTags.map(t => t.id));
      const filteredItems = items.filter(item => !existingIds.has(item.id) && item.id && item.label);
      
      setResults(filteredItems);
      setIsOpen(filteredItems.length > 0);
      setHighlightedIndex(-1);
      setIsLoading(false);
    } catch (err) {
      // Ignore abort errors - don't reset loading state since a new request is in flight
      if (err instanceof Error && (err.name === 'AbortError' || err.name === 'CanceledError')) {
        return;
      }
      logger.error('Wikidata search error', err instanceof Error ? err : new Error(String(err)), { query: searchQuery });
      setError('Failed to search. Please try again.');
      setResults([]);
      setIsOpen(true); // Show dropdown to display error
      setIsLoading(false);
    }
  }, [existingTags]);

  // Debounce input changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      searchWikidata(query);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, searchWikidata]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: WikidataItem) => {
    const tag: Tag = {
      id: item.id,
      name: item.label,
      description: item.description,
    };
    onSelect(tag);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // If dropdown is open and has results, select highlighted item
      if (isOpen && results.length > 0) {
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex]);
        } else if (results.length > 0) {
          // If no item is highlighted, select the first result
          handleSelect(results[0]);
        }
        return;
      }
      
      // If query exists but no results showing, trigger search and add first result
      if (query.trim().length >= 2 && !isLoading) {
        try {
          setIsLoading(true);
          setError(null);
          
          // Cancel any pending debounced search
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
          }
          
          // Cancel any pending request
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          
          abortControllerRef.current = new AbortController();
          const items = await wikidataAPI.search(query.trim(), 10, abortControllerRef.current.signal);
          
          // Check if request was aborted
          if (abortControllerRef.current.signal.aborted) {
            setIsLoading(false);
            return;
          }
          
          // Filter out items that are already selected and ensure they have required fields
          const existingIds = new Set(existingTags.map(t => t.id));
          const filteredItems = items.filter(item => 
            !existingIds.has(item.id) && 
            item.id && 
            item.label
          );
          
          if (filteredItems.length > 0) {
            // Automatically select the first result
            handleSelect(filteredItems[0]);
            setResults([]);
            setIsOpen(false);
          } else {
            setError('No matching tags found. Please try a different search term.');
            setResults([]);
            setIsOpen(true);
          }
          setIsLoading(false);
        } catch (err) {
          if (err instanceof Error && (err.name === 'AbortError' || err.name === 'CanceledError')) {
            setIsLoading(false);
            return;
          }
          logger.error('Wikidata search error on Enter', err instanceof Error ? err : new Error(String(err)), { query });
          setError('Failed to search. Please check your connection and try again.');
          setResults([]);
          setIsOpen(true);
          setIsLoading(false);
        }
        return;
      }
      
      // If query is too short, do nothing
      return;
    }

    // Handle other keys only when dropdown is open
    if (!isOpen || results.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const clearInput = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-10"
          aria-label="Search Wikidata for tags"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
        {!isLoading && query && (
          <button
            type="button"
            onClick={clearInput}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
          role="listbox"
        >
          {error ? (
            <div className="px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No results found. Try a different search term.
            </div>
          ) : (
            results.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full px-4 py-2 text-left hover:bg-amber-50 focus:bg-amber-50 focus:outline-none transition-colors ${
                  highlightedIndex === index ? 'bg-amber-50' : ''
                }`}
                role="option"
                aria-selected={highlightedIndex === index}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs text-gray-400 font-mono mt-0.5">
                    {item.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {item.label}
                    </div>
                    {item.description && (
                      <div className="text-sm text-gray-500 truncate">
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Helper text */}
      {query.length > 0 && query.length < 2 && !isOpen && (
        <p className="mt-1 text-xs text-gray-500">
          Type at least 2 characters to search, then press Enter to add
        </p>
      )}
      {query.length >= 2 && !isOpen && !isLoading && results.length === 0 && (
        <p className="mt-1 text-xs text-amber-600">
          Press Enter to search and add the first matching tag
        </p>
      )}
    </div>
  );
}
