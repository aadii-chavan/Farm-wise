export type InventoryUnit = 'kg' | 'gm' | 'L' | 'mL' | 'bags';

/**
 * Converts a quantity from one unit to another.
 * Returns null if the conversion is impossible (e.g., kg to L).
 */
export function convertUnit(value: number, fromUnit: string, toUnit: string): number | null {
  if (fromUnit === toUnit) return value;

  // Mass conversions
  if ((fromUnit === 'kg' || fromUnit === 'gm') && (toUnit === 'kg' || toUnit === 'gm')) {
    if (fromUnit === 'kg' && toUnit === 'gm') return value * 1000;
    if (fromUnit === 'gm' && toUnit === 'kg') return value / 1000;
  }

  // Volume conversions
  if ((fromUnit === 'L' || fromUnit === 'mL') && (toUnit === 'L' || toUnit === 'mL')) {
    if (fromUnit === 'L' && toUnit === 'mL') return value * 1000;
    if (fromUnit === 'mL' && toUnit === 'L') return value / 1000;
  }

  return null;
}

/**
 * Returns the "natural" secondary unit for display/convenience.
 */
export function getSecondaryUnit(unit: string): string | null {
  switch (unit) {
    case 'kg': return 'gm';
    case 'gm': return 'kg';
    case 'L': return 'mL';
    case 'mL': return 'L';
    default: return null;
  }
}
