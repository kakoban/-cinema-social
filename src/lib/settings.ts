// System settings — persisted in-memory with env var defaults
// For Railway: set OPENROUTER_API_KEY and OPENROUTER_MODEL as env vars

interface SystemSettings {
  openRouterApiKey: string;
  openRouterModel: string;
  aiServerFinderEnabled: boolean;
}

const defaults: SystemSettings = {
  openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
  openRouterModel: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
  aiServerFinderEnabled: true,
};

// In-memory store (resets on restart, falls back to env vars)
let currentSettings: SystemSettings = { ...defaults };

export function getSystemSettings(): SystemSettings {
  return { ...currentSettings };
}

export function updateSystemSettings(partial: Partial<SystemSettings>): SystemSettings {
  if (partial.openRouterApiKey !== undefined) currentSettings.openRouterApiKey = partial.openRouterApiKey;
  if (partial.openRouterModel !== undefined) currentSettings.openRouterModel = partial.openRouterModel;
  if (partial.aiServerFinderEnabled !== undefined) currentSettings.aiServerFinderEnabled = partial.aiServerFinderEnabled;
  return { ...currentSettings };
}
