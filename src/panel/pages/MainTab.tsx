import { Box } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import ChatPanel, { Message } from "../components/ChatPanel";
import ChatInputBar from "../components/ChatInputBar";
import { ChatSession } from "@App/askAI";
import { getSettings } from "@App/settings";

const MainTab = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isReplying, setIsReplying] = useState(false);
    const sessionRef = useRef<ChatSession | null>(null);

    useEffect(() => {
        getSettings().then((settings) => {
            const session = new ChatSession({
                provider: settings.defaultProvider as "openai" | "grok" | "gemini",
                model: settings.models[settings.defaultProvider],
                stream: true,
                onStream: (chunk) => {
                    setMessages((prev) => {
                        const last = prev.at(-1);
                        if (last?.role === "assistant") {
                            return [
                                ...prev.slice(0, -1),
                                { ...last, content: (last.content || "") + chunk },
                            ];
                        } else {
                            return [...prev, { role: "assistant", content: chunk }];
                        }
                    });
                },
            });

            sessionRef.current = session;
        });
    }, []);

    const handleSend = async (text: string, imgs?: File[], citation?: string[], network?: boolean) => {
        if (!sessionRef.current) return;
        let content: { type: string; text: string }[] | string = [];
        setIsReplying(true);
        if (citation && citation.length > 0) {
            content = citation.join(";") + text
        } else {
            content = text

        }
        setMessages((prev) => [...prev, { role: "user", content: text }]);
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        try {
            await sessionRef.current.send(content, network);
        } catch (err) {
            console.warn("发送失败或被中止", err);
        }

        // 4️⃣ 最终同步整个 session 的消息（失败时也能保证 UI 不乱）
        setMessages(
            sessionRef.current
                .getMessages()
                .filter(
                    (msg): msg is { role: "user" | "assistant"; content: string } =>
                        msg.role === "user" || msg.role === "assistant"
                )
        );
        // 5️⃣ 取消正在回复状态
        setIsReplying(false);
    };

    const handleStop = () => {
        sessionRef.current?.stop();
        setIsReplying(false);
    };

    return (
        <Box display="flex" flexDirection="column" height="100%" sx={{ px: 1, pt: 1 }}>
            {messages.length > 0 ? (
                <ChatPanel messages={messages} loading={isReplying} />
            ) : (
                <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    欢迎，请输入您的问题。
                </Box>
            )}

            <Box sx={{ mt: 0, mb: 4.3 }}>
                <ChatInputBar onSend={handleSend} onStop={handleStop} isReplying={isReplying} />
            </Box>
        </Box>
    );
};

export default MainTab;