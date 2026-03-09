# Amazon ScraperAPI 采集升级 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Playwright local-auth Amazon scraping with ScraperAPI HTTP requests, enabling production-ready review collection on Railway.

**Architecture:** Add a `fetchWithScraperAPI()` method to `AmazonCollector` that uses ScraperAPI to fetch Amazon review page HTML, then reuses the existing `parseReviewsHtml()` cheerio parser. Three-tier fallback: ScraperAPI → Playwright → Mock.

**Tech Stack:** ScraperAPI (HTTP proxy), cheerio (HTML parsing), axios (HTTP client — already a dependency)

---

### Task 1: Add ScraperAPI fetch method to Amazon collector

**Files:**
- Modify: `packages/core/src/collectors/amazon.js:293-317` (fetchRaw method)
- Modify: `packages/core/src/collectors/amazon.js` (add new fetchWithScraperAPI method)

**Step 1: Add `fetchWithScraperAPI()` method**

Insert after the `fetchMock()` method (after line 292), before `fetchRaw()`:

```javascript
async fetchWithScraperAPI() {
    const keyword = this.config.keyword.trim().toUpperCase();
    const limit = this.config.limit ?? 20;
    const apiKey = process.env.SCRAPERAPI_KEY;
    if (!apiKey) throw new Error('SCRAPERAPI_KEY not set');

    const asin = keyword;
    const reviews = [];
    let pageNum = 1;
    const maxPages = Math.ceil(limit / 10); // Amazon shows ~10 reviews per page

    while (reviews.length < limit && pageNum <= maxPages) {
        const amazonUrl = `https://www.amazon.com/product-reviews/${asin}?filterByStar=one_star&filterByStar=two_star&sortBy=recent&pageNumber=${pageNum}`;
        const scraperUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(amazonUrl)}&render=false`;

        this.log(`ScraperAPI page ${pageNum}: ${amazonUrl}`);
        const res = await axios_1.default.get(scraperUrl, { timeout: 30000 });
        const html = res.data;

        // Check for CAPTCHA or sign-in redirect
        if (typeof html === 'string' && (html.includes('captcha') || html.includes('Amazon Sign'))) {
            this.log(`ScraperAPI: CAPTCHA or sign-in detected on page ${pageNum}`);
            break;
        }

        const pageReviews = this.parseReviewsHtml(html);
        this.log(`ScraperAPI page ${pageNum}: parsed ${pageReviews.length} reviews`);

        if (pageReviews.length === 0) break;

        // Extract product title from first page
        if (pageNum === 1) {
            const $ = cheerio_1.default.load(html);
            const productTitle = $('[data-hook="product-link"]').first().text().trim()
                || $('[data-hook="cr-product-title"]').text().trim()
                || null;
            if (productTitle) {
                this.log(`Product title: ${productTitle}`);
                pageReviews.forEach(r => { r.productTitle = productTitle; });
                // Tag subsequent pages too
                this._productTitle = productTitle;
            }
        } else if (this._productTitle) {
            pageReviews.forEach(r => { r.productTitle = this._productTitle; });
        }

        reviews.push(...pageReviews);
        pageNum++;

        // Polite delay between pages
        if (pageNum <= maxPages && reviews.length < limit) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    this.log(`ScraperAPI total: ${reviews.length} reviews collected`);
    return reviews.slice(0, limit);
}
```

**Step 2: Update `fetchRaw()` to use three-tier fallback**

Replace the existing `fetchRaw()` method (lines 293-317) with:

```javascript
async fetchRaw() {
    this.log(`fetchRaw called: mock=${this.config.mock} keyword="${this.config.keyword}"`);
    if (this.config.mock) {
        this.log('mock=true, returning mock data, skipping ASIN check');
        return this.fetchMock();
    }

    const _keyword = this.config.keyword.trim();
    if (/[\u4e00-\u9fa5]/.test(_keyword)) {
        this.log(`WARNING: keyword "${_keyword}" contains Chinese characters.`);
    }
    if (!isAsin(_keyword)) {
        throw new types_1.CollectorError(
            `Amazon collector requires a valid 10-char ASIN (e.g. B08F7PTF53), got: "${_keyword}"`,
            this.platform
        );
    }

    // Tier 1: ScraperAPI (works in production, no auth needed)
    if (process.env.SCRAPERAPI_KEY) {
        try {
            this.log('Trying ScraperAPI...');
            return await this.fetchWithScraperAPI();
        } catch (err) {
            this.log(`ScraperAPI failed: ${err.message}, falling back...`);
        }
    }

    // Tier 2: Playwright with local auth (works locally with saved session)
    try {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const AUTH_STATE_PATH = path.join(os.homedir(), '.demand-collector', 'amazon-auth.json');
        if (fs.existsSync(AUTH_STATE_PATH)) {
            this.log('Trying Playwright with saved auth...');
            return await this.fetchWithPlaywright();
        }
    } catch (err) {
        this.log(`Playwright failed: ${err.message}, falling back to mock...`);
    }

    // Tier 3: Mock with demoMode flag
    this.log('All real collection methods unavailable, returning mock data');
    const mockData = this.fetchMock();
    mockData._demoMode = true;
    return mockData;
}
```

