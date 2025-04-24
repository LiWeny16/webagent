// src/popup/pages/AboutTab.tsx
import { Box, Typography, Link } from "@mui/material";

const AboutTab = () => {
    return (
        <Box
            sx={{
                height: "100%",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "#f9fafb",
                textAlign: "center",
                px: 2,
            }}
        >
            <Typography variant="body1" sx={{ mb: 1 }}>
                作者：<strong>Bigonino</strong>
            </Typography>

            <Typography variant="body1" sx={{ mb: 1 }}>
                版本号：<strong>v1.0.1</strong>
            </Typography>

            <Typography variant="body1" sx={{ mb: 3 }}>
                开源协议：<strong>MIT License</strong>
            </Typography>

        </Box>
    );
};

export default AboutTab;
