import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Database
const dbPath = path.join(process.cwd(), 'feedback.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    location TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reviewee_id INTEGER NOT NULL,
    reviewer_name TEXT NOT NULL,
    reviewer_relationship TEXT NOT NULL,
    date TEXT NOT NULL,
    scores TEXT NOT NULL,
    notes TEXT NOT NULL,
    open_ended_1 TEXT,
    open_ended_2 TEXT,
    open_ended_3 TEXT,
    open_ended_4 TEXT,
    overall_assessment INTEGER,
    is_archived INTEGER DEFAULT 0,
    FOREIGN KEY (reviewee_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS feedback_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER NOT NULL,
    reviewer_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users (id),
    FOREIGN KEY (reviewer_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS pulse_surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    role TEXT,
    tenure TEXT,
    scores TEXT NOT NULL,
    open_ended_1 TEXT,
    open_ended_2 TEXT,
    open_ended_3 TEXT,
    open_ended_4 TEXT,
    enps_score INTEGER
  );

  CREATE TABLE IF NOT EXISTS anonymous_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER NOT NULL,
    deadline DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS shower_thoughts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content TEXT NOT NULL,
    is_anonymous INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );
`);

try {
  db.exec(`ALTER TABLE users ADD COLUMN pin TEXT NOT NULL DEFAULT '1234'`);
  db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`);
} catch (e) {
  // Ignore if columns already exist
}

try {
  db.exec(`ALTER TABLE feedback ADD COLUMN is_archived INTEGER DEFAULT 0`);
} catch (e) {
  // Ignore if column already exists
}

try {
  db.exec(`ALTER TABLE feedback_requests ADD COLUMN campaign_id INTEGER REFERENCES anonymous_campaigns(id)`);
} catch (e) {
  // Ignore if column already exists
}

try {
  db.exec(`ALTER TABLE feedback ADD COLUMN campaign_id INTEGER REFERENCES anonymous_campaigns(id)`);
} catch (e) {
  // Ignore if column already exists
}

// Seed data
const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
if (userCount === 0) {
  const insertUser = db.prepare('INSERT INTO users (name, role, location, pin, is_admin) VALUES (?, ?, ?, ?, ?)');
  insertUser.run('Admin User', 'System Admin', 'HQ', '0000', 1);
  insertUser.run('Alice Smith', 'Head Baker', 'London - Soho', '1111', 0);
  insertUser.run('Bob Jones', 'Barista', 'London - Soho', '2222', 0);
  insertUser.run('Charlie Brown', 'Store Manager', 'London - Soho', '3333', 0);
  insertUser.run('Diana Prince', 'Team Member', 'London - Soho', '4444', 0);
}

// Ensure Tristen Bayley exists and is locked as admin
const tristenExists = (db.prepare('SELECT COUNT(*) as count FROM users WHERE name = ?').get('Tristen Bayley') as any).count;
if (tristenExists === 0) {
  const insertUser = db.prepare('INSERT INTO users (name, role, location, pin, is_admin) VALUES (?, ?, ?, ?, ?)');
  insertUser.run('Tristen Bayley', 'Bakery Manager', 'HQ', '0000', 1);
} else {
  db.prepare('UPDATE users SET is_admin = 1 WHERE name = ?').run('Tristen Bayley');
}

// API Routes
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT id, name, role, location, is_admin FROM users').all();
  res.json(users);
});

app.get('/api/admin/users', (req, res) => {
  const users = db.prepare('SELECT id, name, role, location, pin, is_admin FROM users').all();
  res.json(users);
});

app.post('/api/login', (req, res) => {
  const { id, pin } = req.body;
  const user = db.prepare('SELECT id, name, role, location, is_admin FROM users WHERE id = ? AND pin = ?').get(id, pin);
  if (user) {
    res.json(user);
  } else {
    res.status(401).json({ error: 'Invalid PIN' });
  }
});

