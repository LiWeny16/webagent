import React from "react";
import { Paper, IconButton, Tooltip } from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import SettingsIcon from "@mui/icons-material/Settings";
import InfoIcon from "@mui/icons-material/Info";
import { NAV_WIDTH } from "../Popup";

interface SideNavigationProps {
  tab: number;
  setTab: (value: number) => void;
}

const SideNavigation: React.FC<SideNavigationProps> = ({ tab, setTab }) => {
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
        left: 0,
        height: "100%",
        width: NAV_WIDTH,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 1,
        zIndex: 10,
        backgroundColor: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(10px)",
        borderRadius: "0 16px 16px 0",
      }}
    >
      {items.map(({ icon, label, value }) => (
        <Tooltip key={label} title={label} placement="right">
          <IconButton
            onClick={() => setTab(value)}
            sx={{
              my: 1,
              borderRadius: 2,
              backgroundColor:
                tab === value ? "rgba(0,0,0,0.08)" : "transparent",
              transition: "all 0.2s",
            }}
          >
            {icon}
          </IconButton>
        </Tooltip>
      ))}
    </Paper>
  );
};

export default SideNavigation;
