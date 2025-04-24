import { Readability } from "@mozilla/readability";
import DOMPurify from "dompurify";

export interface ParseResult {
    url: string;
    title?: string;
    excerpt?: string;
    content?: string;
    description?: string;
    error?: string;
}

/**
 * 在浏览器环境中解析并提取页面内容。
 * 流程：
 * 1. 元数据和 JSON-LD 优先。
 * 2. Readability 提取。
 * 3. 基于文本密度的回退遍历。
 */
export function parseAndSummarize(html: string, url: string): ParseResult {
    try {
        // 解析 HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // 1. 元数据提取
        let metaTitle = doc.querySelector("title")?.textContent || undefined;
        const description =
            doc.querySelector('meta[name="description"]')?.getAttribute("content") ||
            doc.querySelector('meta[property="og:description"]')?.getAttribute("content") ||
            doc.querySelector('meta[name="twitter:description"]')?.getAttribute("content") ||
            undefined;

        // JSON-LD 提取 articleBody
        let structuredBody: string | null = null;
        doc.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
            try {
                const data = JSON.parse(script.textContent || "");
                const items = Array.isArray(data) ? data : [data];
                for (const item of items) {
                    if (item && typeof item === "object" && item.articleBody) {
                        structuredBody = item.articleBody;
                        if (!metaTitle && item.headline) metaTitle = item.headline;
                        break;
                    }
                }
            } catch { }
        });

        if (structuredBody) {
            return {
                url,
                title: metaTitle,
                description,
                content: structuredBody,
                // @ts-ignore
                excerpt: structuredBody.slice(0, 500)
            };
        }

        // 2. Readability 提取
        const reader = new Readability(doc);
        const article = reader.parse();
        if (article && article.textContent && article.textContent.length > 200) {
            return {
                url,
                title: article.title || metaTitle,
                // @ts-ignore
                excerpt: article.excerpt,
                content: sanitize(article.textContent)
            };
        }

        // 3. 回退：智能密度算法
        const fallback = smartExtract(doc);
        return {
            url,
            title: metaTitle,
            excerpt: fallback.slice(0, 200),
            content: sanitize(fallback)
        };
    } catch (e: any) {
        return { url, error: e.message || "解析失败" };
    }
}

/**
 * 安全清洗 HTML，只保留常见内容标签
 */
function sanitize(html: string): string {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            "p", "h1", "h2", "h3", "h4", "h5", "h6",
            "pre", "code", "table", "thead", "tbody", "tr", "th", "td",
            "img"
        ],
        ALLOWED_ATTR: ["src", "alt", "href"]
    });
}

/**
 * 基于文本密度与链接密度的回退提取
 */
function smartExtract(doc: Document): string {
    type Candidate = { node: Element; score: number };
    const candidates: Candidate[] = [];

    doc.querySelectorAll("article, section, div").forEach(el => {
        const text = el.textContent?.trim() || "";
        if (text.length < 120) return;

        const linkCount = el.querySelectorAll("a").length;
        const linkRatio = (linkCount + 1) / (text.length + 1);
        const density = text.length / (el.innerHTML.length + 1);
        const semanticBonus = /post|article|content|entry/i.test(el.className) ? 0.15 : 0;
        const score = density * (1 - linkRatio) + semanticBonus;
        candidates.push({ node: el, score });
    });

    if (candidates.length === 0) {
        return doc.body.textContent?.trim() || "";
    }

    // 取 top3 outerHTML
    const top = candidates.sort((a, b) => b.score - a.score).slice(0, 3);
    return top.map(c => c.node.outerHTML).join("\n\n");
}