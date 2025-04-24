import React from "react";
import {
    AppBar,
    Toolbar,
    IconButton,
    Tooltip,
    Box,
    Paper,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import SettingsIcon from "@mui/icons-material/Settings";
import InfoIcon from "@mui/icons-material/Info";

interface TopNavigationProps {
    tab: number;
    setTab: (value: number) => void;
}

const TopNavigation: React.FC<TopNavigationProps> = ({ tab, setTab }) => {
    const items = [
        { icon: <ChatIcon />, label: "对话", value: 0 },
        { icon: <SettingsIcon />, label: "设置", value: 1 },
        { icon: <InfoIcon />, label: "关于", value: 2 },
    ];

    return (
        <Paper
            elevation={2}
            sx={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                mx: "auto",
                borderRadius: "0 0 16px 16px",
                maxWidth: 720,
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(10px)",
            }}
        >
            <Toolbar sx={{ justifyContent: "center", minHeight: 64 }}>
                {items.map(({ icon, label, value }) => (
                    <Tooltip key={label} title={label}>
                        <IconButton
                            onClick={() => setTab(value)}
                            sx={{
                                mx: 1.5,
                                borderRadius: 2,
                                backgroundColor:
                                    tab === value ? "rgba(0, 0, 0, 0.08)" : "transparent",
                                transition: "all 0.2s",
                            }}
                        >
                            {icon}
                        </IconButton>
                    </Tooltip>
                ))}
            </Toolbar>
        </Paper>
    );
};

export default TopNavigation;
