// src/popup/Popup.tsx
// import '@chatscope/chat-ui-kit-react/dist/default/styles.min.css';
import styles from "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import { useEffect, useState } from "react";
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Box,
  CircularProgress,
  CssBaseline,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import SettingsIcon from "@mui/icons-material/Settings";
import InfoIcon from "@mui/icons-material/Info";

import MainTab from "./pages/MainTab";
import SettingsTab from "./pages/SettingsTab";
import AboutTab from "./pages/AboutTab";


// src/popup/theme.ts
import { createTheme, ThemeProvider } from "@mui/material/styles";
import TopNavigation from "./components/TopNavi";

const chatGPTTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#000000", // ChatGPT 主绿色
    },
    background: {
      default: "#f9fafb", // 背景灰白
      paper: "#ffffff",
    },
    text: {
      primary: "#111827", // 深灰字体
    },
  },
  typography: {
    fontFamily: "'Noto Sans SC', 'Segoe UI', sans-serif",
    fontSize: 14,
  },
  shape: {
    borderRadius: 5,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        *::-webkit-scrollbar {
          width: 6px;
          height: 6px;
          background-color: transparent;
        }
    
        *::-webkit-scrollbar-thumb {
          background-color: rgba(150, 150, 150, 0.5);
          border-radius: 4px;
        }
    
        *::-webkit-scrollbar-thumb:hover {
          background-color: rgba(120, 120, 120, 0.6);
        }
    
        *::-webkit-scrollbar-track {
          background-color: transparent;
        }
    
        *::-webkit-scrollbar-button {
          display: none;
          height: 0;
          width: 0;
        }
      `,
    },


    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "none",
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: "#ffffff",
          borderTop: "1px solid #e5e7eb",
        },
      },
    },
  },
});


const Popup = () => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟加载
    setTimeout(() => setLoading(false), 500); // 可换成真正的数据加载判断
  }, []);

  const renderTab = () => {
    switch (tab) {
      case 0: return <MainTab />;
      case 1: return <SettingsTab />;
      case 2: return <AboutTab />;
    }
  };

  return (
    <ThemeProvider theme={chatGPTTheme}>
      <CssBaseline />
      <Box
        sx={{
          width: 400,
          height: 600,
          display: "flex",
          overflow: "hidden",
          flexDirection: "column",
          boxSizing: "border-box",
          backgroundColor: "#fff"
        }}
      >
        {loading ? (
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
          <>
            <TopNavigation tab={tab} setTab={setTab}  />
            <Box sx={{ flexGrow: 1, }}>
              {renderTab()}
            </Box>
          </>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default Popup;
