// src/popup/pages/SettingsTab.tsx
import {
    Box,
    Typography,
    TextField,
    Autocomplete,
    Avatar,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Button,
    Divider,
} from "@mui/material";
import { useEffect, useState } from "react";
import { getSettings, changeSettings, Settings, ProviderType } from "@App/settings";

// ✅ 服务配置项
const SERVICES = [
    {
        id: "openai",
        name: "OpenAI",
        icon: chrome.runtime.getURL("models-supplyer/openai/openai.svg"),
    },
    {
        id: "gemini",
        name: "Gemini（谷歌）",
        icon: chrome.runtime.getURL("models-supplyer/gemini/gemini.svg"),
    },
    {
        id: "grok",
        name: "Grok（xAI）",
        icon: chrome.runtime.getURL("models-supplyer/grok/grok.svg"),
    },
    {
        id: "deepseek",
        name: "DeepSeek（深度求索）",
        icon: chrome.runtime.getURL("models-supplyer/deepseek/deepseek.svg"),
    },
    {
        id: "anthropic",
        name: "Anthropic Claude",
        icon: chrome.runtime.getURL("models-supplyer/claude/claude.svg"),
    },
];
// 👇 你已有的部分省略...

// ✅ 各服务支持的模型
const MODEL_OPTIONS: Record<string, string[]> = {
    openai: ["gpt-o1", "gpt4o", "gpt4o-mini", "gpt-o3-mini"],
    gemini: ["gemini-2.0-pro", "gemini-2.0-flash"],
    grok: ["grok-2", "grok-3"],
    deepseek: ["deepseek-r1", "deepseek-r3"],
    anthropic: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
};

const SettingsTab = () => {
    const [selectedService, setSelectedService] = useState(SERVICES[0]);
    const [inputValue, setInputValue] = useState("");
    const [selectedModel, setSelectedModel] = useState("");

    const [tokens, setTokens] = useState<Record<string, string>>({});
    const [models, setModels] = useState<Record<string, string>>({});

    useEffect(() => {
        getSettings().then((s) => {
            setTokens(s.apiKeys);
            setModels(s.models || {});

            const match = SERVICES.find((svc) => svc.id === s.defaultProvider);
            setSelectedService(match || SERVICES[0]);
        });
    }, []);

    useEffect(() => {
        setInputValue(tokens[selectedService.id] || "");
        setSelectedModel(models[selectedService.id] || MODEL_OPTIONS[selectedService.id]?.[0] || "");
    }, [selectedService, tokens, models]);

    const handleSave = async () => {
        const mergedKeys = {
            ...tokens,
            [selectedService.id]: inputValue,
        };

        const mergedModels = {
            ...models,
            [selectedService.id]: selectedModel,
        };

        await changeSettings({
            defaultProvider: selectedService.id as ProviderType,
            apiKeys: mergedKeys as Settings["apiKeys"],
            models: mergedModels as Settings["models"],
        });

        setTokens(mergedKeys);
        setModels(mergedModels);
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                设置 API Token 和模型
            </Typography>

            <Autocomplete
                disablePortal
                options={SERVICES}
                value={selectedService}
                onChange={(_, newValue) => newValue && setSelectedService(newValue)}
                getOptionLabel={(option) => option.name}
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

            <TextField
                label={`为 ${selectedService.id} 设置 Token`}
                variant="outlined"
                fullWidth
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="请输入 API Token"
                sx={{ mb: 2 }}
            />

            <Autocomplete
                disablePortal
                options={MODEL_OPTIONS[selectedService.id] || []}
                value={selectedModel}
                onChange={(_, newValue) => newValue && setSelectedModel(newValue)}
                renderInput={(params) => <TextField {...params} label="选择模型" fullWidth />}
                sx={{ mb: 2 }}
            />

            <Button variant="contained" fullWidth onClick={handleSave}>
                保存设置
            </Button>

            <Divider sx={{ my: 3 }} />

            <Typography variant="body2" color="text.secondary">
                所有设置将保存在浏览器本地（chrome.storage.local），不会上传。
            </Typography>
        </Box>
    );
};

export default SettingsTab;

