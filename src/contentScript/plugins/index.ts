
interface Command {
    action: string;
    selector?: string;
    nodeRef?: string; // 来自 background 注入的 data‑aiId
    text?: string;
    key?: string;
    position?: "top" | "bottom" | "center" | "start" | "end";
    value?: string;
    [k: string]: any;
}

type Resp = { status: "SUCCESS"; data?: any } | { status: "ERROR"; error: string };

/* -------------------------------------------------------------
 * 小工具：根据 selector 或 nodeRef 找单个元素
 * -----------------------------------------------------------*/
function resolveElement(cmd: Command): HTMLElement | null {
    if (cmd.nodeRef) return document.querySelector(`[data-ai-id="${cmd.nodeRef}"]`);
    if (cmd.selector) return document.querySelector(cmd.selector);
    return null;
}

/* -------------------------------------------------------------
 * 为一组元素打上 data-ai-id，返回 id 列表
 * -----------------------------------------------------------*/
function tagElements(els: Element[]): string[] {
    return els.map((el) => {
        let id = (el as HTMLElement).dataset.aiId;
        if (!id) {
            id = `ai_${Math.random().toString(36).slice(2, 8)}`;
            (el as HTMLElement).dataset.aiId = id;
        }
        return id;
    });
}

/* -------------------------------------------------------------
 * 核心路由
 * -----------------------------------------------------------*/
chrome.runtime.onMessage.addListener((cmd: Command, _sender, sendResponse) => {
    const fail = (err: string): Resp => ({ status: "ERROR", error: err });
    const ok = (data?: any): Resp => ({ status: "SUCCESS", data });

    try {
        switch (cmd.action) {
            /* ---------------- READ_DOM ----------------*/
            case "READ_DOM": {
                const el = resolveElement(cmd);
                if (!el) return sendResponse(fail("READ_DOM: 无法找到元素"));
                const data = cmd.includeText ? el.textContent ?? "" : el.innerHTML;
                return sendResponse(ok(data));
            }

            /* 默认 */
            default:
                return sendResponse(fail(`未知 action: ${cmd.action}`));
        }
    } catch (err: any) {
        return sendResponse(fail(err.message));
    }

    // 声明同步响应
    return true;
});