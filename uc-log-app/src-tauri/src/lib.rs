mod commands;
mod db;

use commands::stool::*;
use commands::diet::*;
use commands::symptom::*;
use commands::medication::*;
use commands::fc::*;
use commands::ai_config::*;
use commands::library::*;
use commands::profile::*;
use commands::report::*;
use db::Database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Initialize database
      let db = Database::new(app.handle()).expect("Failed to initialize database");
      app.manage(db);

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      stool_create,
      stool_list_by_date,
      stool_daily_summary,
      stool_summary_range,
      stool_update,
      stool_delete,
      diet_create,
      diet_list_by_date,
      diet_update,
      diet_delete,
      symptom_create,
      symptom_list_by_date,
      symptom_summary_range,
      symptom_update,
      symptom_delete,
      medication_create,
      medication_list_by_date,
      medication_update,
      medication_delete,
      medication_plan_list,
      medication_plan_add,
      medication_plan_update,
      medication_plan_delete,
      medication_quick_take,
      fc_create,
      fc_list_all,
      fc_update,
      fc_delete,
      ai_config_get,
      ai_config_save,
      ai_config_test,
      food_library_list,
      food_library_add,
      food_library_delete,
      medication_library_list,
      medication_library_add,
      medication_library_delete,
      clear_all_data,
      export_all_json,
      export_all_csv,
      save_file,
      seed_sample_data,
      profile_get,
      profile_save,
      report_save,
      report_list,
      report_get,
      report_get_latest,
      report_delete,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
