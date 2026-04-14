export interface SearchProfile {
  /** Unique profile ID used as KV key prefix */
  id: string;
  /** Display label for Discord notifications */
  label: string;
  /** Lexus CPO category code (e.g. 'LC', 'RX', 'NX', 'LX', 'IS') */
  category: string;
  /** Minimum model year */
  minModelYear: number;
  /** Maximum base price in万円 */
  maxPrice: number;
  /** Only match hybrid models (name contains 'h' after model number) */
  hybridOnly: boolean;
  /** Name pattern regex (optional, e.g. 'LC500h' or 'RX350') */
  namePattern?: string;
  /** Body color codes to match (empty = any) */
  bodyColorCodes: string[];
  /** Interior color keywords to match (empty = any) */
  interiorColors: string[];
}

export interface Car {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  detailUrl: string;
  price: number | null;
  totalPrice: number | null;
  modelYear: number | null;
  inspectionYear: number | null;
  inspectionMonth: number | null;
  mileage: number | null;
  bodyColorText: string | null;
  bodyColorCode: string | null;
  interiorColor: string | null;
  engine: string | null;
  dealer: string | null;
  region: string | null;
  createdAt: number;
}

export interface Env {
  LEXUS_KV: KVNamespace;
  DISCORD_WEBHOOK_URL: string;
}
