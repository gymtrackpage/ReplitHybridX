// Weight conversion utilities

export function convertWeight(weight: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return weight;
  
  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return weight * 2.20462;
  }
  
  if (fromUnit === 'lbs' && toUnit === 'kg') {
    return weight / 2.20462;
  }
  
  return weight;
}

export function formatWeight(weight: number | string, unit: string): string {
  if (typeof weight === 'string') {
    // Try to extract numeric value from string like "20kg" or "45 lbs"
    const match = weight.match(/(\d+(?:\.\d+)?)/);
    if (!match) return weight; // Return original if no number found
    
    const numericWeight = parseFloat(match[1]);
    const originalUnit = weight.toLowerCase().includes('lb') ? 'lbs' : 'kg';
    const convertedWeight = convertWeight(numericWeight, originalUnit, unit);
    
    return `${Math.round(convertedWeight * 10) / 10}${unit}`;
  }
  
  return `${Math.round(weight * 10) / 10}${unit}`;
}

export function parseWeightString(weightStr: string, targetUnit: string): string {
  // Handle various weight formats: "20kg", "45 lbs", "30", etc.
  const match = weightStr.match(/(\d+(?:\.\d+)?)\s*(kg|lbs?|pounds?)?/i);
  if (!match) return weightStr;
  
  const value = parseFloat(match[1]);
  const unit = match[2] ? (match[2].toLowerCase().includes('lb') || match[2].toLowerCase().includes('pound') ? 'lbs' : 'kg') : 'kg';
  
  const convertedValue = convertWeight(value, unit, targetUnit);
  return `${Math.round(convertedValue * 10) / 10}${targetUnit}`;
}