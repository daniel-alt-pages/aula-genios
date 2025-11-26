import initSqlJs from 'sql.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'aula-genios.db');

let dbInstance = null;
let SQL = null;

async function getDB() {
  if (dbInstance) return dbInstance;

  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(filebuffer);
  } else {
    dbInstance = new SQL.Database();
    saveDB();
  }

  return dbInstance;
}

function saveDB() {
  if (!dbInstance) return;
  const data = dbInstance.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Wrapper to mimic better-sqlite3 somewhat
const dbWrapper = {
  exec: async (sql) => {
    const db = await getDB();
    db.run(sql);
    saveDB();
  },
  prepare: (sql) => {
    return {
      run: async (...params) => {
        const db = await getDB();
        db.run(sql, params);
        saveDB();
        // Return mock info if needed, sql.js doesn't give lastInsertRowid easily unless we ask
        // For UUIDs we don't need lastInsertRowid usually
        return {};
      },
      get: async (...params) => {
        const db = await getDB();
        const stmt = db.prepare(sql);
        stmt.bind(params);
        let result = null;
        if (stmt.step()) {
          result = stmt.getAsObject();
        }
        stmt.free();
        return result;
      },
      all: async (...params) => {
        const db = await getDB();
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  }
};

export async function initDB() {
  console.log('🏗️  Initializing 3NF Database Schema (SQL.js)...');
  const db = await getDB();

  // 1. IAM: Roles
  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      permissions TEXT DEFAULT '{}'
    )
  `);

  // 2. IAM: Users
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, -- UUID
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'student', -- Added system role
      profile_data TEXT DEFAULT '{}', -- JSON: avatar, bio, preferences
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Curriculum: Terms
  db.run(`
    CREATE TABLE IF NOT EXISTS terms (
      id TEXT PRIMARY KEY, -- UUID
      name TEXT NOT NULL,
      start_date DATETIME,
      end_date DATETIME
    )
  `);

  // 4. Curriculum: Courses
  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY, -- UUID
      code TEXT UNIQUE NOT NULL, -- e.g., MATH101
      title TEXT NOT NULL,
      term_id TEXT,
      settings TEXT DEFAULT '{}', -- JSON: grading_scheme, visibility
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (term_id) REFERENCES terms(id)
    )
  `);

  // 5. Curriculum: Modules
  db.run(`
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY, -- UUID
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      sequence_order INTEGER NOT NULL,
      unlock_at DATETIME,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
  `);

  // 6. Content Repository (No Repetition)
  db.run(`
    CREATE TABLE IF NOT EXISTS content_items (
      id TEXT PRIMARY KEY, -- UUID
      type TEXT NOT NULL CHECK(type IN ('PDF', 'VIDEO', 'QUIZ', 'ASSIGNMENT', 'LTI', 'PAGE')),
      title TEXT NOT NULL, -- Internal library name
      resource_url TEXT, -- S3 path or external URL
      metadata TEXT DEFAULT '{}', -- JSON: duration, file_size, points
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 7. Structural Linking: Module Items
  db.run(`
    CREATE TABLE IF NOT EXISTS module_items (
      id TEXT PRIMARY KEY, -- UUID
      module_id TEXT NOT NULL,
      content_item_id TEXT NOT NULL,
      sequence_order INTEGER NOT NULL,
      is_required BOOLEAN DEFAULT 1,
      FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
      FOREIGN KEY (content_item_id) REFERENCES content_items(id) ON DELETE CASCADE
    )
  `);

  // 8. Learning Logic: Enrollments
  db.run(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY, -- UUID
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      role_id INTEGER NOT NULL,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id),
      UNIQUE(user_id, course_id)
    )
  `);

  // 9. Learning Logic: Progress
  db.run(`
    CREATE TABLE IF NOT EXISTS progress (
      id TEXT PRIMARY KEY, -- UUID
      enrollment_id TEXT NOT NULL,
      module_item_id TEXT NOT NULL,
      status TEXT DEFAULT 'LOCKED' CHECK(status IN ('LOCKED', 'STARTED', 'COMPLETED')),
      score REAL, -- For quizzes/assignments
      completed_at DATETIME,
      FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
      FOREIGN KEY (module_item_id) REFERENCES module_items(id) ON DELETE CASCADE,
      UNIQUE(enrollment_id, module_item_id)
    )
  `);

  // 10. Learning Logic: Prerequisites (DAG)
  db.run(`
    CREATE TABLE IF NOT EXISTS prerequisites (
      id TEXT PRIMARY KEY, -- UUID
      module_id TEXT NOT NULL, -- The module being locked
      required_module_id TEXT NOT NULL, -- The dependency
      FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
      FOREIGN KEY (required_module_id) REFERENCES modules(id) ON DELETE CASCADE
    )
  `);

  // 11. Chat & Messaging
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      course_id TEXT, -- NULL for global chat
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 12. Calendar Events
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      start_date DATETIME NOT NULL,
      end_date DATETIME,
      type TEXT DEFAULT 'class' CHECK(type IN ('exam', 'assignment', 'class', 'other')),
      course_id TEXT,
      created_by TEXT NOT NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // 13. Global Settings
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 14. Forum Posts
  db.run(`
    CREATE TABLE IF NOT EXISTS forum_posts (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 15. Forum Replies
  db.run(`
    CREATE TABLE IF NOT EXISTS forum_replies (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  saveDB();
  console.log('✅ 3NF Database Schema Initialized Successfully (SQL.js)');
}

export default dbWrapper;
