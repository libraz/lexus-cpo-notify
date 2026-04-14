import { PROFILES } from './config';
import { sendDiscordNotification, sendErrorNotification } from './discord';
import { matchesFullCriteria, matchesListingCriteria } from './filter';
import { scrapeDetail, scrapeListing } from './scraper';
import type { Car, Env, SearchProfile } from './types';

const KV_TTL = 90 * 24 * 60 * 60; // 90 days

export default {
  async scheduled(_event: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    try {
      await runAll(env);
    } catch (error) {
      await sendErrorNotification(env.DISCORD_WEBHOOK_URL, env.LEXUS_KV, error);
    }
  },

  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/run') {
      try {
        const results = await runAll(env);
        return Response.json(results);
      } catch (error) {
        await sendErrorNotification(env.DISCORD_WEBHOOK_URL, env.LEXUS_KV, error);
        return Response.json({ error: String(error) }, { status: 500 });
      }
    }
    return new Response('OK');
  },
} satisfies ExportedHandler<Env>;

async function runAll(env: Env) {
  // Group profiles by category to avoid fetching the same listing page twice
  const byCategory = new Map<string, SearchProfile[]>();
  for (const profile of PROFILES) {
    const list = byCategory.get(profile.category) ?? [];
    list.push(profile);
    byCategory.set(profile.category, list);
  }

  const results = [];

  for (const [category, profiles] of byCategory) {
    const currentItems = await scrapeListing(category);

    if (currentItems.length === 0) {
      throw new Error(
        `Scraping returned 0 items for category "${category}" — site may have changed`,
      );
    }

    // Save all vehicles to KV, determine new ones
    const newItems = await saveAndFindNew(env.LEXUS_KV, category, currentItems);

    for (const profile of profiles) {
      const result = await processProfile(env, profile, newItems);
      results.push(result);
    }
  }

  console.log(JSON.stringify(results));
  return results;
}

async function saveAndFindNew(kv: KVNamespace, category: string, items: Car[]): Promise<Car[]> {
  const kvResults = await Promise.all(
    items.map(async (item) => ({
      item,
      existing: await kv.get<Car>(`car:${category}:${item.id}`, 'json'),
    })),
  );

  const newItems: Car[] = [];

  await Promise.all(
    kvResults.map(async ({ item, existing }) => {
      if (!existing) {
        newItems.push(item);
      }
      await kv.put(
        `car:${category}:${item.id}`,
        JSON.stringify(existing ? { ...existing, ...item } : item),
        { expirationTtl: KV_TTL },
      );
    }),
  );

  return newItems;
}

async function processProfile(env: Env, profile: SearchProfile, newItems: Car[]) {
  const kv = env.LEXUS_KV;

  // Pre-filter new items with listing data
  const preFiltered = newItems.filter((car) => matchesListingCriteria(car, profile));

  // Fetch detail pages only for pre-filtered items
  const enriched = await Promise.all(
    preFiltered.map(async (car) => {
      const detail = await scrapeDetail(car.detailUrl);
      const enrichedCar = { ...car, interiorColor: detail.interiorColor, engine: detail.engine };
      await kv.put(`car:${profile.category}:${car.id}`, JSON.stringify(enrichedCar), {
        expirationTtl: KV_TTL,
      });
      return enrichedCar;
    }),
  );

  // Final filter (interior color)
  const matchedItems = enriched.filter((car) => matchesFullCriteria(car, profile));

  // Send Discord notification for unnotified matches
  const unnotified = await filterUnnotified(kv, matchedItems);
  if (unnotified.length > 0) {
    await sendDiscordNotification(env.DISCORD_WEBHOOK_URL, profile.label, unnotified);
    await Promise.all(
      unnotified.map((item) => kv.put(`notified:${item.id}`, '1', { expirationTtl: KV_TTL })),
    );
  }

  return {
    profileId: profile.id,
    newItemsCount: newItems.length,
    preFilteredCount: preFiltered.length,
    matchedItemsCount: matchedItems.length,
    notifiedCount: unnotified.length,
  };
}

async function filterUnnotified(kv: KVNamespace, cars: Car[]): Promise<Car[]> {
  const flags = await Promise.all(cars.map((car) => kv.get(`notified:${car.id}`)));
  return cars.filter((_car, i) => flags[i] === null);
}
