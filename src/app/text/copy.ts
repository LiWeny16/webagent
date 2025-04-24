/**
 * 让 background 执行 clipboard 写入。
 * @returns Promise<true> 成功 | <false> 失败
 */
export function copyText(text: string): Promise<boolean> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(
            { type: "copy-to-clipboard", text },
            (resp) => resolve(Boolean(resp?.ok))
        );
    });
}
