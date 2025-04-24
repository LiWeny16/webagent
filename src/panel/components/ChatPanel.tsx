// src/popup/components/ChatPanel.tsx
import { md } from "@App/markdown/markdown";
import {
  Box,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { ContentCopy } from "@mui/icons-material";
import { useEffect, useRef, useState } from "react";
import { copyText } from "@App/text/copy";

export type Message = {
  role: "user" | "assistant";
  content: string 
};

interface ChatPanelProps {
  messages: Message[];
  loading: boolean; // 是否在流式加载中
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, loading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading, autoScroll]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 20;
    const isAtBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < threshold;
    setAutoScroll(isAtBottom);
  };

  const handleCopy = async (text: string) => {
    await copyText(text);
  };

  return (
    <Box
      ref={scrollRef}
      onScroll={handleScroll}
      sx={{
        flex: 1,
        overflowY: "auto",
        height: "calc(100% - 20px)",
        pr: 1,
        pb: 1,
        p: 1,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {messages.map((msg, idx) => {
        const isLastAssistant =
          loading &&
          msg.role === "assistant" &&
          idx === messages.length - 1;
        return (
          <Box
            key={idx}
            sx={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              width: "100%",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 1.5,
                  py: 1,
                  bgcolor: msg.role === "user" ? "#e3f2fd" : "#ffffff",
                  borderRadius: 2,
                  fontSize: 14,
                  lineHeight: 1.6,
                  wordBreak: "break-word",
                  minWidth: 50,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  "& pre": {
                    display: "block",
                    overflowX: "auto",
                    background: "#f6f8fa",
                    borderRadius: 1,
                    padding: "8px",
                    whiteSpace: "pre-wrap",
                  },
                  "& code": {
                    fontFamily: "monospace",
                    fontSize: 13,
                    background: "rgba(0,0,0,0.04)",
                    padding: "1px 4px",
                    borderRadius: "3px",
                  },
                  "& p": { margin: 0 },
                  "& ul, & ol": { paddingLeft: "20px", margin: "5px 0" },
                }}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: md.render(
                      typeof msg.content === "string" ? msg.content : ""
                    ),
                  }}
                />

              </Paper>

              <Box sx={{ ml: 1, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                <Box>
                  <Tooltip title="复制" arrow placement={msg.role === 'user' ? 'left' : 'right'}>
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(msg.content)}
                      sx={{
                        bgcolor: "rgba(0,0,0,0.04)",
                        "&:hover": { bgcolor: "rgba(0,0,0,0.1)" },
                        width: 24,
                        height: 24,
                        p: 0.5,
                        m: 0.5,
                      }}
                    >
                      <ContentCopy sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center" }}>{isLastAssistant && (
                  <CircularProgress size={15} sx={{
                    width: 24,
                    height: 24,
                    p: 0.5,
                    m: 0.5,
                  }} />
                )}</Box>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default ChatPanel;