use serde::{Deserialize, Serialize};
use tauri::command;
use tauri::State;
use uuid::Uuid;
use crate::db::Database;
use std::fs;
use chrono::{Local, Duration as ChronoDuration};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FoodLibraryItem {
    pub id: String,
    pub name: String,
    pub category: String,
    pub default_cooking_method: String,
    pub default_amount_grams: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MedicationLibraryItem {
    pub id: String,
    pub name: String,
    pub category: String,
    pub route: String,
    pub default_dose: String,
    pub default_scheduled_time: String,
}

#[command]
pub async fn food_library_list(db: State<'_, Database>) -> Result<Vec<FoodLibraryItem>, String> {
    let conn = db.conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, name, category, default_cooking_method, default_amount_grams FROM food_library ORDER BY category, name"
    ).map_err(|e| e.to_string())?;

    let items = stmt.query_map([], |row| {
        Ok(FoodLibraryItem {
            id: row.get(0)?,
            name: row.get(1)?,
            category: row.get(2)?,
            default_cooking_method: row.get(3)?,
            default_amount_grams: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(items)
}

#[command]
pub async fn food_library_add(
    name: String,
    category: String,
    default_cooking_method: String,
    default_amount_grams: i32,
    db: State<'_, Database>,
) -> Result<FoodLibraryItem, String> {
    let id = format!("food_{}", Uuid::new_v4());
    let conn = db.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO food_library (id, name, category, default_cooking_method, default_amount_grams) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, name, category, default_cooking_method, default_amount_grams],
    ).map_err(|e| e.to_string())?;

    Ok(FoodLibraryItem { id, name, category, default_cooking_method, default_amount_grams })
}

#[command]
pub async fn food_library_delete(id: String, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    conn.execute("DELETE FROM food_library WHERE id=?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn medication_library_list(db: State<'_, Database>) -> Result<Vec<MedicationLibraryItem>, String> {
    let conn = db.conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, name, category, route, default_dose, default_scheduled_time FROM medication_library ORDER BY category, name"
    ).map_err(|e| e.to_string())?;

    let items = stmt.query_map([], |row| {
        Ok(MedicationLibraryItem {
            id: row.get(0)?,
            name: row.get(1)?,
            category: row.get(2)?,
            route: row.get(3)?,
            default_dose: row.get(4)?,
            default_scheduled_time: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(items)
}

#[command]
pub async fn medication_library_add(
    name: String,
    category: String,
    route: String,
    default_dose: String,
    default_scheduled_time: String,
    db: State<'_, Database>,
) -> Result<MedicationLibraryItem, String> {
    let id = format!("med_{}", Uuid::new_v4());
    let conn = db.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO medication_library (id, name, category, route, default_dose, default_scheduled_time) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, name, category, route, default_dose, default_scheduled_time],
    ).map_err(|e| e.to_string())?;

    Ok(MedicationLibraryItem { id, name, category, route, default_dose, default_scheduled_time })
}

#[command]
pub async fn medication_library_delete(id: String, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    conn.execute("DELETE FROM medication_library WHERE id=?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn clear_all_data(db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    conn.execute("DELETE FROM diet_items", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM diet_records", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM medication_items", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM medication_records", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM symptom_records", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM stool_records", []).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM fc_records", []).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn export_all_json(db: State<'_, Database>) -> Result<String, String> {
    let conn = db.conn.lock().unwrap();

    let export = |table: &str| -> Result<Vec<serde_json::Value>, String> {
        let mut stmt = conn.prepare(&format!("SELECT * FROM {}", table)).map_err(|e| e.to_string())?;
        let columns: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
        let rows = stmt.query_map([], |row| {
            let mut map = serde_json::Map::new();
            for (i, col) in columns.iter().enumerate() {
                let val: serde_json::Value = match row.get_ref(i).unwrap() {
                    rusqlite::types::ValueRef::Null => serde_json::Value::Null,
                    rusqlite::types::ValueRef::Integer(n) => serde_json::Value::Number(n.into()),
                    rusqlite::types::ValueRef::Real(f) => serde_json::json!(f),
                    rusqlite::types::ValueRef::Text(t) => serde_json::Value::String(String::from_utf8_lossy(t).to_string()),
                    rusqlite::types::ValueRef::Blob(_) => serde_json::Value::String("[blob]".to_string()),
                };
                map.insert(col.clone(), val);
            }
            Ok(serde_json::Value::Object(map))
        }).map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
        Ok(rows)
    };

    let mut result = serde_json::Map::new();
    for table in &["stool_records", "diet_records", "diet_items", "symptom_records", "medication_records", "medication_items", "medication_plans", "fc_records", "food_library", "medication_library"] {
        match export(table) {
            Ok(data) => { result.insert(table.to_string(), serde_json::Value::Array(data)); },
            Err(_) => { result.insert(table.to_string(), serde_json::Value::Array(vec![])); },
        }
    }

    serde_json::to_string_pretty(&result).map_err(|e| e.to_string())
}

#[command]
pub async fn export_all_csv(db: State<'_, Database>) -> Result<String, String> {
    let conn = db.conn.lock().unwrap();
    let mut output = String::new();

    for table in &["stool_records", "diet_records", "diet_items", "symptom_records", "medication_records", "medication_items", "medication_plans", "fc_records", "food_library", "medication_library"] {
        let mut stmt = conn.prepare(&format!("SELECT * FROM {}", table)).map_err(|e| e.to_string())?;
        let columns: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();

        output.push_str(&format!("\n## {}\n", table));
        output.push_str(&columns.join(","));
        output.push('\n');

        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
        while let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let vals: Vec<String> = (0..columns.len()).map(|i| {
                match row.get_ref(i).unwrap() {
                    rusqlite::types::ValueRef::Null => String::new(),
                    rusqlite::types::ValueRef::Integer(n) => n.to_string(),
                    rusqlite::types::ValueRef::Real(f) => f.to_string(),
                    rusqlite::types::ValueRef::Text(t) => {
                        let s = String::from_utf8_lossy(t).to_string();
                        if s.contains(',') || s.contains('"') || s.contains('\n') {
                            format!("\"{}\"", s.replace('"', "\"\""))
                        } else { s }
                    },
                    rusqlite::types::ValueRef::Blob(_) => "[blob]".to_string(),
                }
            }).collect();
            output.push_str(&vals.join(","));
            output.push('\n');
        }
    }

    Ok(output)
}

#[command]
pub async fn save_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[command]
pub async fn seed_sample_data(db: State<'_, Database>) -> Result<String, String> {
    let conn = db.conn.lock().unwrap();
    let today = Local::now().date_naive();

    // Phase pattern: days 30-21 = flare, 20-11 = improving, 10-0 = near remission
    let phase = |d: i64| -> i32 {
        if d >= 21 { 0 }      // flare (worst)
        else if d >= 11 { 1 } // improving
        else { 2 }            // near remission (best)
    };

    for day_offset in 0..30 {
        let date = today - ChronoDuration::days(day_offset);
        let p = phase(day_offset);
        let hash = ((day_offset * 7 + 3) % 11) as usize; // pseudo-random

        // === STOOL RECORDS ===
        let stool_count = match p { 0 => 3 + (hash % 2) as i64, 1 => 2 + (hash % 2) as i64, _ => 1 + (hash % 2) as i64 };
        for seq in 0..stool_count {
            let id = format!("s_{}", Uuid::new_v4());
            let bristol = match p {
                0 => [5, 6, 6, 7, 5][hash % 5],
                1 => [4, 5, 5, 4, 6][hash % 5],
                _ => [3, 4, 4, 4, 5][hash % 5],
            };
            let color = if p == 0 && seq == 0 { "red" } else if p == 1 && hash % 4 == 0 { "dark_brown" } else { "brown" };
            let consistency = match p { 0 => "mushy", 1 => "soft", _ => "formed" };
            let blood = p == 0 || (p == 1 && hash % 5 == 0);
            let mucus = p == 0 && hash % 3 == 0;
            let urgency = match p { 0 => 6 + (hash % 4) as i32, 1 => 3 + (hash % 4) as i32, _ => 1 + (hash % 3) as i32 };
            let pain_before = p == 0 || (p == 1 && hash % 3 == 0);
            let pain_intensity = if pain_before { p * 2 + (hash % 3) as i32 } else { 0 };
            let hour = 7 + (seq * 4) as i32;
            let ts = format!("{}T{:02}:{:02}:00Z", date, hour, 10 + hash);
            conn.execute(
                "INSERT OR IGNORE INTO stool_records (id,timestamp,sequence_number,bristol_type,color,consistency,volume,blood_present,blood_amount,blood_location,blood_color,mucus_present,mucus_amount,mucus_color,urgency_level,urgency_sudden,pain_before_present,pain_before_location,pain_before_intensity,pain_after_present,pain_after_location,pain_after_intensity) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22)",
                rusqlite::params![
                    id, ts, (seq+1) as i32, bristol, color, consistency, "medium",
                    blood, if blood { "trace" } else { "none" }, None::<String>, None::<String>,
                    mucus, if mucus { "small" } else { "none" }, None::<String>,
                    urgency, p == 0,
                    pain_before, None::<String>, pain_intensity,
                    false, None::<String>, 0i32
                ],
            ).map_err(|e| e.to_string())?;
        }

        // === DIET RECORDS ===
        // Meals vary by phase: flare has trigger foods, remission has safe foods
        let breakfast: Vec<(&str, &str, i32, &str)> = vec![("白粥", "grain", 300, "boiled"), ("鸡蛋", "protein", 50, "boiled")];
        let lunch_safe: Vec<(&str, &str, i32, &str)> = vec![("白米饭", "grain", 200, "boiled"), ("鸡胸肉", "protein", 80, "steamed"), ("南瓜", "vegetable", 150, "steamed")];
        let lunch_flare: Vec<(&str, &str, i32, &str)> = vec![("白米饭", "grain", 150, "boiled"), ("猪肉", "protein", 100, "stir_fried"), ("芹菜", "vegetable", 80, "stir_fried")];
        let dinner_safe: Vec<(&str, &str, i32, &str)> = vec![("面条", "grain", 200, "boiled"), ("鱼肉", "protein", 100, "steamed"), ("胡萝卜", "vegetable", 100, "boiled")];
        let dinner_flare: Vec<(&str, &str, i32, &str)> = vec![("面条", "grain", 150, "boiled"), ("猪肉", "protein", 80, "stir_fried"), ("韭菜", "vegetable", 60, "stir_fried")];
        let snack_safe: Vec<(&str, &str, i32, &str)> = vec![("酸奶", "dairy", 150, "raw"), ("香蕉", "fruit", 80, "raw")];
        let snack_flare: Vec<(&str, &str, i32, &str)> = vec![("酸奶", "dairy", 200, "raw"), ("香蕉", "fruit", 120, "raw")];

        let meals: Vec<(&str, Vec<(&str, &str, i32, &str)>)> = vec![
            ("breakfast", breakfast),
            ("lunch", if p == 0 || (p == 1 && hash % 3 == 0) { lunch_flare } else { lunch_safe }),
            ("dinner", if p == 0 || (p == 1 && hash % 4 == 0) { dinner_flare } else { dinner_safe }),
            ("snack", if p <= 1 && hash % 2 == 0 { snack_flare } else { snack_safe }),
        ];

        for (meal_type, items) in &meals {
            // Skip snack some days
            if *meal_type == "snack" && hash % 3 == 0 { continue; }
            let record_id = format!("d_{}", Uuid::new_v4());
            let hour = match *meal_type { "breakfast" => 8, "lunch" => 12, "dinner" => 18, "snack" => 15, _ => 12 };
            let ts = format!("{}T{:02}:00:00Z", date, hour);
            conn.execute(
                "INSERT OR IGNORE INTO diet_records (id, timestamp, meal_type, notes) VALUES (?1,?2,?3,?4)",
                rusqlite::params![record_id, ts, meal_type, None::<String>],
            ).map_err(|e| e.to_string())?;

            for (food_name, category, amount, cooking) in items {
                let item_id = format!("di_{}", Uuid::new_v4());
                conn.execute(
                    "INSERT OR IGNORE INTO diet_items (id, diet_record_id, food_name, category, amount_grams, cooking_method, oil_added_ml, is_new_food, allergen_flag) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
                    rusqlite::params![item_id, record_id, food_name, category, amount, cooking, 0, false, false],
                ).map_err(|e| e.to_string())?;
            }
        }

        // === SYMPTOM RECORDS ===
        let id = format!("sy_{}", Uuid::new_v4());
        let ts = format!("{}T20:00:00Z", date);
        let pain = p == 0 || (p == 1 && hash % 3 == 0);
        let pain_intensity: i32 = if pain { match p { 0 => 5 + (hash % 4) as i32, 1 => 2 + (hash % 3) as i32, _ => 0 } } else { 0 };
        let tenesmus = p == 0 || (p == 1 && hash % 4 == 0);
        let tenesmus_intensity: i32 = if tenesmus { match p { 0 => 4 + (hash % 4) as i32, 1 => 2, _ => 0 } } else { 0 };
        let bloating = p == 0 && hash % 2 == 0;
        let fatigue: i32 = match p { 0 => 6 + (hash % 3) as i32, 1 => 4 + (hash % 3) as i32, _ => 2 + (hash % 2) as i32 };
        let wellbeing: i32 = match p { 0 => 3 + (hash % 3) as i32, 1 => 5 + (hash % 3) as i32, _ => 7 + (hash % 3) as i32 };
        conn.execute(
            "INSERT OR IGNORE INTO symptom_records (id,timestamp,abdominal_pain_present,abdominal_pain_location,abdominal_pain_intensity,abdominal_pain_character,abdominal_pain_duration,abdominal_pain_relieved_by_bm,tenesmus_present,tenesmus_intensity,bloating_present,bloating_severity,fever_present,fever_temperature,joint_pain_present,joint_pain_location,joint_pain_intensity,skin_rash_present,skin_rash_location,mouth_ulcers_present,mouth_ulcers_count,fatigue_level,overall_wellbeing) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23)",
            rusqlite::params![
                id, ts, pain, None::<String>, pain_intensity, None::<String>, 0i32, false,
                tenesmus, tenesmus_intensity, bloating, if bloating { 3i32 } else { 0i32 },
                false, None::<String>, false, None::<String>, 0i32,
                false, None::<String>, false, 0i32, fatigue, wellbeing
            ],
        ).map_err(|e| e.to_string())?;
    }

    // === MEDICATION RECORDS ===
    let mut stmt = conn.prepare("SELECT id, name, scheduled_time FROM medication_plans WHERE active=1").map_err(|e| e.to_string())?;
    let plans: Vec<(String, String, String)> = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    drop(stmt);

    if !plans.is_empty() {
        for day_offset in 0..30 {
            let date = today - ChronoDuration::days(day_offset);
            let record_id = format!("m_{}", Uuid::new_v4());
            let ts = format!("{}T08:00:00Z", date);
            conn.execute(
                "INSERT OR IGNORE INTO medication_records (id, timestamp, suppository_lubrication_adequate, suppository_retention_hours, suppository_position_mins) VALUES (?1,?2,NULL,0,0)",
                rusqlite::params![record_id, ts],
            ).map_err(|e| e.to_string())?;
            for (_, name, scheduled_time) in &plans {
                let item_id = format!("mi_{}", Uuid::new_v4());
                let taken = day_offset == 0 || ((day_offset * 3 + 1) % 5 != 0); // ~80% adherence
                conn.execute(
                    "INSERT OR IGNORE INTO medication_items (id, medication_record_id, name, category, route, dose, scheduled_time, taken, actual_time, missed_reason, side_effects) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,NULL,NULL)",
                    rusqlite::params![item_id, record_id, name, "", "oral", "", scheduled_time, taken as i32, if taken { Some(ts.clone()) } else { None::<String> }],
                ).map_err(|e| e.to_string())?;
            }
        }
    }

    Ok("已添加30天示例数据（含饮食、排便、症状、用药记录）".to_string())
}
