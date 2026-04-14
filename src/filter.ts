import type { Car, SearchProfile } from './types';

/**
 * Pre-filter using listing page data only (no detail page needed).
 * Checks: name pattern, hybrid, model year, price, body color.
 */
export function matchesListingCriteria(car: Car, profile: SearchProfile): boolean {
  if (profile.hybridOnly && !/\d+h/i.test(car.name)) {
    return false;
  }

  if (profile.namePattern && !new RegExp(profile.namePattern, 'i').test(car.name)) {
    return false;
  }

  if (car.modelYear == null || car.modelYear < profile.minModelYear) {
    return false;
  }

  if (car.price != null && car.price > profile.maxPrice) {
    return false;
  }

  if (
    profile.bodyColorCodes.length > 0 &&
    (car.bodyColorCode == null || !profile.bodyColorCodes.includes(car.bodyColorCode))
  ) {
    return false;
  }

  return true;
}

/**
 * Final filter including detail page data (interior color).
 */
export function matchesFullCriteria(car: Car, profile: SearchProfile): boolean {
  if (!matchesListingCriteria(car, profile)) {
    return false;
  }

  if (
    profile.interiorColors.length > 0 &&
    (car.interiorColor == null ||
      !profile.interiorColors.some((c) => car.interiorColor?.includes(c)))
  ) {
    return false;
  }

  return true;
}
