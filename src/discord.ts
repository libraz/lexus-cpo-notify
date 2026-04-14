import type { Car } from './types';

interface DiscordEmbed {
  title: string;
  url?: string;
  color: number;
  description: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  image?: { url: string };
  footer?: { text: string };
  timestamp?: string;
}

export async function sendDiscordNotification(
  webhookUrl: string,
  profileLabel: string,
  cars: Car[],
): Promise<void> {
  if (cars.length === 0) return;

  const embeds: DiscordEmbed[] = cars.map((car) => ({
    title: `🚗 ${car.name}`,
    url: car.detailUrl,
    color: 0x0a3d62,
    description: [
      car.bodyColorText && `**${car.bodyColorText}**`,
      car.interiorColor && `内装: ${car.interiorColor}`,
      car.engine,
    ]
      .filter(Boolean)
      .join(' / '),
    fields: [
      { name: '年式', value: car.modelYear ? `${car.modelYear}年` : '-', inline: true },
      {
        name: '走行距離',
        value: car.mileage != null ? `${car.mileage.toLocaleString()}km` : '-',
        inline: true,
      },
      {
        name: '本体価格',
        value: car.price != null ? `¥${car.price.toLocaleString()}万` : '-',
        inline: true,
      },
      {
        name: '支払総額',
        value: car.totalPrice != null ? `¥${car.totalPrice.toLocaleString()}万` : '-',
        inline: true,
      },
    ],
    ...(car.imageUrl ? { image: { url: car.imageUrl } } : {}),
    footer: { text: profileLabel },
    timestamp: new Date().toISOString(),
  }));

  // Send one embed per message for large images
  for (const embed of embeds) {
    await postWebhook(webhookUrl, { username: 'Lexus CPO Notify', embeds: [embed] });
  }
}

const ERROR_SUPPRESS_TTL = 30 * 24 * 60 * 60; // 30 days

export async function sendErrorNotification(
  webhookUrl: string,
  kv: KVNamespace,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const kvKey = `error:${simpleHash(message)}`;

  // Suppress duplicate error notifications for 30 days
  if ((await kv.get(kvKey)) !== null) return;

  const embed: DiscordEmbed = {
    title: '⚠️ Lexus CPO Notify Error',
    color: 0xe74c3c,
    description: `\`\`\`\n${message}\n\`\`\``,
    footer: { text: 'Suppressed for 30 days after first notification' },
    timestamp: new Date().toISOString(),
  };

  await postWebhook(webhookUrl, { username: 'Lexus CPO Notify', embeds: [embed] });
  await kv.put(kvKey, '1', { expirationTtl: ERROR_SUPPRESS_TTL });
}

async function postWebhook(url: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`Discord webhook failed: ${res.status} ${await res.text()}`);
  }
}

function simpleHash(str: string): string {
  let hash = 0;
  for (const ch of str) {
    hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  }
  return (hash >>> 0).toString(36);
}
