import { getSettings, ProviderType } from "@App/settings";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseAndSummarize } from "./text/parse";

export type Role = "user" | "assistant" | "system";

export interface Message {
    role: Role;
    content: string;
}

interface AskOptions {
    provider: ProviderType;
    model?: string;
    temperature?: number;
    systemPrompt?: string;
    stream?: boolean;
    onStream?: (chunk: string) => void;
    /** ⭐️ 新增：流被中止时收到已下载部分 */
    onAbort?: (partial: string) => void;
    /** 可选：正常结束时收到完整内容 */
    onFinish?: (full: string) => void;
}

const MAX_TOKEN_WINDOW = 15000;
const estimateTokens = (msg: Message) => Math.ceil(msg.content.length / 3);
export const commandPresets: Record<string, { description: string; example: object }> = {
    "@总结页面": {
        description: "提取页面主内容文本并交由 AI 进行总结",
        example: {
            action: "READ_DOM",
            selector: "main",
            includeText: true
        }
    },

};


export class ChatSession {
    private provider: AskOptions["provider"];
    private model?: string;
    private temperature: number;
    private stream: boolean;
    private onStream?: (chunk: string) => void;
    private context: Message[] = [];
    private systemPrompt: string;
    private apiKey: string = "";
    private abortCtrl: AbortController | null = null;
    private onAbort?: (partial: string) => void;   // ⭐️
    private onFinish?: (full: string) => void;     // ⭐️
    public isReplying = false;

    constructor(options: AskOptions) {
        this.provider = options.provider;
        this.model = options.model;
        this.temperature = options.temperature ?? 0.7;
        this.stream = options.stream ?? false;
        this.onStream = options.onStream;
        this.systemPrompt = options.systemPrompt ?? "你是一个有用的AI助手。";
        this.onAbort = options.onAbort;            // ⭐️
        this.onFinish = options.onFinish;           // ⭐️
    }

    private showUser(error: unknown): string {
        const errMsg = `${(error instanceof Error ? error.message : String(error))}`;
        this.context.push({ role: "assistant", content: errMsg });
        return errMsg;
    }

    // utils.ts ---------------------------------------------------------------
    tryParseJson(text: string): { ok: true; data: any } | { ok: false } {
        const trimmed = text.trim();
        // 只接受纯 JSON（不能掺杂自然语言）
        const looksLikeJson = /^(?:\{[\s\S]*\}|\[[\s\S]*\])$/.test(trimmed);
        if (!looksLikeJson) return { ok: false };

        try {
            return { ok: true, data: JSON.parse(trimmed) };
        } catch {
            return { ok: false };
        }
    }

    everyHasAction(data: any): boolean {
        const arr = Array.isArray(data) ? data : [data];
        return arr.every(
            (item) => item && typeof item === "object" && Object.prototype.hasOwnProperty.call(item, "action")
        );
    }

