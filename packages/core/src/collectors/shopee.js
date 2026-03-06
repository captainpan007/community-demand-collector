"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeCollector = void 0;
const base_1 = require("./base");

class ShopeeCollector extends base_1.BaseCollector {
    constructor() {
        super(...arguments);
        this.platform = "shopee";
    }

    fetchMock() {
        const limit = this.config.limit ?? 20;
        this.log(`[MOCK] Returning ${limit} fake Shopee reviews`);
        const now = Date.now();
        const day = 24 * 3600 * 1000;
        const allMock = [
            { id: "sp-mock-001", title: "Item arrived broken", text: "Packaging was very thin and item inside was cracked on arrival. Contacted seller but they said it is normal. Do not buy from this shop.", stars: 1, createdAt: new Date(now - 1 * day).toISOString(), author: "buyer_sg_001" },
            { id: "sp-mock-002", title: "Wrong item sent", text: "Ordered the blue variant but received red. Asked seller to exchange and they wanted me to pay for return shipping. Very bad service.", stars: 2, createdAt: new Date(now - 4 * day).toISOString(), author: "shopee_user_kl" },
            { id: "sp-mock-003", title: "Quality much worse than photos", text: "The product photos are heavily edited. In real life the material is thin and transparent. Looks nothing like the listing. Misleading seller.", stars: 1, createdAt: new Date(now - 7 * day).toISOString(), author: "honest_reviewer_my" },
            { id: "sp-mock-004", title: "Stopped working after 2 weeks", text: "Used it for only two weeks and it completely stopped working. Seller is no longer responding to messages. Wasted money.", stars: 1, createdAt: new Date(now - 11 * day).toISOString(), author: "ph_buyer_2024" },
            { id: "sp-mock-005", title: "Very slow shipping even with express", text: "Paid extra for express shipping but package took 3 weeks. Tracking showed no updates for 10 days. Shopee support could not help.", stars: 2, createdAt: new Date(now - 15 * day).toISOString(), author: "impatient_but_fair" },
            { id: "sp-mock-006", title: "Zipper broke on first use", text: "The zipper on the bag broke completely the first time I tried to open it. The stitching is also coming apart. Terrible build quality.", stars: 1, createdAt: new Date(now - 20 * day).toISOString(), author: "fashion_reviewer_id" },
            { id: "sp-mock-007", title: "Strong plastic smell, possibly harmful", text: "Opened the box and the smell was unbearable. Had to leave it outside for a week. Still smells. Not safe to use near food.", stars: 1, createdAt: new Date(now - 26 * day).toISOString(), author: "health_first_sg" },
            { id: "sp-mock-008", title: "Seller rating is fake", text: "Shop has 5-star rating but product is terrible. Clearly bought fake reviews. Real customer experience is completely different from what ratings show.", stars: 2, createdAt: new Date(now - 32 * day).toISOString(), author: "skeptical_shopper" },
            { id: "sp-mock-009", title: "Size chart completely wrong", text: "Followed the size chart exactly and ordered M but received something that would fit a child. No standard sizing used at all by this seller.", stars: 1, createdAt: new Date(now - 39 * day).toISOString(), author: "return_queen_th" },
            { id: "sp-mock-010", title: "Refund process is a nightmare", text: "Raised a return request two weeks ago and still no resolution. Shopee keeps closing my case automatically. Customer service is non-existent.", stars: 1, createdAt: new Date(now - 47 * day).toISOString(), author: "disappointed_vn_buyer" },
        ];
        return allMock.slice(0, limit);
    }

    async fetchRaw() {
        if (this.config.mock) {
            return this.fetchMock();
        }

        const keyword = this.config.keyword.trim();
        const limit = this.config.limit ?? 20;
        this.log(`Fetching Shopee items via API for: ${keyword}`);

        // Step 1: search for items matching keyword
        const searchUrl = `https://shopee.sg/api/v4/search/search_items?by=relevancy&keyword=${encodeURIComponent(keyword)}&limit=10&newest=0&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2`;
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://shopee.sg/',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };

        const searchRes = await fetch(searchUrl, { headers });
        if (!searchRes.ok) throw new Error(`Shopee search API returned ${searchRes.status}`);
        const searchData = await searchRes.json();

        const items = searchData?.items ?? searchData?.data?.items ?? [];
        if (!items.length) throw new Error(`No items found on Shopee for "${keyword}"`);

        // Step 2: fetch reviews for top items
        const reviews = [];
        for (const item of items.slice(0, 5)) {
            if (reviews.length >= limit) break;
            const shopId = item.itemid ? item.shopid : item.item_basic?.shopid;
            const itemId = item.itemid ?? item.item_basic?.itemid;
            if (!shopId || !itemId) continue;

            try {
                const reviewUrl = `https://shopee.sg/api/v2/item/get_ratings?filter=1&flag=1&itemid=${itemId}&limit=20&offset=0&shopid=${shopId}&type=0`;
                const reviewRes = await fetch(reviewUrl, { headers });
                if (!reviewRes.ok) continue;
                const reviewData = await reviewRes.json();
                const ratings = reviewData?.data?.ratings ?? reviewData?.ratings ?? [];
                for (const r of ratings) {
                    if (reviews.length >= limit) break;
                    if ((r.rating_star ?? 5) <= 2) {
                        reviews.push({
                            id: `sp-${r.cmtid ?? r.id ?? reviews.length}`,
                            title: r.comment?.slice(0, 80) || '(no title)',
                            text: r.comment || '',
                            stars: r.rating_star ?? 1,
                            createdAt: r.ctime ? new Date(r.ctime * 1000).toISOString() : new Date().toISOString(),
                            author: r.author_username || r.buyer_name || 'shopee_user',
                            url: `https://shopee.sg/product/${shopId}/${itemId}`,
                        });
                    }
                }
            } catch (err) {
                this.log(`Warning: failed to fetch reviews for item ${itemId}: ${err}`);
            }
        }

        this.log(`Fetched ${reviews.length} Shopee low-star reviews`);
        return reviews;
    }

    parsePost(raw) {
        const stars = raw.stars ?? raw.rating_star ?? 3;
        const score = (5 - stars) * 20;
        return {
            id: String(raw.id ?? `sp-${Date.now()}-${Math.random().toString(36).slice(2)}`),
            title: raw.title ?? raw.comment?.slice(0, 80) ?? '(no title)',
            content: raw.text ?? raw.content ?? raw.comment ?? '',
            author: raw.author ?? raw.author_username ?? raw.buyer_name ?? 'shopee_user',
            url: raw.url ?? `https://shopee.sg/search?keyword=${encodeURIComponent(this.config.keyword)}`,
            score: Number.isFinite(score) ? score : 40,
            commentCount: 0,
            createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
            platform: this.platform,
        };
    }
}
exports.ShopeeCollector = ShopeeCollector;
