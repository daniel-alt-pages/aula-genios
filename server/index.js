import express from 'express';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import db, { initDB } from './db.js';
import { randomUUID } from 'crypto';
import driveService from './googleDriveService.js';
import { initializeDrive, registerDriveRoutes } from './driveRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = 'aula-genios-secret-key-2025';

// Initialize database
initDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, join(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// Auth middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access token required' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// ============================================
// CREDENTIALS JSON HELPERS
// ============================================

const CREDENTIALS_FILE = join(__dirname, '..', 'credenciales.json');

// Leer credenciales del archivo JSON
async function readCredentials() {
    try {
        const data = await readFile(CREDENTIALS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading credentials:', error);
        // Si no existe, crear archivo con admin por defecto
        const defaultData = {
            plataforma: "Aula Genios - Seamos Genios Colombia",
            version: "2.0.0",
            fecha_actualizacion: new Date().toISOString().split('T')[0],
            usuarios: [
                {
                    id: "admin001",
                    nombre: "Administrador Principal",
                    email: "admin@aula.com",
                    password: "admin2025",
                    rol: "admin",
                    avatar: "👨‍💼",
                    activo: true,
                    fecha_creacion: new Date().toISOString().split('T')[0]
                }
            ]
        };
        await writeFile(CREDENTIALS_FILE, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
}

// Escribir credenciales al archivo JSON
async function writeCredentials(data) {
    try {
        data.fecha_actualizacion = new Date().toISOString().split('T')[0];
        await writeFile(CREDENTIALS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing credentials:', error);
        return false;
    }
}

// ============================================
// AUTH ROUTES
// ============================================

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Leer credenciales del archivo JSON
        const credentials = await readCredentials();

        // Buscar usuario por email
        const user = credentials.usuarios.find(u => u.email === email);

        if (!user) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        // Verificar si el usuario está activo
        if (!user.activo) {
            return res.status(401).json({ error: 'Usuario inactivo' });
        }

        // Verificar contraseña (comparación directa, sin hash por ahora)
        if (password !== user.password) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        // Generar token JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.rol },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.nombre,
                role: user.rol,
                avatar: user.avatar || (user.rol === 'admin' ? '👨‍💼' : user.rol === 'teacher' ? '👨‍🏫' : '👨‍🎓')
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const profile = JSON.parse(user.profile_data || '{}');

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: req.user.role,
            ...profile
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// USERS ROUTES (Admin)
// ============================================

app.get('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    try {
        const users = await db.prepare('SELECT * FROM users').all();
        const sanitizedUsers = users.map(u => ({
            ...u,
            password_hash: undefined, // Hide hash
            profile_data: JSON.parse(u.profile_data || '{}'),
            role: u.role // Use the real role column
        }));
        res.json(sanitizedUsers);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const { id } = req.params;
    const { name, email, role } = req.body;

    try {
        await db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, id);
        res.json({ success: true });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const userId = randomUUID();
        const passwordHash = bcrypt.hashSync(password, 10);

        await db.prepare(`
            INSERT INTO users (id, email, password_hash, name, role, profile_data)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, email, passwordHash, name, role, JSON.stringify({ avatar: role === 'admin' ? '👨‍💼' : role === 'teacher' ? '👨‍🏫' : '👨‍🎓' }));

        res.json({
            success: true,
            user: { id: userId, name, email, role }
        });
    } catch (error) {
        console.error('Create user error:', error);
        if (error.message?.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// COURSE ROUTES (Ivy League Dashboard)
// ============================================

app.get('/api/courses', authenticateToken, async (req, res) => {
    try {
        // Fetch courses the user is enrolled in
        // Also fetch progress for each course

        let query = `
      SELECT c.*, t.name as term_name, r.name as user_role
      FROM courses c
      JOIN terms t ON c.term_id = t.id
      JOIN enrollments e ON c.id = e.course_id
      JOIN roles r ON e.role_id = r.id
      WHERE e.user_id = ?
    `;

        if (req.user.role === 'admin') {
            // Admin sees all courses
            query = `
        SELECT c.*, t.name as term_name, 'admin' as user_role
        FROM courses c
        JOIN terms t ON c.term_id = t.id
      `;
        }

        const courses = await db.prepare(query).all(req.user.role === 'admin' ? [] : [req.user.id]);

        // Enhance with progress data
        // For each course, calculate progress: (completed required items / total required items)
        const enhancedCourses = await Promise.all(courses.map(async (course) => {
            const settings = JSON.parse(course.settings || '{}');

            // Calculate progress
            // Total required items in this course
            const totalItems = await db.prepare(`
        SELECT COUNT(*) as count
        FROM module_items mi
        JOIN modules m ON mi.module_id = m.id
        WHERE m.course_id = ? AND mi.is_required = 1
      `).get(course.id);

            // Completed items by this user
            // We need enrollment_id for this user & course
            const enrollment = await db.prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?').get(req.user.id, course.id);

            let progressPercent = 0;
            if (enrollment && totalItems.count > 0) {
                const completedItems = await db.prepare(`
          SELECT COUNT(*) as count
          FROM progress p
          WHERE p.enrollment_id = ? AND p.status = 'COMPLETED'
        `).get(enrollment.id);

                progressPercent = Math.round((completedItems.count / totalItems.count) * 100);
            }

            return {
                ...course,
                settings,
                progress: progressPercent,
                term: course.term_name,
                role: course.user_role
            };
        }));

        res.json(enhancedCourses);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// CREATE COURSE
app.post('/api/courses', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const { code, title, color, icon } = req.body;

    if (!code || !title) {
        return res.status(400).json({ error: 'Code and title are required' });
    }

    try {
        const courseId = randomUUID();

        // Get or create default term
        let term = await db.prepare('SELECT id FROM terms LIMIT 1').get();
        if (!term) {
            const termId = randomUUID();
            await db.prepare(`
                INSERT INTO terms (id, name, start_date, end_date)
                VALUES (?, ?, ?, ?)
            `).run(termId, 'Semestre 2025-1', '2025-01-01', '2025-12-31');
            term = { id: termId };
        }

        const settings = JSON.stringify({
            color: color || 'blue',
            icon: icon || '📚'
        });

        await db.prepare(`
            INSERT INTO courses (id, code, title, term_id, settings)
            VALUES (?, ?, ?, ?, ?)
        `).run(courseId, code, title, term.id, settings);

        res.json({
            success: true,
            course: { id: courseId, code, title, settings: JSON.parse(settings) }
        });
    } catch (error) {
        console.error('Create course error:', error);
        if (error.message?.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Course code already exists' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// UPDATE COURSE
app.put('/api/courses/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Admin or teacher access required' });
    }

    const { id } = req.params;
    const { title, code, settings } = req.body;

    try {
        const updates = [];
        const values = [];

        if (title) {
            updates.push('title = ?');
            values.push(title);
        }
        if (code) {
            updates.push('code = ?');
            values.push(code);
        }
        if (settings) {
            updates.push('settings = ?');
            values.push(JSON.stringify(settings));
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await db.prepare(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        res.json({ success: true });
    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE USER
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const { id } = req.params;

    try {
        await db.prepare('DELETE FROM users WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ENROLL USER IN COURSE
app.post('/api/enrollment', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const { userId, courseId, role } = req.body;

    if (!userId || !courseId || !role) {
        return res.status(400).json({ error: 'userId, courseId, and role are required' });
    }

    try {
        const enrollmentId = randomUUID();

        // Get role_id from roles table
        const roleRecord = await db.prepare('SELECT id FROM roles WHERE name = ?').get(role);
        if (!roleRecord) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        await db.prepare(`
            INSERT INTO enrollments (id, user_id, course_id, role_id)
            VALUES (?, ?, ?, ?)
        `).run(enrollmentId, userId, courseId, roleRecord.id);

        res.json({ success: true, enrollmentId });
    } catch (error) {
        console.error('Enrollment error:', error);
        if (error.message?.includes('UNIQUE')) {
            return res.status(400).json({ error: 'User already enrolled in this course' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// MODULE ROUTES (Linear Navigation)
// ============================================

app.get('/api/courses/:courseId/modules', authenticateToken, async (req, res) => {
    const { courseId } = req.params;

    try {
        const modules = await db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY sequence_order').all(courseId);

        // For each module, fetch items
        const modulesWithItems = await Promise.all(modules.map(async (mod) => {
            const items = await db.prepare(`
        SELECT mi.*, ci.type, ci.title, ci.resource_url, ci.metadata
        FROM module_items mi
        JOIN content_items ci ON mi.content_item_id = ci.id
        WHERE mi.module_id = ?
        ORDER BY mi.sequence_order
      `).all(mod.id);

            // Check status for each item (LOCKED/COMPLETED)
            const enrollment = await db.prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?').get(req.user.id, courseId);

            const itemsWithStatus = await Promise.all(items.map(async (item) => {
                let status = 'LOCKED'; // Default
                // Logic: If previous item is completed, this one is UNLOCKED/STARTED.
                // Simplified: Check progress table.

                if (enrollment) {
                    const prog = await db.prepare('SELECT status FROM progress WHERE enrollment_id = ? AND module_item_id = ?').get(enrollment.id, item.id);
                    if (prog) status = prog.status;
                    else {
                        // If it's the first item of first module, it's unlocked?
                        // Or check if previous item is completed.
                        // For MVP, let's default to STARTED if not in progress table, or LOCKED if strict.
                        // Let's say everything is open for now unless explicitly locked.
                        status = 'NOT_STARTED';
                    }
                }

                return {
                    ...item,
                    metadata: JSON.parse(item.metadata || '{}'),
                    status
                };
            }));

            return {
                ...mod,
                items: itemsWithStatus
            };
        }));

        res.json(modulesWithItems);
    } catch (error) {
        console.error('Get modules error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// CLASSES ROUTES (Simple in-memory storage)
// ============================================

let classesDB = [
    {
        id: 1,
        name: 'Lectura Crítica',
        section: 'Grado 11-A',
        teacherName: 'Prof. Ana María',
        teacherId: 'prof1',
        color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
        icon: '📚',
        students: 25,
        progress: 35,
        description: 'Preparación ICFES'
    }
];

// Obtener clases
app.get('/api/classes', authenticateToken, (req, res) => {
    try {
        // Filtrar por profesor si no es admin
        let classes = classesDB;
        if (req.user.role === 'teacher') {
            classes = classesDB.filter(c => c.teacherId === req.user.id);
        }
        res.json({ success: true, classes });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener clases' });
    }
});

// Crear clase
app.post('/api/classes', authenticateToken, (req, res) => {
    try {
        const { name, section, icon, color, description } = req.body;

        const newClass = {
            id: Date.now(),
            name,
            section: section || 'Nueva Sección',
            teacherName: req.user.name,
            teacherId: req.user.id,
            color: color || 'bg-gradient-to-br from-blue-500 to-indigo-600',
            icon: icon || '📘',
            students: 0,
            progress: 0,
            description: description || ''
        };

        classesDB.push(newClass);
        res.json({ success: true, class: newClass });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear clase' });
    }
});

// Actualizar clase
app.put('/api/classes/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const index = classesDB.findIndex(c => c.id == id);
        if (index === -1) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        classesDB[index] = { ...classesDB[index], ...updates };
        res.json({ success: true, class: classesDB[index] });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar clase' });
    }
});

// Eliminar clase
app.delete('/api/classes/:id', authenticateToken, (req, res) => {
    try {
        const { id } = req.params;
        classesDB = classesDB.filter(c => c.id != id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar clase' });
    }
});

// ============================================
// EVENTS ROUTES
// ============================================

app.get('/api/events', authenticateToken, async (req, res) => {
    try {
        // Fetch all events for now (or filter by course/user if needed)
        const events = await db.prepare('SELECT * FROM events ORDER BY start_date ASC').all();
        res.json({ success: true, events });
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/events', authenticateToken, async (req, res) => {
    try {
        const { title, description, start_date, end_date, type, course_id } = req.body;
        const eventId = randomUUID();

        await db.prepare(`
            INSERT INTO events (id, title, description, start_date, end_date, type, course_id, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(eventId, title, description, start_date, end_date, type || 'class', course_id, req.user.id);

        res.json({ success: true, event: { id: eventId, ...req.body } });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// CHAT & MESSAGING ROUTES
// ============================================

// Get messages for a class or global chat
app.get('/api/chat/:classId?', authenticateToken, async (req, res) => {
    try {
        const { classId } = req.params;
        const query = classId && classId !== 'global'
            ? 'SELECT m.*, u.name as user_name FROM messages m JOIN users u ON m.user_id = u.id WHERE m.course_id = ? ORDER BY m.created_at ASC'
            : 'SELECT m.*, u.name as user_name FROM messages m JOIN users u ON m.user_id = u.id WHERE m.course_id IS NULL ORDER BY m.created_at ASC';

        const messages = classId && classId !== 'global'
            ? await db.prepare(query).all(classId)
            : await db.prepare(query).all();

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Send a message
app.post('/api/chat/:classId?', authenticateToken, async (req, res) => {
    try {
        const { classId } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Message content required' });
        }

        const messageId = randomUUID();
        await db.prepare(`
            INSERT INTO messages (id, course_id, user_id, content)
            VALUES (?, ?, ?, ?)
        `).run(messageId, classId && classId !== 'global' ? classId : null, req.user.id, content);

        res.json({ success: true, messageId });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// CALENDAR/EVENTS ROUTES
// ============================================

app.get('/api/events', authenticateToken, async (req, res) => {
    try {
        const events = await db.prepare(`
            SELECT e.*, u.name as created_by_name 
            FROM events e 
            JOIN users u ON e.created_by = u.id 
            ORDER BY e.start_date ASC
        `).all();

        res.json({ success: true, events });
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/events', authenticateToken, async (req, res) => {
    try {
        const { title, description, start_date, end_date, course_id } = req.body;

        if (!title || !start_date) {
            return res.status(400).json({ error: 'Title and start date required' });
        }

        const eventId = randomUUID();
        await db.prepare(`
            INSERT INTO events (id, title, description, start_date, end_date, course_id, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(eventId, title, description, start_date, end_date, course_id, req.user.id);

        res.json({ success: true, eventId });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// ENROLLMENT ROUTES
// ============================================

app.post('/api/classes/:classId/enroll', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Permission denied' });
    }

    try {
        const { classId } = req.params;
        const { studentId } = req.body;

        if (!studentId) {
            return res.status(400).json({ error: 'Student ID required' });
        }

        // Get student role ID (assuming role ID 3 is student)
        const studentRole = await db.prepare('SELECT id FROM roles WHERE name = ?').get('student');

        const enrollmentId = randomUUID();
        await db.prepare(`
            INSERT INTO enrollments (id, user_id, course_id, role_id)
            VALUES (?, ?, ?, ?)
        `).run(enrollmentId, studentId, classId, studentRole.id);

        res.json({ success: true, enrollmentId });
    } catch (error) {
        console.error('Enroll student error:', error);
        if (error.message?.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Student already enrolled' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});

// Get classes for a specific student
app.get('/api/classes/student/:studentId', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.params;

        const classes = await db.prepare(`
            SELECT c.* 
            FROM courses c 
            JOIN enrollments e ON c.id = e.course_id 
            WHERE e.user_id = ?
        `).all(studentId);

        res.json({ success: true, classes });
    } catch (error) {
        console.error('Get student classes error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// FORUM ROUTES
// ============================================

app.get('/api/forum/:classId', authenticateToken, async (req, res) => {
    try {
        const { classId } = req.params;
        const threads = await db.prepare(`
            SELECT fp.*, u.name as author_name,
            (SELECT COUNT(*) FROM forum_replies fr WHERE fr.post_id = fp.id) as reply_count
            FROM forum_posts fp
            JOIN users u ON fp.user_id = u.id
            WHERE fp.course_id = ?
            ORDER BY fp.created_at DESC
        `).all(classId);

        res.json({ success: true, threads });
    } catch (error) {
        console.error('Get forum threads error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/forum/:classId', authenticateToken, async (req, res) => {
    try {
        const { classId } = req.params;
        const { title, content, tags } = req.body;

        if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

        const postId = randomUUID();
        await db.prepare(`
            INSERT INTO forum_posts (id, course_id, user_id, title, content, tags)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(postId, classId, req.user.id, title, content, JSON.stringify(tags || []));

        res.json({ success: true, postId });
    } catch (error) {
        console.error('Create forum thread error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/forum/thread/:threadId', authenticateToken, async (req, res) => {
    try {
        const { threadId } = req.params;
        const replies = await db.prepare(`
            SELECT fr.*, u.name as author_name
            FROM forum_replies fr
            JOIN users u ON fr.user_id = u.id
            WHERE fr.post_id = ?
            ORDER BY fr.created_at ASC
        `).all(threadId);

        res.json({ success: true, replies });
    } catch (error) {
        console.error('Get forum replies error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/forum/thread/:threadId', authenticateToken, async (req, res) => {
    try {
        const { threadId } = req.params;
        const { content } = req.body;

        if (!content) return res.status(400).json({ error: 'Content required' });

        const replyId = randomUUID();
        await db.prepare(`
            INSERT INTO forum_replies (id, post_id, user_id, content)
            VALUES (?, ?, ?, ?)
        `).run(replyId, threadId, req.user.id, content);

        res.json({ success: true, replyId });
    } catch (error) {
        console.error('Create forum reply error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// SETTINGS ROUTES
// ============================================

app.get('/api/settings', authenticateToken, async (req, res) => {
    try {
        const settings = await db.prepare('SELECT * FROM settings').all();
        // Convert array of {key, value} to object
        const settingsObj = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        res.json({ success: true, settings: settingsObj });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/settings', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    try {
        const settings = req.body;
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

        for (const [key, value] of Object.entries(settings)) {
            await stmt.run(key, String(value));
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// CREDENTIALS MANAGEMENT ROUTES
// ============================================

// Obtener todas las credenciales (solo admin)
app.get('/api/credentials', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    try {
        const credentials = await readCredentials();
        res.json({
            success: true,
            usuarios: credentials.usuarios,
            metadata: {
                plataforma: credentials.plataforma,
                version: credentials.version,
                fecha_actualizacion: credentials.fecha_actualizacion,
                total_usuarios: credentials.usuarios.length
            }
        });
    } catch (error) {
        console.error('Get credentials error:', error);
        res.status(500).json({ error: 'Error al obtener credenciales' });
    }
});

// Crear nuevo usuario (solo admin)
app.post('/api/credentials', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    const { nombre, email, password, rol, avatar } = req.body;

    if (!nombre || !email || !password || !rol) {
        return res.status(400).json({ error: 'Faltan campos requeridos: nombre, email, password, rol' });
    }

    // Validar rol
    if (!['admin', 'teacher', 'student'].includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido. Use: admin, teacher o student' });
    }

    try {
        const credentials = await readCredentials();

        // Verificar si el email ya existe
        if (credentials.usuarios.find(u => u.email === email)) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Crear nuevo usuario
        const newUser = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            nombre,
            email,
            password,
            rol,
            avatar: avatar || (rol === 'admin' ? '👨‍💼' : rol === 'teacher' ? '👨‍🏫' : '👨‍🎓'),
            activo: true,
            fecha_creacion: new Date().toISOString().split('T')[0]
        };

        credentials.usuarios.push(newUser);
        await writeCredentials(credentials);

        res.json({
            success: true,
            usuario: { ...newUser, password: undefined }, // No devolver password
            message: 'Usuario creado exitosamente'
        });
    } catch (error) {
        console.error('Create credential error:', error);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

// Actualizar usuario (solo admin)
app.put('/api/credentials/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    const { id } = req.params;
    const { nombre, email, password, rol, avatar, activo } = req.body;

    try {
        const credentials = await readCredentials();
        const userIndex = credentials.usuarios.findIndex(u => u.id === id);

        if (userIndex === -1) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar si el nuevo email ya existe en otro usuario
        if (email && email !== credentials.usuarios[userIndex].email) {
            if (credentials.usuarios.find(u => u.email === email && u.id !== id)) {
                return res.status(400).json({ error: 'El email ya está registrado' });
            }
        }

        // Actualizar campos
        if (nombre) credentials.usuarios[userIndex].nombre = nombre;
        if (email) credentials.usuarios[userIndex].email = email;
        if (password) credentials.usuarios[userIndex].password = password;
        if (rol && ['admin', 'teacher', 'student'].includes(rol)) {
            credentials.usuarios[userIndex].rol = rol;
        }
        if (avatar) credentials.usuarios[userIndex].avatar = avatar;
        if (typeof activo === 'boolean') credentials.usuarios[userIndex].activo = activo;

        await writeCredentials(credentials);

        res.json({
            success: true,
            usuario: { ...credentials.usuarios[userIndex], password: undefined },
            message: 'Usuario actualizado exitosamente'
        });
    } catch (error) {
        console.error('Update credential error:', error);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

// Eliminar usuario (solo admin)
app.delete('/api/credentials/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    const { id } = req.params;

    try {
        const credentials = await readCredentials();
        const userIndex = credentials.usuarios.findIndex(u => u.id === id);

        if (userIndex === -1) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Prevenir eliminar el último admin
        const user = credentials.usuarios[userIndex];
        if (user.rol === 'admin') {
            const adminCount = credentials.usuarios.filter(u => u.rol === 'admin').length;
            if (adminCount <= 1) {
                return res.status(400).json({ error: 'No se puede eliminar el último administrador' });
            }
        }

        credentials.usuarios.splice(userIndex, 1);
        await writeCredentials(credentials);

        res.json({
            success: true,
            message: 'Usuario eliminado exitosamente'
        });
    } catch (error) {
        console.error('Delete credential error:', error);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

// Exportar credenciales como CSV (solo admin)
app.get('/api/credentials/export/csv', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    try {
        const credentials = await readCredentials();

        // Crear CSV
        let csv = 'ID,Nombre,Email,Password,Rol,Avatar,Activo,Fecha Creación\n';
        credentials.usuarios.forEach(user => {
            csv += `${user.id},"${user.nombre}",${user.email},${user.password},${user.rol},${user.avatar || ''},${user.activo},${user.fecha_creacion}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=credenciales_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (error) {
        console.error('Export credentials error:', error);
        res.status(500).json({ error: 'Error al exportar credenciales' });
    }
});

// Registrar rutas de Google Drive
registerDriveRoutes(app, authenticateToken, upload);

// Inicializar Google Drive
initializeDrive();

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
});
