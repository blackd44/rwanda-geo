import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature } from "geojson";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type SearchLevel = "Province" | "District" | "Cell" | "Village";

export type SearchItem = {
  id: string;
  level: SearchLevel;
  name: string;
  parentsLabel: string;
  searchText: string;
  indices: number[];
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getProp(p: Feature["properties"], key: string) {
  const v = p && typeof p === "object" ? (p as Record<string, unknown>)[key] : undefined;
  if (v === null || v === undefined || v === "") return "Unknown";
  return String(v);
}

export default function LocationSearch({
  features,
  onPick,
}: {
  features: Feature[];
  onPick: (item: SearchItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const searchIndex = useMemo(() => {
    const map = new Map<string, SearchItem>();
    const add = (
      level: SearchLevel,
      name: string,
      idx: number,
      parentsKey: string,
      parentsLabel: string,
    ) => {
      const clean = name.trim();
      if (!clean) return;
      // Important: do NOT de-dupe purely by name. Many locations share the same name
      // across different parents (e.g. two Cells with the same name in different Districts).
      const key = `${level}:${normalize(clean)}|${normalize(parentsKey)}`;
      const existing = map.get(key);
      if (existing) {
        existing.indices.push(idx);
        return;
      }
      map.set(key, {
        id: key,
        level,
        name: clean,
        parentsLabel,
        searchText: normalize(`${clean} ${parentsLabel}`),
        indices: [idx],
      });
    };

    features.forEach((f, idx) => {
      const p = f.properties;
      const country = getProp(p, "NAME_0");
      const province = getProp(p, "NAME_1");
      const district = getProp(p, "NAME_2");
      const sector = getProp(p, "NAME_3");
      const cell = getProp(p, "NAME_4");

      add("Province", province, idx, country, country);
      add(
        "District",
        district,
        idx,
        `${province}|${country}`,
        `${province} • ${country}`,
      );
      add(
        "Cell",
        cell,
        idx,
        `${province}|${district}|${sector}`,
        `${province} • ${district} • ${sector}`,
      );
      add(
        "Village",
        getProp(p, "NAME_5"),
        idx,
        `${province}|${district}|${sector}|${cell}`,
        `${province} • ${district} • ${sector} • ${cell}`,
      );
    });

    return Array.from(map.values());
  }, [features]);

  const results = useMemo(() => {
    const q = normalize(query);
    if (q.length < 2) return [] as SearchItem[];
    return searchIndex
      .filter((item) => item.searchText.includes(q))
      .sort((a, b) => {
        const aStarts = normalize(a.name).startsWith(q) ? 0 : 1;
        const bStarts = normalize(b.name).startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;

        if (a.level !== b.level) {
          const order: Record<SearchLevel, number> = {
            Province: 0,
            District: 1,
            Cell: 2,
            Village: 3,
          };
          return order[a.level] - order[b.level];
        }

        return a.indices.length - b.indices.length;
      })
      .slice(0, 50);
  }, [query, searchIndex]);

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
      className="absolute top-4 left-4 z-1100 w-lg max-w-[calc(100%-2rem)]"
    >
      <Card className="border-none bg-transparent text-zinc-50">
        <CardContent className="p-0">
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
            }}
            placeholder="Search Province, District, Cell, or Village..."
            className="bg-zinc-950/80 backdrop-blur focus-visible:ring-0"
          />

          {isOpen && results.length > 0 && (
            <div className="mt-2 max-h-[60vh] overflow-auto rounded-lg border border-white/10 bg-zinc-950/80 backdrop-blur">
              {results.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-between gap-3 rounded-none px-3 py-2 text-left hover:bg-white/5 hover:text-zinc-50"
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
