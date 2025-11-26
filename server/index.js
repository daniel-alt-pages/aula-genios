import express from 'express';
import cors from 'cors';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/User.js';
import Course from './models/Course.js';
import { initializeDrive, registerDriveRoutes } from './driveRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'aula-genios-secret-key-2025';

// Connect to MongoDB
connectDB();

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
// AUTH ROUTES
// ============================================

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });
        if (!user.activo) return res.status(401).json({ error: 'Usuario inactivo' });

        // Plain text password comparison as requested
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
        const user = await User.findOne({ id: req.user.id });

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
// COURSES / CLASSES ROUTES (MONGODB)
// ============================================

app.get('/api/classes', authenticateToken, async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'teacher') {
            query = { profesorId: req.user.id };
        } else if (req.user.role === 'student') {
            query = { estudiantes: req.user.id };
        }

        const courses = await Course.find(query);
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

        const newCourse = await Course.create({
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
            posts: [],
            fecha_creacion: new Date().toISOString()
        });

        res.json({ success: true, class: newCourse, course: newCourse });
    } catch (error) {
        console.error('Create class error:', error);
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

        const course = await Course.findOne({ id: classId });
        if (!course) return res.status(404).json({ error: 'Class not found' });

        if (role === 'teacher') {
            const teacher = await User.findOne({ id: targetId });
            course.profesorId = targetId;
            if (teacher) {
                course.profesorNombre = teacher.nombre;
            }
            await course.save();
            return res.json({ success: true, message: 'Teacher assigned' });
        }

        if (!course.estudiantes.includes(targetId)) {
            course.estudiantes.push(targetId);
            await course.save();
        }

        res.json({ success: true, message: 'Student enrolled' });
    } catch (error) {
        console.error('Enrollment error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/classes/:classId/students/:studentId', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Permission denied' });
    }

    try {
        const { classId, studentId } = req.params;
        const course = await Course.findOne({ id: classId });

        if (!course) return res.status(404).json({ error: 'Class not found' });

        course.estudiantes = course.estudiantes.filter(id => id !== studentId);
        await course.save();

        res.json({ success: true, message: 'Student removed' });
    } catch (error) {
        console.error('Remove student error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/classes/:classId/posts', authenticateToken, async (req, res) => {
    try {
        const { classId } = req.params;
        const course = await Course.findOne({ id: classId });

        if (!course) return res.status(404).json({ error: 'Class not found' });

        res.json({ success: true, posts: course.posts || [] });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/classes/:classId/posts', authenticateToken, async (req, res) => {
    if (req.user.role === 'student') {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only teachers can post announcements' });
        }
    }

    try {
        const { classId } = req.params;
        const { content } = req.body;

        const course = await Course.findOne({ id: classId });
        if (!course) return res.status(404).json({ error: 'Class not found' });

        const newPost = {
            id: Date.now(),
            author: req.user.name || req.user.nombre,
            authorId: req.user.id,
            content,
            date: new Date().toLocaleDateString(),
            timestamp: new Date().toISOString(),
            comments: [],
            type: 'post'
        };

        course.posts.unshift(newPost);
        await course.save();

        res.json({ success: true, post: newPost });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/courses', authenticateToken, async (req, res) => {
    try {
        const courses = await Course.find({});
        res.json(courses);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/courses', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    try {
        const { code, title, color, icon } = req.body;

        const newCourse = await Course.create({
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
            posts: [],
            fecha_creacion: new Date().toISOString()
        });

        res.json({ success: true, course: newCourse });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// CREDENTIALS MANAGEMENT ROUTES (MONGODB)
// ============================================

app.get('/api/credentials', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores.' });
    }

    try {
        const users = await User.find({});
        res.json({
            success: true,
            usuarios: users,
            metadata: {
                plataforma: "Aula Genios",
                version: "2.1.0 (MongoDB)",
                fecha_actualizacion: new Date().toISOString(),
                total_usuarios: users.length
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

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const newUser = await User.create({
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            nombre,
            email,
            password, // Plain text as requested
            rol,
            avatar: avatar || (rol === 'admin' ? '👨‍💼' : rol === 'teacher' ? '👨‍🏫' : '👨‍🎓'),
            activo: true,
            fecha_creacion: new Date().toISOString().split('T')[0]
        });

        res.json({
            success: true,
            usuario: newUser,
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
        const user = await User.findOne({ id });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) return res.status(400).json({ error: 'El email ya está registrado' });
        }

        if (nombre) user.nombre = nombre;
        if (email) user.email = email;
        if (password) user.password = password;
        if (rol) user.rol = rol;
        if (avatar) user.avatar = avatar;
        if (typeof activo === 'boolean') user.activo = activo;

        await user.save();

        res.json({
            success: true,
            usuario: user,
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
        const user = await User.findOne({ id });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        if (user.rol === 'admin') {
            const adminCount = await User.countDocuments({ rol: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({ error: 'No se puede eliminar el último administrador' });
            }
        }

        await User.deleteOne({ id });

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
        const users = await User.find({});

        let csv = 'ID,Nombre,Email,Password,Rol,Avatar,Activo,Fecha Creación\n';
        users.forEach(user => {
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
        const users = await User.find({});
        const mappedUsers = users.map(u => ({
            id: u.id,
            name: u.nombre,
            email: u.email,
            role: u.rol,
            avatar: u.avatar,
            active: u.activo
        }));
        res.json(mappedUsers);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const { name, email, password, role } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'Email exists' });

        const newUser = await User.create({
            id: `user_${Date.now()}`,
            nombre: name,
            email,
            password,
            rol: role || 'student',
            avatar: '👤',
            activo: true,
            fecha_creacion: new Date().toISOString()
        });

        res.json({ success: true, user: newUser });
    } catch (e) {
        res.status(500).json({ error: 'Error' });
    }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { id } = req.params;
    try {
        await User.deleteOne({ id });
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
