mod env;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            env::get_env_var,
            env::get_app_config
        ])
        .setup(|app| {
            // Load environment variables from .env file
            #[cfg(debug_assertions)]
            {
                dotenv::dotenv().ok();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
