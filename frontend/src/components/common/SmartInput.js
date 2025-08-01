import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TextField,
  Autocomplete,
  Box,
  Chip,
  Typography,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useDebounce } from '../hooks/useDebounce';

// Intelligente Eingabe mit Auto-Complete
export const SmartInput = ({
  label,
  value,
  onChange,
  options = [],
  loading = false,
  error = null,
  helperText = '',
  placeholder = '',
  multiple = false,
  freeSolo = false,
  onSearch = null,
  renderOption = null,
  getOptionLabel = null,
  isOptionEqualToValue = null,
  minSearchLength = 2,
  debounceMs = 300,
  maxSuggestions = 10,
  showRecentSearches = true,
  recentSearchesKey = 'recentSearches',
  className = '',
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [inputValue, setInputValue] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [filteredOptions, setFilteredOptions] = useState([]);
  
  const debouncedInputValue = useDebounce(inputValue, debounceMs);

  // Lade recent searches aus localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(recentSearchesKey);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Fehler beim Laden der recent searches:', error);
    }
  }, [recentSearchesKey]);

  // Speichere recent searches in localStorage
  const saveRecentSearch = useCallback((searchTerm) => {
    if (!searchTerm || searchTerm.length < minSearchLength) return;
    
    const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5);
    setRecentSearches(updated);
    
    try {
      localStorage.setItem(recentSearchesKey, JSON.stringify(updated));
    } catch (error) {
      console.warn('Fehler beim Speichern der recent searches:', error);
    }
  }, [recentSearches, recentSearchesKey, minSearchLength]);

  // Suche nach Vorschlägen
  useEffect(() => {
    if (debouncedInputValue.length >= minSearchLength && onSearch) {
      onSearch(debouncedInputValue);
    }
  }, [debouncedInputValue, onSearch, minSearchLength]);

  // Filtere Optionen basierend auf Input
  useEffect(() => {
    if (!inputValue || inputValue.length < minSearchLength) {
      setFilteredOptions(options.slice(0, maxSuggestions));
      return;
    }

    const filtered = options
      .filter(option => {
        const label = getOptionLabel ? getOptionLabel(option) : String(option);
        return label.toLowerCase().includes(inputValue.toLowerCase());
      })
      .slice(0, maxSuggestions);

    setFilteredOptions(filtered);
  }, [options, inputValue, minSearchLength, maxSuggestions, getOptionLabel]);

  // Kombiniere Optionen mit recent searches
  const allOptions = useMemo(() => {
    if (!showRecentSearches || inputValue.length >= minSearchLength) {
      return filteredOptions;
    }

    const recent = recentSearches
      .filter(search => search.toLowerCase().includes(inputValue.toLowerCase()))
      .map(search => ({ label: search, isRecent: true }));

    return [...recent, ...filteredOptions];
  }, [filteredOptions, recentSearches, inputValue, minSearchLength, showRecentSearches]);

  const handleChange = useCallback((event, newValue) => {
    onChange(newValue);
    
    if (newValue && typeof newValue === 'string') {
      saveRecentSearch(newValue);
    } else if (newValue && newValue.label) {
      saveRecentSearch(newValue.label);
    }
  }, [onChange, saveRecentSearch]);

  const handleInputChange = useCallback((event, newInputValue) => {
    setInputValue(newInputValue);
  }, []);

  const defaultRenderOption = useCallback((props, option) => (
    <Box component="li" {...props}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {option.isRecent && (
          <Typography variant="caption" color="text.secondary">
            🔍
          </Typography>
        )}
        <Typography variant="body2">
          {getOptionLabel ? getOptionLabel(option) : String(option)}
        </Typography>
        {option.isRecent && (
          <Chip 
            label="Kürzlich" 
            size="small" 
            variant="outlined"
            sx={{ ml: 'auto', fontSize: '0.7rem' }}
          />
        )}
      </Box>
    </Box>
  ), [getOptionLabel]);

  const defaultGetOptionLabel = useCallback((option) => {
    if (typeof option === 'string') return option;
    if (option && option.label) return option.label;
    return String(option);
  }, []);

  const defaultIsOptionEqualToValue = useCallback((option, value) => {
    if (typeof option === 'string' && typeof value === 'string') {
      return option === value;
    }
    if (option && value && option.label && value.label) {
      return option.label === value.label;
    }
    return option === value;
  }, []);

  return (
    <Autocomplete
      value={value}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      options={allOptions}
      loading={loading}
      multiple={multiple}
      freeSolo={freeSolo}
      renderOption={renderOption || defaultRenderOption}
      getOptionLabel={getOptionLabel || defaultGetOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue || defaultIsOptionEqualToValue}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          error={!!error}
          helperText={error || helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          className={className}
          {...props}
        />
      )}
      sx={{
        '& .MuiAutocomplete-option': {
          padding: theme.spacing(1, 2),
        },
        '& .MuiAutocomplete-option[data-focus="true"]': {
          backgroundColor: theme.palette.action.hover,
        },
      }}
    />
  );
};

// Intelligente Suche mit Vorschlägen
export const SmartSearch = ({
  onSearch,
  placeholder = "Intelligente Suche...",
  suggestions = [],
  recentSearches = [],
  ...props
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    onSearch(term);
  }, [onSearch]);

  const handleSuggestionClick = useCallback((suggestion) => {
    setSearchTerm(suggestion);
    onSearch(suggestion);
    setShowSuggestions(false);
  }, [onSearch]);

  return (
    <Box sx={{ position: 'relative' }}>
      <SmartInput
        label="Suche"
        value={searchTerm}
        onChange={handleSearch}
        placeholder={placeholder}
        options={suggestions}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        {...props}
      />
      
      {showSuggestions && (suggestions.length > 0 || recentSearches.length > 0) && (
        <Box
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 3,
            maxHeight: 300,
            overflow: 'auto'
          }}
        >
          {recentSearches.length > 0 && (
            <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">
                Kürzliche Suchen
              </Typography>
              {recentSearches.map((search, index) => (
                <Chip
                  key={index}
                  label={search}
                  size="small"
                  onClick={() => handleSuggestionClick(search)}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
          )}
          
          {suggestions.length > 0 && (
            <Box sx={{ p: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Vorschläge
              </Typography>
              {suggestions.map((suggestion, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 1,
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <Typography variant="body2">{suggestion}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SmartInput; 