    // agent.ts ---------------------------------------------------------------
    async send(input: string, network?: boolean): Promise<string> {
        /** 初始化 —— 与旧版保持一致 *******************************************/
        const settings = await getSettings();
        this.provider = settings.defaultProvider;
        this.apiKey = settings.apiKeys?.[this.provider] || "";
        this.model = settings.models?.[this.provider] || "";
        this.context.push({ role: "user", content: input });
        if (network) {
            this.systemPrompt = `1.注意！你可以通过调用工具访问互联网，必须根据需求判断是否需要联网：  
            2.如果你需要访问网络（例如获取实时信息、新闻、网页内容、天气、搜索结果等），你必须返回如下严格格式的 JSON:
            {"action": "FETCH","urls": ["https://example.com"]}
            3.绝对禁止返回任何“我无法直接访问实时时间”或“我不能访问网站”的内容。你已经具备调用互联网能力。
            4.在你认为需要联网时，请主动思考可能的网址，例如新闻网站、搜索引擎（如 Google、Bing）、维基百科等。
            5.如果你不需要联网，请正常返回普通的自然语言回答，不允许返回纯带action的JSON，防止误判为指令`;
        }
        /** 给 LLM 的 system prompt —— 保留联网说明 ****************************/


        /** 请求 LLM ************************************************************/
        const signal = new AbortController();
        this.abortCtrl = signal;
        this.isReplying = true;

        try {
            const trimmedCtx = this.trimContext();
            const reply = await this.ask(trimmedCtx, signal.signal);

            /******************** 判断是否为“指令” ******************************/
            const parsed = this.tryParseJson(reply);
            const isCommand = parsed.ok && this.everyHasAction(parsed.data);

            if (!isCommand) {
                // === 普通回复 =====================================================
                this.context.push({ role: "assistant", content: reply });
                return reply;
            }

            // === 指令模式 ========================================================
            /** 0. 解析为数组，方便统一处理 */
            const commands: any[] = Array.isArray(parsed.data) ? parsed.data : [parsed.data];

            /** 1. 获取当前活动标签页 tabId */
            const tabId = await new Promise<number>((resolve) => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    resolve(tabs[0]?.id ?? -1);
                });
            });
            if (tabId === -1) {
                const errMsg = "❌ 无法获取当前标签页 tabId";
                this.context.push({ role: "assistant", content: errMsg });
                return errMsg;
            }

            /** 2. 依次执行指令 */
            const execResults: string[] = [];
            for (const cmd of commands) {
                const res = await new Promise<any>((resolve) => {
                    chrome.runtime.sendMessage({ from: "aiAgent", data: cmd, targetTabId: tabId }, resolve);
                });

                if (res.status === "SUCCESS") {
                    const summaries: string[] = [];
                    for (const item of res.results) {
                        if (item.html) {
                            summaries.push(JSON.stringify(parseAndSummarize(item.html, item.url), null, 2));
                        } else if (item.error) {
                            summaries.push(`❌ ${item.url} 报错：${item.error}`);
                        }
                    }
                    execResults.push(summaries.join("\n"));
                } else {
                    execResults.push(`❌ ${cmd.action} 失败：${res.error}`);
                }
            }

            /** 3. 将抓取结果回馈给 LLM，让它生成最终答复 */
            const combinedUserMsg: Message = {
                role: "user",
                content: execResults.join("\n") + ";" + input,
            };
            const finalReply = await this.ask([combinedUserMsg], signal.signal);

            this.context.push({ role: "assistant", content: finalReply });
            return finalReply;
        } catch (err: any) {
            const msg = `❌ 出错啦，请检查 TOKEN 是否有效！报错信息：${err.message || String(err)}`;
            // this.showUser(msg);
            return msg;
        } finally {
            this.abortCtrl = null;
            this.isReplying = false;
        }
    }





    stop() {
        if (this.abortCtrl) {
            this.abortCtrl.abort();
            this.abortCtrl = null;
            this.isReplying = false;
        }
    }

    getMessages(): Message[] {
        return this.context;
    }

    clear() {
        this.context = [];
    }

    private trimContext(): Message[] {
        const sysMsg: Message = { role: "system", content: this.systemPrompt };
        let tokens = estimateTokens(sysMsg);
        const reversed = [...this.context].reverse();
        const result: Message[] = [];

        for (const msg of reversed) {
            const t = estimateTokens(msg);
            if (tokens + t > MAX_TOKEN_WINDOW) break;
            tokens += t;
            result.unshift(msg);
        }

        return [sysMsg, ...result];
    }

    private async ask(messages: Message[], signal: AbortSignal): Promise<string> {
        switch (this.provider) {
            case "openai":

                return askOpenAI(messages, this.apiKey, this.model ?? "gpt-3.5-turbo",
                    this.stream, this.temperature, this.onStream, this.onAbort,
                    this.onFinish, signal);
            case "grok":

                return askGrok(messages, this.apiKey, this.model ?? "grok-2",
                    this.stream, this.temperature, this.onStream, this.onAbort,
                    this.onFinish, signal);
            case "gemini":
                return askGemini(messages, this.apiKey, this.model ?? "gemini-2.0-flash", signal);
            case "deepseek":

                return askDeepSeek(messages, this.apiKey, this.model ?? "deepseek-chat",
                    this.stream, this.temperature, this.onStream, this.onAbort,
                    this.onFinish, signal);
            default:
                throw new Error("Unsupported provider: " + this.provider);
        }
    }

}
// OpenAI
export const askOpenAI = async (
    messages: Message[],
    apiKey: string,
    model: string,
    stream: boolean,
    temperature: number,
    onStream?: (chunk: string) => void,
    onAbort?: (partial: string) => void,
    onFinish?: (full: string) => void,
    signal?: AbortSignal
): Promise<string> => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, stream, temperature }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Request failed with status ${res.status}: ${errorText}`);
    }

    // 非流式
    if (!stream) {
        const json = await res.json();
        return json.choices?.[0]?.message?.content || "";
    }

    // 流式
    const reader = res.body!.getReader();
    const decoder = new TextDecoder("utf-8");
    let full = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

            for (const line of lines) {
                if (line.includes("[DONE]")) continue;
                try {
                    const payload = JSON.parse(line.replace("data: ", ""));
                    const delta = payload.choices?.[0]?.delta?.content;
                    if (delta) {
                        full += delta;
                        onStream?.(delta);
                    }
                } catch (err) {
                    console.warn("OpenAI stream parse error", err);
                }
            }
        }
        onFinish?.(full);
        return full;
    } catch (err) {
        if ((err as DOMException)?.name === "AbortError") {
            onAbort?.(full);
            return full;
        }
        throw err;
    }
};

export const askGrok = async (
    messages: Message[],
    apiKey: string,
    model: string,
    stream: boolean,
    temperature: number,
    onStream?: (chunk: string) => void,
    onAbort?: (partial: string) => void,
    onFinish?: (full: string) => void,
    signal?: AbortSignal
): Promise<string> => {
    const payload = {
        model,
        stream,
        temperature,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        signal,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Request failed with status ${res.status}: ${errorText}`);
    }

    if (!stream) {
        const json = await res.json();
        return json.choices?.[0]?.message?.content || "";
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let full = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

            for (const line of lines) {
                if (line.includes("[DONE]")) continue;
                try {
                    const payload = JSON.parse(line.replace("data: ", ""));
                    const delta = payload.choices?.[0]?.delta?.content;
                    if (delta) {
                        full += delta;
                        onStream?.(delta);
                    }
                } catch (e) {
                    console.warn("Grok stream error", e);
                }
            }
        }
        onFinish?.(full);
        return full;
    } catch (err) {
        if ((err as DOMException)?.name === "AbortError") {
            onAbort?.(full);
            return full;
        }
        throw err;
    }
};