**Step 3: Run build to verify no syntax errors**

Run: `cd packages/core && npx tsc --noEmit 2>&1 | head -20` (if TS source) or just verify the JS is valid.

Since this is a `.js` file (not `.ts`), verify with:
```bash
node -c packages/core/src/collectors/amazon.js
```
Expected: no output (valid syntax)

**Step 4: Commit**

```bash
git add packages/core/src/collectors/amazon.js
git commit -m "feat: add ScraperAPI fetch with three-tier fallback for Amazon collector"
```

---

### Task 2: Update Web API route to simplify Amazon mock logic

**Files:**
- Modify: `apps/web/app/api/collect/route.ts:116-124` (mock decision logic)

**Step 1: Simplify the mock decision**

Replace lines 116-124 in `route.ts`:

```typescript
// Old logic: complex mock decision based on auth file existence
// New logic: ScraperAPI handles production, Playwright handles local, mock is last resort
const isValidAsin = (s: string) => /^[A-Z0-9]{10}$/.test(s.trim().toUpperCase());
const keywordIsAsin = source === 'amazon' && isValidAsin(keyword);
const mock =
  source === 'amazon' ? !keywordIsAsin :  // only mock if not a valid ASIN (fallback handled inside collector)
  source === 'trustpilot' ? false :
  source === 'tiktokshop' ? true :
  source === 'shopee' ? true :
  true;
```

This removes the `amazonAuthMissing` check since the collector now handles fallback internally.

**Step 2: Clean up the demoMode logic**

Replace lines 133-135:

```typescript
// demoMode is now set by the collector itself via _demoMode flag
if ((result as unknown as Record<string, unknown>)._demoMode) {
  (result as unknown as Record<string, unknown>).demoMode = true;
}
```

Remove the `AMAZON_AUTH_PATH` constant and related imports (`existsSync`, `join`, `homedir`) at the top of the file since they're no longer needed.

**Step 3: Commit**

```bash
git add apps/web/app/api/collect/route.ts
git commit -m "feat: simplify Amazon mock logic, collector handles fallback internally"
```

---

### Task 3: Add SCRAPERAPI_KEY to environment configs

**Files:**
- Modify: `apps/web/.env.local` (local dev)
- Modify: `apps/web/.env.production` (production)
- Modify: `apps/web/.env.example` (template)
- Modify: `.env` (CLI root)

**Step 1: Get a ScraperAPI key**

Sign up at https://www.scraperapi.com/ (free plan: 5000 requests/month). Copy the API key.

**Step 2: Add to env files**

Add to each env file:
```
SCRAPERAPI_KEY=your_key_here
```

**Step 3: Add to Railway environment variables**

In Railway Dashboard → Web service → Variables → add `SCRAPERAPI_KEY`.

Note: Since `.env.production` is committed, you can also add it there. But Railway env vars take precedence and are more secure.

**Step 4: Commit**

```bash
git add apps/web/.env.example
git commit -m "feat: add SCRAPERAPI_KEY to env example"
```

---

### Task 4: Enhance parseReviewsHtml with new fields

**Files:**
- Modify: `packages/core/src/collectors/amazon.js:461-487` (parseReviewsHtml method)

**Step 1: Update parseReviewsHtml to extract additional fields**

Replace the `parseReviewsHtml` method:

