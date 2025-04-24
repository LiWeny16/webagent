// content.ts
// MV3 content‑script：执行原子 DOM 操作，响应 background 调度

import { togglePanel } from "./insert/insert";
import { copyViaTextarea } from "./text/copy";
import "./plugins/index"



chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'toggle-panel') togglePanel()
})

/**
 * @description copy
*/
chrome.runtime.onMessage.addListener((msg, _s, send) => {
    if (msg?.type === "content-copy") {
        const ok = copyViaTextarea(msg.text ?? "");
        send({ ok });
    }
});

