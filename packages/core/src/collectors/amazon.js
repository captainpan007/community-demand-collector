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
                text: `I bought this ${keyword} hoping it would last. After only 2 weeks of normal use it just stopped working completely. Also noticed it got very hot during that short time. Contacted seller, no response. Waste of money.`,
                stars: 1,
                helpfulVotes: 143,
                verified: true,
                createdAt: new Date(now - 4 * day).toISOString(),
                author: "Sarah K.",
                asin: "B0MOCK001",
            },
            {
                id: "amz-mock-002",
                title: "Way slower than advertised",
                text: `The box says 15W fast charging but my phone only ever shows 7.5W max. Tried multiple cables and phones. The ${keyword} is misleading in its specs. On top of that it runs hot during charging, which makes me nervous. Not what I paid for.`,
                stars: 2,
                helpfulVotes: 89,
                verified: true,
                createdAt: new Date(now - 10 * day).toISOString(),
                author: "Mike T.",
                asin: "B0MOCK002",
            },
            {
                id: "amz-mock-003",
                title: "Gets dangerously hot",
                text: `This ${keyword} heats up so much I'm afraid to leave it on overnight. My phone was almost too hot to touch after an hour. This is a safety issue and Amazon should remove it.`,
                stars: 1,
                helpfulVotes: 211,
                verified: true,
                createdAt: new Date(now - 18 * day).toISOString(),
                author: "Jennifer L.",
                asin: "B0MOCK003",
            },
            {
                id: "amz-mock-004",
                title: "Coil alignment is terrible",
                text: `Have to place my phone in exactly the right spot or it won't charge. The alignment window on this ${keyword} is maybe 1cm wide. So frustrating to use in the dark or half asleep.`,
                stars: 2,
                helpfulVotes: 67,
                verified: true,
                createdAt: new Date(now - 25 * day).toISOString(),
                author: "David R.",
                asin: "B0MOCK004",
            },
            {
                id: "amz-mock-005",
                title: "Makes annoying buzzing noise all night",
                text: `The ${keyword} emits a constant high-pitched buzzing sound when charging. Completely unusable on a bedside table. Returned immediately.`,
                stars: 1,
                helpfulVotes: 178,
                verified: true,
                createdAt: new Date(now - 33 * day).toISOString(),
                author: "Emma W.",
                asin: "B0MOCK005",
            },
            {
                id: "amz-mock-006",
                title: "Indicator light is blinding at night",
                text: `Why does the ${keyword} need an LED so bright it lights up the whole room? There's no way to turn it off. Had to cover it with tape. Simple design oversight that ruins an otherwise decent product.`,
                stars: 2,
                helpfulVotes: 54,
                verified: false,
                createdAt: new Date(now - 42 * day).toISOString(),
                author: "Chris B.",
                asin: "B0MOCK006",
            },
            {
                id: "amz-mock-007",
                title: "Doesn't work through phone case",
                text: `Product description says it works through cases up to 5mm but it fails with my 3mm leather case. The ${keyword} only charges if I remove my case completely, which defeats the purpose.`,
                stars: 1,
                helpfulVotes: 132,
                verified: true,
                createdAt: new Date(now - 55 * day).toISOString(),
                author: "Anna M.",
                asin: "B0MOCK007",
            },
            {
                id: "amz-mock-008",
                title: "Charging stops randomly during the night",
                text: `The ${keyword} randomly disconnects and reconnects during charging, waking me up with the notification sound. Checked with two different phones - same issue. Poor firmware or hardware quality.`,
                stars: 2,
                helpfulVotes: 96,
                verified: true,
                createdAt: new Date(now - 68 * day).toISOString(),
                author: "Robert S.",
                asin: "B0MOCK008",
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
            const url = `https://www.amazon.com/product-reviews/${asin}?filterByStar=one_star&filterByStar=two_star&sortBy=recent`;
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
            // 等待评论加载
            await page.waitForSelector('[data-hook="review"]', { timeout: 15000 }).catch(() => {
                throw new types_1.CollectorError(
                    `No reviews found for ASIN ${asin}. The product may have no 1-2 star reviews, or the page structure changed.`,
                    this.platform
                );
            });
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
        return {
            id,
            title: raw.title ?? "(no title)",
            content: raw.text ?? raw.content ?? "",
            author: raw.author ?? "unknown",
            url: raw.url ?? `https://www.amazon.com/product-reviews/${raw.asin ?? 'unknown'}`,
            score: Number.isFinite(score) ? score : 80,
            commentCount: raw.helpfulVotes ?? 0,
            createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
            platform: this.platform,
        };
    }
}
exports.AmazonCollector = AmazonCollector;
