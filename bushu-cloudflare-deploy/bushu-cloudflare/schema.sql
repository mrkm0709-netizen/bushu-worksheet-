CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  student_class TEXT NOT NULL,
  student_number INTEGER NOT NULL,
  student_name TEXT NOT NULL,
  step1_json TEXT,
  step2_json TEXT,
  step3_json TEXT,
  step1_submitted_at TEXT,
  step2_submitted_at TEXT,
  step3_submitted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(student_class, student_number)
);
CREATE INDEX IF NOT EXISTS idx_submissions_class_number
  ON submissions(student_class, student_number);
