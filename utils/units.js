// utils/units.js
export const KG_TO_LB = 2.20462262185;
export const KM_TO_MI = 0.621371192;

export function toDisplayWeight(valueKg, units = 'metric') {
  if (valueKg == null || isNaN(valueKg)) return '';
  if (units === 'imperial') return `${(valueKg * KG_TO_LB).toFixed(1)} lb`;
  return `${Number(valueKg).toFixed(1)} kg`;
}

export function toDisplayDistance(valueKm, units = 'metric') {
  if (valueKm == null || isNaN(valueKm)) return '';
  if (units === 'imperial') return `${(valueKm * KM_TO_MI).toFixed(2)} mi`;
  return `${Number(valueKm).toFixed(2)} km`;
}