```javascript
parseReviewsHtml(html) {
    const $ = cheerio_1.default.load(html);
    const items = [];
    $('[data-hook="review"]').each((_, el) => {
        const $el = $(el);
        const id = $el.attr('id') ?? `amz-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const titleEl = $el.find('[data-hook="review-title"] span').not('[class]').first();
        const title = titleEl.text().trim() || $el.find('[data-hook="review-title"]').text().trim() || '(no title)';
        const text = $el.find('[data-hook="review-body"] span').first().text().trim();
        const starText = $el.find('[data-hook="review-star-rating"] .a-icon-alt, [data-hook="cmps-review-star-rating"] .a-icon-alt').first().text();
        const stars = parseFloat(starText) || 3;
        const author = $el.find('.a-profile-name').first().text().trim() || 'unknown';
        const dateText = $el.find('[data-hook="review-date"]').first().text();
        const dateMatch = dateText.match(/(\w+ \d+, \d{4})/);
        const createdAt = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();
        const helpfulText = $el.find('[data-hook="helpful-vote-statement"]').first().text();
        const helpfulMatch = helpfulText.match(/(\d+)/);
        const helpfulVotes = helpfulMatch ? parseInt(helpfulMatch[1]) : 0;
        const verified = $el.find('[data-hook="avp-badge"]').length > 0;
        const hasImages = $el.find('[data-hook="review-image-tile"]').length > 0
            || $el.find('.review-image-tile-section').length > 0;
        const asin = $el.closest('[data-asin]').attr('data-asin') ?? '';
        if (title && (text || title !== '(no title)')) {
            items.push({
                id, title, text, stars, author, createdAt,
                helpfulVotes, verified, hasImages, asin,
                url: `https://www.amazon.com/gp/customer-reviews/${id}`,
            });
        }
    });
    return items;
}
```

**Step 2: Update parsePost to pass through new fields**

Update `parsePost` method to include new fields:

```javascript
parsePost(raw) {
    const stars = raw.stars ?? 1;
    const score = (5 - stars) * 20;
    const id = String(raw.id ?? `amz-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const post = {
        id,
        title: raw.title ?? "(no title)",
        titleZh: raw.titleZh,
        content: raw.text ?? raw.content ?? "",
        author: raw.author ?? "unknown",
        url: raw.url ?? `https://www.amazon.com/product-reviews/${raw.asin ?? 'unknown'}`,
        score: Number.isFinite(score) ? score : 80,
        commentCount: raw.helpfulVotes ?? 0,
        createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
        platform: this.platform,
        starRating: raw.stars ?? null,
        verifiedPurchase: raw.verified ?? false,
        helpfulCount: raw.helpfulVotes ?? 0,
        hasImages: raw.hasImages ?? false,
    };
    if (raw.productTitle) post.productTitle = raw.productTitle;
    return post;
}
```

**Step 3: Verify syntax**

```bash
node -c packages/core/src/collectors/amazon.js
```

**Step 4: Commit**

```bash
git add packages/core/src/collectors/amazon.js
git commit -m "feat: add starRating, verifiedPurchase, helpfulCount, hasImages to Amazon reviews"
```

---

### Task 5: Update Post type to include new Amazon fields

**Files:**
- Modify: `packages/core/src/types/index.ts:27-53` (Post interface)

**Step 1: Add optional Amazon-specific fields to Post interface**

Add after `opportunities` field (line 51):

```typescript
  /** Amazon 原始星级 1-5 */
  starRating?: number;
  /** 是否 Verified Purchase */
  verifiedPurchase?: boolean;
  /** "X 人觉得有用" 数量 */
  helpfulCount?: number;
  /** 是否含图片评论 */
  hasImages?: boolean;
  /** 商品名称（Amazon 特有） */
  productTitle?: string;
