import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrapeDetail } from '../src/scraper';

const DETAIL_URL = 'https://cpo.lexus.jp/cposearch/detail?Id=test-001';

function detailPage(body: string): string {
  return `<html><body><dl><dt>年式</dt><dd>2025年（R7年）</dd><dt>エンジン</dt><dd>ハイブリッド</dd></dl>${body}</body></html>`;
}

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn();
  for (const res of responses) fetchMock.mockResolvedValueOnce(res);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('scrapeDetail', () => {
  it('reads the interior color after the bullet separator', async () => {
    stubFetch(new Response(detailPage('<dt>インテリアカラー</dt><dd><span>・</span> レッド</dd>')));
    expect(await scrapeDetail(DETAIL_URL)).toEqual({
      interiorColor: 'レッド',
      engine: 'ハイブリッド',
    });
  });

  it('falls back to the equipment notes when the field is absent', async () => {
    stubFetch(
      new Response(
        detailPage(
          '<p>＜インテリア＞ セミアニリン本革／ダークローズ／ブラック ＜装備品＞ フロアマット</p>',
        ),
      ),
    );
    const detail = await scrapeDetail(DETAIL_URL);
    expect(detail.interiorColor).toBe('セミアニリン本革／ダークローズ／ブラック');
  });

  it('returns null when no interior information exists', async () => {
    stubFetch(new Response(detailPage('')));
    expect((await scrapeDetail(DETAIL_URL)).interiorColor).toBeNull();
  });

  it('retries a transient 403 before giving up', async () => {
    const fetchMock = stubFetch(
      new Response('Forbidden', { status: 403 }),
      new Response(detailPage('<dt>インテリアカラー</dt><dd>・ ブラック</dd>')),
    );
    expect((await scrapeDetail(DETAIL_URL)).interiorColor).toBe('ブラック');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
