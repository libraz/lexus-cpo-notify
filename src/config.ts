import type { SearchProfile } from './types';

const BASE_URL = 'https://cpo.lexus.jp';

export function getListUrl(category: string): string {
  return `${BASE_URL}/cposearch/result_list?Cn=${category}`;
}

export const BASE_SITE_URL = BASE_URL;

export const PROFILES: SearchProfile[] = [
  {
    id: 'lc500h-white',
    label: 'LC500h White / Red or Black interior',
    category: 'LC',
    minModelYear: 2025,
    maxPrice: Number.POSITIVE_INFINITY,
    hybridOnly: true,
    bodyColorCodes: ['083'],
    interiorColors: ['レッド', 'ブラック', '赤', '黒'],
  },
  // Example: add more profiles here
  // {
  //   id: 'rx500h-black',
  //   label: 'RX500h Black',
  //   category: 'RX',
  //   minModelYear: 2024,
  //   maxPrice: 900,
  //   hybridOnly: true,
  //   bodyColorCodes: ['212'],
  //   interiorColors: [],
  // },
];
