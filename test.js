import Database from 'better-sqlite3';
const db = new Database(':memory:');
db.exec('CREATE TABLE notifications (id INTEGER PRIMARY KEY, user_id INTEGER, message TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
console.log(db.prepare('SELECT * FROM notifications WHERE user_id = ?').all('undefined'));
