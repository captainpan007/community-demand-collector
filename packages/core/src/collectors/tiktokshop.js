"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokShopCollector = void 0;
const base_1 = require("./base");

class TikTokShopCollector extends base_1.BaseCollector {
    constructor() {
        super(...arguments);
        this.platform = "tiktokshop";
    }

    fetchMock() {
        const limit = this.config.limit ?? 20;
        this.log(`[MOCK] Returning ${limit} fake TikTok Shop reviews`);
        const now = Date.now();
        const day = 24 * 3600 * 1000;
        const allMock = [
            { id: "tt-mock-001", title: "Broke after one week", text: "Received the product and it stopped working after 7 days. Very disappointed with the quality. Not worth the price at all.", stars: 1, createdAt: new Date(now - 2 * day).toISOString(), author: "user_8821k" },
            { id: "tt-mock-002", title: "Completely different from the video", text: "The product shown in the TikTok video looked amazing but what I received is a cheap knockoff. The color is wrong and the material feels flimsy.", stars: 1, createdAt: new Date(now - 5 * day).toISOString(), author: "shopaholic_jen" },
            { id: "tt-mock-003", title: "Took 6 weeks to arrive, then broken", text: "Waited over 6 weeks for delivery and the item arrived damaged. The packaging was completely crushed. Seller refuses to refund.", stars: 1, createdAt: new Date(now - 9 * day).toISOString(), author: "frustrated_buyer" },
            { id: "tt-mock-004", title: "Size runs extremely small", text: "Ordered a size L but it fits like a kids XS. No accurate size chart provided. Had to return at my own cost. Terrible experience.", stars: 2, createdAt: new Date(now - 14 * day).toISOString(), author: "fashionlover22" },
            { id: "tt-mock-005", title: "Smells of strong chemicals", text: "Opened the package and there was an overwhelming chemical smell. Had to air it out for days. Still not sure if it is safe to use.", stars: 1, createdAt: new Date(now - 18 * day).toISOString(), author: "health_conscious_m" },
            { id: "tt-mock-006", title: "Battery dies in under 30 minutes", text: "The listing claims 8-hour battery life but in reality it lasts maybe 25 minutes before dying completely. False advertising everywhere.", stars: 2, createdAt: new Date(now - 22 * day).toISOString(), author: "tech_buyer_99" },
            { id: "tt-mock-007", title: "Seller blocked me after complaint", text: "Messaged seller about defective product and they immediately blocked me. Lost my money with zero recourse. TikTok Shop support is useless.", stars: 1, createdAt: new Date(now - 28 * day).toISOString(), author: "scammed_shopper" },
            { id: "tt-mock-008", title: "Glue came apart on first use", text: "The adhesive holding the parts together completely failed on first use. Glue is visible and the product fell apart. Very poor construction.", stars: 1, createdAt: new Date(now - 33 * day).toISOString(), author: "diy_reviewer" },
            { id: "tt-mock-009", title: "Instructions are impossible to follow", text: "There are no English instructions included. The Chinese manual makes no sense even after translation. Wasted hours trying to set it up.", stars: 2, createdAt: new Date(now - 40 * day).toISOString(), author: "confused_customer" },
            { id: "tt-mock-010", title: "Stopped charging after 3 days", text: "Worked fine for the first three days then the charging function failed entirely. Clearly defective from the start. Returning immediately.", stars: 1, createdAt: new Date(now - 48 * day).toISOString(), author: "angry_reviewer_tt" },
        ];
        return allMock.slice(0, limit);
    }

    async fetchRaw() {
        if (this.config.mock) {
            return this.fetchMock();
        }

        const keyword = this.config.keyword.trim();
        const limit = this.config.limit ?? 20;
        this.log(`Fetching TikTok Shop reviews for: ${keyword} via Playwright`);

        const { chromium } = require('playwright');
        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
        });
        try {
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                locale: 'en-US',
            });
            const page = await context.newPage();

            // Try product page first, fallback to search
            const productUrl = `https://www.tiktok.com/view/product/${encodeURIComponent(keyword)}`;
            this.log(`Playwright → ${productUrl}`);
            await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Wait for reviews section
            const reviewSelector = '[class*="review-item"], [class*="ReviewItem"], [data-e2e="review-item"]';
            const found = await page.waitForSelector(reviewSelector, { timeout: 12000 }).catch(() => null);

            if (!found) {
                // Fallback: search page
                const searchUrl = `https://www.tiktok.com/search?q=${encodeURIComponent(keyword)}&type=product`;
                this.log(`Falling back to search: ${searchUrl}`);
                await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.waitForSelector(reviewSelector, { timeout: 12000 }).catch(() => {
                    throw new Error(`No reviews found for "${keyword}" on TikTok Shop`);
                });
            }

            const items = await page.evaluate((lim, sel) => {
                const cards = Array.from(document.querySelectorAll(sel)).slice(0, lim);
                return cards.map((el, idx) => {
                    const titleEl = el.querySelector('[class*="review-title"], [class*="ReviewTitle"], h3, h4');
                    const title = titleEl?.textContent?.trim() || '(no title)';
                    const bodyEl = el.querySelector('[class*="review-content"], [class*="ReviewContent"], p');
                    const content = bodyEl?.textContent?.trim() || '';
                    const starEls = el.querySelectorAll('[class*="star-filled"], [class*="StarFilled"], [data-e2e="star-filled"]');
                    const stars = starEls.length || 3;
                    const timeEl = el.querySelector('time, [class*="review-date"], [class*="ReviewDate"]');
                    const createdAt = timeEl?.getAttribute('datetime') || timeEl?.textContent?.trim() || new Date().toISOString();
                    const authorEl = el.querySelector('[class*="reviewer-name"], [class*="ReviewerName"], [data-e2e="reviewer-name"]');
                    const author = authorEl?.textContent?.trim() || 'tiktok_user';
                    return { id: `tt-${idx}-${Math.random().toString(36).slice(2)}`, title, content, stars, createdAt, author };
                });
            }, limit, reviewSelector);

            this.log(`Playwright: parsed ${items.length} TikTok Shop reviews`);
            return items;
        } finally {
            await browser.close();
        }
    }

    parsePost(raw) {
        const stars = raw.stars ?? raw.rating ?? 3;
        const score = (5 - stars) * 20;
        return {
            id: String(raw.id ?? `tt-${Date.now()}-${Math.random().toString(36).slice(2)}`),
            title: raw.title ?? '(no title)',
            content: raw.text ?? raw.content ?? '',
            author: raw.author ?? 'tiktok_user',
            url: raw.url ?? `https://www.tiktok.com/view/product/${this.config.keyword}`,
            score: Number.isFinite(score) ? score : 40,
            commentCount: 0,
            createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
            platform: this.platform,
        };
    }
}
exports.TikTokShopCollector = TikTokShopCollector;
