use serde_json::Value;
use std::path::PathBuf;
use tauri::api::path;

#[tauri::command]
pub fn save_secure_data(key: String, value: Value) -> Result<(), String> {
    let app_dir =
        path::app_data_dir(&tauri::Config::default()).ok_or("Failed to get app data directory")?;

    let file_path = app_dir.join(format!("{}.json", key));
    let json_string = serde_json::to_string_pretty(&value)
        .map_err(|e| format!("Failed to serialize data: {}", e))?;

    std::fs::write(file_path, json_string).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn load_secure_data(key: String) -> Result<Value, String> {
    let app_dir =
        path::app_data_dir(&tauri::Config::default()).ok_or("Failed to get app data directory")?;

    let file_path = app_dir.join(format!("{}.json", key));

    if !file_path.exists() {
        return Ok(Value::Null);
    }

    let content =
        std::fs::read_to_string(file_path).map_err(|e| format!("Failed to read file: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {}", e))
}

#[tauri::command]
pub fn remove_secure_data(key: String) -> Result<(), String> {
    let app_dir =
        path::app_data_dir(&tauri::Config::default()).ok_or("Failed to get app data directory")?;

    let file_path = app_dir.join(format!("{}.json", key));

    if file_path.exists() {
        std::fs::remove_file(file_path).map_err(|e| format!("Failed to remove file: {}", e))?;
    }

    Ok(())
}
