use std::env;

#[tauri::command]
pub fn get_env_var(name: String) -> String {
    env::var(name).unwrap_or_default()
}

#[tauri::command]
pub fn get_app_config() -> serde_json::Value {
    serde_json::json!({
        "plex_server_url": env::var("PLEX_SERVER_URL").unwrap_or("http://localhost:32400".to_string()),
        "app_url": env::var("APP_URL").unwrap_or("http://localhost:3000".to_string())
    })
}
