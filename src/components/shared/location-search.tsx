import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature } from "geojson";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUrlParam } from "@/hooks/useUrlParam";
import { buildSearchIndexMap, normalize } from "@/lib/search-index";

export type SearchLevel = "Province" | "District" | "Sector" | "Cell" | "Village";

export type SearchItem = {
  id: string;
  level: SearchLevel;
  name: string;
  parentsLabel: string;
  searchText: string;
  indices: number[];
};

const levelMap: Record<string, SearchLevel> = {
  province: "Province",
  district: "District",
  sector: "Sector",
  cell: "Cell",
  village: "Village",
};

const allTypePrefixes = Object.keys(levelMap);

export default function LocationSearch({
  features,
  onPick,
}: {
  features: Feature[];
  onPick: (item: SearchItem) => void;
}) {
  const [query, setQuery] = useUrlParam<string>("search", "", 300);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Parse type filter from debounced query for search (e.g., ":cell name" -> filter: "Cell", searchQuery: "name")
  const { filterLevel, normalizedSearchQuery } = useMemo(() => {
    const trimmed = debouncedQuery.trim();
    const hasTypePrefix = trimmed.startsWith(":");
    const typePrefix = hasTypePrefix
      ? trimmed.slice(1).split(/\s+/, 2)[0]?.toLowerCase()
      : null;
    const searchQuery = hasTypePrefix
      ? trimmed.slice(1).split(/\s+/, 2)[1] || ""
      : debouncedQuery;

    const filterLevel = typePrefix && levelMap[typePrefix] ? levelMap[typePrefix] : null;
    const normalizedSearchQuery = normalize(searchQuery);

    return { filterLevel, normalizedSearchQuery };
  }, [debouncedQuery]);

  // Parse type prefix suggestions from current query (not debounced) for immediate feedback
  const typePrefixSuggestions = useMemo(() => {
    const trimmed = query.trim();
    const hasTypePrefix = trimmed.startsWith(":");
    const typePrefix = hasTypePrefix
      ? trimmed.slice(1).split(/\s+/, 2)[0]?.toLowerCase()
      : null;
    const isValidPrefix = typePrefix && levelMap[typePrefix];

    let suggestions: string[] = [];
    if (hasTypePrefix && typePrefix && !isValidPrefix) {
      // User is typing a type prefix, suggest matching ones
      suggestions = allTypePrefixes.filter((prefix) =>
        prefix.toLowerCase().startsWith(typePrefix.toLowerCase()),
      );
    } else if (trimmed === ":" || (hasTypePrefix && !typePrefix)) {
      // User just typed ":" or ": " - show all suggestions
      suggestions = allTypePrefixes;
    }

    return suggestions;
  }, [query]);

  const searchIndex = useMemo(() => {
    const map = buildSearchIndexMap(features);
    return Array.from(map.values());
  }, [features]);

  const results = useMemo(() => {
    if (normalizedSearchQuery.length < 2 && !filterLevel) return [] as SearchItem[];

    let filtered = searchIndex;

    // Filter by level if type prefix is specified
    if (filterLevel) {
      filtered = filtered.filter((item) => item.level === filterLevel);
    }

    // Filter by search query if provided
    if (normalizedSearchQuery.length >= 2) {
      filtered = filtered.filter((item) =>
        item.searchText.includes(normalizedSearchQuery),
      );
    }

    return filtered
      .sort((a, b) => {
        if (normalizedSearchQuery.length >= 2) {
          const aStarts = normalize(a.name).startsWith(normalizedSearchQuery) ? 0 : 1;
          const bStarts = normalize(b.name).startsWith(normalizedSearchQuery) ? 0 : 1;
          if (aStarts !== bStarts) return aStarts - bStarts;
        }

        if (a.level !== b.level) {
          const order: Record<SearchLevel, number> = {
            Province: 0,
            District: 1,
            Sector: 2,
            Cell: 3,
            Village: 4,
          };
          return order[a.level] - order[b.level];
        }

        return a.indices.length - b.indices.length;
      })
      .slice(0, 50);
  }, [normalizedSearchQuery, filterLevel, searchIndex]);

  const groupedResults = useMemo(() => {
    const nameMatches: SearchItem[] = [];
    const parentOnlyMatches: SearchItem[] = [];

    for (const item of results) {
      if (normalizedSearchQuery.length < 2) {
        // If no search query, all results are name matches
        nameMatches.push(item);
        continue;
      }

      const matchesName = normalize(item.name).includes(normalizedSearchQuery);
      const matchesParents = normalize(item.parentsLabel).includes(normalizedSearchQuery);
      const isParentsOnlyMatch = !matchesName && matchesParents;
      if (isParentsOnlyMatch) parentOnlyMatches.push(item);
      else nameMatches.push(item);
    }

    return { nameMatches, parentOnlyMatches };
  }, [normalizedSearchQuery, results]);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (e.target instanceof Node && rootRef.current.contains(e.target)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  return (
    <div
      ref={rootRef}
      className="absolute top-4 left-4 z-1100 w-md max-w-[calc(100%-2rem)] max-md:w-full"
    >
      <Card className="border-none bg-transparent text-zinc-50 shadow-none">
        <CardContent className="p-0!">
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsOpen(false);
                if (e.key === "Enter" && results.length === 1) onPick(results[0]);
                // Handle tab/enter for type prefix suggestions
                if (
                  (e.key === "Enter" || e.key === "Tab") &&
                  typePrefixSuggestions.length === 1
                ) {
                  e.preventDefault();
                  const suggestion = typePrefixSuggestions[0];
                  const restOfQuery = query.trim().startsWith(":")
                    ? query.trim().slice(1).split(/\s+/).slice(1).join(" ") || ""
                    : "";
                  setQuery(`:${suggestion}${restOfQuery ? ` ${restOfQuery}` : ""}`);
                }
              }}
              placeholder={
                filterLevel
                  ? `Search ${filterLevel}...`
                  : "Search... (use :cell, :province, :district, :sector, :village)"
              }
              className="bg-zinc-950/80 backdrop-blur focus-visible:ring-0"
              style={{
                paddingRight: filterLevel ? "5rem" : undefined,
              }}
            />
            {filterLevel && (
              <div className="absolute top-1/2 right-3 -translate-y-1/2">
                <Badge
                  variant="outline"
                  className="border-orange-500/30 bg-orange-950/20 text-orange-300"
                >
                  {filterLevel}
                </Badge>
              </div>
            )}
          </div>

          {/* Type prefix suggestions */}
          {isOpen && typePrefixSuggestions.length > 0 && (
            <div className="mt-2 rounded-lg border border-white/10 bg-zinc-950/90 p-2 backdrop-blur">
              <div className="mb-1 px-2 text-[11px] font-medium text-zinc-400 uppercase">
                Type Filters
              </div>
              <div className="flex flex-wrap gap-1">
                {typePrefixSuggestions.map((prefix) => {
                  const level = levelMap[prefix];
                  return (
                    <Button
                      key={prefix}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-xs"
                      onClick={() => {
                        const restOfQuery = query.trim().startsWith(":")
                          ? query.trim().slice(1).split(/\s+/).slice(1).join(" ") || ""
                          : "";
                        setQuery(`:${prefix}${restOfQuery ? ` ${restOfQuery}` : ""}`);
                      }}
                    >
                      <Badge
                        variant="outline"
                        className="border-orange-500/30 text-orange-300"
                      >
                        :{prefix}
                      </Badge>
                      <span className="ml-1 text-zinc-400">{level}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {isOpen && results.length > 0 && (
            <div className="mt-2 max-h-[60vh] overflow-auto rounded-lg border border-white/10 bg-zinc-950/90 backdrop-blur">
              {/* Name matches first */}
              <div className="border-t border-white/10 first:border-t-0">
                <div className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/90 px-3 py-2 text-[11px] font-medium tracking-wide text-zinc-400 uppercase backdrop-blur">
                  Matches
                </div>

                {groupedResults.nameMatches.map((item, idx) => {
                  const prev = groupedResults.nameMatches[idx - 1];
                  const showParentDivider =
                    idx > 0 && prev && prev.parentsLabel !== item.parentsLabel;

                  return (
                    <div key={item.id}>
                      {showParentDivider && (
                        <div className="mx-3 border-t border-white/5" />
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto w-full justify-between gap-3 rounded-none bg-white/0 px-3 py-2 text-left hover:bg-white/10 hover:text-zinc-50"
                        onClick={() => {
                          setQuery(item.name);
                          setIsOpen(false);
                          onPick(item);
                        }}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm text-zinc-50">{item.name}</div>
                          <div className="truncate text-xs text-zinc-400">
                            {item.parentsLabel}
                          </div>
                        </div>
                        <Badge className="shrink-0">{item.level}</Badge>
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Parent-only matches */}
              {groupedResults.parentOnlyMatches.length > 0 && (
                <div className="border-t border-white/10">
                  <div className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/90 px-3 py-2 text-[11px] font-medium tracking-wide text-zinc-400 uppercase backdrop-blur">
                    Others
                  </div>

                  {groupedResults.parentOnlyMatches.map((item, idx) => {
                    const prev = groupedResults.parentOnlyMatches[idx - 1];
                    const showParentDivider =
                      idx > 0 && prev && prev.parentsLabel !== item.parentsLabel;

                    return (
                      <div key={item.id}>
                        {showParentDivider && (
                          <div className="mx-3 border-t border-white/10" />
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          className="h-auto w-full justify-between gap-3 rounded-none bg-white/2 px-3 py-2 text-left hover:bg-white/10 hover:text-zinc-50"
                          onClick={() => {
                            setQuery(item.name);
                            setIsOpen(false);
                            onPick(item);
                          }}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm text-zinc-50">
                              {item.name}
                            </div>
                            <div className="truncate text-xs text-zinc-400">
                              {item.parentsLabel}
                            </div>
                          </div>
                          <Badge className="shrink-0">{item.level}</Badge>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
