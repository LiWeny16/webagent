const PANEL_ID = 'bigonion-webagent-panel';
const PANEL_W = 420;
const PANEL_H = 650;
const { left, top } = calculateInitialPosition();
const containerStyle = {
    display: "none",
    position: 'fixed',
    left: `${left}px`,
    top: `${top}px`,
    width: `${PANEL_W}px`,
    height: `${PANEL_H}px`,
    zIndex: '999999',
    boxShadow: '0 8px 32px rgba(0,0,0,.25)',
    borderRadius: '16px',
    background: 'white',
    overflow: 'hidden',
    opacity: '0',
    transition: 'opacity .2s ease',
} as CSSStyleDeclaration
/** 淡入面板 + 自动聚焦 iframe 及输入框 */
function showPanel(container: HTMLElement, iframe: HTMLIFrameElement) {
    container.style.display = 'block';
    requestAnimationFrame(() => {
        container.style.opacity = '1';
    });
    // **立刻** 在用户手势上下文里 focus iframe
    iframe.setAttribute('tabindex', '0');
    iframe.focus();
}

/** 淡出面板 + 取消 iframe 内所有聚焦 */
function hidePanel(container: HTMLElement, iframe: HTMLIFrameElement) {
    // 通知 iframe 里 blur 掉 input
    iframe.contentWindow?.postMessage({ type: 'BLUR_INPUT' }, '*');
    // 整体也 blur 一下
    iframe.contentWindow?.blur();

    container.style.opacity = '0';
    container.addEventListener(
        'transitionend',
        () => (container.style.display = 'none'),
        { once: true },
    );
}


function calculateInitialPosition(): { left: number; top: number } {
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const targetX = winW * 2.4 / 3 - PANEL_W / 2;
    const targetY = winH / 2 - PANEL_H / 2;
    return {
        left: Math.min(Math.max(0, targetX), winW - PANEL_W),
        top: Math.min(Math.max(0, targetY), winH - PANEL_H),
    };
}

interface Point { x: number; y: number }

/** 拖拽逻辑 */
function makeDraggable(container: HTMLElement, handle: HTMLElement) {
    let startMouse: Point, startPos: Point;

    function onMouseMove(e: MouseEvent) {
        const dx = e.clientX - startMouse.x;
        const dy = e.clientY - startMouse.y;
        const newX = Math.min(
            Math.max(startPos.x + dx, 0),
            window.innerWidth - PANEL_W
        );
        const newY = Math.min(
            Math.max(startPos.y + dy, 0),
            window.innerHeight - PANEL_H
        );
        container.style.left = `${newX}px`;
        container.style.top = `${newY}px`;
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    handle.addEventListener('mousedown', e => {
        e.preventDefault();
        startMouse = { x: e.clientX, y: e.clientY };
        startPos = { x: container.offsetLeft, y: container.offsetTop };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}
/** 获取已存在的面板容器 */
function getPanelContainer(): HTMLElement | null {
    return document.getElementById(PANEL_ID);
}

/** 切换面板 显示 / 隐藏 */
export function togglePanel() {
    let container = getPanelContainer()
    if (container) {
        let iframe: HTMLIFrameElement = container.querySelector('iframe') as HTMLIFrameElement;
        const isHidden =
            container.style.display === 'none' ||
            container.style.opacity === '0';
        if (isHidden) {
            showPanel(container, iframe);
        } else {
            hidePanel(container, iframe);
        }
        return;
    } else {
        createNewPanel()
    }


}
createNewPanel()
function createNewPanel() {
    let container: HTMLElement;
    let iframe: HTMLIFrameElement;
    // 首次创建
    container = document.createElement('div');
    container.id = PANEL_ID;
    const { left, top } = calculateInitialPosition();
    Object.assign(container.style, containerStyle);

    // Header（拖拽把手）
    const header = document.createElement('div');
    Object.assign(header.style, {
        width: '100%',
        height: '40px',
        cursor: 'pointer',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    } as CSSStyleDeclaration);
    const indicator = document.createElement('div');
    Object.assign(indicator.style, {
        width: '100px',
        height: '4px',
        borderRadius: '2px',
        background: '#ccc',
    } as CSSStyleDeclaration);
    header.appendChild(indicator);
    container.appendChild(header);

    // iframe 本体
    iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('panel.html');
    Object.assign(iframe.style, {
        width: '100%',
        height: 'calc(100% - 40px)',
        border: 'none',
    } as CSSStyleDeclaration);
    container.appendChild(iframe);

    document.body.appendChild(container);
    initEvents(container, iframe, header,)

}
function initEvents(
    container: HTMLElement,
    iframe: HTMLIFrameElement,
    header: HTMLElement
) {
    makeDraggable(container, header);
    const pluginDiv = container
    document.addEventListener('fullscreenchange', () => {
        const fsEl = document.fullscreenElement;
        if (fsEl) {
            fsEl.appendChild(pluginDiv);
            Object.assign(pluginDiv.style, containerStyle);
        } else {
            document.body.appendChild(pluginDiv);
        }
    });
    iframe.addEventListener('load', () => {
        const win = iframe.contentWindow;
        win!.document.body.addEventListener('click', e => {
            let el = e.target;
            while (el && (el as HTMLElement).tagName !== 'A') el = (el as HTMLElement).parentElement;
            if (el && (el as HTMLElement).tagName === 'A') {
                const href = (el as HTMLAnchorElement).href;
                e.preventDefault();
                // 在父窗口打开
                window.open(href, '_top');
            }
        });
    });

    // 监听用户选区
    document.addEventListener('selectionchange', () => {
        const sel = window.getSelection()?.toString() || '';
        iframe.contentWindow?.postMessage({ type: 'SELECTION_CHANGE', text: sel }, '*');
    });

    // Netflix 字幕观察器 —— 全局一次挂载
    let lastCaption = '';
    const bodyObserver = new MutationObserver(() => {
        const capEl = document.querySelector<HTMLElement>(
            '.player-timedtext-text-container'
        );
        if (!capEl) return;

        // 找到最里层那个 span
        const inner = capEl.querySelector('span span');
        if (!inner) return;

        // 给这个新的节点挂 observer，防止它以后被整棵树替换
        observeCaptionNode(inner, iframe);
    });
    bodyObserver.observe(document.body, {
        childList: true,
        subtree: true,
    });

    function observeCaptionNode(
        node: Node,
        iframe: HTMLIFrameElement
    ) {
        const mo = new MutationObserver(() => {
            const text = (node.textContent || '').trim();
            if (text && text !== lastCaption) {
                lastCaption = text;
                iframe.contentWindow?.postMessage(
                    { type: 'NETFLIX_CAPTION', text },
                    '*'
                );
            }
        });
        mo.observe(node, {
            characterData: true,
            subtree: false,
        });

        // 也可以在这里立即发一遍，防止 miss 第一帧
        const initial = (node.textContent || '').trim();
        if (initial && initial !== lastCaption) {
            lastCaption = initial;
            iframe.contentWindow?.postMessage(
                { type: 'NETFLIX_CAPTION', text: initial },
                '*'
            );
        }
    }
}
