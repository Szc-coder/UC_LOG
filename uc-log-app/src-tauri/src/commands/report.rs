use serde::Serialize;
use tauri::command;
use tauri::State;
use crate::db::Database;
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Serialize, Clone)]
pub struct ReportRecord {
    pub id: String,
    pub created_at: String,
    pub report_json: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct ReportSummary {
    pub id: String,
    pub created_at: String,
}

#[command]
pub async fn report_save(report_json: String, db: State<'_, Database>) -> Result<String, String> {
    let conn = db.conn.lock().unwrap();
    let id = Uuid::new_v4().to_string();
    let created_at = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();

    conn.execute(
        "INSERT INTO report_history (id, created_at, report_json) VALUES (?1, ?2, ?3)",
        rusqlite::params![id, created_at, report_json],
    ).map_err(|e| e.to_string())?;

    Ok(id)
}

#[command]
pub async fn report_list(db: State<'_, Database>) -> Result<Vec<ReportSummary>, String> {
    let conn = db.conn.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, created_at FROM report_history ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(ReportSummary {
                id: row.get(0)?,
                created_at: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| e.to_string())?);
    }
    Ok(results)
}

#[command]
pub async fn report_get(id: String, db: State<'_, Database>) -> Result<Option<ReportRecord>, String> {
    let conn = db.conn.lock().unwrap();
    let result = conn.query_row(
        "SELECT id, created_at, report_json FROM report_history WHERE id = ?1",
        rusqlite::params![id],
        |row| {
            Ok(ReportRecord {
                id: row.get(0)?,
                created_at: row.get(1)?,
                report_json: row.get(2)?,
            })
        },
    );

    match result {
        Ok(record) => Ok(Some(record)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[command]
pub async fn report_get_latest(db: State<'_, Database>) -> Result<Option<ReportRecord>, String> {
    let conn = db.conn.lock().unwrap();
    let result = conn.query_row(
        "SELECT id, created_at, report_json FROM report_history ORDER BY created_at DESC LIMIT 1",
        [],
        |row| {
            Ok(ReportRecord {
                id: row.get(0)?,
                created_at: row.get(1)?,
                report_json: row.get(2)?,
            })
        },
    );

    match result {
        Ok(record) => Ok(Some(record)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[command]
pub async fn report_delete(id: String, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    conn.execute(
        "DELETE FROM report_history WHERE id = ?1",
        rusqlite::params![id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
