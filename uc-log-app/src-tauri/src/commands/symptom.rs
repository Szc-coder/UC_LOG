use serde::{Deserialize, Serialize};
use tauri::command;
use tauri::State;
use uuid::Uuid;
use crate::db::Database;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SymptomRecord {
    pub id: Option<String>,
    pub timestamp: String,
    pub abdominal_pain_present: bool,
    pub abdominal_pain_location: Option<String>,
    pub abdominal_pain_intensity: i32,
    pub abdominal_pain_character: Option<String>,
    pub abdominal_pain_duration: i32,
    pub abdominal_pain_relieved_by_bm: bool,
    pub tenesmus_present: bool,
    pub tenesmus_intensity: i32,
    pub bloating_present: bool,
    pub bloating_severity: i32,
    pub fever_present: bool,
    pub fever_temperature: Option<String>,
    pub joint_pain_present: bool,
    pub joint_pain_location: Option<String>,
    pub joint_pain_intensity: i32,
    pub skin_rash_present: bool,
    pub skin_rash_location: Option<String>,
    pub mouth_ulcers_present: bool,
    pub mouth_ulcers_count: i32,
    pub fatigue_level: i32,
    pub overall_wellbeing: i32,
}

#[command]
pub async fn symptom_create(record: SymptomRecord, db: State<'_, Database>) -> Result<SymptomRecord, String> {
    let id = record.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
    let conn = db.conn.lock().unwrap();

    conn.execute(
        "INSERT INTO symptom_records (id, timestamp, abdominal_pain_present, abdominal_pain_location,
         abdominal_pain_intensity, abdominal_pain_character, abdominal_pain_duration, abdominal_pain_relieved_by_bm,
         tenesmus_present, tenesmus_intensity, bloating_present, bloating_severity, fever_present, fever_temperature,
         joint_pain_present, joint_pain_location, joint_pain_intensity, skin_rash_present, skin_rash_location,
         mouth_ulcers_present, mouth_ulcers_count, fatigue_level, overall_wellbeing)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23)",
        rusqlite::params![
            id, record.timestamp, record.abdominal_pain_present as i32, record.abdominal_pain_location,
            record.abdominal_pain_intensity, record.abdominal_pain_character, record.abdominal_pain_duration,
            record.abdominal_pain_relieved_by_bm as i32, record.tenesmus_present as i32, record.tenesmus_intensity,
            record.bloating_present as i32, record.bloating_severity, record.fever_present as i32,
            record.fever_temperature, record.joint_pain_present as i32, record.joint_pain_location,
            record.joint_pain_intensity, record.skin_rash_present as i32, record.skin_rash_location,
            record.mouth_ulcers_present as i32, record.mouth_ulcers_count, record.fatigue_level,
            record.overall_wellbeing
        ],
    ).map_err(|e| e.to_string())?;

    let mut result = record;
    result.id = Some(id);
    Ok(result)
}

