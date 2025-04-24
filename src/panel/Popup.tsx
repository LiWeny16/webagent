// src/popup/Popup.tsx
import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import React, { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  CssBaseline,
  GlobalStyles,
  ThemeProvider,
  createTheme,
} from "@mui/material";

import MainTab from "./pages/MainTab";
import SettingsTab from "./pages/SettingsTab";
import AboutTab from "./pages/AboutTab";
import SideNavigation from "./components/Navi";

// ------------------- 主题 -------------------
const chatGPTTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#000000" },
    secondary: { main: "#4aa4ff" },
    background: { default: "#f9fafb", paper: "#ffffff" },
    text: { primary: "#111827" },
  },
  typography: {
    fontFamily: "'Noto Sans SC', 'Segoe UI', sans-serif",
    fontSize: 14,
  },
  shape: { borderRadius: 5 },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        *::-webkit-scrollbar { width: 6px; height: 6px; background: transparent; }
        *::-webkit-scrollbar-thumb { background: rgba(150,150,150,0.5); border-radius: 4px; }
        *::-webkit-scrollbar-thumb:hover { background: rgba(120,120,120,0.6); }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-button { display:none; height:0; width:0; }
          // Chrome, Safari, Opera, Edge
        "::selection": {
          backgroundColor: "#2563EB",
          color: "#fff",
          borderRadius: "4px",
        },
        // Firefox
        "::-moz-selection": {
          backgroundColor: "#2563EB",
          color: "#fff",
          borderRadius: "4px",
        },
      `,
    },
    MuiPaper: { styleOverrides: { root: { boxShadow: "none" } } },
  },
});

// ------------------- 常量 -------------------
export const NAV_WIDTH = 50;   // 侧栏宽
const WIN_WIDTH = "100%";  // 整个弹窗宽
const WIN_HEIGHT = "100vh"; // 整个弹窗高

// ------------------- 主组件 -------------------
const Popup: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟首屏加载
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // 3 个页面保持挂载，用横向 translateX 做滑动
  const pages = [<MainTab />, <SettingsTab />, <AboutTab />];

  return (
    <ThemeProvider theme={chatGPTTheme}>
      <CssBaseline />
      <GlobalStyles
        styles={(theme) => ({
          '::selection': {
            backgroundColor: theme.palette.primary.light,
            color: theme.palette.getContrastText(theme.palette.primary.light),
          },
        })}
      />
      <Box
        sx={{
          width: WIN_WIDTH,
          height: WIN_HEIGHT,
          display: "flex",
          overflow: "hidden",
          boxSizing: "border-box",
          backgroundColor: "#fff",
        }}
      >
        {loading ? (
          // ---------- 加载占位 ----------
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          // ---------- 主体 ----------
          <>
            {/* 左侧导航栏 */}
            <Box sx={{ flex: `0 0 ${NAV_WIDTH}px`, width: NAV_WIDTH }}>
              <SideNavigation tab={tab} setTab={setTab} />
            </Box>

            {/* 右侧内容区域 */}
            <Box
              sx={{
                overflow: "hidden",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  width: `${pages.length * 100}%`,
                  height: "100%",
                  transform: `translateX(-${tab * (100 / pages.length)}%)`,
                  transition: "transform .35s ease",
                }}
              >
                {pages.map((Page, idx) => (
                  <Box
                    key={idx}
                    sx={{ width: `${100 / pages.length}%`, flexShrink: 0 }}
                  >
                    {Page}
                  </Box>
                ))}
              </Box>
            </Box>
          </>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default Popup;
