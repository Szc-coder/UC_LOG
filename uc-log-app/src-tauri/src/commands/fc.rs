use serde::{Deserialize, Serialize};
use tauri::command;
use tauri::State;
use uuid::Uuid;
use crate::db::Database;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FCRecord {
    pub id: Option<String>,
    pub date: String,
    pub value: f64,
    pub unit: String,
    pub notes: Option<String>,
}

#[command]
pub async fn fc_create(record: FCRecord, db: State<'_, Database>) -> Result<FCRecord, String> {
    let id = record.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
    let conn = db.conn.lock().unwrap();

    conn.execute(
        "INSERT INTO fc_records (id, date, value, unit, notes) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, record.date, record.value, record.unit, record.notes],
    ).map_err(|e| e.to_string())?;

    let mut result = record;
    result.id = Some(id);
    Ok(result)
}

#[command]
pub async fn fc_list_all(db: State<'_, Database>) -> Result<Vec<FCRecord>, String> {
    let conn = db.conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, date, value, unit, notes FROM fc_records ORDER BY date"
    ).map_err(|e| e.to_string())?;

    let records = stmt.query_map([], |row| {
        Ok(FCRecord {
            id: Some(row.get(0)?),
            date: row.get(1)?,
            value: row.get(2)?,
            unit: row.get(3)?,
            notes: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(records)
}

#[command]
pub async fn fc_update(id: String, record: FCRecord, db: State<'_, Database>) -> Result<FCRecord, String> {
    let conn = db.conn.lock().unwrap();

    conn.execute(
        "UPDATE fc_records SET date=?1, value=?2, unit=?3, notes=?4 WHERE id=?5",
        rusqlite::params![record.date, record.value, record.unit, record.notes, id],
    ).map_err(|e| e.to_string())?;

    let mut result = record;
    result.id = Some(id);
    Ok(result)
}

#[command]
pub async fn fc_delete(id: String, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    conn.execute("DELETE FROM fc_records WHERE id=?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
