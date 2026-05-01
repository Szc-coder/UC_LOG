use serde::{Deserialize, Serialize};
use tauri::command;
use tauri::State;
use uuid::Uuid;
use crate::db::Database;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MedicationItem {
    pub id: Option<String>,
    pub name: String,
    pub category: String,
    pub route: String,
    pub dose: String,
    pub scheduled_time: String,
    pub taken: bool,
    pub actual_time: Option<String>,
    pub missed_reason: Option<String>,
    pub side_effects: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MedicationRecord {
    pub id: Option<String>,
    pub timestamp: String,
    pub items: Vec<MedicationItem>,
    pub suppository_lubrication_adequate: Option<bool>,
    pub suppository_retention_hours: f64,
    pub suppository_position_mins: i32,
}

#[command]
pub async fn medication_create(record: MedicationRecord, db: State<'_, Database>) -> Result<MedicationRecord, String> {
    let id = record.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
    let conn = db.conn.lock().unwrap();

    conn.execute(
        "INSERT INTO medication_records (id, timestamp, suppository_lubrication_adequate, suppository_retention_hours, suppository_position_mins)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![
            id, record.timestamp, record.suppository_lubrication_adequate.map(|v| v as i32),
            record.suppository_retention_hours, record.suppository_position_mins
        ],
    ).map_err(|e| e.to_string())?;

    for item in &record.items {
        let item_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO medication_items (id, medication_record_id, name, category, route, dose, scheduled_time, taken, actual_time, missed_reason, side_effects)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            rusqlite::params![
                item_id, id, item.name, item.category, item.route, item.dose, item.scheduled_time,
                item.taken as i32, item.actual_time, item.missed_reason, item.side_effects
            ],
        ).map_err(|e| e.to_string())?;
    }

    let mut result = record;
    result.id = Some(id);
    Ok(result)
}

#[command]
pub async fn medication_list_by_date(date: String, db: State<'_, Database>) -> Result<Vec<MedicationRecord>, String> {
    let conn = db.conn.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT id, timestamp, suppository_lubrication_adequate, suppository_retention_hours, suppository_position_mins
         FROM medication_records WHERE date(timestamp) = ?1 ORDER BY timestamp"
    ).map_err(|e| e.to_string())?;

    let mut records: Vec<MedicationRecord> = Vec::new();
    let record_ids: Vec<String> = stmt.query_map(rusqlite::params![date], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, Option<i32>>(2)?,
            row.get::<_, f64>(3)?,
            row.get::<_, i32>(4)?,
        ))
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .map(|(id, ts, lub, ret, pos)| {
        records.push(MedicationRecord {
            id: Some(id.clone()),
            timestamp: ts,
            items: Vec::new(),
            suppository_lubrication_adequate: lub.map(|v| v != 0),
            suppository_retention_hours: ret,
            suppository_position_mins: pos,
        });
        id
    })
    .collect();

    for (i, record_id) in record_ids.iter().enumerate() {
        let mut item_stmt = conn.prepare(
            "SELECT id, name, category, route, dose, scheduled_time, taken, actual_time, missed_reason, side_effects
             FROM medication_items WHERE medication_record_id = ?1"
        ).map_err(|e| e.to_string())?;

        let items = item_stmt.query_map(rusqlite::params![record_id], |row| {
            Ok(MedicationItem {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                category: row.get(2)?,
                route: row.get(3)?,
                dose: row.get(4)?,
                scheduled_time: row.get(5)?,
                taken: row.get::<_, i32>(6)? != 0,
                actual_time: row.get(7)?,
                missed_reason: row.get(8)?,
                side_effects: row.get(9)?,
            })
        }).map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

        records[i].items = items;
    }

    Ok(records)
}

#[command]
pub async fn medication_update(id: String, record: MedicationRecord, db: State<'_, Database>) -> Result<MedicationRecord, String> {
    let conn = db.conn.lock().unwrap();

    conn.execute(
        "UPDATE medication_records SET timestamp=?1, suppository_lubrication_adequate=?2,
         suppository_retention_hours=?3, suppository_position_mins=?4 WHERE id=?5",
        rusqlite::params![
            record.timestamp, record.suppository_lubrication_adequate.map(|v| v as i32),
            record.suppository_retention_hours, record.suppository_position_mins, id
        ],
    ).map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM medication_items WHERE medication_record_id=?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;

    for item in &record.items {
        let item_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO medication_items (id, medication_record_id, name, category, route, dose, scheduled_time, taken, actual_time, missed_reason, side_effects)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            rusqlite::params![
                item_id, id, item.name, item.category, item.route, item.dose, item.scheduled_time,
                item.taken as i32, item.actual_time, item.missed_reason, item.side_effects
            ],
        ).map_err(|e| e.to_string())?;
    }

    let mut result = record;
    result.id = Some(id);
    Ok(result)
}

