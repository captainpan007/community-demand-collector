"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrustpilotCollector = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = __importDefault(require("cheerio"));
const base_1 = require("./base");
const types_1 = require("../types");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

class TrustpilotCollector extends base_1.BaseCollector {
    constructor() {
        super(...arguments);
        this.platform = "trustpilot";
    }
    fetchMock() {
        const keyword = this.config.keyword.trim();
        const limit = this.config.limit ?? 20;
        this.log(`[MOCK] Returning ${limit} fake Trustpilot reviews for: ${keyword}`);
        const now = Date.now();
        const day = 24 * 3600 * 1000;
        const allMock = [
            { id: "tp-mock-001", title: "Stopped working after 3 months", text: `My ${keyword} charger stopped working after just 3 months. Customer service was unhelpful and refused a refund.`, stars: 1, createdAt: new Date(now - 3 * day).toISOString(), author: "John D.", url: "https://www.trustpilot.com/review/mock-001" },
            { id: "tp-mock-002", title: "Battery capacity much lower than advertised", text: `The ${keyword} power bank claims 20000mAh but independent tests show it is closer to 12000mAh. False advertising.`, stars: 2, createdAt: new Date(now - 7 * day).toISOString(), author: "Sarah M.", url: "https://www.trustpilot.com/review/mock-002" },
            { id: "tp-mock-003", title: "Cable frayed within weeks", text: `The ${keyword} USB-C cable started fraying at the connector after just 3 weeks of normal daily use. Poor build quality for the price.`, stars: 1, createdAt: new Date(now - 14 * day).toISOString(), author: "Mike R.", url: "https://www.trustpilot.com/review/mock-003" },
            { id: "tp-mock-004", title: "Slow customer support, no resolution", text: `Waited 3 weeks for ${keyword} support to respond. Product was defective on arrival and they want me to pay return shipping. Terrible experience.`, stars: 1, createdAt: new Date(now - 21 * day).toISOString(), author: "Emma L.", url: "https://www.trustpilot.com/review/mock-004" },
            { id: "tp-mock-005", title: "Overheating issue is a safety concern", text: `My ${keyword} wireless charger gets extremely hot during use. This is a safety hazard. I would not recommend leaving it unattended.`, stars: 2, createdAt: new Date(now - 30 * day).toISOString(), author: "David K.", url: "https://www.trustpilot.com/review/mock-005" },
            { id: "tp-mock-006", title: "Warranty claim rejected without reason", text: `${keyword} rejected my warranty claim saying "physical damage" even though the product was never dropped. The charging port simply stopped working.`, stars: 1, createdAt: new Date(now - 45 * day).toISOString(), author: "Lisa T.", url: "https://www.trustpilot.com/review/mock-006" },
            { id: "tp-mock-007", title: "Does not charge fast as advertised", text: `Bought ${keyword} 65W GaN charger but it only delivers around 30W to my laptop. Their fast charging claims are completely misleading.`, stars: 2, createdAt: new Date(now - 60 * day).toISOString(), author: "Chris B.", url: "https://www.trustpilot.com/review/mock-007" },
            { id: "tp-mock-008", title: "Speaker sound quality degraded quickly", text: `The ${keyword} Bluetooth speaker sounded great for the first month but the bass disappeared completely after that. Quality does not last.`, stars: 2, createdAt: new Date(now - 75 * day).toISOString(), author: "Anna W.", url: "https://www.trustpilot.com/review/mock-008" },
        ];
        return allMock.slice(0, limit);
    }
    async fetchRaw() {
        if (this.config.mock) {
            return this.fetchMock();
        }
        const keyword = this.config.keyword.trim();
        const limit = this.config.limit ?? 20;
        this.log(`Fetching Trustpilot reviews for: ${keyword} via Playwright`);

        const { chromium } = require('playwright');
        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
        });
        try {
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            });
            const page = await context.newPage();
            // Filter to 1-2 star reviews (negative) for demand analysis
            const url = `https://www.trustpilot.com/review/${encodeURIComponent(keyword)}?stars=1&stars=2`;
            this.log(`Playwright → ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Wait for review cards
            await page.waitForSelector(
                '[data-service-review-card-id], article[data-review-id], [class*="styles_reviewCard"]',
                { timeout: 15000 }
            ).catch(() => {
                throw new types_1.CollectorError(
                    `No reviews found for "${keyword}" on Trustpilot. The page may require JS rendering or the company slug is incorrect.`,
                    this.platform
                );
            });

            const items = await page.evaluate((lim) => {
                const selectors = '[data-service-review-card-id], article[data-review-id], [class*="styles_reviewCard"]';
                const cards = Array.from(document.querySelectorAll(selectors)).slice(0, lim);
                return cards.map((el, idx) => {
                    const id = el.getAttribute('data-service-review-card-id')
                        || el.getAttribute('data-review-id')
                        || `tp-${idx}-${Math.random().toString(36).slice(2)}`;
                    // Title: heading-level text
                    const titleEl = el.querySelector('h2, [class*="typography_heading"], [data-service-review-title-typography]');
                    const title = titleEl?.textContent?.trim() || '(no title)';
                    // Body
                    const bodyEl = el.querySelector('p, [class*="typography_body"], [data-service-review-text-typography]');
                    const content = bodyEl?.textContent?.trim() || '';
                    // Stars: img alt like "5 stars" or data attribute
                    const starImg = el.querySelector('img[alt*="star"], [class*="star-rating"] img');
                    const starAlt = starImg?.getAttribute('alt') || '';
                    const stars = parseInt(starAlt) || 1;
                    // Date
                    const timeEl = el.querySelector('time');
                    const createdAt = timeEl?.getAttribute('datetime') || new Date().toISOString();
                    // Author
                    const authorEl = el.querySelector('[class*="consumerInformation"] span, [class*="consumer-information"] span, [class*="typography_display"]');
                    const author = authorEl?.textContent?.trim() || 'unknown';
                    return { id, title, content, stars, createdAt, author };
                });
            }, limit);

            this.log(`Playwright: parsed ${items.length} Trustpilot reviews`);
            return items.map(item => ({ ...item, url: `https://www.trustpilot.com/review/${keyword}` }));
        } finally {
            await browser.close();
        }
    }
    extractReviews(html, limit) {
        const items = [];
        const scriptMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (scriptMatch) {
            try {
                const data = JSON.parse(scriptMatch[1]);
                const pageProps = data?.props?.pageProps ?? {};
                let list = pageProps.reviews ?? pageProps.data?.reviews ?? pageProps.businessUnit?.reviews ?? [];
                if (!Array.isArray(list)) list = list?.reviews ?? list?.items ?? [];
                for (let i = 0; i < Math.min(limit, list.length); i++) {
                    const r = list[i];
                    if (r && (r.title || r.text || r.content || r.headline || r.consumer?.displayName)) {
                        items.push(r);
                    }
                }
            } catch (e) {
                this.log(`__NEXT_DATA__ parse failed: ${e}`);
            }
        }
        if (items.length === 0) {
            const $ = cheerio_1.default.load(html);
            $('[data-service-review-card-id], article[data-review-id], .paper_paper__1PY90').each((_, el) => {
                if (items.length >= limit) return false;
                const $el = cheerio_1.default(el);
                const id = $el.attr("data-service-review-card-id") ?? $el.attr("data-review-id") ?? `tp-${items.length}`;
                const title = $el.find('[class*="typography_heading"]').first().text().trim() || "(no title)";
                const content = $el.find('[class*="typography_body"]').first().text().trim() || "";
                const stars = $el.find('[class*="star-rating"] img[alt]').attr("alt") || "";
                const starNum = parseInt(stars, 10) || 1;
                const dateStr = $el.find("time").attr("datetime") || new Date().toISOString();
                const author = $el.find('[class*="consumer-information"] span').first().text().trim() || "unknown";
                const link = $el.find('a[href*="/review/"]').attr("href") || "";
                const url = link.startsWith("http") ? link : `https://www.trustpilot.com${link}`;
                items.push({
                    id,
                    title,
                    content,
                    stars: starNum,
                    createdAt: dateStr,
                    author,
                    url,
                });
            });
        }
        return items;
    }
    parsePost(raw) {
        const stars = raw.stars ?? raw.rating ?? 1;
        const score = (5 - stars) * 20;
        const id = String(raw.id ?? raw.reviewId ?? raw.review_id ?? `tp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        const publishedDate = raw.dates?.publishedDate ?? raw.createdAt ?? raw.publishedAt;
        return {
            id,
            title: raw.title ?? raw.headline ?? "(no title)",
            content: raw.text ?? raw.content ?? raw.body ?? "",
            author: raw.consumer?.displayName ?? raw.author ?? raw.user?.name ?? "unknown",
            url: raw.url ?? `https://www.trustpilot.com/review/${id}`,
            score: Number.isFinite(score) ? score : 80,
            commentCount: 0,
            createdAt: publishedDate ? new Date(publishedDate) : new Date(),
            platform: this.platform,
        };
    }
}
exports.TrustpilotCollector = TrustpilotCollector;
