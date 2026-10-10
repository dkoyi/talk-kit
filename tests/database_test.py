import importlib.util
from pathlib import Path
import sqlite3
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('builder', ROOT / 'database/build_database.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / 'catalog.sqlite3'
        self.version = builder.build(self.path)
        self.db = sqlite3.connect(self.path)
        self.db.execute('PRAGMA foreign_keys=ON')
    def tearDown(self):
        self.db.close()
        self.temp.cleanup()
    def test_repeated_build_retains_single_snapshot(self):
        builder.build(self.path)
        self.assertEqual(self.db.execute('SELECT count(*) FROM scenarios').fetchone()[0], 12)
        self.assertEqual(self.db.execute('SELECT count(*) FROM content_versions').fetchone()[0], 1)
        self.assertEqual(self.db.execute('SELECT count(*) FROM professionals').fetchone()[0], 0)
    def test_content_is_immutable(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE scenarios SET headline='changed'")
    def test_approval_needs_verified_current_credentials(self):
        self.db.execute("INSERT INTO professionals(id,display_name,profession,jurisdiction,licensing_board,license_identifier) VALUES ('test','Test only','psychologist','Test','Test board','TEST-NOT-A-LICENSE')")
        review = ('test-review', self.version, 'maya-contact', 'test', 'approved', 'Test only', 'Test record', '2999-01-01')
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute('INSERT INTO reviews(id,version_id,scenario_id,professional_id,decision,scope,notes,recheck_by) VALUES (?,?,?,?,?,?,?,?)', review)
        self.db.execute("UPDATE professionals SET verification_status='verified', verified_at='2020-01-01',valid_until='2999-01-01',verification_evidence_url='https://example.org/test-only',verified_by='test-only' WHERE id='test'")
        self.db.execute('INSERT INTO reviews(id,version_id,scenario_id,professional_id,decision,scope,notes,recheck_by) VALUES (?,?,?,?,?,?,?,?)', review)
        self.assertEqual(self.db.execute('SELECT count(*) FROM current_approvals').fetchone()[0], 1)
        self.db.execute("UPDATE professionals SET verification_status='revoked' WHERE id='test'")
        self.assertEqual(self.db.execute('SELECT count(*) FROM current_approvals').fetchone()[0], 0)

if __name__ == '__main__':
    unittest.main()
