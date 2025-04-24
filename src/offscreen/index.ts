/* 让 SW 知道我已就绪 */
chrome.runtime.sendMessage({ type: "offscreen-ready" });

/* 监听写剪贴板指令 */
chrome.runtime.onMessage.addListener((msg, _s, send) => {
    if (msg?.type === "offscreen-copy") {
        copy(msg.text ?? "").then((ok) => send({ ok }));
        return true;
    }
});

/* 先尝试 Clipboard API，失败回退 textarea */
async function copy(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (_) {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
    }
}
