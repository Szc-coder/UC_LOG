use serde::{Deserialize, Serialize};
use tauri::command;
use tauri::State;
use crate::db::Database;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIConfig {
    pub api_base_url: String,
    pub api_key: String,
    pub model_name: String,
    pub max_tokens: i32,
    pub temperature: f64,
}

#[command]
pub async fn ai_config_get(db: State<'_, Database>) -> Result<Option<AIConfig>, String> {
    let conn = db.conn.lock().unwrap();

    let result = conn.query_row(
        "SELECT api_base_url, api_key, model_name, max_tokens, temperature FROM ai_config WHERE id = 1",
        [],
        |row| {
            Ok(AIConfig {
                api_base_url: row.get(0)?,
                api_key: row.get(1)?,
                model_name: row.get(2)?,
                max_tokens: row.get(3)?,
                temperature: row.get(4)?,
            })
        },
    );

    match result {
        Ok(config) => Ok(Some(config)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[command]
pub async fn ai_config_save(config: AIConfig, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();

    conn.execute(
        "INSERT OR REPLACE INTO ai_config (id, api_base_url, api_key, model_name, max_tokens, temperature)
         VALUES (1, ?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![config.api_base_url, config.api_key, config.model_name, config.max_tokens, config.temperature],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[command]
pub async fn ai_config_test(config: AIConfig) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/chat/completions", config.api_base_url.trim_end_matches('/'));

    let body = serde_json::json!({
        "model": config.model_name,
        "messages": [{"role": "user", "content": "Hello, respond with just 'OK'"}],
        "max_tokens": 10,
    });

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if response.status().is_success() {
        Ok("连接成功".to_string())
    } else {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        Err(format!("请求失败 ({}): {}", status, text))
    }
}
