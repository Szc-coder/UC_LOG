use serde::{Deserialize, Serialize};
use tauri::command;
use tauri::State;
use uuid::Uuid;
use crate::db::Database;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DietItem {
    pub id: Option<String>,
    pub food_name: String,
    pub category: String,
    pub amount_grams: i32,
    pub cooking_method: String,
    pub oil_added_ml: i32,
    pub is_new_food: bool,
    pub allergen_flag: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DietRecord {
    pub id: Option<String>,
    pub timestamp: String,
    pub meal_type: String,
    pub items: Vec<DietItem>,
    pub notes: Option<String>,
}

#[command]
pub async fn diet_create(record: DietRecord, db: State<'_, Database>) -> Result<DietRecord, String> {
    let id = record.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
    let conn = db.conn.lock().unwrap();

    conn.execute(
        "INSERT INTO diet_records (id, timestamp, meal_type, notes) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![id, record.timestamp, record.meal_type, record.notes],
    ).map_err(|e| e.to_string())?;

    for item in &record.items {
        let item_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO diet_items (id, diet_record_id, food_name, category, amount_grams, cooking_method, oil_added_ml, is_new_food, allergen_flag)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![
                item_id, id, item.food_name, item.category, item.amount_grams, item.cooking_method,
                item.oil_added_ml, item.is_new_food as i32, item.allergen_flag as i32
            ],
        ).map_err(|e| e.to_string())?;
    }

    let mut result = record;
    result.id = Some(id);
    Ok(result)
}

#[command]
pub async fn diet_list_by_date(date: String, db: State<'_, Database>) -> Result<Vec<DietRecord>, String> {
    let conn = db.conn.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT id, timestamp, meal_type, notes FROM diet_records WHERE date(timestamp) = ?1 ORDER BY timestamp"
    ).map_err(|e| e.to_string())?;

    let mut records: Vec<DietRecord> = Vec::new();
    let record_ids: Vec<String> = stmt.query_map(rusqlite::params![date], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, Option<String>>(3)?))
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .map(|(id, ts, mt, notes)| {
        records.push(DietRecord {
            id: Some(id.clone()),
            timestamp: ts,
            meal_type: mt,
            items: Vec::new(),
            notes,
        });
        id
    })
    .collect();

    for (i, record_id) in record_ids.iter().enumerate() {
        let mut item_stmt = conn.prepare(
            "SELECT id, food_name, category, amount_grams, cooking_method, oil_added_ml, is_new_food, allergen_flag
             FROM diet_items WHERE diet_record_id = ?1"
        ).map_err(|e| e.to_string())?;

        let items = item_stmt.query_map(rusqlite::params![record_id], |row| {
            Ok(DietItem {
                id: Some(row.get(0)?),
                food_name: row.get(1)?,
                category: row.get(2)?,
                amount_grams: row.get(3)?,
                cooking_method: row.get(4)?,
                oil_added_ml: row.get(5)?,
                is_new_food: row.get::<_, i32>(6)? != 0,
                allergen_flag: row.get::<_, i32>(7)? != 0,
            })
        }).map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

        records[i].items = items;
    }

    Ok(records)
}

#[command]
pub async fn diet_update(id: String, record: DietRecord, db: State<'_, Database>) -> Result<DietRecord, String> {
    let conn = db.conn.lock().unwrap();

    conn.execute(
        "UPDATE diet_records SET timestamp=?1, meal_type=?2, notes=?3 WHERE id=?4",
        rusqlite::params![record.timestamp, record.meal_type, record.notes, id],
    ).map_err(|e| e.to_string())?;

    // Delete old items and insert new ones
    conn.execute("DELETE FROM diet_items WHERE diet_record_id=?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    for item in &record.items {
        let item_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO diet_items (id, diet_record_id, food_name, category, amount_grams, cooking_method, oil_added_ml, is_new_food, allergen_flag)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![
                item_id, id, item.food_name, item.category, item.amount_grams, item.cooking_method,
                item.oil_added_ml, item.is_new_food as i32, item.allergen_flag as i32
            ],
        ).map_err(|e| e.to_string())?;
    }

    let mut result = record;
    result.id = Some(id);
    Ok(result)
}

#[command]
pub async fn diet_delete(id: String, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    conn.execute("DELETE FROM diet_items WHERE diet_record_id=?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM diet_records WHERE id=?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