#[command]
pub async fn symptom_list_by_date(date: String, db: State<'_, Database>) -> Result<Vec<SymptomRecord>, String> {
    let conn = db.conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, timestamp, abdominal_pain_present, abdominal_pain_location, abdominal_pain_intensity,
         abdominal_pain_character, abdominal_pain_duration, abdominal_pain_relieved_by_bm, tenesmus_present,
         tenesmus_intensity, bloating_present, bloating_severity, fever_present, fever_temperature,
         joint_pain_present, joint_pain_location, joint_pain_intensity, skin_rash_present, skin_rash_location,
         mouth_ulcers_present, mouth_ulcers_count, fatigue_level, overall_wellbeing
         FROM symptom_records WHERE date(timestamp) = ?1 ORDER BY timestamp"
    ).map_err(|e| e.to_string())?;

    let records = stmt.query_map(rusqlite::params![date], |row| {
        Ok(SymptomRecord {
            id: Some(row.get(0)?),
            timestamp: row.get(1)?,
            abdominal_pain_present: row.get::<_, i32>(2)? != 0,
            abdominal_pain_location: row.get(3)?,
            abdominal_pain_intensity: row.get(4)?,
            abdominal_pain_character: row.get(5)?,
            abdominal_pain_duration: row.get(6)?,
            abdominal_pain_relieved_by_bm: row.get::<_, i32>(7)? != 0,
            tenesmus_present: row.get::<_, i32>(8)? != 0,
            tenesmus_intensity: row.get(9)?,
            bloating_present: row.get::<_, i32>(10)? != 0,
            bloating_severity: row.get(11)?,
            fever_present: row.get::<_, i32>(12)? != 0,
            fever_temperature: row.get(13)?,
            joint_pain_present: row.get::<_, i32>(14)? != 0,
            joint_pain_location: row.get(15)?,
            joint_pain_intensity: row.get(16)?,
            skin_rash_present: row.get::<_, i32>(17)? != 0,
            skin_rash_location: row.get(18)?,
            mouth_ulcers_present: row.get::<_, i32>(19)? != 0,
            mouth_ulcers_count: row.get(20)?,
            fatigue_level: row.get(21)?,
            overall_wellbeing: row.get(22)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(records)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailySymptomSummary {
    pub date: String,
    pub record_count: i32,
    pub avg_wellbeing: Option<f64>,
    pub avg_fatigue: Option<f64>,
    pub pain_count: i32,
    pub tenesmus_count: i32,
    pub bloating_count: i32,
}

#[command]
pub async fn symptom_summary_range(start_date: String, end_date: String, db: State<'_, Database>) -> Result<Vec<DailySymptomSummary>, String> {
    let conn = db.conn.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT DISTINCT date(timestamp) as d FROM symptom_records WHERE date(timestamp) BETWEEN ?1 AND ?2 ORDER BY d"
    ).map_err(|e| e.to_string())?;

    let dates: Vec<String> = stmt.query_map(rusqlite::params![start_date, end_date], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut summaries = Vec::new();
    for date in dates {
        let record_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM symptom_records WHERE date(timestamp) = ?1",
            rusqlite::params![date], |row| row.get(0),
        ).unwrap_or(0);

        let avg_wellbeing: Option<f64> = conn.query_row(
            "SELECT AVG(CAST(overall_wellbeing AS REAL)) FROM symptom_records WHERE date(timestamp) = ?1",
            rusqlite::params![date], |row| row.get(0),
        ).ok();

        let avg_fatigue: Option<f64> = conn.query_row(
            "SELECT AVG(CAST(fatigue_level AS REAL)) FROM symptom_records WHERE date(timestamp) = ?1",
            rusqlite::params![date], |row| row.get(0),
        ).ok();

        let pain_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM symptom_records WHERE date(timestamp) = ?1 AND abdominal_pain_present = 1",
            rusqlite::params![date], |row| row.get(0),
        ).unwrap_or(0);

        let tenesmus_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM symptom_records WHERE date(timestamp) = ?1 AND tenesmus_present = 1",
            rusqlite::params![date], |row| row.get(0),
        ).unwrap_or(0);

        let bloating_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM symptom_records WHERE date(timestamp) = ?1 AND bloating_present = 1",
            rusqlite::params![date], |row| row.get(0),
        ).unwrap_or(0);

        summaries.push(DailySymptomSummary {
            date,
            record_count,
            avg_wellbeing,
            avg_fatigue,
            pain_count,
            tenesmus_count,
            bloating_count,
        });
    }

    Ok(summaries)
}

#[command]
pub async fn symptom_update(id: String, record: SymptomRecord, db: State<'_, Database>) -> Result<SymptomRecord, String> {
    let conn = db.conn.lock().unwrap();

    conn.execute(
        "UPDATE symptom_records SET timestamp=?1, abdominal_pain_present=?2, abdominal_pain_location=?3,
         abdominal_pain_intensity=?4, abdominal_pain_character=?5, abdominal_pain_duration=?6,
         abdominal_pain_relieved_by_bm=?7, tenesmus_present=?8, tenesmus_intensity=?9, bloating_present=?10,
         bloating_severity=?11, fever_present=?12, fever_temperature=?13, joint_pain_present=?14,
         joint_pain_location=?15, joint_pain_intensity=?16, skin_rash_present=?17, skin_rash_location=?18,
         mouth_ulcers_present=?19, mouth_ulcers_count=?20, fatigue_level=?21, overall_wellbeing=?22 WHERE id=?23",
        rusqlite::params![
            record.timestamp, record.abdominal_pain_present as i32, record.abdominal_pain_location,
            record.abdominal_pain_intensity, record.abdominal_pain_character, record.abdominal_pain_duration,
            record.abdominal_pain_relieved_by_bm as i32, record.tenesmus_present as i32, record.tenesmus_intensity,
            record.bloating_present as i32, record.bloating_severity, record.fever_present as i32,
            record.fever_temperature, record.joint_pain_present as i32, record.joint_pain_location,
            record.joint_pain_intensity, record.skin_rash_present as i32, record.skin_rash_location,
            record.mouth_ulcers_present as i32, record.mouth_ulcers_count, record.fatigue_level,
            record.overall_wellbeing, id
        ],
    ).map_err(|e| e.to_string())?;

    let mut result = record;
    result.id = Some(id);
    Ok(result)
}

#[command]
pub async fn symptom_delete(id: String, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    conn.execute("DELETE FROM symptom_records WHERE id=?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