#[command]
pub async fn medication_delete(id: String, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    conn.execute("DELETE FROM medication_items WHERE medication_record_id=?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM medication_records WHERE id=?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ========== Medication Plan ==========

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MedicationPlan {
    pub id: String,
    pub name: String,
    pub category: String,
    pub route: String,
    pub dose: String,
    pub scheduled_time: String,
    pub active: bool,
    pub created_at: String,
}

#[command]
pub async fn medication_plan_list(db: State<'_, Database>) -> Result<Vec<MedicationPlan>, String> {
    let conn = db.conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, name, category, route, dose, scheduled_time, active, created_at FROM medication_plans ORDER BY scheduled_time, name"
    ).map_err(|e| e.to_string())?;

    let items = stmt.query_map([], |row| {
        Ok(MedicationPlan {
            id: row.get(0)?,
            name: row.get(1)?,
            category: row.get(2)?,
            route: row.get(3)?,
            dose: row.get(4)?,
            scheduled_time: row.get(5)?,
            active: row.get::<_, i32>(6)? != 0,
            created_at: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(items)
}

#[command]
pub async fn medication_plan_add(
    name: String,
    category: String,
    route: String,
    dose: String,
    scheduled_time: String,
    db: State<'_, Database>,
) -> Result<MedicationPlan, String> {
    let id = Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();
    let conn = db.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO medication_plans (id, name, category, route, dose, scheduled_time, active, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7)",
        rusqlite::params![id, name, category, route, dose, scheduled_time, created_at],
    ).map_err(|e| e.to_string())?;

    Ok(MedicationPlan { id, name, category, route, dose, scheduled_time, active: true, created_at })
}

#[command]
pub async fn medication_plan_update(
    id: String,
    name: String,
    category: String,
    route: String,
    dose: String,
    scheduled_time: String,
    active: bool,
    db: State<'_, Database>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    conn.execute(
        "UPDATE medication_plans SET name=?1, category=?2, route=?3, dose=?4, scheduled_time=?5, active=?6 WHERE id=?7",
        rusqlite::params![name, category, route, dose, scheduled_time, active as i32, id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn medication_plan_delete(id: String, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    conn.execute("DELETE FROM medication_plans WHERE id=?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuickTakeResult {
    pub record_id: String,
    pub item_id: String,
    pub taken: bool,
}

#[command]
pub async fn medication_quick_take(
    plan_id: String,
    date: String,
    taken: bool,
    db: State<'_, Database>,
) -> Result<QuickTakeResult, String> {
    let conn = db.conn.lock().unwrap();

    // Get plan details
    let plan: MedicationPlan = conn.query_row(
        "SELECT id, name, category, route, dose, scheduled_time, active, created_at FROM medication_plans WHERE id = ?1",
        rusqlite::params![plan_id],
        |row| Ok(MedicationPlan {
            id: row.get(0)?,
            name: row.get(1)?,
            category: row.get(2)?,
            route: row.get(3)?,
            dose: row.get(4)?,
            scheduled_time: row.get(5)?,
            active: row.get::<_, i32>(6)? != 0,
            created_at: row.get(7)?,
        }),
    ).map_err(|e| e.to_string())?;

    // Check if there's already a record for this date with an item matching this plan's medication
    let existing: Option<(String, String)> = conn.query_row(
        "SELECT r.id, i.id FROM medication_records r
         INNER JOIN medication_items i ON i.medication_record_id = r.id
         WHERE date(r.timestamp) = ?1 AND i.name = ?2 AND i.scheduled_time = ?3
         LIMIT 1",
        rusqlite::params![date, plan.name, plan.scheduled_time],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).ok();

    if let Some((record_id, item_id)) = existing {
        // Update existing item's taken status
        conn.execute(
            "UPDATE medication_items SET taken = ?1, actual_time = ?2 WHERE id = ?3",
            rusqlite::params![taken as i32, if taken { Some(chrono::Utc::now().to_rfc3339()) } else { None }, item_id],
        ).map_err(|e| e.to_string())?;

        Ok(QuickTakeResult { record_id, item_id, taken })
    } else {
        // Create a new medication record for this date
        let record_id = Uuid::new_v4().to_string();
        let timestamp = format!("{}T12:00:00Z", date);
        conn.execute(
            "INSERT INTO medication_records (id, timestamp, suppository_lubrication_adequate, suppository_retention_hours, suppository_position_mins)
             VALUES (?1, ?2, NULL, 0, 0)",
            rusqlite::params![record_id, timestamp],
        ).map_err(|e| e.to_string())?;

        let item_id = Uuid::new_v4().to_string();
        let actual_time = if taken { Some(chrono::Utc::now().to_rfc3339()) } else { None };
        conn.execute(
            "INSERT INTO medication_items (id, medication_record_id, name, category, route, dose, scheduled_time, taken, actual_time, missed_reason, side_effects)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL, NULL)",
            rusqlite::params![item_id, record_id, plan.name, plan.category, plan.route, plan.dose, plan.scheduled_time, taken as i32, actual_time],
        ).map_err(|e| e.to_string())?;

        Ok(QuickTakeResult { record_id, item_id, taken })
    }
}
