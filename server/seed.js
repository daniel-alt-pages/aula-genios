import db, { initDB } from './db.js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'aula-genios.db');

async function seed() {
  console.log('🗑️  Deleting existing database...');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  console.log('🌱 Seeding database...');

  await initDB();

  // Create roles
  console.log('Creating roles...');
  await db.prepare('INSERT OR IGNORE INTO roles (id, name, permissions) VALUES (?, ?, ?)').run(1, 'admin', '{}');
  await db.prepare('INSERT OR IGNORE INTO roles (id, name, permissions) VALUES (?, ?, ?)').run(2, 'teacher', '{}');
  await db.prepare('INSERT OR IGNORE INTO roles (id, name, permissions) VALUES (?, ?, ?)').run(3, 'student', '{}');

  // Create users
  console.log('Creating users...');

  const adminId = randomUUID();
  const teacherId = randomUUID();
  const studentId = randomUUID();

  const adminHash = bcrypt.hashSync('admin', 10);
  const teacherHash = bcrypt.hashSync('prof', 10);
  const studentHash = bcrypt.hashSync('est', 10);

  await db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, name, role, profile_data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(adminId, 'admin@aula.com', adminHash, 'Director General', 'admin', JSON.stringify({ avatar: '🛡️', bio: 'Administrador del sistema' }));

  await db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, name, role, profile_data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(teacherId, 'ana@aula.com', teacherHash, 'Prof. Ana María', 'teacher', JSON.stringify({ avatar: '👩‍🏫', bio: 'Profesora de Lectura Crítica' }));

  await db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, name, role, profile_data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(studentId, 'daniel@aula.com', studentHash, 'Daniel Estudiante', 'student', JSON.stringify({ avatar: '👨‍🎓', bio: 'Estudiante de Grado 11' }));

  // Create a term
  console.log('Creating term...');
  const termId = randomUUID();
  await db.prepare(`
    INSERT OR IGNORE INTO terms (id, name, start_date, end_date)
    VALUES (?, ?, ?, ?)
  `).run(termId, 'Semestre 2025-1', '2025-01-01', '2025-06-30');

  // Create courses
  console.log('Creating courses...');
  const course1Id = randomUUID();
  const course2Id = randomUUID();

  await db.prepare(`
    INSERT OR IGNORE INTO courses (id, code, title, term_id, settings)
    VALUES (?, ?, ?, ?, ?)
  `).run(course1Id, 'LECT101', 'Lectura Crítica', termId, JSON.stringify({ color: 'blue', icon: '📚' }));

  await db.prepare(`
    INSERT OR IGNORE INTO courses (id, code, title, term_id, settings)
    VALUES (?, ?, ?, ?, ?)
  `).run(course2Id, 'MATH101', 'Matemáticas ICFES', termId, JSON.stringify({ color: 'purple', icon: '📐' }));

  // Enroll teacher in course
  console.log('Creating enrollments...');
  const enrollment1Id = randomUUID();
  await db.prepare(`
    INSERT OR IGNORE INTO enrollments (id, user_id, course_id, role_id)
    VALUES (?, ?, ?, ?)
  `).run(enrollment1Id, teacherId, course1Id, 2); // role_id 2 = teacher

  // Enroll student in course
  const enrollment2Id = randomUUID();
  await db.prepare(`
    INSERT OR IGNORE INTO enrollments (id, user_id, course_id, role_id)
    VALUES (?, ?, ?, ?)
  `).run(enrollment2Id, studentId, course1Id, 3); // role_id 3 = student

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('Admin: admin@aula.com / admin');
  console.log('Teacher: ana@aula.com / prof');
  console.log('Student: daniel@aula.com / est');
}

seed().catch(console.error);
