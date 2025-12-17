import { useEffect, useState, useCallback } from "react";

/**
 * Generic hook that syncs a single URL param with state
 * @param key - The URL param key (e.g., "search", "selected", "highlight")
 * @param defaultValue - Default value if param doesn't exist
 * @param debounceMs - Debounce delay for URL updates (0 = no debounce)
 */
export function useUrlParam<T extends string>(
  key: string,
  defaultValue: T = "" as T,
  debounceMs: number = 0,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get(key) as T) || defaultValue;
  });

  // Update URL params when value changes
  useEffect(() => {
    const updateUrl = () => {
      const params = new URLSearchParams(window.location.search);

      if (value && value !== defaultValue) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, "", newUrl);
    };

    if (debounceMs > 0) {
      const timeoutId = setTimeout(updateUrl, debounceMs);
      return () => clearTimeout(timeoutId);
    } else {
      updateUrl();
    }
  }, [key, value, defaultValue, debounceMs]);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlValue = (params.get(key) as T) || defaultValue;
      setValue(urlValue);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [key, defaultValue]);

  const updateValue = useCallback((newValue: T) => {
    setValue(newValue);
  }, []);

  return [value, updateValue] as const;
}
