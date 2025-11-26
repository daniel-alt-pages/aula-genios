import React, { useState, useEffect } from 'react';
import { Download, Plus, Edit, Trash2, X, Save, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function CredentialsManager() {
    const [credentials, setCredentials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showPasswords, setShowPasswords] = useState({});

    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        rol: 'student',
        avatar: ''
    });

    useEffect(() => {
        loadCredentials();
    }, []);

    const loadCredentials = async () => {
        try {
            const response = await api.credentials.getAll();
            setCredentials(response.usuarios || []);
        } catch (error) {
            console.error('Error loading credentials:', error);
            alert('Error al cargar credenciales');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.credentials.create(formData);
            alert('✅ Usuario creado exitosamente');
            setShowCreateModal(false);
            resetForm();
            loadCredentials();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.credentials.update(selectedUser.id, formData);
            alert('✅ Usuario actualizado exitosamente');
            setShowEditModal(false);
            resetForm();
            loadCredentials();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleDelete = async (userId) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
        try {
            await api.credentials.delete(userId);
            alert('✅ Usuario eliminado exitosamente');
            loadCredentials();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleExport = async () => {
        try {
            await api.credentials.exportCSV();
        } catch (error) {
            alert('Error al exportar credenciales');
        }
    };

    const resetForm = () => {
        setFormData({
            nombre: '',
            email: '',
            password: '',
            rol: 'student',
            avatar: ''
        });
        setSelectedUser(null);
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({
            nombre: user.nombre,
            email: user.email,
            password: user.password,
            rol: user.rol,
            avatar: user.avatar || ''
        });
        setShowEditModal(true);
    };

    const togglePasswordVisibility = (userId) => {
        setShowPasswords(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };

    const getRoleColor = (rol) => {
        switch (rol) {
            case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'teacher': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'student': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getRoleLabel = (rol) => {
        switch (rol) {
            case 'admin': return '👑 Administrador';
            case 'teacher': return '👨‍🏫 Profesor';
            case 'student': return '👨‍🎓 Estudiante';
            default: return rol;
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando credenciales...</div>;

    const admins = credentials.filter(u => u.rol === 'admin');
    const teachers = credentials.filter(u => u.rol === 'teacher');
    const students = credentials.filter(u => u.rol === 'student');

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">🔐 Gestión de Credenciales</h2>
                        <p className="text-indigo-100">
                            Total de usuarios: {credentials.length} ({admins.length} admins, {teachers.length} profesores, {students.length} estudiantes)
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            onClick={handleExport}
                            className="bg-white text-indigo-600 hover:bg-indigo-50"
                        >
                            <Download size={18} className="mr-2" />
                            Exportar CSV
                        </Button>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-white text-indigo-600 hover:bg-indigo-50"
                        >
                            <Plus size={18} className="mr-2" />
                            Nuevo Usuario
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Credentials Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left p-4 font-semibold text-slate-700">Usuario</th>
                                <th className="text-left p-4 font-semibold text-slate-700">Email</th>
                                <th className="text-left p-4 font-semibold text-slate-700">Contraseña</th>
                                <th className="text-left p-4 font-semibold text-slate-700">Rol</th>
                                <th className="text-left p-4 font-semibold text-slate-700">Estado</th>
                                <th className="text-right p-4 font-semibold text-slate-700">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {credentials.map(user => (
                                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{user.avatar || '👤'}</span>
                                            <div>
                                                <p className="font-semibold text-slate-800">{user.nombre}</p>
                                                <p className="text-xs text-slate-500">ID: {user.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-600">{user.email}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <code className="bg-slate-100 px-3 py-1 rounded text-slate-700 font-mono text-sm">
                                                {showPasswords[user.id] ? user.password : '••••••••'}
                                            </code>
                                            <button
                                                onClick={() => togglePasswordVisibility(user.id)}
                                                className="text-slate-400 hover:text-slate-600"
                                            >
                                                {showPasswords[user.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.rol)}`}>
                                            {getRoleLabel(user.rol)}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.activo
                                                ? 'bg-green-100 text-green-700 border border-green-200'
                                                : 'bg-red-100 text-red-700 border border-red-200'
                                            }`}>
                                            {user.activo ? '✓ Activo' : '✗ Inactivo'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Editar usuario"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Eliminar usuario"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Crear Nuevo Usuario</h2>
                            <button onClick={() => { setShowCreateModal(false); resetForm(); }}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Juan Pérez"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="usuario@ejemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Contraseña</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Contraseña segura"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Rol</label>
                                <select
                                    value={formData.rol}
                                    onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="student">👨‍🎓 Estudiante</option>
                                    <option value="teacher">👨‍🏫 Profesor</option>
                                    <option value="admin">👑 Administrador</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Avatar (Emoji)</label>
                                <input
                                    type="text"
                                    value={formData.avatar}
                                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="😊 (opcional)"
                                    maxLength={2}
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                <Save size={18} className="mr-2" />
                                Crear Usuario
                            </Button>
                        </form>
                    </Card>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Editar Usuario</h2>
                            <button onClick={() => { setShowEditModal(false); resetForm(); }}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Contraseña</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Rol</label>
                                <select
                                    value={formData.rol}
                                    onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="student">👨‍🎓 Estudiante</option>
                                    <option value="teacher">👨‍🏫 Profesor</option>
                                    <option value="admin">👑 Administrador</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Avatar (Emoji)</label>
                                <input
                                    type="text"
                                    value={formData.avatar}
                                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    maxLength={2}
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                <Save size={18} className="mr-2" />
                                Guardar Cambios
                            </Button>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
