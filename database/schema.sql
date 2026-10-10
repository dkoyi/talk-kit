-- SQLite catalog and future professional-review records. No parent sessions.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS content_versions (
  id TEXT PRIMARY KEY,
  content_sha256 TEXT NOT NULL UNIQUE CHECK(length(content_sha256)=64),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json))
);
CREATE TABLE IF NOT EXISTS scenarios (
  version_id TEXT NOT NULL REFERENCES content_versions(id),
  id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  character_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  PRIMARY KEY(version_id,id)
);
CREATE TABLE IF NOT EXISTS professionals (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  profession TEXT NOT NULL CHECK(profession IN ('psychologist','therapist')),
  jurisdiction TEXT NOT NULL,
  licensing_board TEXT NOT NULL,
  license_identifier TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending','verified','expired','revoked')),
  verified_at TEXT,
  valid_until TEXT,
  verification_evidence_url TEXT,
  verified_by TEXT,
  CHECK(verification_status <> 'verified' OR
    (verified_at IS NOT NULL AND valid_until IS NOT NULL AND verification_evidence_url IS NOT NULL AND verified_by IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  professional_id TEXT NOT NULL REFERENCES professionals(id),
  decision TEXT NOT NULL CHECK(decision IN ('changes_requested','approved')),
  scope TEXT NOT NULL,
  notes TEXT NOT NULL,
  reviewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  recheck_by TEXT NOT NULL,
  FOREIGN KEY(version_id,scenario_id) REFERENCES scenarios(version_id,id),
  UNIQUE(version_id,scenario_id,professional_id)
);
CREATE TRIGGER IF NOT EXISTS immutable_version_update BEFORE UPDATE ON content_versions
BEGIN SELECT RAISE(ABORT,'Create a new version for content changes'); END;
CREATE TRIGGER IF NOT EXISTS immutable_version_delete BEFORE DELETE ON content_versions
BEGIN SELECT RAISE(ABORT,'Content versions are retained for review history'); END;
CREATE TRIGGER IF NOT EXISTS immutable_scenario_update BEFORE UPDATE ON scenarios
BEGIN SELECT RAISE(ABORT,'Create a new version for scenario changes'); END;
CREATE TRIGGER IF NOT EXISTS immutable_scenario_delete BEFORE DELETE ON scenarios
BEGIN SELECT RAISE(ABORT,'Scenario versions are retained for review history'); END;
CREATE TRIGGER IF NOT EXISTS verify_review_insert BEFORE INSERT ON reviews
WHEN NEW.decision='approved' AND NOT EXISTS (
  SELECT 1 FROM professionals WHERE id=NEW.professional_id AND verification_status='verified'
    AND julianday(verified_at)<=julianday('now') AND julianday(valid_until)>julianday('now')
    AND julianday(NEW.recheck_by)>julianday('now')
)
BEGIN SELECT RAISE(ABORT,'Approval requires current verified credentials and a future re-review date'); END;
CREATE TRIGGER IF NOT EXISTS immutable_review_update BEFORE UPDATE ON reviews
BEGIN SELECT RAISE(ABORT,'Review records are immutable'); END;
CREATE TRIGGER IF NOT EXISTS immutable_review_delete BEFORE DELETE ON reviews
BEGIN SELECT RAISE(ABORT,'Review records are retained for history'); END;
CREATE VIEW IF NOT EXISTS current_approvals AS
SELECT r.*,p.display_name,p.profession,p.jurisdiction,p.licensing_board
FROM reviews r JOIN professionals p ON p.id=r.professional_id
WHERE r.decision='approved' AND p.verification_status='verified'
 AND julianday(p.verified_at)<=julianday('now') AND julianday(p.valid_until)>julianday('now')
 AND julianday(r.recheck_by)>julianday('now');
