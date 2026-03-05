"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsvReporter = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const demand_ranker_1 = require("../analyzers/demand-ranker");
function escapeCsv(s) {
    if (!/[\n",]/.test(s))
        return s;
    return `"${s.replace(/"/g, '""')}"`;
}
class CsvReporter {
    constructor() {
        this.ranker = new demand_ranker_1.DemandRanker();
    }
    generate(data, outputPath) {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const extended = data;
        const lines = [];
        if (extended.charts?.wordCloudUrl) {
            lines.push(`__wordcloud_url__,${escapeCsv(extended.charts.wordCloudUrl)}`);
        }
        if (extended.charts?.trendUrl) {
            lines.push(`__trend_url__,${escapeCsv(extended.charts.trendUrl)}`);
        }
        lines.push('rank,title,titleZh,author,score,comments,engagement,date,url,summaryZh');
        extended.analysis.topDemands.forEach((post, i) => {
            const eng = this.ranker.engagementScore(post);
            lines.push([
                i + 1,
                escapeCsv(post.title),
                escapeCsv(post.titleZh || ''),
                escapeCsv(post.author),
                post.score,
                post.commentCount,
                eng,
                post.createdAt.toISOString().slice(0, 10),
                escapeCsv(post.url),
                escapeCsv((post.summaryZh || '').replace(/\n/g, ' ')),
            ].join(','));
        });
        fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
        console.log(`\nCSV saved → ${outputPath}`);
    }
}
exports.CsvReporter = CsvReporter;
//# sourceMappingURL=csv.js.map