import {
    useState,
    useRef,
    useEffect,
    ClipboardEvent,
    KeyboardEvent,
} from "react";
import {
    Box,
    IconButton,
    InputBase,
    Paper,
    Tooltip,
    Typography
} from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import LanguageIcon from "@mui/icons-material/Language";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import MicIcon from "@mui/icons-material/Mic";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import StopCircleIcon from "@mui/icons-material/StopCircle";

const commandPresets: Record<string, { description: string }> = {
    "@访问网址": { description: "提取页面主内容文本并交由 AI 进行总结" },
};

export default function ChatInputBar({ onSend, isReplying, onStop }: {
    onSend: (text: string, images?: File[], citation?: string[], network?: boolean) => void;
    onStop: () => void;
    isReplying: boolean;
}) {
    const [text, setText] = useState("");
    const [images, setImages] = useState<File[]>([]);
    const [selectedText, setSelectedText] = useState<string>("");
    const [netflixCaptions, setNetflixCaptions] = useState<string[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
    const [isUsingWebSearch, setIsUsingWebSearch] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // 处理粘贴和父页面消息
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            Array.from(e.clipboardData?.items || []).forEach(item => {
                if (item.type.startsWith("image/")) {
                    const file = item.getAsFile();
                    file && setImages(prev => [...prev, file]);
                }
            });
        };
        const handleMessage = (e: MessageEvent) => {
            const { type, text } = e.data || {};
            switch (type) {
                case 'SELECTION_CHANGE':
                    setSelectedText((text as string).trim());
                    break;
                case 'NETFLIX_CAPTION': {
                    const cap = (text as string).trim();
                    if (cap) {
                        // 如果想去重，或者只保留最新一条，可以改这里的逻辑
                        setNetflixCaptions(prev => [cap]);
                    }
                    break;
                }
                case 'BLUR_INPUT':
                    inputRef.current?.blur();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('load', () => setTimeout(() => inputRef.current?.focus(), 0));
        window.addEventListener('focus', () => inputRef.current?.focus());
        window.addEventListener('paste', handlePaste as any);
        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('paste', handlePaste as any);
            window.removeEventListener('message', handleMessage as any);
        };
    }, []);

    // 抓取 Netflix 字幕
    useEffect(() => {
        const url = window.location.href;
        if (/^https?:\/\/(www\.)?netflix\.com\/watch\//.test(url)) {
            const els = Array.from(document.getElementsByClassName('caption'));
            const caps = els.map(el => (el as HTMLElement).innerText.trim()).filter(t => t);
            setNetflixCaptions(caps);
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setImages(prev => [...prev, ...Array.from(e.target.files!)]);
            e.target.value = '';
        }
    };
    const removeImage = (idx: number, url?: string) => {
        setImages(prev => prev.filter((_, i) => i !== idx));
        url && URL.revokeObjectURL(url);
    };

    const handleSend = () => {
        const trimmedText = text.trim();
        if (isReplying || (!trimmedText && images.length === 0 && !selectedText && netflixCaptions.length === 0)) return;
        const citation = [netflixCaptions[0], selectedText].filter(Boolean);
        onSend(trimmedText, images, citation, isUsingWebSearch);
        setText('');
        setImages([]);
        setSelectedText('');
        setNetflixCaptions([]);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (showSuggestions) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const len = suggestions.length;
                if (e.key === 'ArrowDown') setSelectedSuggestionIndex(idx => (idx + 1) % len);
                if (e.key === 'ArrowUp') setSelectedSuggestionIndex(idx => (idx - 1 + len) % len);
                if (e.key === 'Enter' || e.key === 'Tab') {
                    const sel = suggestions[selectedSuggestionIndex];
                    setText(prev => prev.replace(/@[一-龥\w]*$/, sel));
                    setShowSuggestions(false);
                }
            }
        } else if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInputChange = (val: string) => {
        setText(val);
        const match = val.match(/@[一-龥\w]*$/);
        if (match) {
            const keyword = match[0];
            const matched = Object.keys(commandPresets).filter(cmd => cmd.startsWith(keyword));
            setSuggestions(matched);
            setShowSuggestions(Boolean(matched.length));
            setSelectedSuggestionIndex(0);
        } else setShowSuggestions(false);
    };

    const isSendDisabled = !isReplying && !text.trim() && images.length === 0 && !selectedText && netflixCaptions.length === 0;

    return (
        <Paper
            elevation={8}
            sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                mr: 1,
                p: 1,
                borderRadius: 2,
                bgcolor: '#fff',
                boxShadow: 8,
            }}
        >
            {/* 引用内容区 */}
            {(selectedText || netflixCaptions.length > 0 || images.length > 0) && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1, maxHeight: 100, overflowY: 'auto' }}>
                    {selectedText && (
                        <Box
                            key="selection"
                            sx={{
                                position: 'relative',
                                bgcolor: '#f5f5f5',
                                borderRadius: 1,
                                p: '4px 24px 4px 8px',
                                width: 120,
                                height: 58,
                                overflow: 'hidden',
                                flexShrink: 0,
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    fontSize: 12,
                                    lineHeight: '16px',
                                    /* 以下实现最多三行，溢出显示省略号 */
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: 3,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {selectedText}
                            </Typography>
                            <IconButton
                                size="small"
                                onClick={() => setSelectedText('')}
                                sx={{
                                    position: 'absolute',
                                    top: 2,
                                    right: 2,
                                    p: 0.5,
                                    bgcolor: 'rgba(255,255,255,0.8)',
                                }}
                            >
                                <CloseIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                        </Box>
                    )}
                    {netflixCaptions.map((cap, i) => (
                        <Box
                            key={i}
                            sx={{
                                position: 'relative',
                                bgcolor: '#fdecea',
                                borderRadius: 1,
                                p: '4px 24px 4px 8px',
                                width: 120,
                                height: 58,
                                overflow: 'hidden',
                                flexShrink: 0,
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    fontSize: 12,
                                    lineHeight: '16px',
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: 3,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {cap}
                            </Typography>
                            <IconButton
                                size="small"
                                onClick={() => setNetflixCaptions(prev => prev.filter((_, j) => j !== i))}
                                sx={{
                                    position: 'absolute',
                                    top: 2,
                                    right: 2,
                                    p: 0.5,
                                    bgcolor: 'rgba(255,255,255,0.8)',
                                }}
                            >
                                <CloseIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                        </Box>
                    ))}
                    {images.map((file, idx) => {
                        const url = URL.createObjectURL(file);
                        return (
                            <Box key={idx} sx={{ position: 'relative', flexShrink: 0 }}>
                                <img
                                    src={url}
                                    alt={file.name}
                                    style={{ width: 58, height: 58, objectFit: 'cover', borderRadius: 8 }}
                                />
                                <IconButton
                                    size="small"
                                    onClick={() => removeImage(idx, url)}
                                    sx={{
                                        position: 'absolute',
                                        top: 2,
                                        right: 2,
                                        p: 0.5,
                                        bgcolor: 'rgba(255,255,255,0.8)',
                                    }}
                                >
                                    <CloseIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                            </Box>
                        );
                    })}
                </Box>
            )}

            {/* 输入区 & 建议 */}
            <Box sx={{ position: 'relative' }}>
                <InputBase
                    inputRef={inputRef}
                    placeholder="询问任何问题 (Ctrl+Enter 发送)"
                    multiline
                    minRows={1}
                    maxRows={5}
                    autoFocus
                    value={text}
                    onChange={e => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    sx={{
                        flexGrow: 1,
                        px: 1.5,
                        py: 1,
                        fontSize: 14,
                        lineHeight: '20px',
                        width: '100%',
                        boxSizing: 'border-box',
                        wordBreak: 'break-word',
                        overflowY: 'auto',
                        resize: 'none',
                        mb: 1,
                        borderRadius: 1,
                    }}
                />
                {showSuggestions && (
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: '100%',
                            left: 0,
                            bgcolor: 'white',
                            borderRadius: 1,
                            boxShadow: 3,
                            width: '100%',
                            maxHeight: 160,
                            overflowY: 'auto',
                            zIndex: 999,
                            mb: 0.5,
                        }}
                    >
                        {suggestions.map((sugg, idx) => (
                            <Box
                                key={sugg}
                                sx={{
                                    px: 1.5,
                                    py: 0.75,
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    cursor: 'pointer',
                                    backgroundColor: idx === selectedSuggestionIndex ? '#f0f0f0' : 'white',
                                }}
                                onClick={() => {
                                    setText(prev => prev.replace(/@[一-龥\\w]*$/, sugg));
                                    setShowSuggestions(false);
                                }}
                            >
                                <Typography variant="body2" noWrap>
                                    {`${sugg} - ${commandPresets[sugg].description}`}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {/* 操作按钮 */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <input
                        type="file"
                        accept="image/*"
                        hidden
                        multiple
                        ref={fileRef}
                        onChange={handleFileChange}
                        disabled={isReplying}
                    />
                    <Tooltip title="上传图片">
                        <IconButton size="small" onClick={() => fileRef.current?.click()} disabled={isReplying}>
                            <AddPhotoAlternateIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="联网搜索">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => {
                                    setIsUsingWebSearch(prev => !prev)
                                }}
                                color={isUsingWebSearch ? 'secondary' : 'primary'}
                            >
                                <LanguageIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <span><IconButton size="small" disabled><MoreHorizIcon fontSize="small" /></IconButton></span>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title="使用麦克风（暂不可用）"><span><IconButton size="small" disabled sx={{ bgcolor: '#000', color: '#fff' }}><MicIcon fontSize="small" /></IconButton></span></Tooltip>
                    <Tooltip title={isReplying ? '停止生成' : '发送 (Ctrl+Enter)'}>
                        <span>
                            <IconButton size="small" color={isReplying ? 'error' : 'primary'} onClick={isReplying ? onStop : handleSend} disabled={isSendDisabled}>
                                {isReplying ? <StopCircleIcon fontSize="small" /> : <SendIcon fontSize="small" />}
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </Box>
        </Paper>
    );
}

// 注意：在 iframe 外层页面监听选区并 postMessage 到此组件：
// document.addEventListener('selectionchange', () => {
//   const sel = window.getSelection()?.toString() || '';
//   const iframe = document.getElementById('chatIframe');
//   iframe.contentWindow.postMessage({ type: 'SELECTION_CHANGE', text: sel }, '*');
// });