app.post('/api/users', (req, res) => {
  const { name, role, location, pin, is_admin } = req.body;
  try {
    const insert = db.prepare('INSERT INTO users (name, role, location, pin, is_admin) VALUES (?, ?, ?, ?, ?)');
    const result = insert.run(name, role, location, pin || '1234', is_admin ? 1 : 0);
    res.status(201).json({ id: result.lastInsertRowid, name, role, location, is_admin });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ error: 'Failed to add user' });
  }
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  try {
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(id) as any;
    if (user && user.name === 'Tristen Bayley') {
      return res.status(403).json({ error: 'Cannot delete the project owner' });
    }
    
    // Also delete associated feedback
    db.prepare('DELETE FROM feedback WHERE reviewee_id = ?').run(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.patch('/api/users/:id/admin', (req, res) => {
  const { id } = req.params;
  const { is_admin } = req.body;
  try {
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(id) as any;
    if (user && user.name === 'Tristen Bayley') {
      return res.status(403).json({ error: 'Cannot change admin status of the project owner' });
    }
    
    db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(is_admin ? 1 : 0, id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating admin status:', error);
    res.status(500).json({ error: 'Failed to update admin status' });
  }
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, role, location, pin } = req.body;
  try {
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(id) as any;
    if (user && user.name === 'Tristen Bayley' && name !== 'Tristen Bayley') {
      // Allow editing other fields but maybe not the name to prevent locking out? 
      // Actually user said "Let admins see and edit: names, job roles and, location and PINS"
      // I'll allow it but keep the locked admin status.
    }
    
    db.prepare('UPDATE users SET name = ?, role = ?, location = ?, pin = ? WHERE id = ?')
      .run(name, role, location, pin, id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.post('/api/anonymous-campaigns', (req, res) => {
  const { requester_id, deadline } = req.body;
  try {
    const insertCampaign = db.prepare('INSERT INTO anonymous_campaigns (requester_id, deadline) VALUES (?, ?)');
    const campaignResult = insertCampaign.run(requester_id, deadline);
    const campaignId = campaignResult.lastInsertRowid;

    // Get all other users
    const users = db.prepare('SELECT id FROM users WHERE id != ?').all(requester_id) as any[];
    
    const insertRequest = db.prepare('INSERT INTO feedback_requests (requester_id, reviewer_id, campaign_id) VALUES (?, ?, ?)');
    const insertNotification = db.prepare('INSERT INTO notifications (user_id, message, link) VALUES (?, ?, ?)');
    
    const requester = db.prepare('SELECT name FROM users WHERE id = ?').get(requester_id) as any;
    
    const transaction = db.transaction((users) => {
      for (const user of users) {
        const result = insertRequest.run(requester_id, user.id, campaignId);
        if (requester) {
          insertNotification.run(
            user.id,
            `${requester.name} has requested anonymous 360 feedback from you.`,
            `/give-feedback?requestId=${result.lastInsertRowid}`
          );
        }
      }
    });
    
    transaction(users);

    res.status(201).json({ success: true, campaignId });
  } catch (error) {
    console.error('Error creating anonymous campaign:', error);
    res.status(500).json({ error: 'Failed to create anonymous campaign' });
  }
});

app.get('/api/anonymous-campaigns/:requesterId', (req, res) => {
  const { requesterId } = req.params;
  try {
    const campaigns = db.prepare(`
      SELECT ac.*, 
             (SELECT COUNT(*) FROM feedback_requests fr WHERE fr.campaign_id = ac.id) as total_requests,
             (SELECT COUNT(*) FROM feedback_requests fr WHERE fr.campaign_id = ac.id AND fr.status = 'completed') as completed_requests
      FROM anonymous_campaigns ac
      WHERE ac.requester_id = ?
      ORDER BY ac.created_at DESC
    `).all(requesterId);
    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

app.post('/api/feedback-requests', (req, res) => {
  const { requester_id, reviewer_id } = req.body;
  try {
    const existing = db.prepare('SELECT id FROM feedback_requests WHERE requester_id = ? AND reviewer_id = ? AND status = ?').get(requester_id, reviewer_id, 'pending');
    if (existing) {
      return res.status(400).json({ error: 'A pending request already exists for this user.' });
    }
    const insert = db.prepare('INSERT INTO feedback_requests (requester_id, reviewer_id) VALUES (?, ?)');
    const result = insert.run(requester_id, reviewer_id);
    
    // Add notification
    const requester = db.prepare('SELECT name FROM users WHERE id = ?').get(requester_id) as any;
    if (requester) {
      db.prepare('INSERT INTO notifications (user_id, message, link) VALUES (?, ?, ?)').run(
        reviewer_id,
        `${requester.name} has requested feedback from you.`,
        `/give-feedback?requestId=${result.lastInsertRowid}`
      );
    }

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

app.get('/api/feedback-requests/pending/:reviewerId', (req, res) => {
  const { reviewerId } = req.params;
  try {
    const requests = db.prepare(`
      SELECT fr.*, u.name as requester_name, u.role as requester_role
      FROM feedback_requests fr
      JOIN users u ON fr.requester_id = u.id
      WHERE fr.reviewer_id = ? AND fr.status = 'pending'
    `).all(reviewerId);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

app.get('/api/feedback-requests/sent/:requesterId', (req, res) => {
  const { requesterId } = req.params;
  try {
    const requests = db.prepare(`
      SELECT fr.*, u.name as reviewer_name, u.role as reviewer_role
      FROM feedback_requests fr
      JOIN users u ON fr.reviewer_id = u.id
      WHERE fr.requester_id = ? AND fr.status = 'pending'
    `).all(requesterId);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sent requests' });
  }
});

app.delete('/api/feedback-requests/:id', (req, res) => {
  const { id } = req.params;
  try {
    // Also delete the notification associated with this request
    db.prepare('DELETE FROM notifications WHERE link = ?').run(`/give-feedback?requestId=${id}`);
    db.prepare('DELETE FROM feedback_requests WHERE id = ?').run(id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

app.get('/api/feedback-requests/:id', (req, res) => {
  const { id } = req.params;
  try {
    const request = db.prepare(`
      SELECT fr.*, u.name as requester_name, u.role as requester_role
      FROM feedback_requests fr
      JOIN users u ON fr.requester_id = u.id
      WHERE fr.id = ?
    `).get(id);
    if (request) res.json(request);
    else res.status(404).json({ error: 'Request not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

app.post('/api/feedback', (req, res) => {
  const {
    reviewee_id,
    reviewer_name,
    reviewer_relationship,
    date,
    scores,
    notes,
    open_ended_1,
    open_ended_2,
    open_ended_3,
    open_ended_4,
    overall_assessment,
    request_id
  } = req.body;

  try {
    let campaign_id = null;
    let final_reviewer_name = reviewer_name;
    let final_reviewer_relationship = reviewer_relationship;

    if (request_id) {
      const request = db.prepare('SELECT campaign_id FROM feedback_requests WHERE id = ?').get(request_id) as any;
      if (request && request.campaign_id) {
        campaign_id = request.campaign_id;
        final_reviewer_name = 'Anonymous';
        final_reviewer_relationship = 'Anonymous';
      }
    }

    const insert = db.prepare(`
      INSERT INTO feedback (
        reviewee_id, reviewer_name, reviewer_relationship, date,
        scores, notes, open_ended_1, open_ended_2, open_ended_3, open_ended_4, overall_assessment, campaign_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insert.run(
      reviewee_id,
      final_reviewer_name,
      final_reviewer_relationship,
      date,
      JSON.stringify(scores),
      JSON.stringify(notes),
      open_ended_1,
      open_ended_2,
      open_ended_3,
      open_ended_4,
      overall_assessment,
      campaign_id
    );

    if (request_id) {
      db.prepare('UPDATE feedback_requests SET status = ? WHERE id = ?').run('completed', request_id);
    }
    
    // Add notification
    db.prepare('INSERT INTO notifications (user_id, message, link) VALUES (?, ?, ?)').run(
      reviewee_id,
      `${final_reviewer_name} has completed their feedback for you.`,
      `/dashboard`
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

app.get('/api/feedback-all', (req, res) => {
  try {
    const feedback = db.prepare(`
      SELECT f.* 
      FROM feedback f
      LEFT JOIN anonymous_campaigns ac ON f.campaign_id = ac.id
      WHERE f.campaign_id IS NULL OR ac.deadline < date('now')
    `).all();
    const parsedFeedback = feedback.map((f: any) => ({
      ...f,
      scores: JSON.parse(f.scores),
      notes: JSON.parse(f.notes)
    }));
    res.json(parsedFeedback);
  } catch (error) {
    console.error('Error fetching all feedback:', error);
    res.status(500).json({ error: 'Failed to fetch all feedback' });
  }
});

app.get('/api/feedback/:revieweeId', (req, res) => {
  const { revieweeId } = req.params;
  const feedback = db.prepare(`
    SELECT f.* 
    FROM feedback f
    LEFT JOIN anonymous_campaigns ac ON f.campaign_id = ac.id
    WHERE f.reviewee_id = ? AND (f.campaign_id IS NULL OR ac.deadline < date('now'))
  `).all(revieweeId);
  
  // Parse JSON fields
  const parsedFeedback = feedback.map((f: any) => ({
    ...f,
    scores: JSON.parse(f.scores),
    notes: JSON.parse(f.notes)
  }));
  
  res.json(parsedFeedback);
});

app.delete('/api/feedback/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM feedback WHERE id = ?').run(id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

app.patch('/api/feedback/:id/archive', (req, res) => {
  const { id } = req.params;
  const { is_archived } = req.body;
  try {
    db.prepare('UPDATE feedback SET is_archived = ? WHERE id = ?').run(is_archived ? 1 : 0, id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error archiving feedback:', error);
    res.status(500).json({ error: 'Failed to archive feedback' });
  }
});

app.patch('/api/anonymous-campaigns/:id/end', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare("UPDATE anonymous_campaigns SET deadline = date('now', '-1 day') WHERE id = ?").run(id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error ending campaign:', error);
    res.status(500).json({ error: 'Failed to end campaign' });
  }
});

app.post('/api/pulse-surveys', (req, res) => {
  const {
    date,
    role,
    tenure,
    scores,
    open_ended_1,
    open_ended_2,
    open_ended_3,
    open_ended_4,
    enps_score
  } = req.body;

  try {
    const insert = db.prepare(`
      INSERT INTO pulse_surveys (
        date, role, tenure, scores, open_ended_1, open_ended_2, open_ended_3, open_ended_4, enps_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insert.run(
      date,
      role,
      tenure,
      JSON.stringify(scores),
      open_ended_1,
      open_ended_2,
      open_ended_3,
      open_ended_4,
      enps_score
    );
    
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error saving pulse survey:', error);
    res.status(500).json({ error: 'Failed to save pulse survey' });
  }
});

app.get('/api/pulse-surveys', (req, res) => {
  try {
    const surveys = db.prepare('SELECT * FROM pulse_surveys').all();
    const parsedSurveys = surveys.map((s: any) => ({
      ...s,
      scores: JSON.parse(s.scores)
    }));
    res.json(parsedSurveys);
  } catch (error) {
    console.error('Error fetching pulse surveys:', error);
    res.status(500).json({ error: 'Failed to fetch pulse surveys' });
  }
});

app.post('/api/shower-thoughts', (req, res) => {
  const { user_id, content, is_anonymous } = req.body;
  try {
    const insert = db.prepare(`
      INSERT INTO shower_thoughts (user_id, content, is_anonymous)
      VALUES (?, ?, ?)
    `);
    insert.run(user_id, content, is_anonymous ? 1 : 0);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error saving shower thought:', error);
    res.status(500).json({ error: 'Failed to save shower thought' });
  }
});

app.get('/api/shower-thoughts', (req, res) => {
  try {
    const thoughts = db.prepare(`
      SELECT st.*, u.name as user_name 
      FROM shower_thoughts st
      LEFT JOIN users u ON st.user_id = u.id
      ORDER BY st.created_at DESC
    `).all();
    res.json(thoughts);
  } catch (error) {
    console.error('Error fetching shower thoughts:', error);
    res.status(500).json({ error: 'Failed to fetch shower thoughts' });
  }
});

app.get('/api/notifications/:userId', (req, res) => {
  const { userId } = req.params;
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.patch('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

app.patch('/api/notifications/read-all/:userId', (req, res) => {
  const { userId } = req.params;
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
