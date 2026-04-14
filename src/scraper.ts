import * as cheerio from 'cheerio';
import { BASE_SITE_URL, getListUrl } from './config';
import type { Car } from './types';

/**
 * Scrape the Lexus CPO listing page for the given category.
 */
export async function scrapeListing(category: string): Promise<Car[]> {
  const listUrl = getListUrl(category);
  const res = await fetch(listUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch listing for ${category}: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const cars: Car[] = [];

  const links = $('a[href*="/cposearch/detail?Id="]');

  links.each((_idx, element) => {
    const $el = $(element);
    const text = $el.text();
    const href = $el.attr('href');
    if (!href) return;

    const url = new URL(href, BASE_SITE_URL);
    const id = url.searchParams.get('Id');
    if (!id) return;

    const car: Car = {
      id,
      name: extractName(text),
      thumbnailUrl: extractImageUrl($el),
      imageUrl: null,
      detailUrl: url.toString(),
      price: extractPrice(text, '本体価格'),
      totalPrice: extractPrice(text, '支払総額'),
      modelYear: extractModelYear(text),
      inspectionYear: null,
      inspectionMonth: null,
      mileage: extractMileage(text),
      bodyColorText: extractColorText(text),
      bodyColorCode: extractColorCode(text),
      interiorColor: null,
      engine: null,
      dealer: null,
      region: null,
      createdAt: Math.floor(Date.now() / 1000),
      soldAt: null,
    };

    if (car.thumbnailUrl) {
      car.imageUrl = car.thumbnailUrl.replace(/_M\.jpg$/, '_L.jpg');
    }

    const inspMatch = text.match(/(\d{4})年(\d{1,2})月/);
    if (inspMatch?.[1] && inspMatch[2]) {
      car.inspectionYear = Number.parseInt(inspMatch[1], 10);
      car.inspectionMonth = Number.parseInt(inspMatch[2], 10);
    }

    cars.push(car);
  });

  return cars;
}

/**
 * Fetch vehicle detail page to get interior color and engine type.
 */
export async function scrapeDetail(
  detailUrl: string,
): Promise<{ interiorColor: string | null; engine: string | null }> {
  const res = await fetch(detailUrl);
  if (!res.ok) {
    return { interiorColor: null, engine: null };
  }

  const html = await res.text();
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  // Interior color field
  const interiorMatch = text.match(/インテリアカラー[：:\s]*([^\s,、]+)/);
  const interiorColor = interiorMatch?.[1] ? interiorMatch[1].replace(/^・/, '') : null;

  // Engine type field
  const engineMatch = text.match(/エンジン[：:\s]*([^\s,、]+)/);
  const engine = engineMatch?.[1] ?? null;

  return { interiorColor, engine };
}

function extractName(text: string): string {
  // Extract vehicle name from listing text
  const match = text.match(
    /[A-Z]{2,3}\d+h?\s*[^\n]*?(パッケージ|コンバーチブル|Convertible|package|S\s*package|L\s*package)?/i,
  );
  if (!match) return '';
  return match[0]
    .replace(/\s+/g, ' ')
    .replace(/パッケージ/, '-PKG')
    .replace(/\s*(package|pkg)/i, '-PKG')
    .trim();
}

function extractImageUrl($el: ReturnType<cheerio.CheerioAPI>): string | null {
  const img = $el.find('img').first();
  const src = img.attr('src');
  if (!src) return null;
  return new URL(src, BASE_SITE_URL).toString();
}

function extractPrice(text: string, label: string): number | null {
  const regex = new RegExp(`${label}[\\s:]*(\\d[\\d,.]+)万円`);
  const match = text.match(regex);
  if (!match?.[1]) return null;
  return Number.parseFloat(match[1].replace(/,/g, ''));
}

function extractModelYear(text: string): number | null {
  const match = text.match(/年式[：:\s]*(\d{4})年/);
  if (!match?.[1]) return null;
  return Number.parseInt(match[1], 10);
}

function extractMileage(text: string): number | null {
  const match = text.match(/走行距離[：:\s]*([\d,]+)\s*km/);
  if (!match?.[1]) return null;
  return Number.parseInt(match[1].replace(/,/g, ''), 10);
}

function extractColorText(text: string): string | null {
  // Pattern: color name followed by (code), e.g. White(083)
  const match = text.match(/([\u3000-\u9fff\w]+)\(\w+\)/);
  return match?.[1] ?? null;
}

function extractColorCode(text: string): string | null {
  // Pattern: (CODE) after color text
  const match = text.match(/\((\w+)\)/);
  return match?.[1] ?? null;
}
