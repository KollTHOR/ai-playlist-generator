/* eslint-disable @typescript-eslint/no-explicit-any */
import { invoke } from "@tauri-apps/api/core";

export async function getEnvVar(name: string): Promise<string> {
  try {
    return await invoke("get_env_var", { name });
  } catch (error) {
    console.error("Failed to get environment variable:", error);
    return "";
  }
}

export async function getAppConfig(): Promise<any> {
  try {
    return await invoke("get_app_config");
  } catch (error) {
    console.error("Failed to get app config:", error);
    return {};
  }
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}
