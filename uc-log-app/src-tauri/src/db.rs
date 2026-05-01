use rusqlite::{Connection, Result};
use std::sync::Mutex;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_handle: &AppHandle) -> Result<Self> {
        let mut db_path = app_handle.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
        std::fs::create_dir_all(&db_path).ok();
        db_path.push("uc_log.db");

        let conn = Connection::open(db_path)?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.init_tables()?;
        Ok(db)
    }

    fn init_tables(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS stool_records (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                sequence_number INTEGER NOT NULL DEFAULT 1,
                bristol_type INTEGER NOT NULL,
                color TEXT NOT NULL,
                consistency TEXT NOT NULL,
                volume TEXT,
                blood_present INTEGER NOT NULL DEFAULT 0,
                blood_amount TEXT,
                blood_location TEXT,
                blood_color TEXT,
                mucus_present INTEGER NOT NULL DEFAULT 0,
                mucus_amount TEXT,
                mucus_color TEXT,
                urgency_level INTEGER,
                urgency_sudden INTEGER,
                pain_before_present INTEGER,
                pain_before_location TEXT,
                pain_before_intensity INTEGER,
                pain_after_present INTEGER,
                pain_after_location TEXT,
                pain_after_intensity INTEGER
            );

            CREATE TABLE IF NOT EXISTS diet_records (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                meal_type TEXT NOT NULL,
                notes TEXT
            );

            CREATE TABLE IF NOT EXISTS diet_items (
                id TEXT PRIMARY KEY,
                diet_record_id TEXT NOT NULL,
                food_name TEXT NOT NULL,
                category TEXT NOT NULL,
                amount_grams INTEGER NOT NULL,
                cooking_method TEXT NOT NULL,
                oil_added_ml INTEGER NOT NULL DEFAULT 0,
                is_new_food INTEGER NOT NULL DEFAULT 0,
                allergen_flag INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (diet_record_id) REFERENCES diet_records(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS symptom_records (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                abdominal_pain_present INTEGER NOT NULL DEFAULT 0,
                abdominal_pain_location TEXT,
                abdominal_pain_intensity INTEGER NOT NULL DEFAULT 0,
                abdominal_pain_character TEXT,
                abdominal_pain_duration INTEGER NOT NULL DEFAULT 0,
                abdominal_pain_relieved_by_bm INTEGER NOT NULL DEFAULT 0,
                tenesmus_present INTEGER NOT NULL DEFAULT 0,
                tenesmus_intensity INTEGER NOT NULL DEFAULT 0,
                bloating_present INTEGER NOT NULL DEFAULT 0,
                bloating_severity INTEGER NOT NULL DEFAULT 0,
                fever_present INTEGER NOT NULL DEFAULT 0,
                fever_temperature TEXT,
                joint_pain_present INTEGER NOT NULL DEFAULT 0,
                joint_pain_location TEXT,
                joint_pain_intensity INTEGER NOT NULL DEFAULT 0,
                skin_rash_present INTEGER NOT NULL DEFAULT 0,
                skin_rash_location TEXT,
                mouth_ulcers_present INTEGER NOT NULL DEFAULT 0,
                mouth_ulcers_count INTEGER NOT NULL DEFAULT 0,
                fatigue_level INTEGER NOT NULL DEFAULT 0,
                overall_wellbeing INTEGER NOT NULL DEFAULT 5
            );

            CREATE TABLE IF NOT EXISTS medication_records (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                suppository_lubrication_adequate INTEGER,
                suppository_retention_hours REAL NOT NULL DEFAULT 0,
                suppository_position_mins INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS medication_items (
                id TEXT PRIMARY KEY,
                medication_record_id TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                route TEXT NOT NULL,
                dose TEXT NOT NULL,
                scheduled_time TEXT NOT NULL,
                taken INTEGER NOT NULL DEFAULT 0,
                actual_time TEXT,
                missed_reason TEXT,
                side_effects TEXT,
                FOREIGN KEY (medication_record_id) REFERENCES medication_records(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS fc_records (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT NOT NULL DEFAULT 'µg/g',
                notes TEXT
            );

            CREATE TABLE IF NOT EXISTS ai_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                api_base_url TEXT NOT NULL,
                api_key TEXT NOT NULL,
                model_name TEXT NOT NULL,
                max_tokens INTEGER NOT NULL DEFAULT 4096,
                temperature REAL NOT NULL DEFAULT 0.7
            );

            CREATE TABLE IF NOT EXISTS food_library (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                default_cooking_method TEXT NOT NULL DEFAULT 'boiled',
                default_amount_grams INTEGER NOT NULL DEFAULT 100
            );

            CREATE TABLE IF NOT EXISTS medication_library (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                route TEXT NOT NULL DEFAULT 'oral',
                default_dose TEXT NOT NULL DEFAULT '',
                default_scheduled_time TEXT NOT NULL DEFAULT 'morning'
            );

            CREATE TABLE IF NOT EXISTS medication_plans (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                route TEXT NOT NULL DEFAULT 'oral',
                dose TEXT NOT NULL,
                scheduled_time TEXT NOT NULL DEFAULT 'morning',
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS report_history (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                report_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS personal_profile (
                id TEXT PRIMARY KEY DEFAULT 'default',
                name TEXT,
                gender TEXT,
                birth_date TEXT,
                height_cm REAL,
                weight_kg REAL,
                blood_type TEXT,
                diagnosis_date TEXT,
                disease_type TEXT,
                disease_location TEXT,
                disease_severity TEXT,
                allergies TEXT,
                surgical_history TEXT,
                family_history TEXT,
                emergency_contact TEXT,
                emergency_phone TEXT,
                doctor_name TEXT,
                doctor_phone TEXT,
                hospital TEXT,
                notes TEXT,
                updated_at TEXT
            );
        ")?;

        self.seed_library(&conn)?;

        Ok(())
    }

    fn seed_library(&self, conn: &Connection) -> Result<()> {
        // Seed food library
        let foods: Vec<(&str, &str, &str, i32)> = vec![
            ("白米饭", "grain", "boiled", 200),
            ("面条", "grain", "boiled", 200),
            ("馒头", "grain", "steamed", 100),
            ("面包", "grain", "baked", 80),
            ("燕麦粥", "grain", "boiled", 200),
            ("鸡蛋", "protein", "boiled", 60),
            ("鸡胸肉", "protein", "stir_fried", 150),
            ("猪肉", "protein", "stir_fried", 100),
            ("鱼肉", "protein", "steamed", 150),
            ("豆腐", "protein", "boiled", 150),
            ("西兰花", "vegetable", "boiled", 150),
            ("胡萝卜", "vegetable", "boiled", 100),
            ("土豆", "vegetable", "boiled", 150),
            ("南瓜", "vegetable", "steamed", 150),
            ("菠菜", "vegetable", "boiled", 100),
            ("苹果", "fruit", "raw", 200),
            ("香蕉", "fruit", "raw", 120),
            ("牛奶", "dairy", "raw", 250),
            ("酸奶", "dairy", "raw", 200),
            ("橄榄油", "fat", "raw", 10),
        ];
        for (name, cat, method, grams) in &foods {
            conn.execute(
                "INSERT OR IGNORE INTO food_library (id, name, category, default_cooking_method, default_amount_grams) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![format!("food_{}", name), name, cat, method, grams],
            )?;
        }

        // Seed medication library
        let meds: Vec<(&str, &str, &str, &str, &str)> = vec![
            ("美沙拉嗪肠溶片", "5ASA", "oral", "1g", "morning"),
            ("美沙拉嗪栓剂", "5ASA", "rectal_suppository", "1g", "bedtime"),
            ("美沙拉嗪灌肠液", "5ASA", "rectal_enema", "4g", "bedtime"),
            ("泼尼松", "steroid", "oral", "40mg", "morning"),
            ("布地奈德", "steroid", "oral", "9mg", "morning"),
            ("硫唑嘌呤", "immunomodulator", "oral", "50mg", "morning"),
            ("甲氨蝶呤", "immunomodulator", "oral", "15mg", "morning"),
            ("英夫利昔单抗", "biologic", "IV", "5mg/kg", "morning"),
            ("阿达木单抗", "biologic", "SC", "40mg", "morning"),
            ("维多珠单抗", "biologic", "IV", "300mg", "morning"),
            ("乌司奴单抗", "biologic", "IV", "体重计算", "morning"),
            ("托法替布", "JAKi", "oral", "5mg", "morning"),
            ("乌帕替尼", "JAKi", "oral", "15mg", "morning"),
            ("奥扎莫德", "S1Pi", "oral", "0.92mg", "morning"),
            ("双歧杆菌", "probiotic", "oral", "2粒", "morning"),
            ("乳果糖", "laxative", "oral", "15ml", "morning"),
        ];
        for (name, cat, route, dose, time) in &meds {
            conn.execute(
                "INSERT OR IGNORE INTO medication_library (id, name, category, route, default_dose, default_scheduled_time) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![format!("med_{}", name), name, cat, route, dose, time],
            )?;
        }

        Ok(())
    }
}
