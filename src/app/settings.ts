type SettingScope = "persistent" | "volatile";

export type SettingKey =
  | "apiKeys"
  | "defaultProvider"
  | "theme"
  | "useScrollToBottom";



const STORAGE_KEY = "pluginSettings";

// 修改 DEFAULT_SETTINGS 的定义，使用类型来代替 as const
export type ProviderType = "openai" | "gemini" | "grok" | "deepseek" | "anthropic";

export const DEFAULT_SETTINGS = {
  apiKeys: {
    openai: "",
    gemini: "",
    grok: "",
    deepseek: "",
    anthropic: "",
  },
  defaultProvider: "openai" as ProviderType,
  models: {
    openai: "gpt-4o",
    gemini: "gemini-2.0-flash",
    grok: "grok-2",
    deepseek: "deepseek-chat",
    anthropic: "claude-3-sonnet",
  },
  theme: "light" as "light" | "dark",
};

// 定义 Settings 类型
export type Settings = {
  apiKeys: Record<ProviderType, string>;
  defaultProvider: ProviderType;
  models: Record<ProviderType, string>;
  theme: "light" | "dark";
};


// ✅ 内存缓存，仅用于 volatile 设置（页面级临时存储）
let volatileSettings: Partial<Settings> = {};

/**
 * ✅ 获取完整设置（自动补全缺失字段）
 */
/**
 * 获取设置
 */
export async function getSettings(): Promise<Settings> {
  if (!chrome?.storage?.local) {
    console.warn("⚠️ chrome.storage.local 不可用，可能不在插件环境中");
    return DEFAULT_SETTINGS;
  }

  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (res) => {
      const stored = res[STORAGE_KEY] || {};
      // 确保合并后的结果符合 Settings 类型
      const merged = deepMerge(DEFAULT_SETTINGS, stored) as Settings;

      // 确保 defaultProvider 是有效的类型
      if (!Object.keys(DEFAULT_SETTINGS.apiKeys).includes(merged.defaultProvider)) {
        merged.defaultProvider = DEFAULT_SETTINGS.defaultProvider;
      }

      resolve(merged);
    });
  });
}


/**
 * ✅ 设置：支持持久 / volatile 两种模式
 * @param partial 只传需要更新的字段即可
 * @param scope "persistent"（存储） or "volatile"（内存）
 */
export async function changeSettings(partial: Partial<Settings>, scope: SettingScope = "persistent") {
  if (scope === "persistent") {
    const current = await getSettings();
    const updated = deepMerge(current, partial);
    chrome.storage.local.set({ [STORAGE_KEY]: updated });
  } else {
    volatileSettings = deepMerge(volatileSettings, partial);
  }
}

/**
 * ✅ 获取 volatile-only 设置（页面级状态用）
 */
export function getVolatileSettings(): Partial<Settings> {
  return volatileSettings;
}

/**
 * 🧠 工具函数：深度合并对象（递归嵌套合并）
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key in source) {
    if (
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      source[key] !== null
    ) {
      result[key] = deepMerge((target as any)[key] || {}, (source as any)[key]);
    } else if (source[key] !== undefined) {
      result[key] = source[key] as any;
    }
  }
  return result;
}
