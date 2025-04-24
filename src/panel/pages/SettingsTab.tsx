import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    Box,
    Typography,
    TextField,
    Autocomplete,
    Avatar,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Divider,
    Button,
} from "@mui/material";
import { getSettings, changeSettings, Settings, ProviderType } from "@App/settings";

// ------------------ 基础数据 ------------------ //
interface ServiceOption {
    id: ProviderType;
    name: string;
    icon: string;
}

const SERVICES: ServiceOption[] = [
    { id: "openai", name: "OpenAI", icon: chrome.runtime.getURL("models-supplyer/openai/openai.svg") },
    { id: "gemini", name: "Gemini（谷歌）", icon: chrome.runtime.getURL("models-supplyer/gemini/gemini.svg") },
    { id: "grok", name: "Grok（xAI）", icon: chrome.runtime.getURL("models-supplyer/grok/grok.svg") },
    { id: "deepseek", name: "DeepSeek（深度求索）", icon: chrome.runtime.getURL("models-supplyer/deepseek/deepseek.svg") },
    { id: "anthropic", name: "Anthropic Claude", icon: chrome.runtime.getURL("models-supplyer/claude/claude.svg") },
];

const MODEL_OPTIONS: Record<ProviderType, string[]> = {
    openai: ["gpt-o1", "gpt4o", "gpt4o-mini", "gpt-o3-mini"],
    gemini: ["gemini-2.0-pro", "gemini-2.0-flash"],
    grok: ["grok-2", "grok-3"],
    deepseek: ["deepseek-chat", "deepseek-reasoner"],
    anthropic: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
};

// ------------------ 组件 ------------------ //
const SettingsTab: React.FC = () => {
    // 已保存设置
    // @ts-ignore
    const [settings, setSettings] = useState<Settings>({ defaultProvider: "openai", apiKeys: {}, models: {} });
    // 当前服务 pending token
    const [pendingToken, setPendingToken] = useState<string>("");

    // 初始化：加载本地已保存的设置
    useEffect(() => {
        getSettings().then((loaded) => {
            setSettings(loaded);
            setPendingToken(loaded.apiKeys[loaded.defaultProvider] || "");
        });
    }, []);

    // ------------------ 衍生数据 ------------------ //
    const selectedService = useMemo(
        () => SERVICES.find((s) => s.id === settings.defaultProvider) || SERVICES[0],
        [settings.defaultProvider]
    );

    const modelValue = settings.models[selectedService.id] || MODEL_OPTIONS[selectedService.id][0];

    // 是否有未保存的 token
    const isTokenDirty = pendingToken !== (settings.apiKeys[selectedService.id] || "");

    // ------------------ 事件处理 ------------------ //
    // 切换服务：立即保存并重置 pendingToken
    const handleServiceChange = useCallback((_: unknown, newValue: ServiceOption | null) => {
        if (!newValue) return;
        const updated = { ...settings, defaultProvider: newValue.id };
        setSettings(updated);
        changeSettings(updated);
        // load token for new provider
        setPendingToken(settings.apiKeys[newValue.id] || "");
    }, [settings]);

    // 修改 token：仅更新 pending
    const handleTokenChange = (token: string) => {
        setPendingToken(token);
    };

    // 保存 token：更新 settings 并持久化
    const handleSaveToken = () => {
        const updated = {
            ...settings,
            apiKeys: { ...settings.apiKeys, [selectedService.id]: pendingToken },
        };
        setSettings(updated);
        changeSettings(updated);
    };

    // 切换模型：立即保存
    const handleModelChange = useCallback((_: unknown, model: string | null) => {
        if (!model) return;
        const updated = {
            ...settings,
            models: { ...settings.models, [selectedService.id]: model },
        };
        setSettings(updated);
        changeSettings(updated);
    }, [settings, selectedService.id]);

    // ------------------ UI ------------------ //
    return (
        <Box display="flex" flexDirection="column" height="90svh" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                设置 API Token 和模型
            </Typography>

            {/* 服务选择 */}
            <Autocomplete<ServiceOption>
                disablePortal
                options={SERVICES}
                value={selectedService}
                onChange={handleServiceChange}
                getOptionLabel={(o) => o.name}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                renderOption={(props, option) => (
                    <ListItem {...props} sx={{ minHeight: 48 }}>
                        <ListItemAvatar>
                            <Avatar src={option.icon} sx={{ width: 32, height: 32 }} />
                        </ListItemAvatar>
                        <ListItemText primary={option.name} />
                    </ListItem>
                )}
                renderInput={(params) => <TextField {...params} label="选择服务" fullWidth />}
                sx={{ mb: 2 }}
            />

            {/* Token 输入 + 保存 */}
            <TextField
                label={`为 ${selectedService.name} 设置 Token`}
                variant="outlined"
                fullWidth
                value={pendingToken}
                onChange={(e) => handleTokenChange(e.target.value)}
                placeholder="请输入 API Token"
                sx={{ mb: 1 }}
            />
            <Button
                variant="contained"
                disabled={!isTokenDirty}
                onClick={handleSaveToken}
                sx={{ mb: 2, bgcolor: isTokenDirty ? 'primary.main' : 'grey.500' }}
            >
                保存设置
            </Button>

            {/* 模型选择 */}
            <Autocomplete<string>
                disablePortal
                options={MODEL_OPTIONS[selectedService.id]}
                value={modelValue}
                onChange={handleModelChange}
                renderInput={(params) => <TextField {...params} label="选择模型" fullWidth />}
                sx={{ mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" color="text.secondary">
                所有设置保存在浏览器本地（chrome.storage.local），<strong>不会上传</strong>。<br />
            </Typography>
        </Box>
    );
};

export default SettingsTab;
