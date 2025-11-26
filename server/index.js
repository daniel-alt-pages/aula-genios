import express from 'express';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import driveService from './googleDriveService.js';
import { initializeDrive, registerDriveRoutes } from './driveRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = 'aula-genios-secret-key-2025';

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
const COURSES_FILE = join(__dirname, '..', 'cursos.json');

async function readCourses() {
    try {
        const data = await readFile(COURSES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        const initialData = { cursos: [] };
        await writeCourses(initialData);
        return initialData;
    }
}

async function writeCourses(data) {
    await writeFile(COURSES_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

async function readCredentials() {
    try {
        const data = await readFile(CREDENTIALS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading credentials:', error);
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
        const credentials = await readCredentials();
        const user = credentials.usuarios.find(u => u.email === email);

        if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });
        if (!user.activo) return res.status(401).json({ error: 'Usuario inactivo' });
        if (password !== user.password) return res.status(401).json({ error: 'Credenciales incorrectas' });

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
        const credentials = await readCredentials();
        const user = credentials.usuarios.find(u => u.id === req.user.id);

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            id: user.id,
            email: user.email,
            name: user.nombre,
            role: user.rol,
            avatar: user.avatar
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// STUBS
app.get('/api/events', (req, res) => res.json({ success: true, events: [] }));
app.get('/api/chat/:classId?', (req, res) => res.json({ success: true, messages: [] }));
app.get('/api/settings', (req, res) => res.json({ success: true, settings: {} }));

// ============================================
// COURSES / CLASSES ROUTES (JSON)
// ============================================

app.get('/api/classes', authenticateToken, async (req, res) => {
    try {
        const data = await readCourses();
        let courses = data.cursos;

        if (req.user.role === 'teacher') {
            courses = courses.filter(c => c.profesorId === req.user.id);
        } else if (req.user.role === 'student') {
            courses = courses.filter(c => c.estudiantes && c.estudiantes.includes(req.user.id));
        }

        res.json({ success: true, classes: courses });
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/classes', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Admin or teacher access required' });
    }

    try {
        const { name, title, section, code, color, icon, description, teacherId, teacherName } = req.body;
        const data = await readCourses();

        let assignedTeacherId = req.user.id;
        let assignedTeacherName = req.user.name || req.user.nombre;

        if (req.user.role === 'admin') {
            if (teacherId) {
                assignedTeacherId = teacherId;
                assignedTeacherName = teacherName || 'Profesor Asignado';
            } else {
                assignedTeacherId = 'admin';
                assignedTeacherName = 'Administrador';
            }
        }

        const newCourse = {
            id: randomUUID(),
            nombre: name || title || 'Nueva Clase',
            code: code || '',
            seccion: section || 'Sección A',
            profesorId: assignedTeacherId,
            profesorNombre: assignedTeacherName,
            color: color || 'bg-gradient-to-br from-blue-500 to-indigo-600',
            icono: icon || '📚',
            descripcion: description || '',
            estudiantes: [],
            modulos: [],
            fecha_creacion: new Date().toISOString()
        };

        data.cursos.push(newCourse);
        await writeCourses(data);

        res.json({ success: true, class: newCourse, course: newCourse });
    } catch (error) {
        console.error('Create class error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/courses', authenticateToken, async (req, res) => {
    try {
        const data = await readCourses();
        res.json(data.cursos);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/courses', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    try {
        const { code, title, color, icon } = req.body;
        const data = await readCourses();

        const newCourse = {
            id: randomUUID(),
            nombre: title,
            code: code,
            seccion: 'General',
            profesorId: 'admin',
            profesorNombre: 'Administrador',
            color: color || 'blue',
            icono: icon || '📚',
            descripcion: '',
            estudiantes: [],
            modulos: [],
            fecha_creacion: new Date().toISOString()
        };

        data.cursos.push(newCourse);
        await writeCourses(data);

        res.json({ success: true, course: newCourse });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/classes/:classId/enroll', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Permission denied' });
    }

    try {
        const { classId } = req.params;
        const { userId, studentId, role } = req.body;

        const targetId = userId || studentId;
        if (!targetId) return res.status(400).json({ error: 'User ID required' });

        const data = await readCourses();
        const courseIndex = data.cursos.findIndex(c => c.id === classId);

        if (courseIndex === -1) return res.status(404).json({ error: 'Class not found' });

        if (role === 'teacher') {
            const credentials = await readCredentials();
            const teacher = credentials.usuarios.find(u => u.id === targetId);

            data.cursos[courseIndex].profesorId = targetId;
            if (teacher) {
                data.cursos[courseIndex].profesorNombre = teacher.nombre;
            }
            await writeCourses(data);
            return res.json({ success: true, message: 'Teacher assigned' });
        }

        if (!data.cursos[courseIndex].estudiantes) {
            data.cursos[courseIndex].estudiantes = [];
        }

        if (!data.cursos[courseIndex].estudiantes.includes(targetId)) {
            data.cursos[courseIndex].estudiantes.push(targetId);
            await writeCourses(data);
        }

        res.json({ success: true, message: 'Student enrolled' });
    } catch (error) {
        console.error('Enrollment error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// CREDENTIALS MANAGEMENT ROUTES
// ============================================

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

app.post('/api/credentials', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    const { nombre, email, password, rol, avatar } = req.body;

    if (!nombre || !email || !password || !rol) {
        return res.status(400).json({ error: 'Faltan campos requeridos: nombre, email, password, rol' });
    }

    if (!['admin', 'teacher', 'student'].includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido. Use: admin, teacher o student' });
    }

    try {
        const credentials = await readCredentials();

        if (credentials.usuarios.find(u => u.email === email)) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

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
            usuario: { ...newUser, password: undefined },
            message: 'Usuario creado exitosamente'
        });
    } catch (error) {
        console.error('Create credential error:', error);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

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

        if (email && email !== credentials.usuarios[userIndex].email) {
            if (credentials.usuarios.find(u => u.email === email && u.id !== id)) {
                return res.status(400).json({ error: 'El email ya está registrado' });
            }
        }

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

app.get('/api/credentials/export/csv', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    try {
        const credentials = await readCredentials();

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

app.get('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    try {
        const credentials = await readCredentials();
        const users = credentials.usuarios.map(u => ({
            id: u.id,
            name: u.nombre,
            email: u.email,
            role: u.rol,
            avatar: u.avatar,
            active: u.activo
        }));
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/users', authenticateToken, async (req, res) => {
    // Alias to credentials creation
    // ... (reuse logic)
    // For simplicity, we just call the credentials endpoint logic here or redirect
    // But since we are rewriting the file, let's just add a simple handler that calls the same logic
    // Or better, let the frontend use /api/credentials for user management as it seems to be doing in AdminPanel
    // But AdminPanel calls api.users.create which calls /users

    // So we need /api/users endpoints too
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    // Reuse credentials logic
    const { name, email, password, role } = req.body;
    // ... implementation similar to credentials
    // To save space, let's assume AdminPanel uses /api/credentials if we updated api.js, but we didn't update api.users to point to credentials.
    // So we need to implement /api/users here.

    try {
        const credentials = await readCredentials();
        if (credentials.usuarios.find(u => u.email === email)) return res.status(400).json({ error: 'Email exists' });

        const newUser = {
            id: `user_${Date.now()}`,
            nombre: name,
            email,
            password,
            rol: role || 'student',
            avatar: '👤',
            activo: true,
            fecha_creacion: new Date().toISOString()
        };

        credentials.usuarios.push(newUser);
        await writeCredentials(credentials);
        res.json({ success: true, user: newUser });
    } catch (e) {
        res.status(500).json({ error: 'Error' });
    }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { id } = req.params;
    try {
        const credentials = await readCredentials();
        const idx = credentials.usuarios.findIndex(u => u.id === id);
        if (idx !== -1) {
            credentials.usuarios.splice(idx, 1);
            await writeCredentials(credentials);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error' });
    }
});

registerDriveRoutes(app, authenticateToken, upload);
initializeDrive();

app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
});
