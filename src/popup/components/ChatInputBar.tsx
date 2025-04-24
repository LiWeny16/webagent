import {
    useState,
    useRef,
    useEffect,
    ClipboardEvent,
    KeyboardEvent, // 确保导入 KeyboardEvent
} from "react";
import {
    Box,
    IconButton,
    InputBase,
    Paper,
    Tooltip, // 导入 Tooltip
} from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import LanguageIcon from "@mui/icons-material/Language";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import MicIcon from "@mui/icons-material/Mic";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from '@mui/icons-material/Send';
import StopCircleIcon from '@mui/icons-material/StopCircle';

export default function ChatInputBar({
    onSend,
    isReplying, // 确认传入
    onStop,     // 确认传入
}: {
    onSend: (text: string, images: File[]) => void;
    onStop: () => void;
    isReplying: boolean;
}) {
    const [text, setText] = useState("");
    const [images, setImages] = useState<File[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    // --- 图片处理 (粘贴, 上传, 移除) ---
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            Array.from(e.clipboardData?.items || []).forEach((item) => {
                if (item.type.startsWith("image/")) {
                    const file = item.getAsFile();
                    file && setImages((prev) => [...prev, file]);
                }
            });
        };
        window.addEventListener("paste", handlePaste as any);
        return () => window.removeEventListener("paste", handlePaste as any);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setImages((prev) => [...prev, ...Array.from(e.target.files!)]);
            e.target.value = "";
        }
    };

    // 移除图片，并释放 Object URL
    const removeImage = (idx: number, url?: string) => {
        setImages((prev) => prev.filter((_, i) => i !== idx));
        if (url) {
            // 在实际应用中，确保 URL 在这里被正确 revoke
            // 可能需要更复杂的 URL 管理策略
            try { URL.revokeObjectURL(url); } catch (e) { console.error("Error revoking object URL", e); }
        }
    };

    // --- 发送 / 停止 逻辑 ---
    const handleSend = () => {
        const trimmedText = text.trim();
        if (isReplying || (!trimmedText && images.length === 0)) return;
        onSend(trimmedText, images);
        setText("");
        setImages([]);
    };

    // 处理 Ctrl+Enter 发送
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === "Enter" && e.ctrlKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // 计算发送按钮是否应禁用
    const isSendDisabled = !isReplying && !text.trim() && images.length === 0;

    return (
        <Paper
            elevation={8}
            sx={{
                display: "flex",
                flexDirection: "column",
                margin: "10px",
                p: 1,
                borderRadius: 2,
                bgcolor: "#fff",
                boxShadow: 8, // 保留 boxShadow
                boxSizing: 'border-box', // ✅ 确保 padding/border 在尺寸内
            }}
        >
            {/* --- 图片预览 --- */}
            {images.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: 'wrap', gap: 1, mb: 1, maxHeight: 100, overflowY: 'auto' }}>
                    {images.map((file, idx) => {
                        let url = '';
                        try { url = URL.createObjectURL(file); } catch (error) { console.error(error); }
                        return (
                            <Box key={idx} sx={{ position: "relative", flexShrink: 0 }}>
                                {url ? (
                                    <img src={url} alt={file.name || "preview"} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, display: 'block' }} onError={(e) => e.currentTarget.style.display = 'none'} />
                                ) : (
                                    <Box sx={{ width: 48, height: 48, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontSize: 10 }}>错误</Box>
                                )}
                                <IconButton size="small" onClick={() => removeImage(idx, url)} sx={{ position: "absolute", top: -6, right: -6, bgcolor: "rgba(255,255,255,0.8)", p: 0.2, '&:hover': { bgcolor: 'rgba(255, 255, 255, 1)' } }} aria-label={`移除图片 ${idx + 1}`}>
                                    <CloseIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Box>
                        );
                    })}
                </Box>
            )}

            {/* --- 输入区 --- */}
            <Box sx={{ display: "flex", flexDirection: "column", width: '100%' }}>
                {/* ✅ 应用防溢出和样式修复 */}
                <InputBase
                    placeholder="询问任何问题 (Ctrl+Enter 发送)"
                    multiline
                    minRows={1}        // ✅ 最小行数
                    maxRows={5}        // ✅ 最大行数 (可调整)
                    autoFocus
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isReplying} // ✅ 回复时禁用输入
                    sx={{
                        flexGrow: 1,
                        px: 1.5, py: 1,
                        fontSize: 14,
                        lineHeight: "20px",
                        width: '100%',           // ✅ 全宽
                        boxSizing: 'border-box', // ✅ 正确的尺寸计算
                        wordBreak: 'break-word', // ✅ 防止水平溢出
                        overflowY: 'auto',       // ✅ 超出 maxRows 后垂直滚动
                        resize: 'none',          // ✅ 禁用文本区域调整大小
                        mb: 1,                   // 输入框和按钮之间的间距
                        borderRadius: 1,         // 可选：内部轻微圆角
                    }}
                />

                {/* --- 功能按钮 --- */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {/* 左侧按钮 */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}> {/* 减小间距 */}
                        <input type="file" accept="image/*" hidden multiple ref={fileRef} onChange={handleFileChange} disabled={isReplying} />
                        <Tooltip title="上传图片">
                            <IconButton size="small" onClick={() => fileRef.current?.click()} disabled={isReplying} aria-label="上传图片">
                                <AddPhotoAlternateIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="语言选项（暂不可用）">
                            <span>
                                <IconButton size="small" disabled aria-label="语言选项">
                                    <LanguageIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="更多选项（暂不可用）">
                            <span>
                                <IconButton size="small" disabled aria-label="更多选项">
                                    <MoreHorizIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>

                    {/* 右侧按钮 */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}> {/* 减小间距 */}
                        <Tooltip title="使用麦克风（暂不可用）">
                            <span>
                                <IconButton size="small" disabled sx={{ bgcolor: "#000", color: "#fff", "&:hover": { bgcolor: "#333" } }} aria-label="使用麦克风">
                                    <MicIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        {/* ✅ 发送 or 停止 按钮 (逻辑保持不变) */}
                        <Tooltip title={isReplying ? "停止生成" : "发送 (Ctrl+Enter)"}>
                            <span>
                                <IconButton
                                    size="small"
                                    color={isReplying ? "error" : "primary"}
                                    onClick={isReplying ? onStop : handleSend} // ✅ 调用正确的函数
                                    disabled={isSendDisabled} // ✅ 使用正确的禁用状态
                                    aria-label={isReplying ? "停止生成" : "发送消息"}
                                >
                                    {isReplying ? (
                                        <StopCircleIcon fontSize="medium" /> // ✅ 显示停止图标
                                    ) : (
                                        <SendIcon fontSize="small" />      // ✅ 显示发送图标
                                    )}
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                </Box>
            </Box>
        </Paper>
    );
}