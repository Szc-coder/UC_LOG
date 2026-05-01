use serde::{Deserialize, Serialize};
use tauri::command;
use tauri::State;
use crate::db::Database;
use chrono::Local;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PersonalProfile {
    pub id: String,
    pub name: Option<String>,
    pub gender: Option<String>,
    pub birth_date: Option<String>,
    pub height_cm: Option<f64>,
    pub weight_kg: Option<f64>,
    pub blood_type: Option<String>,
    pub diagnosis_date: Option<String>,
    pub disease_type: Option<String>,
    pub disease_location: Option<String>,
    pub disease_severity: Option<String>,
    pub allergies: Option<String>,
    pub surgical_history: Option<String>,
    pub family_history: Option<String>,
    pub emergency_contact: Option<String>,
    pub emergency_phone: Option<String>,
    pub doctor_name: Option<String>,
    pub doctor_phone: Option<String>,
    pub hospital: Option<String>,
    pub notes: Option<String>,
    pub updated_at: Option<String>,
}

#[command]
pub async fn profile_get(db: State<'_, Database>) -> Result<Option<PersonalProfile>, String> {
    let conn = db.conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, name, gender, birth_date, height_cm, weight_kg, blood_type, diagnosis_date, disease_type, disease_location, disease_severity, allergies, surgical_history, family_history, emergency_contact, emergency_phone, doctor_name, doctor_phone, hospital, notes, updated_at FROM personal_profile WHERE id='default'"
    ).map_err(|e| e.to_string())?;

    let mut rows = stmt.query_map([], |row| {
        Ok(PersonalProfile {
            id: row.get(0)?,
            name: row.get(1)?,
            gender: row.get(2)?,
            birth_date: row.get(3)?,
            height_cm: row.get(4)?,
            weight_kg: row.get(5)?,
            blood_type: row.get(6)?,
            diagnosis_date: row.get(7)?,
            disease_type: row.get(8)?,
            disease_location: row.get(9)?,
            disease_severity: row.get(10)?,
            allergies: row.get(11)?,
            surgical_history: row.get(12)?,
            family_history: row.get(13)?,
            emergency_contact: row.get(14)?,
            emergency_phone: row.get(15)?,
            doctor_name: row.get(16)?,
            doctor_phone: row.get(17)?,
            hospital: row.get(18)?,
            notes: row.get(19)?,
            updated_at: row.get(20)?,
        })
    }).map_err(|e| e.to_string())?;

    match rows.next() {
        Some(Ok(profile)) => Ok(Some(profile)),
        _ => Ok(None),
    }
}

#[command]
pub async fn profile_save(profile: PersonalProfile, db: State<'_, Database>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    let now = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();

    conn.execute(
        "INSERT OR REPLACE INTO personal_profile (id, name, gender, birth_date, height_cm, weight_kg, blood_type, diagnosis_date, disease_type, disease_location, disease_severity, allergies, surgical_history, family_history, emergency_contact, emergency_phone, doctor_name, doctor_phone, hospital, notes, updated_at) VALUES ('default', ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)",
        rusqlite::params![
            profile.name, profile.gender, profile.birth_date,
            profile.height_cm, profile.weight_kg, profile.blood_type,
            profile.diagnosis_date, profile.disease_type, profile.disease_location,
            profile.disease_severity, profile.allergies, profile.surgical_history,
            profile.family_history, profile.emergency_contact, profile.emergency_phone,
            profile.doctor_name, profile.doctor_phone, profile.hospital,
            profile.notes, now,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}
