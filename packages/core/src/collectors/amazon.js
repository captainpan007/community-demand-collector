"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmazonCollector = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = __importDefault(require("cheerio"));
const base_1 = require("./base");
const types_1 = require("../types");

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'max-age=0',
    'Upgrade-Insecure-Requests': '1',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
};

function randomSleep(minMs, maxMs) {
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isAsin(str) {
    return /^[A-Z0-9]{10}$/.test(str.trim().toUpperCase());
}

class AmazonCollector extends base_1.BaseCollector {
    constructor() {
        super(...arguments);
        this.platform = "amazon";
        // Playwright 采集不需要重试（auth 问题重试无意义，网络问题也不是幂等）
        this.maxRetries = 1;
    }
    fetchMock() {
        const keyword = this.config.keyword.trim();
        const limit = this.config.limit ?? 20;
        this.log(`[MOCK] Generating ${limit} fake Amazon reviews for: ${keyword}`);
        const now = Date.now();
        const day = 24 * 3600 * 1000;
        const allMock = [
            {
                id: "amz-mock-001",
                title: "Stopped working after 2 weeks",
                titleZh: "两周后完全失效",
                text: `I bought this product hoping it would last. After only 2 weeks of normal use it just stopped working completely. Contacted seller, no response. Waste of money.`,
                stars: 1,
                helpfulVotes: 243,
                verified: true,
                createdAt: new Date(now - 4 * day).toISOString(),
                author: "Sarah K.",
                asin: "B0MOCK001",
            },
            {
                id: "amz-mock-002",
                title: "Not as described - very misleading listing",
                titleZh: "与描述严重不符，信息误导",
                text: `The listing is very misleading. The photos show a much better product than what arrived. Key specs don't match what's advertised. Not what I paid for.`,
                stars: 2,
                helpfulVotes: 189,
                verified: true,
                createdAt: new Date(now - 10 * day).toISOString(),
                author: "Mike T.",
                asin: "B0MOCK002",
            },
            {
                id: "amz-mock-003",
                title: "Build quality is terrible",
                titleZh: "做工极差，质量低劣",
                text: `This product feels incredibly cheap. Materials are flimsy and it started falling apart within the first week. This is a safety concern and Amazon should remove it from their platform.`,
                stars: 1,
                helpfulVotes: 311,
                verified: true,
                createdAt: new Date(now - 18 * day).toISOString(),
                author: "Jennifer L.",
                asin: "B0MOCK003",
            },
            {
                id: "amz-mock-004",
                title: "Customer service completely ignored me",
                titleZh: "客服完全无视投诉",
                text: `After it broke within a month, I reached out to the seller 4 times over 3 weeks. No response at all. Finally had to file an A-to-Z claim. The product is defective and support is non-existent.`,
                stars: 1,
                helpfulVotes: 97,
                verified: true,
                createdAt: new Date(now - 25 * day).toISOString(),
                author: "David R.",
                asin: "B0MOCK004",
            },
            {
                id: "amz-mock-005",
                title: "Arrived damaged - poor packaging",
                titleZh: "包装简陋，到货时已损坏",
                text: `It arrived with visible damage. The packaging was minimal — just thrown in a box with no protection. This is not how you ship a product at this price point. Very disappointed.`,
                stars: 1,
                helpfulVotes: 278,
                verified: true,
                createdAt: new Date(now - 33 * day).toISOString(),
                author: "Emma W.",
                asin: "B0MOCK005",
            },
            {
                id: "amz-mock-006",
                title: "Broke on first use",
                titleZh: "首次使用即损坏",
                text: `Used it exactly once and it broke. Followed all instructions carefully. The materials just can't handle normal use. For this price I expected much better durability.`,
                stars: 1,
                helpfulVotes: 154,
                verified: false,
                createdAt: new Date(now - 42 * day).toISOString(),
                author: "Chris B.",
                asin: "B0MOCK006",
            },
            {
                id: "amz-mock-007",
                title: "Size is completely wrong - much smaller than pictured",
                titleZh: "尺寸严重缩水，实物远小于图片",
                text: `The product photos are clearly not to scale. What arrived is significantly smaller than expected. The dimensions in the listing are accurate but the photos are very misleading. Would have returned if not so much hassle.`,
                stars: 2,
                helpfulVotes: 232,
                verified: true,
                createdAt: new Date(now - 55 * day).toISOString(),
                author: "Anna M.",
                asin: "B0MOCK007",
            },
            {
                id: "amz-mock-008",
                title: "Counterfeit product - not the real brand",
                titleZh: "疑似假冒产品，非正品",
                text: `What I received is clearly not a genuine product. The logo looks off, the quality is much worse than the real thing, and the packaging has typos. Reported to Amazon. Be careful with this listing.`,
                stars: 1,
                helpfulVotes: 196,
                verified: true,
                createdAt: new Date(now - 68 * day).toISOString(),
                author: "Robert S.",
                asin: "B0MOCK008",
            },
            {
                id: "amz-mock-009",
                title: "Instructions are completely useless",
                titleZh: "说明书毫无用处",
                text: `It came with a single sheet of instructions that are poorly translated and missing key steps. Had to watch multiple YouTube videos just to set it up. A proper manual should be included.`,
                stars: 2,
                helpfulVotes: 167,
                verified: true,
                createdAt: new Date(now - 80 * day).toISOString(),
                author: "James P.",
                asin: "B0MOCK009",
            },
            {
                id: "amz-mock-010",
                title: "Missing parts - incomplete product",
                titleZh: "配件缺失，产品不完整",
                text: `It arrived missing several components that should be included according to the listing. Contacted seller and they wanted me to pay extra for the missing parts. Completely unacceptable.`,
                stars: 1,
                helpfulVotes: 221,
                verified: true,
                createdAt: new Date(now - 92 * day).toISOString(),
                author: "Lily C.",
                asin: "B0MOCK010",
            },
            {
                id: "amz-mock-011",
                title: "Smells terrible - chemical odor",
                titleZh: "刺鼻异味，疑含有害物质",
                text: `Opened the box and was hit with a strong chemical smell. Left it outside for a week and the smell barely faded. Not something I want near my family. Returning immediately.`,
                stars: 2,
                helpfulVotes: 112,
                verified: true,
                createdAt: new Date(now - 105 * day).toISOString(),
                author: "Marcus H.",
                asin: "B0MOCK011",
            },
            {
                id: "amz-mock-012",
                title: "Color is completely different from listing",
                titleZh: "颜色与宣传图片严重不符",
                text: `Ordered in the color shown in the product photos. What arrived is a noticeably different shade. I understand screen calibration differences, but this is just a different color entirely. Very disappointed.`,
                stars: 2,
                helpfulVotes: 88,
                verified: true,
                createdAt: new Date(now - 118 * day).toISOString(),
                author: "Priya N.",
                asin: "B0MOCK012",
            },
            {
                id: "amz-mock-013",
                title: "Fake reviews - real product is terrible",
                titleZh: "疑似刷单，真实质量糟糕",
                text: `Don't trust the 5-star reviews. They're clearly fake. The real product is poorly made, doesn't match the description, and the seller offers gift cards for positive reviews. Amazon needs to clean this up.`,
                stars: 1,
                helpfulVotes: 344,
                verified: true,
                createdAt: new Date(now - 130 * day).toISOString(),
                author: "Kevin O.",
                asin: "B0MOCK013",
            },
            {
                id: "amz-mock-014",
                title: "Durability is extremely poor",
                titleZh: "耐用性极差，短期内即损坏",
                text: `It started showing wear and defects after just a few weeks of light use. For the price point this should last years. The materials used are clearly the cheapest available. Not worth it.`,
                stars: 1,
                helpfulVotes: 199,
                verified: true,
                createdAt: new Date(now - 143 * day).toISOString(),
                author: "Fiona W.",
                asin: "B0MOCK014",
            },
            {
                id: "amz-mock-015",
                title: "Acceptable quality for the price",
                titleZh: "价位合理，质量尚可",
                text: `Decent for the price. It does what it's supposed to do without any major issues. Build quality is average — nothing impressive but nothing terrible either. My main concern is long-term durability, but so far so good after a month.`,
                stars: 3,
                helpfulVotes: 143,
                verified: true,
                createdAt: new Date(now - 155 * day).toISOString(),
                author: "Brandon T.",
                asin: "B0MOCK015",
            },
            {
                id: "amz-mock-016",
                title: "Good design but mediocre execution",
                titleZh: "设计思路不错，但做工一般",
                text: `Thoughtful design that shows the team put effort into the concept. Execution is just okay — not as polished as advertised. Customer support responded within 24 hours when I had questions. Not bad, not great. Three stars feels right.`,
                stars: 3,
                helpfulVotes: 76,
                verified: true,
                createdAt: new Date(now - 168 * day).toISOString(),
                author: "Dana L.",
                asin: "B0MOCK016",
            },
            {
                id: "amz-mock-017",
                title: "Exactly what I needed, great quality",
                titleZh: "正是所需，质量出色",
                text: `Exceeded my expectations. The build quality feels premium, everything fits perfectly, and it does exactly what it promises. Setup was straightforward. Minor wish for better documentation, but overall very happy with this purchase.`,
                stars: 4,
                helpfulVotes: 87,
                verified: true,
                createdAt: new Date(now - 180 * day).toISOString(),
                author: "Raj S.",
                asin: "B0MOCK017",
            },
            {
                id: "amz-mock-018",
                title: "Best purchase I've made this year",
                titleZh: "年度最佳购买，强烈推荐",
                text: `I've tried several similar products over the past two years. This is the first that delivers on every promise: excellent build quality, accurate to the description, and performs flawlessly after 3 months of daily use. Highly recommend.`,
                stars: 5,
                helpfulVotes: 176,
                verified: true,
                createdAt: new Date(now - 195 * day).toISOString(),
                author: "Tara M.",
                asin: "B0MOCK018",
            },
            {
                id: "amz-mock-019",
                title: "Works perfectly, very happy",
                titleZh: "使用顺畅，非常满意",
                text: `Honestly love it. Does exactly what it claims, arrived well-packaged, and the quality is noticeably better than cheaper alternatives I've tried. Would buy again without hesitation.`,
                stars: 4,
                helpfulVotes: 212,
                verified: true,
                createdAt: new Date(now - 210 * day).toISOString(),
                author: "Alex J.",
                asin: "B0MOCK019",
            },
            {
                id: "amz-mock-020",
                title: "Solid product, great value for price",
                titleZh: "产品可靠，性价比高",
                text: `Been using it daily for 4 months now. Performs reliably, the build quality holds up well, and it does everything the listing promises. Really good value at this price point. No complaints.`,
                stars: 4,
                helpfulVotes: 142,
                verified: true,
                createdAt: new Date(now - 225 * day).toISOString(),
                author: "Nina B.",
                asin: "B0MOCK020",
            },
        ];
        return allMock.slice(0, limit);
    }
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
            const res = await axios_1.default.get(scraperUrl, { timeout: 60000 });
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
    async fetchWithPlaywright() {
        const { chromium } = require('playwright');
        const os = require('os');
        const path = require('path');
        const fs = require('fs');
        const keyword = this.config.keyword.trim();
        const limit = this.config.limit ?? 20;
        // ASIN 已由 fetchRaw 校验，此处直接使用
        const asin = keyword.toUpperCase();
        // Auth state 保存路径（跨会话复用登录状态）
        const AUTH_STATE_PATH = path.join(os.homedir(), '.demand-collector', 'amazon-auth.json');
        const authDir = path.dirname(AUTH_STATE_PATH);
        if (!fs.existsSync(authDir)) {
            fs.mkdirSync(authDir, { recursive: true });
        }
        const hasAuthState = fs.existsSync(AUTH_STATE_PATH);
        this.log(`Fetching Amazon reviews for ASIN: ${asin} via Playwright`);
        // 首次运行或 auth 已失效时，启动可见浏览器让用户登录
        if (!hasAuthState) {
            this.log('No saved Amazon auth state. Launching visible browser for one-time login...');
            this.log('Please log in to Amazon in the browser window. The tool will continue automatically after login.');
            const browser = await chromium.launch({ headless: false });
            const ctx = await browser.newContext();
            const loginPage = await ctx.newPage();
            await loginPage.goto('https://www.amazon.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
            // 等待用户完成登录：导航栏问候语从 "Hello, sign in" 变为 "Hello, [Name]"（最多 5 分钟）
            this.log('Waiting for you to log in... (5 minute timeout)');
            try {
                await loginPage.waitForFunction(
                    () => {
                        const el = document.querySelector('#nav-link-accountList .nav-line-1');
                        return el && el.textContent && !el.textContent.toLowerCase().includes('sign in');
                    },
                    undefined,
                    { timeout: 300000, polling: 1000 }
                );
            } catch(loginErr) {
                await browser.close();
                throw new types_1.CollectorError(
                    `Amazon login failed: ${loginErr.message}`,
                    this.platform
                );
            }
            this.log('Login detected. Saving auth state...');
            await ctx.storageState({ path: AUTH_STATE_PATH });
            await browser.close();
            this.log(`Auth state saved to ${AUTH_STATE_PATH}`);
        }
        // 用保存的 auth state 启动无头浏览器
        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
        });
        const context = await browser.newContext({
            storageState: AUTH_STATE_PATH,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        });
        try {
            const page = await context.newPage();
            const url = `https://www.amazon.com/product-reviews/${asin}?sortBy=recent`;
            this.log(`Playwright → ${url}`);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            const title = await page.title();
            if (title.includes('Sign-In') || title.includes('Amazon Sign')) {
                // auth state 已过期，删除后提示重新登录
                try { fs.unlinkSync(AUTH_STATE_PATH); } catch {}
                throw new types_1.CollectorError(
                    'Amazon session expired. Deleted saved auth state — please run the command again to log in fresh.',
                    this.platform
                );
            }
            // 等待评论加载（超时前先截图供调试）
            const DEBUG_SCREENSHOT = path.join(os.homedir(), '.demand-collector', 'debug.png');
            await page.waitForSelector('[data-hook="review"]', { timeout: 15000 }).catch(async (err) => {
                try { await page.screenshot({ path: DEBUG_SCREENSHOT, fullPage: true }); } catch {}
                this.log(`Screenshot saved to ${DEBUG_SCREENSHOT}`);
                throw new types_1.CollectorError(
                    `No reviews found for ASIN ${asin}. Screenshot saved to ${DEBUG_SCREENSHOT}. The page may be showing a CAPTCHA or the structure changed.`,
                    this.platform
                );
            });
            // Extract product title from review page header
            const productTitle = await page.evaluate(() => {
                // Try selectors in order of reliability
                const selectors = [
                    '[data-hook="product-link"]',
                    '#cm_cr-product_info [data-hook="product-link"]',
                    '.cr-lightbox-title-link',
                    '#product-title',
                    '.product-title a',
                    '.cr-product-title a',
                    '[data-hook="cr-summarization-attributes-btn"]',
                ];
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    const text = el?.textContent?.trim();
                    if (text && text.length > 3 && text.length < 300) return text;
                }
                return null;
            }).catch(() => null);
            if (productTitle) this.log(`Product title: ${productTitle}`);
            const items = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('[data-hook="review"]')).map(el => ({
                    id: el.id || `amz-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    title: el.querySelector('[data-hook="review-title"] span:not([class])')?.textContent?.trim()
                        ?? el.querySelector('[data-hook="review-title"]')?.textContent?.trim()
                        ?? '(no title)',
                    text: el.querySelector('[data-hook="review-body"] span')?.textContent?.trim() ?? '',
                    stars: parseFloat(
                        el.querySelector('[data-hook="review-star-rating"] .a-icon-alt')?.textContent ?? '3'
                    ),
                    author: el.querySelector('.a-profile-name')?.textContent?.trim() ?? 'unknown',
                    dateText: el.querySelector('[data-hook="review-date"]')?.textContent?.trim() ?? '',
                    helpfulText: el.querySelector('[data-hook="helpful-vote-statement"]')?.textContent?.trim() ?? '',
                    verified: el.querySelector('[data-hook="avp-badge"]') !== null,
                }));
            });
            // 更新 auth state（保持 cookies 刷新）
            await context.storageState({ path: AUTH_STATE_PATH });
            this.log(`Playwright: parsed ${items.length} reviews`);
            return items.slice(0, limit).map(raw => {
                const dateMatch = raw.dateText?.match(/(\w+ \d+, \d{4})/);
                const createdAt = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();
                const helpfulMatch = raw.helpfulText?.match(/(\d+)/);
                const helpfulVotes = helpfulMatch ? parseInt(helpfulMatch[1]) : 0;
                return {
                    id: raw.id,
                    title: raw.title,
                    text: raw.text,
                    stars: raw.stars,
                    author: raw.author,
                    createdAt,
                    helpfulVotes,
                    verified: raw.verified,
                    asin,
                    productTitle: productTitle || null,
                    url: `https://www.amazon.com/gp/customer-reviews/${raw.id}`,
                };
            });
        } finally {
            await browser.close();
        }
    }
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
                items.push({ id, title, text, stars, author, createdAt, helpfulVotes, verified, hasImages, asin,
                    url: `https://www.amazon.com/gp/customer-reviews/${id}` });
            }
        });
        return items;
    }
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
}
exports.AmazonCollector = AmazonCollector;
