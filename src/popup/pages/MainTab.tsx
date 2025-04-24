import { Box } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import ChatPanel from "../components/ChatPanel";
import ChatInputBar from "../components/ChatInputBar";
import { ChatSession } from "@App/askAI";
import { getSettings } from "@App/settings";

const MainTab = () => {
    const [messages, setMessages] = useState<
        { role: "user" | "assistant"; content: string }[]
    >([
        { role: "assistant", content: "你好！我可以帮你做什么？" },
    ]);

    const [isReplying, setIsReplying] = useState(false);
    const sessionRef = useRef<ChatSession | null>(null);

    useEffect(() => {
        getSettings().then((settings) => {
            const session = new ChatSession({
                provider: settings.defaultProvider as "openai" | "grok" | "gemini",
                model: settings.models[settings.defaultProvider],
                stream: true,
                onStream: (chunk) => {
                    setMessages((prev) =>
                        prev.map((msg, idx) =>
                            idx === prev.length - 1
                                ? { ...msg, content: msg.content + chunk }
                                : msg
                        )
                    );
                },
            });

            sessionRef.current = session;
            setMessages([
                { role: "assistant", content: "你好，我是你的助手，请问有什么可以帮您？" },
            ]);
        });
    }, []);

    const handleSend = async (text: string, imgs: File[]) => {
        if (!sessionRef.current) return;

        setIsReplying(true);

        setMessages((prev) => [...prev, { role: "user", content: text }]);
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        try {
            await sessionRef.current.send(text);
        } catch (err) {
            console.warn("发送失败或被中止", err);
        }

        setMessages(
            sessionRef.current.getMessages()
                .filter((msg): msg is { role: "user" | "assistant"; content: string } =>
                    msg.role === "user" || msg.role === "assistant"
                )
        );

        setIsReplying(false);
    };

    const handleStop = () => {
        sessionRef.current?.stop(); // 👈 你需要在 ChatSession 中实现这个方法
        setIsReplying(false);
    };

    return (
        <Box
            display="flex"
            flexDirection="column"
            height="90svh"
            sx={{ px: 1, pt: 1 }}
        >
            <ChatPanel messages={messages} />
            <Box sx={{ mt: 0, mb: 1 }}>
                <ChatInputBar
                    onSend={handleSend}
                    onStop={handleStop}
                    isReplying={isReplying}
                />
            </Box>
        </Box>
    );
};

export default MainTab;
