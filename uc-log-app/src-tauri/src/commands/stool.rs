use serde::{Deserialize, Serialize};
use tauri::command;
use tauri::State;
use uuid::Uuid;
use crate::db::Database;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoolRecord {
    pub id: Option<String>,
    pub timestamp: String,
    pub sequence_number: i32,
    pub bristol_type: i32,
    pub color: String,
    pub consistency: String,
    pub volume: Option<String>,
    pub blood_present: bool,
    pub blood_amount: Option<String>,
    pub blood_location: Option<String>,
    pub blood_color: Option<String>,
    pub mucus_present: bool,
    pub mucus_amount: Option<String>,
    pub mucus_color: Option<String>,
    pub urgency_level: Option<i32>,
    pub urgency_sudden: Option<bool>,
    pub pain_before_present: Option<bool>,
    pub pain_before_location: Option<String>,
    pub pain_before_intensity: Option<i32>,
    pub pain_after_present: Option<bool>,
    pub pain_after_location: Option<String>,
    pub pain_after_intensity: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailyStoolSummary {
    pub date: String,
    pub total_count: i32,
    pub nighttime_count: i32,
    pub b1_count: i32,
    pub b2_count: i32,
    pub b3_count: i32,
    pub b4_count: i32,
    pub b5_count: i32,
    pub b6_count: i32,
    pub b7_count: i32,
    pub blood_occurrences: i32,
    pub max_blood_amount: Option<String>,
    pub mucus_occurrences: i32,
    pub urgency_avg: Option<f64>,
    pub pain_episodes: i32,
}

#[command]
pub async fn stool_create(record: StoolRecord, db: State<'_, Database>) -> Result<StoolRecord, String> {
    let id = record.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
    let conn = db.conn.lock().unwrap();

    conn.execute(
        "INSERT INTO stool_records (id, timestamp, sequence_number, bristol_type, color, consistency, volume,
         blood_present, blood_amount, blood_location, blood_color, mucus_present, mucus_amount, mucus_color,
         urgency_level, urgency_sudden, pain_before_present, pain_before_location, pain_before_intensity,
         pain_after_present, pain_after_location, pain_after_intensity)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)",
        rusqlite::params![
            id, record.timestamp, record.sequence_number, record.bristol_type, record.color, record.consistency,
            record.volume, record.blood_present as i32, record.blood_amount, record.blood_location, record.blood_color,
            record.mucus_present as i32, record.mucus_amount, record.mucus_color, record.urgency_level,
            record.urgency_sudden.map(|v| v as i32), record.pain_before_present.map(|v| v as i32),
            record.pain_before_location, record.pain_before_intensity, record.pain_after_present.map(|v| v as i32),
            record.pain_after_location, record.pain_after_intensity
        ],
    ).map_err(|e| e.to_string())?;

    let mut result = record;
    result.id = Some(id);
    Ok(result)
}

#[command]
pub async fn stool_list_by_date(date: String, db: State<'_, Database>) -> Result<Vec<StoolRecord>, String> {
    let conn = db.conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, timestamp, sequence_number, bristol_type, color, consistency, volume,
         blood_present, blood_amount, blood_location, blood_color, mucus_present, mucus_amount, mucus_color,
         urgency_level, urgency_sudden, pain_before_present, pain_before_location, pain_before_intensity,
         pain_after_present, pain_after_location, pain_after_intensity
         FROM stool_records WHERE date(timestamp) = ?1 ORDER BY timestamp"
    ).map_err(|e| e.to_string())?;

    let records = stmt.query_map(rusqlite::params![date], |row| {
        Ok(StoolRecord {
            id: Some(row.get(0)?),
            timestamp: row.get(1)?,
            sequence_number: row.get(2)?,
            bristol_type: row.get(3)?,
            color: row.get(4)?,
            consistency: row.get(5)?,
            volume: row.get(6)?,
            blood_present: row.get::<_, i32>(7)? != 0,
            blood_amount: row.get(8)?,
            blood_location: row.get(9)?,
            blood_color: row.get(10)?,
            mucus_present: row.get::<_, i32>(11)? != 0,
            mucus_amount: row.get(12)?,
            mucus_color: row.get(13)?,
            urgency_level: row.get(14)?,
            urgency_sudden: row.get::<_, Option<i32>>(15)?.map(|v| v != 0),
            pain_before_present: row.get::<_, Option<i32>>(16)?.map(|v| v != 0),
            pain_before_location: row.get(17)?,
            pain_before_intensity: row.get(18)?,
            pain_after_present: row.get::<_, Option<i32>>(19)?.map(|v| v != 0),
            pain_after_location: row.get(20)?,
            pain_after_intensity: row.get(21)?,
        })
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(records)
}

#[command]
pub async fn stool_daily_summary(date: String, db: State<'_, Database>) -> Result<DailyStoolSummary, String> {
    let conn = db.conn.lock().unwrap();

    let total_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM stool_records WHERE date(timestamp) = ?1",
        rusqlite::params![date],
        |row| row.get(0),
    ).unwrap_or(0);

    let bristol_counts: Vec<i32> = (1..=7).map(|b| {
        conn.query_row(
            "SELECT COUNT(*) FROM stool_records WHERE date(timestamp) = ?1 AND bristol_type = ?2",
            rusqlite::params![date, b],
            |row| row.get(0),
        ).unwrap_or(0)
    }).collect();

    let blood_occurrences: i32 = conn.query_row(
        "SELECT COUNT(*) FROM stool_records WHERE date(timestamp) = ?1 AND blood_present = 1",
        rusqlite::params![date],
        |row| row.get(0),
    ).unwrap_or(0);

    let mucus_occurrences: i32 = conn.query_row(
        "SELECT COUNT(*) FROM stool_records WHERE date(timestamp) = ?1 AND mucus_present = 1",
        rusqlite::params![date],
        |row| row.get(0),
    ).unwrap_or(0);

    let urgency_avg: Option<f64> = conn.query_row(
        "SELECT AVG(CAST(urgency_level AS REAL)) FROM stool_records WHERE date(timestamp) = ?1 AND urgency_level IS NOT NULL",
        rusqlite::params![date],
        |row| row.get(0),
    ).ok();

    let pain_episodes: i32 = conn.query_row(
        "SELECT COUNT(*) FROM stool_records WHERE date(timestamp) = ?1 AND (pain_before_intensity > 0 OR pain_after_intensity > 0)",
        rusqlite::params![date],
        |row| row.get(0),
    ).unwrap_or(0);

    Ok(DailyStoolSummary {
        date,
        total_count,
        nighttime_count: 0,
        b1_count: bristol_counts[0],
        b2_count: bristol_counts[1],
        b3_count: bristol_counts[2],
        b4_count: bristol_counts[3],
        b5_count: bristol_counts[4],
        b6_count: bristol_counts[5],
        b7_count: bristol_counts[6],
        blood_occurrences,
        max_blood_amount: None,
        mucus_occurrences,
        urgency_avg,
        pain_episodes,
    })
}

