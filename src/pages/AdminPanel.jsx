import React, { useState, useEffect } from 'react';
import {
    Users, BookOpen, UserPlus, GraduationCap, Key, Search, Plus, Edit, Trash2, Save, X, CheckCircle, Settings as SettingsIcon
} from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import CredentialsManager from '../components/CredentialsManager';

export default function AdminPanel() {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [showCreateCourse, setShowCreateCourse] = useState(false);
    const [showAssignStudents, setShowAssignStudents] = useState(null);
    const [showAssignTeacher, setShowAssignTeacher] = useState(null);

    // Forms
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'student' });
    const [newCourse, setNewCourse] = useState({ code: '', title: '', color: 'blue', icon: '📚' });
    const [selectedStudents, setSelectedStudents] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersData, coursesData] = await Promise.all([
                api.users.getAll(),
                api.courses.getAll()
            ]);
            setUsers(usersData);
            setCourses(coursesData);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await api.users.create(newUser);
            alert('✅ Usuario creado exitosamente');
            setShowCreateUser(false);
            setNewUser({ name: '', email: '', password: '', role: 'student' });
            loadData();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            await api.courses.create(newCourse);
            alert('✅ Clase creada exitosamente');
            setShowCreateCourse(false);
            setNewCourse({ code: '', title: '', color: 'blue', icon: '📚' });
            loadData();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleAssignTeacher = async (courseId, teacherId) => {
        try {
            await api.enrollment.enroll({ userId: teacherId, courseId, role: 'teacher' });
            alert('✅ Profesor asignado exitosamente');
            setShowAssignTeacher(null);
            loadData();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleAssignStudents = async (courseId) => {
        try {
            for (const studentId of selectedStudents) {
                await api.enrollment.enroll({ userId: studentId, courseId, role: 'student' });
            }
            alert(`✅ ${selectedStudents.length} estudiantes asignados exitosamente`);
            setShowAssignStudents(null);
            setSelectedStudents([]);
            loadData();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
        try {
            await api.users.delete(userId);
            alert('✅ Usuario eliminado');
            loadData();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleResetPassword = async (userId, newPassword) => {
        const password = newPassword || prompt('Ingresa la nueva contraseña:');
        if (!password) return;

        try {
            await api.users.update(userId, { password });
            alert('✅ Contraseña actualizada');
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const students = users.filter(u => u.role === 'student');
    const teachers = users.filter(u => u.role === 'teacher');
    const admins = users.filter(u => u.role === 'admin');

    if (loading) return <div className="p-8 text-center">Cargando panel de administración...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
                <h1 className="text-3xl font-bold mb-2">Panel de Administración</h1>
                <p className="text-purple-100">Control total de la plataforma Aula Genios</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Total Usuarios</p>
                            <p className="text-3xl font-bold text-slate-800">{users.length}</p>
                        </div>
                        <Users className="text-blue-500" size={40} />
                    </div>
                </Card>
                <Card className="p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Estudiantes</p>
                            <p className="text-3xl font-bold text-slate-800">{students.length}</p>
                        </div>
                        <GraduationCap className="text-green-500" size={40} />
                    </div>
                </Card>
                <Card className="p-6 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Profesores</p>
                            <p className="text-3xl font-bold text-slate-800">{teachers.length}</p>
                        </div>
                        <Users className="text-orange-500" size={40} />
                    </div>
                </Card>
                <Card className="p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Clases</p>
                            <p className="text-3xl font-bold text-slate-800">{courses.length}</p>
                        </div>
                        <BookOpen className="text-purple-500" size={40} />
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                {[
                    { id: 'users', label: 'Usuarios', icon: Users },
                    { id: 'courses', label: 'Clases', icon: BookOpen },
                    { id: 'credentials', label: 'Credenciales', icon: Key }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${activeTab === tab.id
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === 'users' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar usuarios..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <Button onClick={() => setShowCreateUser(true)}>
                            <Plus size={18} className="mr-2" /> Crear Usuario
                        </Button>
                    </div>

                    <Card className="overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left p-4 font-semibold text-slate-700">Nombre</th>
                                    <th className="text-left p-4 font-semibold text-slate-700">Email</th>
                                    <th className="text-left p-4 font-semibold text-slate-700">Rol</th>
                                    <th className="text-left p-4 font-semibold text-slate-700">Contraseña</th>
                                    <th className="text-right p-4 font-semibold text-slate-700">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="border-t border-slate-100 hover:bg-slate-50">
                                        <td className="p-4">{user.name}</td>
                                        <td className="p-4 text-slate-600">{user.email}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                user.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                {user.role === 'admin' ? 'Administrador' :
                                                    user.role === 'teacher' ? 'Profesor' : 'Estudiante'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleResetPassword(user.id)}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                            >
                                                Restablecer
                                            </button>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="text-red-600 hover:text-red-800 p-2"
                                                title="Eliminar usuario"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>
            )}

            {activeTab === 'courses' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Button onClick={() => setShowCreateCourse(true)}>
                            <Plus size={18} className="mr-2" /> Crear Clase
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {courses.map(course => (
                            <Card key={course.id} className="p-6 hover:shadow-lg transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">{course.title}</h3>
                                        <p className="text-sm text-slate-500">{course.code}</p>
                                    </div>
                                    <span className="text-3xl">{course.settings?.icon || '📚'}</span>
                                </div>
                                <div className="space-y-2">
                                    <Button
                                        variant="secondary"
                                        className="w-full"
                                        onClick={() => setShowAssignTeacher(course.id)}
                                    >
                                        <UserPlus size={16} className="mr-2" /> Asignar Profesor
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="w-full"
                                        onClick={() => setShowAssignStudents(course.id)}
                                    >
                                        <GraduationCap size={16} className="mr-2" /> Asignar Estudiantes
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'credentials' && (
                <CredentialsManager />
            )}

            {/* Modal: Create User */}
            {showCreateUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Crear Usuario</h2>
                            <button onClick={() => setShowCreateUser(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre</label>
                                <input
                                    type="text"
                                    required
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    className="w-full p-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full p-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Contraseña</label>
                                <input
                                    type="text"
                                    required
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full p-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Rol</label>
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                    className="w-full p-2 border rounded-lg"
                                >
                                    <option value="student">Estudiante</option>
                                    <option value="teacher">Profesor</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                            <Button type="submit" className="w-full">Crear Usuario</Button>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal: Create Course */}
            {showCreateCourse && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Crear Clase</h2>
                            <button onClick={() => setShowCreateCourse(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateCourse} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Código</label>
                                <input
                                    type="text"
                                    required
                                    value={newCourse.code}
                                    onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                                    className="w-full p-2 border rounded-lg"
                                    placeholder="MATH101"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Título</label>
                                <input
                                    type="text"
                                    required
                                    value={newCourse.title}
                                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                                    className="w-full p-2 border rounded-lg"
                                    placeholder="Matemáticas Avanzadas"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Icono</label>
                                <input
                                    type="text"
                                    value={newCourse.icon}
                                    onChange={(e) => setNewCourse({ ...newCourse, icon: e.target.value })}
                                    className="w-full p-2 border rounded-lg"
                                    placeholder="📚"
                                />
                            </div>
                            <Button type="submit" className="w-full">Crear Clase</Button>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal: Assign Teacher */}
            {showAssignTeacher && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Asignar Profesor</h2>
                            <button onClick={() => setShowAssignTeacher(null)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-2">
                            {teachers.map(teacher => (
                                <button
                                    key={teacher.id}
                                    onClick={() => handleAssignTeacher(showAssignTeacher, teacher.id)}
                                    className="w-full p-3 text-left border rounded-lg hover:bg-blue-50 transition-colors"
                                >
                                    <p className="font-semibold">{teacher.name}</p>
                                    <p className="text-sm text-slate-600">{teacher.email}</p>
                                </button>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* Modal: Assign Students */}
            {showAssignStudents && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Asignar Estudiantes</h2>
                            <button onClick={() => { setShowAssignStudents(null); setSelectedStudents([]); }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-2 mb-4">
                            {students.map(student => (
                                <label
                                    key={student.id}
                                    className="flex items-center p-3 border rounded-lg hover:bg-green-50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedStudents.includes(student.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedStudents([...selectedStudents, student.id]);
                                            } else {
                                                setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                                            }
                                        }}
                                        className="mr-3"
                                    />
                                    <div className="flex-1">
                                        <p className="font-semibold">{student.name}</p>
                                        <p className="text-sm text-slate-600">{student.email}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                        <Button
                            onClick={() => handleAssignStudents(showAssignStudents)}
                            disabled={selectedStudents.length === 0}
                            className="w-full"
                        >
                            Asignar {selectedStudents.length} estudiante(s)
                        </Button>
                    </Card>
                </div>
            )}
        </div>
    );
}
