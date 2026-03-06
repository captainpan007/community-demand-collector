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
                title: "Stopped charging after 2 weeks",
                titleZh: "两周后停止充电",
                text: `I bought this ${keyword} hoping it would last. After only 2 weeks of normal use it just stopped working completely. Also noticed it got very hot during that short time. Contacted seller, no response. Waste of money.`,
                stars: 1,
                helpfulVotes: 243,
                verified: true,
                createdAt: new Date(now - 4 * day).toISOString(),
                author: "Sarah K.",
                asin: "B0MOCK001",
            },
            {
                id: "amz-mock-002",
                title: "Way slower than advertised",
                titleZh: "实际速度远低于宣传",
                text: `The box says 15W fast charging but my phone only ever shows 7.5W max. Tried multiple cables and phones. The ${keyword} is misleading in its specs. On top of that it runs hot during charging, which makes me nervous. Not what I paid for.`,
                stars: 2,
                helpfulVotes: 189,
                verified: true,
                createdAt: new Date(now - 10 * day).toISOString(),
                author: "Mike T.",
                asin: "B0MOCK002",
            },
            {
                id: "amz-mock-003",
                title: "Gets dangerously hot",
                titleZh: "过热问题（存在安全隐患）",
                text: `This ${keyword} heats up so much I'm afraid to leave it on overnight. My phone was almost too hot to touch after an hour. This is a safety issue and Amazon should remove it.`,
                stars: 1,
                helpfulVotes: 311,
                verified: true,
                createdAt: new Date(now - 18 * day).toISOString(),
                author: "Jennifer L.",
                asin: "B0MOCK003",
            },
            {
                id: "amz-mock-004",
                title: "Coil alignment is terrible",
                titleZh: "无线充电线圈对位困难",
                text: `Have to place my phone in exactly the right spot or it won't charge. The alignment window on this ${keyword} is maybe 1cm wide. So frustrating to use in the dark or half asleep.`,
                stars: 2,
                helpfulVotes: 97,
                verified: true,
                createdAt: new Date(now - 25 * day).toISOString(),
                author: "David R.",
                asin: "B0MOCK004",
            },
            {
                id: "amz-mock-005",
                title: "Makes annoying buzzing noise all night",
                titleZh: "整夜发出烦人噪音",
                text: `The ${keyword} emits a constant high-pitched buzzing sound when charging. Completely unusable on a bedside table. Returned immediately.`,
                stars: 1,
                helpfulVotes: 278,
                verified: true,
                createdAt: new Date(now - 33 * day).toISOString(),
                author: "Emma W.",
                asin: "B0MOCK005",
            },
            {
                id: "amz-mock-006",
                title: "Indicator light is blinding at night",
                titleZh: "指示灯夜间刺眼",
                text: `Why does the ${keyword} need an LED so bright it lights up the whole room? There's no way to turn it off. Had to cover it with tape. Simple design oversight that ruins an otherwise decent product.`,
                stars: 2,
                helpfulVotes: 154,
                verified: false,
                createdAt: new Date(now - 42 * day).toISOString(),
                author: "Chris B.",
                asin: "B0MOCK006",
            },
            {
                id: "amz-mock-007",
                title: "Doesn't work through phone case",
                titleZh: "无法穿透手机壳充电",
                text: `Product description says it works through cases up to 5mm but it fails with my 3mm leather case. The ${keyword} only charges if I remove my case completely, which defeats the purpose.`,
                stars: 1,
                helpfulVotes: 232,
                verified: true,
                createdAt: new Date(now - 55 * day).toISOString(),
                author: "Anna M.",
                asin: "B0MOCK007",
            },
            {
                id: "amz-mock-008",
                title: "Charging stops randomly during the night",
                titleZh: "夜间随机断充",
                text: `The ${keyword} randomly disconnects and reconnects during charging, waking me up with the notification sound. Checked with two different phones - same issue. Poor firmware or hardware quality.`,
                stars: 2,
                helpfulVotes: 196,
                verified: true,
                createdAt: new Date(now - 68 * day).toISOString(),
                author: "Robert S.",
                asin: "B0MOCK008",
            },
            {
                id: "amz-mock-009",
                title: "Plastic build feels cheap, broke on first drop",
                titleZh: "做工廉价，一摔即碎",
                text: `Dropped the ${keyword} from my nightstand (less than 3 feet) and the housing cracked open. The internal coil came loose. Build quality is terrible for the price. Expected something more durable.`,
                stars: 1,
                helpfulVotes: 167,
                verified: true,
                createdAt: new Date(now - 80 * day).toISOString(),
                author: "James P.",
                asin: "B0MOCK009",
            },
            {
                id: "amz-mock-010",
                title: "Only works with Samsung, not iPhone - misleading listing",
                titleZh: "仅支持三星快充，描述具有误导性",
                text: `The listing says "universal compatibility" but the 15W fast charge only works for Samsung Galaxy. My iPhone 14 Pro only charges at 7.5W. This is buried in the fine print. The ${keyword} should be advertised honestly.`,
                stars: 2,
                helpfulVotes: 221,
                verified: true,
                createdAt: new Date(now - 92 * day).toISOString(),
                author: "Lily C.",
                asin: "B0MOCK010",
            },
            {
                id: "amz-mock-011",
                title: "Stand wobbles on any surface - tipping hazard",
                titleZh: "底座不稳，容易倾倒",
                text: `The base of this ${keyword} is poorly weighted. It tips over constantly, especially when removing the phone. On my glass desk it slides around. Needs rubber feet or a heavier base. Cheap design.`,
                stars: 2,
                helpfulVotes: 112,
                verified: true,
                createdAt: new Date(now - 105 * day).toISOString(),
                author: "Marcus H.",
                asin: "B0MOCK011",
            },
            {
                id: "amz-mock-012",
                title: "Interferes with my car key fob",
                titleZh: "干扰汽车钥匙信号",
                text: `Since plugging in the ${keyword} near my entryway, my car key fob stopped working reliably within 2 meters. Unplugged it and the fob works fine again. EMF interference is a real issue with this product.`,
                stars: 1,
                helpfulVotes: 88,
                verified: true,
                createdAt: new Date(now - 118 * day).toISOString(),
                author: "Priya N.",
                asin: "B0MOCK012",
            },
            {
                id: "amz-mock-013",
                title: "No power adapter included - deceptive",
                titleZh: "未附赠充电头，涉嫌欺骗",
                text: `The ${keyword} listing shows a power brick in every product photo. Nowhere does it say the adapter is not included. I opened the box to find just the pad and a cable. Had to buy a separate 18W adapter. Very deceptive.`,
                stars: 1,
                helpfulVotes: 344,
                verified: true,
                createdAt: new Date(now - 130 * day).toISOString(),
                author: "Kevin O.",
                asin: "B0MOCK013",
            },
            {
                id: "amz-mock-014",
                title: "Gets extremely hot after 30 minutes",
                titleZh: "使用30分钟后严重过热",
                text: `I set up the ${keyword} as my overnight charger but it gets alarmingly hot after half an hour. The bottom of my phone was 48°C according to an app. I'm now worried about long-term battery damage and fire risk.`,
                stars: 1,
                helpfulVotes: 199,
                verified: true,
                createdAt: new Date(now - 143 * day).toISOString(),
                author: "Fiona W.",
                asin: "B0MOCK014",
            },
            {
                id: "amz-mock-015",
                title: "Acceptable performance but gets warm",
                titleZh: "性能尚可但充电时偏热",
                text: `The ${keyword} works consistently and charges my phone overnight without issues. Charging speed is slower than wired but acceptable for nightly use. My main concern is it gets noticeably warm during extended sessions — nothing alarming, but worth monitoring. Overall a decent product for the price.`,
                stars: 3,
                helpfulVotes: 143,
                verified: true,
                createdAt: new Date(now - 155 * day).toISOString(),
                author: "Brandon T.",
                asin: "B0MOCK015",
            },
            {
                id: "amz-mock-016",
                title: "Mixed feelings — good design, mediocre speed",
                titleZh: "设计不错，充电速度一般",
                text: `The ${keyword} has a sleek design that fits my bedside setup nicely. Charging speed is just okay — not as fast as advertised. Customer support responded within 24 hours when I had questions. Not bad, not great. Three stars feels right.`,
                stars: 3,
                helpfulVotes: 76,
                verified: true,
                createdAt: new Date(now - 168 * day).toISOString(),
                author: "Dana L.",
                asin: "B0MOCK016",
            },
            {
                id: "amz-mock-017",
                title: "Great charger, works perfectly with iPhone 15",
                titleZh: "优秀充电器，与 iPhone 15 完美兼容",
                text: `Switched from a generic pad to this ${keyword} and what a difference. My iPhone 15 Pro charges to 80% in about 70 minutes overnight. No overheating, no noise. The soft matte finish feels premium. Dock on my desk looks clean. Minor wish: a dimmable LED option.`,
                stars: 4,
                helpfulVotes: 87,
                verified: true,
                createdAt: new Date(now - 180 * day).toISOString(),
                author: "Raj S.",
                asin: "B0MOCK017",
            },
            {
                id: "amz-mock-018",
                title: "Finally a wireless charger that just works",
                titleZh: "终于找到一款真正好用的无线充电器",
                text: `I've tried four wireless chargers in the last two years. The ${keyword} is the first that delivers on every promise: genuinely fast (15W on my Galaxy S24 Ultra), whisper-quiet, and hasn't broken a sweat in 3 months of daily use. The alignment range is forgiving too. Highly recommend.`,
                stars: 5,
                helpfulVotes: 176,
                verified: true,
                createdAt: new Date(now - 195 * day).toISOString(),
                author: "Tara M.",
                asin: "B0MOCK018",
            },
            {
                id: "amz-mock-019",
                title: "Works great! Fast and quiet",
                titleZh: "充电快且安静，体验极佳",
                text: `Honestly love this ${keyword}. Charges my Galaxy S24 to full in under 90 minutes and completely silent. The LED is a bit bright but I put it in a drawer anyway. Would buy again.`,
                stars: 4,
                helpfulVotes: 212,
                verified: true,
                createdAt: new Date(now - 210 * day).toISOString(),
                author: "Alex J.",
                asin: "B0MOCK019",
            },
            {
                id: "amz-mock-020",
                title: "Solid everyday charger, great value for price",
                titleZh: "日常使用可靠，性价比高",
                text: `Been using the ${keyword} daily for 4 months now. It charges reliably, stays reasonably cool, and the build quality feels solid. Charging speed is close to the advertised 15W on my Samsung. The LED can be bright at night but I got used to it. Really good value.`,
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
    async fetchRaw() {
        this.log(`fetchRaw called: mock=${this.config.mock} keyword="${this.config.keyword}"`);
        if (this.config.mock) {
            this.log('mock=true, returning mock data, skipping ASIN check');
            return this.fetchMock();
        }
        // ASIN 校验只在非 mock 模式执行
        const _keyword = this.config.keyword.trim();
        if (/[\u4e00-\u9fa5]/.test(_keyword)) {
            this.log(`WARNING: keyword "${_keyword}" contains Chinese characters. Amazon reviews are in English — suggest using an English keyword or ASIN (e.g. B08F7PTF53) for better results.`);
        }
        if (!isAsin(_keyword)) {
            throw new types_1.CollectorError(
                `Amazon collector requires a valid 10-char ASIN (e.g. B08F7PTF53), got: "${_keyword}"`,
                this.platform
            );
        }
        try {
            return await this.fetchWithPlaywright();
        } catch (err) {
            // 确保真实错误信息可见
            this.log(`Error: ${err.message}`);
            throw err;
        }
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
                const el = document.querySelector('#cm_cr-product_info [data-hook="product-link"], .product-title a, [data-hook="cr-summarization-attributes-btn"]');
                if (el) return el.textContent?.trim() || null;
                // fallback: first h1 or h2
                const h1 = document.querySelector('h1');
                return h1 ? h1.textContent?.trim() || null : null;
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
            const asin = $el.closest('[data-asin]').attr('data-asin') ?? '';
            if (title && (text || title !== '(no title)')) {
                items.push({ id, title, text, stars, author, createdAt, helpfulVotes, verified, asin,
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
        };
        if (raw.productTitle) post.productTitle = raw.productTitle;
        return post;
    }
}
exports.AmazonCollector = AmazonCollector;
