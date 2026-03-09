import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';

// The module uses CommonJS, import accordingly
const { AmazonCollector } = require('./amazon');

// ── Helper: create collector with default config ─────────────────────
function createCollector(overrides = {}) {
  const config = {
    keyword: 'B08F7PTF53',
    source: 'amazon',
    limit: 10,
    mock: false,
    ...overrides,
  };
  return new AmazonCollector(config);
}

// ── isAsin (tested indirectly via fetchRaw) ──────────────────────────
describe('ASIN validation', () => {
  beforeEach(() => {
    // Prevent Playwright from launching by pretending no auth file exists
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects non-ASIN keywords with CollectorError', async () => {
    const collector = createCollector({ keyword: 'not-an-asin', mock: false });
    await expect(collector.fetchRaw()).rejects.toThrow(/valid 10-char ASIN/);
  });

  it('rejects Chinese characters with CollectorError', async () => {
    const collector = createCollector({ keyword: '蓝牙耳机', mock: false });
    await expect(collector.fetchRaw()).rejects.toThrow(/valid 10-char ASIN/);
  });

  it('accepts valid ASIN (uppercase) - falls to demoMode with no services', async () => {
    const collector = createCollector({ keyword: 'B08F7PTF53', mock: false });
    const result = await collector.fetchRaw();
    expect(collector._demoMode).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('accepts lowercase ASIN (case insensitive)', async () => {
    const collector = createCollector({ keyword: 'b08f7ptf53', mock: false });
    const result = await collector.fetchRaw();
    expect(collector._demoMode).toBe(true);
  });
});

// ── fetchMock ────────────────────────────────────────────────────────
describe('fetchMock', () => {
  it('returns mock reviews up to limit', () => {
    const collector = createCollector({ limit: 5, mock: true });
    const reviews = collector.fetchMock();
    expect(reviews).toHaveLength(5);
  });

  it('all mock reviews have required fields', () => {
    const collector = createCollector({ limit: 20, mock: true });
    const reviews = collector.fetchMock();
    for (const r of reviews) {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('title');
      expect(r).toHaveProperty('text');
      expect(r).toHaveProperty('stars');
      expect(r).toHaveProperty('author');
      expect(r).toHaveProperty('createdAt');
      expect(typeof r.stars).toBe('number');
      expect(r.stars).toBeGreaterThanOrEqual(1);
      expect(r.stars).toBeLessThanOrEqual(5);
    }
  });

  it('returns max 20 reviews', () => {
    const collector = createCollector({ limit: 100, mock: true });
    const reviews = collector.fetchMock();
    expect(reviews).toHaveLength(20);
  });

  it('includes mix of star ratings', () => {
    const collector = createCollector({ limit: 20, mock: true });
    const reviews = collector.fetchMock();
    const stars = new Set(reviews.map(r => r.stars));
    expect(stars.size).toBeGreaterThan(1);
  });
});

// ── parsePost ────────────────────────────────────────────────────────
describe('parsePost', () => {
  it('maps raw review to Post structure', () => {
    const collector = createCollector();
    const raw = {
      id: 'R123',
      title: 'Bad product',
      text: 'It broke immediately',
      stars: 1,
      author: 'John',
      createdAt: '2025-01-01T00:00:00.000Z',
      helpfulVotes: 42,
      verified: true,
      hasImages: true,
      asin: 'B08F7PTF53',
      productTitle: 'Test Widget',
    };
    const post = collector.parsePost(raw);

    expect(post.id).toBe('R123');
    expect(post.title).toBe('Bad product');
    expect(post.content).toBe('It broke immediately');
    expect(post.author).toBe('John');
    expect(post.platform).toBe('amazon');
    expect(post.starRating).toBe(1);
    expect(post.verifiedPurchase).toBe(true);
    expect(post.helpfulCount).toBe(42);
    expect(post.hasImages).toBe(true);
    expect(post.productTitle).toBe('Test Widget');
    expect(post.createdAt).toBeInstanceOf(Date);
  });

  it('calculates score inversely from stars (1-star = 80)', () => {
    const collector = createCollector();
    const post = collector.parsePost({ stars: 1 });
    expect(post.score).toBe(80); // (5-1)*20
  });

  it('calculates score for 5-star (score = 0)', () => {
    const collector = createCollector();
    const post = collector.parsePost({ stars: 5 });
    expect(post.score).toBe(0); // (5-5)*20
  });

  it('defaults missing fields gracefully', () => {
    const collector = createCollector();
    const post = collector.parsePost({});
    expect(post.title).toBe('(no title)');
    expect(post.author).toBe('unknown');
    expect(post.content).toBe('');
    expect(post.verifiedPurchase).toBe(false);
    expect(post.hasImages).toBe(false);
    expect(post.helpfulCount).toBe(0);
    expect(post.starRating).toBeNull(); // raw.stars ?? null
  });

  it('uses titleZh when present', () => {
    const collector = createCollector();
    const post = collector.parsePost({ titleZh: '差评标题' });
    expect(post.titleZh).toBe('差评标题');
  });

  it('does not set productTitle when absent', () => {
    const collector = createCollector();
    const post = collector.parsePost({});
    expect(post.productTitle).toBeUndefined();
  });
});

// ── parseReviewsHtml ─────────────────────────────────────────────────
describe('parseReviewsHtml', () => {
  const sampleHtml = `
    <div data-hook="review" id="R111TEST">
      <span data-hook="review-star-rating">
        <span class="a-icon-alt">2.0 out of 5 stars</span>
      </span>
      <a data-hook="review-title">
        <span>Terrible product</span>
      </a>
      <span data-hook="review-body">
        <span>It fell apart on day one.</span>
      </span>
      <span class="a-profile-name">TestUser</span>
      <span data-hook="review-date">Reviewed in the United States on January 15, 2025</span>
      <span data-hook="helpful-vote-statement">42 people found this helpful</span>
      <span data-hook="avp-badge">Verified Purchase</span>
      <div data-hook="review-image-tile"></div>
    </div>
    <div data-hook="review" id="R222TEST">
      <span data-hook="review-star-rating">
        <span class="a-icon-alt">4.0 out of 5 stars</span>
      </span>
      <a data-hook="review-title">
        <span>Pretty good</span>
      </a>
      <span data-hook="review-body">
        <span>Works well for the price.</span>
      </span>
      <span class="a-profile-name">HappyBuyer</span>
      <span data-hook="review-date">Reviewed in the United States on February 20, 2025</span>
    </div>
  `;

  it('parses multiple reviews from HTML', () => {
    const collector = createCollector();
    const reviews = collector.parseReviewsHtml(sampleHtml);
    expect(reviews).toHaveLength(2);
  });

  it('extracts review ID from element id', () => {
    const collector = createCollector();
    const reviews = collector.parseReviewsHtml(sampleHtml);
    expect(reviews[0].id).toBe('R111TEST');
    expect(reviews[1].id).toBe('R222TEST');
  });

  it('extracts star rating from alt text', () => {
    const collector = createCollector();
    const reviews = collector.parseReviewsHtml(sampleHtml);
    expect(reviews[0].stars).toBe(2);
    expect(reviews[1].stars).toBe(4);
  });

  it('extracts title and body text', () => {
    const collector = createCollector();
    const reviews = collector.parseReviewsHtml(sampleHtml);
    expect(reviews[0].title).toBe('Terrible product');
    expect(reviews[0].text).toBe('It fell apart on day one.');
  });

  it('extracts author name', () => {
    const collector = createCollector();
    const reviews = collector.parseReviewsHtml(sampleHtml);
    expect(reviews[0].author).toBe('TestUser');
  });

  it('parses date from review-date text', () => {
    const collector = createCollector();
    const reviews = collector.parseReviewsHtml(sampleHtml);
    expect(reviews[0].createdAt).toContain('2025');
  });

  it('extracts helpful vote count', () => {
    const collector = createCollector();
    const reviews = collector.parseReviewsHtml(sampleHtml);
    expect(reviews[0].helpfulVotes).toBe(42);
    expect(reviews[1].helpfulVotes).toBe(0); // no helpful text
  });

  it('detects verified purchase badge', () => {
    const collector = createCollector();
    const reviews = collector.parseReviewsHtml(sampleHtml);
    expect(reviews[0].verified).toBe(true);
    expect(reviews[1].verified).toBe(false);
  });

  it('detects review images', () => {
    const collector = createCollector();
    const reviews = collector.parseReviewsHtml(sampleHtml);
    expect(reviews[0].hasImages).toBe(true);
    expect(reviews[1].hasImages).toBe(false);
  });

  it('generates URL for each review', () => {
    const collector = createCollector();
    const reviews = collector.parseReviewsHtml(sampleHtml);
    expect(reviews[0].url).toContain('R111TEST');
  });

  it('returns empty array for HTML with no reviews', () => {
    const collector = createCollector();
    const reviews = collector.parseReviewsHtml('<html><body>No reviews here</body></html>');
    expect(reviews).toHaveLength(0);
  });

  it('handles CAPTCHA/empty page gracefully', () => {
    const collector = createCollector();
    const reviews = collector.parseReviewsHtml('<html><body>To discuss automated access to Amazon data please contact</body></html>');
    expect(reviews).toHaveLength(0);
  });
});

// ── fetchRaw three-tier fallback ─────────────────────────────────────
describe('fetchRaw fallback logic', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.SCRAPERAPI_KEY;
    // Mock fs.existsSync to prevent Playwright from launching
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('returns mock data when mock=true, skipping ASIN check', async () => {
    const collector = createCollector({ keyword: 'anything', mock: true });
    const result = await collector.fetchRaw();
    expect(result.length).toBeGreaterThan(0);
    expect(collector._demoMode).toBe(false); // mock mode, not demo mode
  });

  it('falls back to mock with demoMode when no ScraperAPI key and no auth file', async () => {
    const collector = createCollector({ keyword: 'B08F7PTF53', mock: false });
    const result = await collector.fetchRaw();
    expect(collector._demoMode).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('tries ScraperAPI first when SCRAPERAPI_KEY is set', async () => {
    process.env.SCRAPERAPI_KEY = 'test-key';
    const collector = createCollector({ keyword: 'B08F7PTF53', mock: false });

    // Mock the ScraperAPI method to track if it was called
    const scraperSpy = vi.spyOn(collector, 'fetchWithScraperAPI').mockRejectedValue(new Error('API error'));

    const result = await collector.fetchRaw();

    expect(scraperSpy).toHaveBeenCalled();
    // Should fall through to mock since both ScraperAPI and Playwright fail
    expect(collector._demoMode).toBe(true);
  });
});

// ── collect() end-to-end (with mock) ─────────────────────────────────
describe('collect() integration', () => {
  it('returns Post[] from mock data', async () => {
    const collector = createCollector({ keyword: 'B08F7PTF53', mock: true, limit: 5 });
    const posts = await collector.collect();
    expect(posts).toHaveLength(5);
    for (const post of posts) {
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('title');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('platform', 'amazon');
      expect(post).toHaveProperty('starRating');
      expect(post).toHaveProperty('verifiedPurchase');
      expect(post).toHaveProperty('helpfulCount');
      expect(post).toHaveProperty('hasImages');
    }
  });

  it('validates config - empty keyword throws', async () => {
    const collector = createCollector({ keyword: '' });
    await expect(collector.collect()).rejects.toThrow(/Keyword is required/);
  });

  it('validates config - zero limit throws', async () => {
    const collector = createCollector({ limit: 0 });
    await expect(collector.collect()).rejects.toThrow(/Limit must be greater than 0/);
  });

  it('mock reviews have correct score mapping (1-star → 80)', async () => {
    const collector = createCollector({ mock: true, limit: 20 });
    const posts = await collector.collect();
    for (const post of posts) {
      const expectedScore = (5 - post.starRating) * 20;
      expect(post.score).toBe(expectedScore);
    }
  });
});