// Gemini（本身无流式 API，不需要改动）
export const askGemini = async (
    messages: Message[],
    apiKey: string,
    model: string,
    signal?: AbortSignal
): Promise<string> => {
    const filtered = messages.filter((m) => m.role === "user");
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal,
            body: JSON.stringify({
                contents: filtered.map((m) => ({
                    role: m.role,
                    parts: [{ text: m.content }],
                })),
            }),
        }
    );

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Request failed with status ${res.status}: ${txt}`);
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
};

export const askDeepSeek = async (
    messages: Message[],
    apiKey: string,
    model: string = "deepseek-chat",
    stream: boolean = false,
    temperature: number = 1,
    onStream?: (chunk: string) => void,
    onAbort?: (partial: string) => void,
    onFinish?: (full: string) => void,
    signal?: AbortSignal
): Promise<string> => {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, stream, temperature }),
        signal,
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`DeepSeek API error: ${res.status} ${txt}`);
    }

    if (!stream) {
        const json = await res.json();
        return json.choices?.[0]?.message?.content ?? "";
    }

    if (!res.body) throw new Error("DeepSeek stream not supported.");

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buf = "";
    let full = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;

            buf += decoder.decode(value, { stream: true });
            let idx: number;
            while ((idx = buf.indexOf("\n\n")) !== -1) {
                const raw = buf.slice(0, idx).trim();
                buf = buf.slice(idx + 2);

                for (const line of raw.split("\n")) {
                    if (!line.startsWith("data:")) continue;
                    const data = line.slice(5).trim();
                    if (data === "[DONE]") break;
                    try {
                        const j = JSON.parse(data);
                        const delta = j.choices?.[0]?.delta?.content;
                        if (delta) {
                            full += delta;
                            onStream?.(delta);
                        }
                    } catch (e) {
                        console.warn("DeepSeek SSE parse error", e);
                    }
                }
            }
        }
        onFinish?.(full);
        return full;
    } catch (err) {
        if ((err as DOMException)?.name === "AbortError") {
            onAbort?.(full);
            return full;
        }
        throw err;
    }
};
