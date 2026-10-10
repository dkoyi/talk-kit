"""Build an optional local catalog. The web demo uses data/scenarios.json directly.
Run from any directory: python3 database/build_database.py [output.sqlite3]
Existing snapshots and review records are retained; this never overwrites them.
"""
import hashlib
import json
from pathlib import Path
import sqlite3
import sys

ROOT = Path(__file__).resolve().parents[1]

def build(destination):
    content = json.loads((ROOT / 'data/scenarios.json').read_text())
    engine = (ROOT / 'assets/engine.js').read_text()
    # Bind review snapshots to all questions, options, feedback, and weights.
    payload = json.dumps({'content': content, 'engineSource': engine}, sort_keys=True, ensure_ascii=False)
    digest = hashlib.sha256(payload.encode()).hexdigest()
    version_id = f"{content['contentVersion']}:{digest}"
    with sqlite3.connect(destination) as conn:
        conn.executescript((ROOT / 'database/schema.sql').read_text())
        conn.execute('INSERT OR IGNORE INTO content_versions(id,content_sha256,payload_json) VALUES (?,?,?)', (version_id, digest, payload))
        for scenario in content['scenarios']:
            conn.execute('INSERT OR IGNORE INTO scenarios VALUES (?,?,?,?,?,?)', (
                version_id, scenario['id'], scenario['categoryId'], scenario['name'], scenario['headline'], json.dumps(scenario, ensure_ascii=False)))
        assert not conn.execute('PRAGMA foreign_key_check').fetchall()
        total = conn.execute('SELECT COUNT(*) FROM scenarios WHERE version_id=?', (version_id,)).fetchone()[0]
    print(f'Catalog ready: {destination} ({total} situations in current version). No professional approvals are seeded.')
    return version_id

if __name__ == '__main__':
    build(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'database/catalog.sqlite3')
