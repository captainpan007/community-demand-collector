import { Post } from '../types';

const STOP_WORDS = new Set([
  // 冠词 / 连词 / 介词
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'by','from','as','into','through','about','above','after','before',
  'between','during','without','within','along','across','behind','beyond',
  // 代词
  'i','you','he','she','it','we','they','me','him','her','us','them',
  'my','your','his','its','our','their','this','that','these','those',
  // 助动词 / 系动词
  'is','was','are','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','can',
  'shall','must','ought',
  // 高频无意义词
  'just','more','also','very','really','so','too','even','still','already',
  'now','then','here','there','when','where','who','what','how','why',
  'all','any','both','each','few','many','much','most','other','some',
  'such','than','same','own','its','not','no','nor','only','same','than',
  'like','well','back','get','got','go','one','two','new','use','used',
  'make','made','know','think','want','need','see','look','come','keep',
  'way','thing','time','year','people','man','woman','day','good','long',
  'take','give','put','set','let','try','ask','say','tell','said',
  'right','left','old','big','little','great','high','low','next','last',
  // URL / Markdown 碎片
  'https','http','www','com','org','net','io','app','link','url',
  'amp','nbsp','redd','reddit','imgur','github','youtube','twitter',
  'watch','video','videos','preview','width','format','webp','auto',
  // Reddit 固定格式词
  'status','deleted','removed','edit','update','tldr','eli','tl',
  'post','comment','comments','thread','subreddit','upvote','downvote',
  // 缩写残留（don't / isn't 截断后的残留）
  'don','isn','doesn','didn','won','aren','wasn','weren','hadn',
  'shouldn','couldn','wouldn','haven','hasn','let',
]);

/**
 * 对单段文本做预清洗，去除 URL、Markdown 链接、HTML 实体、代码块等
 */
function cleanText(raw: string): string {
  return raw
    // 去掉 Markdown 链接 [text](url) → text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // 去掉裸 URL（http/https 开头）
    .replace(/https?:\/\/\S+/g, '')
    // 去掉 HTML 实体（&amp; &#x200B; 等）
    .replace(/&[a-zA-Z0-9#]+;/g, ' ')
    // 去掉 Markdown 代码块 ```...```
    .replace(/```[\s\S]*?```/g, ' ')
    // 去掉行内代码 `...`
    .replace(/`[^`]*`/g, ' ')
    // 去掉 Markdown 标题 # ## ###
    .replace(/^#+\s*/gm, '')
    // 去掉星号加粗/斜体
    .replace(/\*+([^*]*)\*+/g, '$1')
    // 多空白合并
    .replace(/\s+/g, ' ')
    .trim();
}

export class KeywordAnalyzer {
  /**
   * 统计词频，同时记录每个词出现在多少篇不同帖子中（文档频率）
   *
   * @param posts   帖子列表
   * @param topN    返回前 N 个关键词
   * @param minDf   最小文档频率：词必须出现在至少 minDf 篇帖子中才计入（默认 2）
   */
  analyze(posts: Post[], topN = 30, minDf = 2): Map<string, number> {
    // termFreq: 词 → 全局出现总次数
    const termFreq = new Map<string, number>();
    // docFreq: 词 → 出现在几篇帖子中
    const docFreq = new Map<string, number>();

    for (const post of posts) {
      const raw = `${post.title} ${post.content}`;
      const text = cleanText(raw).toLowerCase();
      const words = text.match(/\b[a-z]{3,}\b/g) ?? [];

      // 本篇帖子中出现过的词（去重，用于计算文档频率）
      const seenInPost = new Set<string>();

      for (const word of words) {
        if (STOP_WORDS.has(word)) continue;

        termFreq.set(word, (termFreq.get(word) ?? 0) + 1);

        if (!seenInPost.has(word)) {
          seenInPost.add(word);
          docFreq.set(word, (docFreq.get(word) ?? 0) + 1);
        }
      }
    }

    // 过滤掉文档频率不足 minDf 的词，再按全局词频降序排列
    const filtered = [...termFreq.entries()]
      .filter(([word]) => (docFreq.get(word) ?? 0) >= minDf)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN);

    return new Map(filtered);
  }
}
