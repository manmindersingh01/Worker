import type { Blueprint } from "../types";
import { cdscoBlueprint } from "./cdsco";

/**
 * Registry of jurisdiction blueprints. Adding a new jurisdiction is a matter of
 * authoring another `Blueprint` and dropping it in this list - nothing else in
 * the readiness pipeline changes.
 */
const BLUEPRINTS: readonly Blueprint[] = [cdscoBlueprint];

/** The blueprint the UI defaults to when none is specified. */
export const DEFAULT_BLUEPRINT_ID = cdscoBlueprint.id;

export function listBlueprints(): readonly Blueprint[] {
  return BLUEPRINTS;
}

export function getBlueprint(id: string): Blueprint | undefined {
  return BLUEPRINTS.find((b) => b.id === id);
}

export function getBlueprintByJurisdiction(
  jurisdiction: string,
): Blueprint | undefined {
  return BLUEPRINTS.find((b) => b.jurisdiction === jurisdiction);
}

/** Lightweight shape for the "pick a jurisdiction" list endpoint. */
export interface BlueprintSummary {
  id: string;
  jurisdiction: string;
  jurisdictionLabel: string;
  title: string;
  version: string;
  authority: string;
  itemCount: number;
  categoryCount: number;
}

export function blueprintSummary(b: Blueprint): BlueprintSummary {
  return {
    id: b.id,
    jurisdiction: b.jurisdiction,
    jurisdictionLabel: b.jurisdictionLabel,
    title: b.title,
    version: b.version,
    authority: b.authority,
    itemCount: b.items.length,
    categoryCount: b.categories.length,
  };
}

/**
 * Structural check that a blueprint is internally consistent: unique item keys,
 * unique category keys, every item points at a real category, and every weight
 * is a positive integer. Guards against a typo silently dropping an item out of
 * the score. Throws with a specific message on the first problem found.
 */
export function assertBlueprintValid(b: Blueprint): void {
  const categoryKeys = new Set<string>();
  for (const c of b.categories) {
    if (categoryKeys.has(c.key)) {
      throw new Error(`[${b.id}] duplicate category key: ${c.key}`);
    }
    categoryKeys.add(c.key);
  }

  const itemKeys = new Set<string>();
  for (const item of b.items) {
    if (itemKeys.has(item.key)) {
      throw new Error(`[${b.id}] duplicate item key: ${item.key}`);
    }
    itemKeys.add(item.key);
    if (!categoryKeys.has(item.category)) {
      throw new Error(
        `[${b.id}] item "${item.key}" references unknown category "${item.category}"`,
      );
    }
    if (!Number.isInteger(item.weight) || item.weight <= 0) {
      throw new Error(
        `[${b.id}] item "${item.key}" has invalid weight ${item.weight} (must be a positive integer)`,
      );
    }
  }
}
