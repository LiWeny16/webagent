// background.ts
// 负责调度 AI 生成的指令流，并把结果汇总返回给 popup / content
// 运行环境：Chrome MV3 service‑worker background

/* ------------------------------------------------------------------
 * 类型声明
 * ----------------------------------------------------------------*/
interface Command {
  id?: string;
  urls?: string[];
  action: string;
  selector?: string;
  nodeRef?: string;
  text?: string;
  key?: string;
  ms?: number;
  storeAs?: string;
}

interface Store {
  [key: string]: any;
}

/* ------------------------------------------------------------------
 * 工具：向 content script 发送单条指令
 * ----------------------------------------------------------------*/
function sendToContent<T = any>(tabId: number, cmd: Command): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, cmd, (res) => {
      if (chrome.runtime.lastError)
        return reject(new Error(chrome.runtime.lastError.message));
      if (!res) return reject(new Error("No response from content"));
      res.status === "SUCCESS" ? resolve(res.data as T) : reject(new Error(res.error));
    });
  });
}


/* ------------------------------------------------------------------
* 修改：按序执行指令流，使用 switch 分流不同 action
* ----------------------------------------------------------------*/
async function executeFlow(cmd: Command, tabId: number): Promise<{ status: string; results: any[] }> {
  try {
    switch (cmd.action) {
      case "FETCH":
        if (!cmd.urls || cmd.urls.length === 0) {
          throw new Error("FETCH 命令缺少 urls 参数");
        }

        const results = await Promise.all(
          cmd.urls.map(async (url) => {
            try {
              const res = await fetch(url);
              if (!res.ok) {
                return { url, error: `请求失败，状态码：${res.status}` };
              }
              const html = await res.text();
              return { url, html };
            } catch (err: any) {
              return { url, error: err.message || "未知错误" };
            }
          })
        );

        return { status: "SUCCESS", results };
      default:
        const res = await sendToContent(tabId, cmd);
        return { status: "SUCCESS", results: [res] };
    }
  } catch (err: any) {
    return { status: "ERROR", results: [{ error: err.message || "后台执行失败" }] };
  }
}


/* ------------------------------------------------------------------
* Background 消息入口保持不变
* ----------------------------------------------------------------*/
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  console.log(msg);
  if (msg.from !== "aiAgent") {
    sendResponse();
    return;
  }

  executeFlow(msg.data as Command, msg.targetTabId as number)
    .then((e) => {
      sendResponse(e)
    })
    .catch((err) => sendResponse({ summary: `❌ 执行失败：${err.message}` }));

  return true;
});


/**
 * @description 页面出现控制
*/
chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) return
  chrome.tabs.sendMessage(tab.id, { type: 'toggle-panel' })
})

/**
 * @description 剪切板 clipboard
*/

/* ------- 保证 Off‑screen 就绪 ------- */
let offscreenReady: any;                         // Promise<void>

async function ensureOffscreen() {
  if (offscreenReady) return offscreenReady;

  offscreenReady = new Promise<void>(async (resolve) => {
    if (!(await chrome.offscreen.hasDocument())) {
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL("offscreen.html"),
        reasons: [chrome.offscreen.Reason.CLIPBOARD],
        justification: "write to clipboard"
      });
    }

    const readyListener = (msg: { type: string; }) => {
      if (msg?.type === "offscreen-ready") {
        chrome.runtime.onMessage.removeListener(readyListener);
        resolve();
      }
    };
    chrome.runtime.onMessage.addListener(readyListener);
  });

  return offscreenReady;
}

/* ------- 主函数：写剪贴板，自动 fallback ------- */
async function writeClipboard(text: any) {
  await ensureOffscreen();

  const resp = await chrome.runtime.sendMessage({
    type: "offscreen-copy",
    text
  });

  if (resp?.ok) return true;                // 成功

  /* ⬇️ Off‑screen 失败 → 转发给当前 Tab 的 content.js 做 textarea fallback */
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return false;

  const resp2 = await chrome.tabs.sendMessage(tab.id, {
    type: "content-copy",
    text
  });

  return Boolean(resp2?.ok);
}

/* ------- 接收 UI 请求 ------- */
chrome.runtime.onMessage.addListener((msg, _s, send) => {
  if (msg?.type === "copy-to-clipboard") {
    writeClipboard(msg.text).then((ok) => send({ ok }));
    return true;                            // 异步
  }
});