#[command]
pub async fn stool_summary_range(start_date: String, end_date: String, db: State<'_, Database>) -> Result<Vec<DailyStoolSummary>, String> {
    let conn = db.conn.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT DISTINCT date(timestamp) as d FROM stool_records WHERE date(timestamp) BETWEEN ?1 AND ?2 ORDER BY d"
    ).map_err(|e| e.to_string())?;

    let dates: Vec<String> = stmt.query_map(rusqlite::params![start_date, end_date], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut summaries = Vec::new();
    for date in dates {
        let total_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM stool_records WHERE date(timestamp) = ?1",
            rusqlite::params![date], |row| row.get(0),
        ).unwrap_or(0);

        let bristol_counts: Vec<i32> = (1..=7).map(|b| {
            conn.query_row(
                "SELECT COUNT(*) FROM stool_records WHERE date(timestamp) = ?1 AND bristol_type = ?2",
                rusqlite::params![date, b], |row| row.get(0),
            ).unwrap_or(0)
        }).collect();

        let blood_occurrences: i32 = conn.query_row(
            "SELECT COUNT(*) FROM stool_records WHERE date(timestamp) = ?1 AND blood_present = 1",
            rusqlite::params![date], |row| row.get(0),
        ).unwrap_or(0);

        let mucus_occurrences: i32 = conn.query_row(
            "SELECT COUNT(*) FROM stool_records WHERE date(timestamp) = ?1 AND mucus_present = 1",
            rusqlite::params![date], |row| row.get(0),
        ).unwrap_or(0);

        let urgency_avg: Option<f64> = conn.query_row(
            "SELECT AVG(CAST(urgency_level AS REAL)) FROM stool_records WHERE date(timestamp) = ?1 AND urgency_level IS NOT NULL",
            rusqlite::params![date], |row| row.get(0),
        ).ok();

        let pain_episodes: i32 = conn.query_row(
            "SELECT COUNT(*) FROM stool_records WHERE date(timestamp) = ?1 AND (pain_before_intensity > 0 OR pain_after_intensity > 0)",
            rusqlite::params![date], |row| row.get(0),
        ).unwrap_or(0);

        summaries.push(DailyStoolSummary {
            date,
            total_count,
            nighttime_count: 0,
            b1_count: bristol_counts[0],
            b2_count: bristol_counts[1],
            b3_count: bristol_counts[2],
            b4_count: bristol_counts[3],
            b5_count: bristol_counts[4],
            b6_count: bristol_counts[5],
            b7_count: bristol_counts[6],
            blood_occurrences,
            max_blood_amount: None,
            mucus_occurrences,
            urgency_avg,
            pain_episodes,
        });
    }

    Ok(summaries)
}

#[command]
pub async fn stool_update(id: String, record: StoolRecord, db: State<'_, Database>) -> Result<StoolRecord, String> {
    let conn = db.conn.lock().unwrap();

    conn.execute(
        "UPDATE stool_records SET timestamp=?1, sequence_number=?2, bristol_type=?3, color=?4, consistency=?5,
         volume=?6, blood_present=?7, blood_amount=?8, blood_location=?9, blood_color=?10, mucus_present=?11,
         mucus_amount=?12, mucus_color=?13, urgency_level=?14, urgency_sudden=?15, pain_before_present=?16,
         pain_before_location=?17, pain_before_intensity=?18, pain_after_present=?19, pain_after_location=?20,
         pain_after_intensity=?21 WHERE id=?22",
        rusqlite::params![
            record.timestamp, record.sequence_number, record.bristol_type, record.color, record.consistency,
            record.volume, record.blood_present as i32, record.blood_amount, record.blood_location, record.blood_color,
            record.mucus_present as i32, record.mucus_amount, record.mucus_color, record.urgency_level,
            record.urgency_sudden.map(|v| v as i32), record.pain_before_present.map(|v| v as i32),
            record.pain_before_location, record.pain_before_intensity, record.pain_after_present.map(|v| v as i32),
            record.pain_after_location, record.pain_after_intensity, id
        ],
    ).map_err(|e| e.to_string())?;

    let mut result = record;
    result.id = Some(id);
    Ok(result)
}

#[command]
pub async fn stool_delete(id: String, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    conn.execute("DELETE FROM stool_records WHERE id=?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
