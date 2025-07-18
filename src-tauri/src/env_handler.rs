use serde_json::Value;
use std::env;

#[tauri::command]
pub fn get_env_var(name: String) -> String {
    env::var(&name).unwrap_or_default()
}

#[tauri::command]
pub fn get_app_config() -> Value {
    serde_json::json!({
        "plex_server_url": env::var("PLEX_SERVER_URL").unwrap_or("http://localhost:32400".to_string()),
        "app_url": env::var("APP_URL").unwrap_or("http://localhost:3000".to_string()),
        "openrouter_available": !env::var("OPENROUTER_API_KEY").unwrap_or_default().is_empty(),
        "lastfm_available": !env::var("LASTFM_API_KEY").unwrap_or_default().is_empty()
    })
}
