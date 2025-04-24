// src/popup/components/ChatPanel.tsx
import { md } from "@App/markdown/markdown";
import {
  Box,
  Paper,
  IconButton,
  Snackbar,
  Alert,
  Tooltip,
} from "@mui/material";
import { ContentCopy } from "@mui/icons-material";
import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const ChatPanel = ({ messages }: { messages: Message[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Scroll logic remains the same (assuming ChatPanel handles its own scroll)
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth", // Use 'auto' for immediate scroll if 'smooth' feels slow
    });
  }, [messages]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => setCopied(true))
      .catch(err => console.error('Failed to copy text: ', err)); // Add error handling
  };

  return (
    <>
      {/* This Box is the scrollable container */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1, // Takes up space if parent is flex column
          overflowY: "auto", // Changed to auto, looks better than always scroll
          // Consider removing fixed height like '67vh' if parent (MainTab) handles sizing
          height: "calc(100% - 20px)", // Example: leave space for padding, adjust as needed
          pr: 1, pb: 1, padding: 1, // Keep padding consistent
          display: "flex",
          flexDirection: "column",
          gap: 2, // Increased gap slightly
        }}
      >
        {messages.map((msg, idx) => (
          // This Box aligns the entire message block (bubble + button) left or right
          <Box
            key={idx}
            sx={{
              display: "flex",
              // Use justifyContent to push the inner content block left/right
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              width: "100%", // Ensure it takes full row width for alignment
            }}
          >
            {/* This inner Box groups the Paper and Button vertically, and controls their alignment */}
            <Box
              sx={{
                display: 'flex',          // ✅ Make this a flex container
                flexDirection: 'column',  // ✅ Stack Paper and Button vertically
                // ✅ Align items inside this box based on role
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%', // ✅ Limit the max width of the bubble+button group
              }}
            >
              {/* Message Bubble */}
              <Paper
                elevation={1} // Add subtle shadow
                sx={{
                  p: 1.5, py: 1,
                  bgcolor: msg.role === "user" ? "#e3f2fd" : "#ffffff",
                  borderRadius: 2, fontSize: 14, lineHeight: 1.6, wordBreak: "break-word",
                  // Ensure Paper doesn't shrink unnecessarily
                  minWidth: 50, // Example minimum width
                  // Markdown/Code styles
                  "& pre": { display: "block", overflowX: "auto", background: "#f6f8fa", borderRadius: 1, padding: "8px", whiteSpace: "pre-wrap" },
                  "& code": { fontFamily: "monospace", fontSize: 13, background: 'rgba(0,0,0,0.04)', padding: '1px 4px', borderRadius: '3px' }, // Style inline code too
                  "& p": { margin: 0 }, // Remove default paragraph margin from markdown
                  "& ul, & ol": { paddingLeft: '20px', margin: '5px 0' }, // Adjust list padding
                }}
              >
                {/* Render Markdown Content */}
                <div dangerouslySetInnerHTML={{ __html: md.render(msg.content) }} />
              </Paper>

              {/* Copy Button Container (now directly under Paper in a vertical flex) */}
              <Box
                sx={{
                  mt: 0.5, // Margin top from Paper
                  // No flex alignment needed here, parent (column flex) handles it
                }}
              >
                <Tooltip title="复制" arrow placement={msg.role === 'user' ? 'left' : 'right'}>
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(msg.content)}
                    sx={{
                      bgcolor: "rgba(0,0,0,0.04)",
                      "&:hover": { bgcolor: "rgba(0,0,0,0.1)" },
                      width: 24, height: 24, // Slightly larger?
                      p: 0.5,
                    }}
                  >
                    <ContentCopy sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box> {/* End Inner vertical flex Box */}
          </Box> // End Outer alignment Box
        ))}
      </Box> {/* End Scrollable Box */}
    </>
  );
};

export default ChatPanel;