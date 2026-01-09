import type { Feature, GeoJsonProperties } from "geojson";
import type { SearchItem, SearchLevel } from "@/components/shared/location-search";

export function getLabel(p: GeoJsonProperties | null | undefined, key: string) {
  const v = p && typeof p === "object" ? (p as Record<string, unknown>)[key] : undefined;
  if (v === null || v === undefined || v === "") return "Unknown";
  return String(v);
}

export function normalize(s: string) {
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

/**
 * Builds a search index map from GeoJSON features
 * @param features - Array of GeoJSON features
 * @returns Map of search item IDs to SearchItem objects
 */
export function buildSearchIndexMap(features: Feature[]): Map<string, SearchItem> {
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
    add("District", district, idx, `${province}|${country}`, `${province} • ${country}`);
    add("Sector", sector, idx, `${province}|${district}`, `${province} • ${district}`);
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

  return map;
}

export function getHighlighted(selected: GeoJsonProperties, keyValue: string) {
  if (isNaN(Number(keyValue))) return;

  const key = Number(keyValue);
  if (key < 1 || key > 5) return;

  const arrayKeys = [key, ...Array.from({ length: key - 1 }, (_, i) => i + 1)];
  if (arrayKeys.length <= 2) arrayKeys.push(0);
  return arrayKeys.map((k) => getLabel(selected, `NAME_${k}`)?.toLowerCase()).join("|");
}

export function handleHighlight({
  selected,
  keyValue,
  label,

  // functions
  setHighlightedId,
}: {
  selected: GeoJsonProperties | null;
  keyValue: string;
  label: string;

  // functions
  setHighlightedId?: (value: string) => void;
}) {
  if (!selected) return;

  const highlighted = getHighlighted(selected, keyValue);
  if (!highlighted) return;

  if (setHighlightedId) setHighlightedId(`${label}:${highlighted}`);
}
