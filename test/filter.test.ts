import { describe, expect, it } from 'vitest';
import { matchesFullCriteria, matchesListingCriteria } from '../src/filter';
import type { Car, SearchProfile } from '../src/types';

const profile: SearchProfile = {
  id: 'lc500h-white',
  label: 'LC500h White',
  category: 'LC',
  minModelYear: 2025,
  maxPrice: Number.POSITIVE_INFINITY,
  hybridOnly: true,
  bodyColorCodes: ['083'],
  interiorColors: ['レッド', 'ブラック', '赤', '黒'],
};

function makeCar(overrides: Partial<Car> = {}): Car {
  return {
    id: 'test-001',
    name: 'LC500h S-PKG',
    thumbnailUrl: null,
    imageUrl: null,
    detailUrl: 'https://cpo.lexus.jp/cposearch/detail?Id=test-001',
    price: 1250,
    totalPrice: 1261,
    modelYear: 2025,
    inspectionYear: 2027,
    inspectionMonth: 11,
    mileage: 4000,
    bodyColorText: 'ホワイト',
    bodyColorCode: '083',
    interiorColor: 'ブラック',
    engine: 'ハイブリッド',
    dealer: 'レクサス宮崎',
    region: '宮崎',
    createdAt: Math.floor(Date.now() / 1000),
    soldAt: null,
    ...overrides,
  };
}

describe('matchesListingCriteria', () => {
  it('should match a valid candidate', () => {
    expect(matchesListingCriteria(makeCar(), profile)).toBe(true);
  });

  it('should reject non-hybrid', () => {
    expect(matchesListingCriteria(makeCar({ name: 'LC500 S-PKG' }), profile)).toBe(false);
  });

  it('should reject model year before 2025', () => {
    expect(matchesListingCriteria(makeCar({ modelYear: 2024 }), profile)).toBe(false);
  });

  it('should reject non-white body color', () => {
    expect(matchesListingCriteria(makeCar({ bodyColorCode: '3T5' }), profile)).toBe(false);
  });

  it('should accept any price when maxPrice is Infinity', () => {
    expect(matchesListingCriteria(makeCar({ price: 9999 }), profile)).toBe(true);
  });

  it('should reject over maxPrice', () => {
    const limited = { ...profile, maxPrice: 1000 };
    expect(matchesListingCriteria(makeCar({ price: 1250 }), limited)).toBe(false);
  });
});

describe('matchesFullCriteria', () => {
  it('should match with black interior', () => {
    expect(matchesFullCriteria(makeCar({ interiorColor: 'ブラック' }), profile)).toBe(true);
  });

  it('should match with red interior', () => {
    expect(matchesFullCriteria(makeCar({ interiorColor: 'レッド' }), profile)).toBe(true);
  });

  it('should reject wrong interior color', () => {
    expect(matchesFullCriteria(makeCar({ interiorColor: 'その他' }), profile)).toBe(false);
  });

  it('should reject null interior color', () => {
    expect(matchesFullCriteria(makeCar({ interiorColor: null }), profile)).toBe(false);
  });

  it('should accept any interior when interiorColors is empty', () => {
    const anyInterior = { ...profile, interiorColors: [] as string[] };
    expect(matchesFullCriteria(makeCar({ interiorColor: null }), anyInterior)).toBe(true);
  });
});