```

**Step 2: Build to verify types**

```bash
cd packages/core && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add packages/core/src/types/index.ts
git commit -m "feat: add Amazon-specific optional fields to Post type"
```

---

### Task 6: Update report page with star distribution and new badges

**Files:**
- Modify: `apps/web/app/report/[id]/page.tsx`

**Step 1: Add starRating, verifiedPurchase, helpfulCount to Post interface**

Update the Post interface at the top of the file (lines 7-21):

```typescript
interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  url: string;
  score: number;
  commentCount: number;
  createdAt: string;
  platform: string;
  titleZh?: string;
  summaryZh?: string;
  painPoints?: string[];
  sentiment?: string;
  starRating?: number;
  verifiedPurchase?: boolean;
  helpfulCount?: number;
  hasImages?: boolean;
}
```

**Step 2: Add star distribution section**

After the 情感分布 section (after line 227), add:

```tsx
{/* 星级分布 */}
{posts.some(p => p.starRating) && (() => {
  const starCounts = [0, 0, 0, 0, 0]; // index 0 = 1-star
  posts.forEach(p => {
    if (p.starRating && p.starRating >= 1 && p.starRating <= 5) {
      starCounts[p.starRating - 1]++;
    }
  });
  const maxCount = Math.max(...starCounts, 1);
  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-medium uppercase tracking-widest text-white/50">星级分布</p>
      <div className="mt-3 space-y-2">
        {[5, 4, 3, 2, 1].map(star => (
          <div key={star} className="flex items-center gap-3">
            <span className="w-12 text-right text-xs text-white/60">{star} 星</span>
            <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${star >= 4 ? 'bg-green-400' : star === 3 ? 'bg-yellow-400' : 'bg-red-400'}`}
                style={{ width: `${(starCounts[star - 1] / maxCount) * 100}%` }}
              />
            </div>
            <span className="w-8 text-xs text-white/50">{starCounts[star - 1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
})()}
```

**Step 3: Add verified badge and helpful count to pain point cards**

In the top5 mapping section (around line 278), add badges after the author span:

```tsx
<span className="text-xs text-white/40">
  热度 {post.score} · {post.author}
  {post.verifiedPurchase && (
    <span className="ml-2 rounded bg-green-400/15 px-1.5 py-0.5 text-[10px] text-green-400">已验证购买</span>
  )}
  {post.helpfulCount && post.helpfulCount > 0 && (
    <span className="ml-2 text-white/30">{post.helpfulCount} 人觉得有用</span>
  )}
</span>
```

**Step 4: Add same badges to the full comment list section**

In the posts.map section (around line 355-375), add after the author line:

```tsx
<p className="mt-1 text-xs text-white/50">
  {post.author}
  {post.verifiedPurchase && <span className="ml-1.5 rounded bg-green-400/15 px-1 py-0.5 text-[10px] text-green-400">已验证</span>}
  {post.helpfulCount && post.helpfulCount > 0 && <span className="ml-1.5 text-white/30">· {post.helpfulCount}人有用</span>}
  {post.hasImages && <span className="ml-1.5 text-white/30">· 含图片</span>}
  {' '}· {new Date(post.createdAt).toLocaleDateString('zh-CN')} ·{' '}
  <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-[#00C2FF]/70 hover:text-[#00C2FF]">
    原文
  </a>
</p>
```

**Step 5: Verify build**

```bash
cd apps/web && npx next build
```

**Step 6: Commit**

```bash
git add apps/web/app/report/[id]/page.tsx
git commit -m "feat: add star distribution chart, verified badge, helpful count to report page"
```

---

### Task 7: Integration test — end-to-end with ScraperAPI

**Step 1: Test locally with ScraperAPI key**

Set SCRAPERAPI_KEY in `.env` and run:

```bash
node dist/index.js collect -k "B08F7PTF53" -s amazon -l 5 -t -o ./reports/amazon-scraperapi-test.md
```

Expected: Real reviews fetched via ScraperAPI, report generated.

**Step 2: Test fallback (no ScraperAPI key)**

Temporarily remove SCRAPERAPI_KEY and run the same command.
Expected: Falls back to Playwright (if auth exists) or mock data.

**Step 3: Test Web endpoint locally**

```bash
cd apps/web && npm run dev
```
Create a new collection with Amazon source, ASIN B08F7PTF53. Verify report shows star distribution, verified badges.

**Step 4: Deploy and test production**

```bash
git push origin main
```

After Railway deploys, test at production URL:
- Create Amazon collection
- Verify report renders correctly with new fields

**Step 5: Commit any fixes**

```bash
git commit -m "test: verify ScraperAPI integration end-to-end"
```

---

### Task 8: Update documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/DEV_LOG.md`

**Step 1: Update CLAUDE.md**

- Add ScraperAPI to tech stack
- Update Amazon collector description
- Update 当前完成状态 to note ScraperAPI support
- Add SCRAPERAPI_KEY to 环境变量位置

**Step 2: Update DEV_LOG.md**

Add a new section for today's work documenting:
- ScraperAPI integration
- Three-tier fallback strategy
- New review fields
- Report page enhancements

**Step 3: Commit**

```bash
git add CLAUDE.md docs/DEV_LOG.md
git commit -m "docs: update project docs with ScraperAPI integration details"
```
