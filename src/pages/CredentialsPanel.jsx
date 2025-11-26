import React, { useState, useEffect } from 'react';
import { Key, Download, Eye, EyeOff, Copy, Check, Search, Filter } from 'lucide-react';
import { db } from '../lib/db';
import { loadStudentsFromCSV } from '../lib/csvParser';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function CredentialsPanel() {
    const [credentials, setCredentials] = useState([]);
    const [filteredCreds, setFilteredCreds] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPasswords, setShowPasswords] = useState({});
    const [copiedId, setCopiedId] = useState(null);
    const [filterRole, setFilterRole] = useState('all');

    useEffect(() => {
        loadCredentials();
    }, []);

    useEffect(() => {
        filterCredentials();
    }, [searchTerm, filterRole, credentials]);

    const loadCredentials = async () => {
        // Cargar usuarios del sistema
        const users = db.get('users');

        // Cargar estudiantes del CSV
        let students = db.get('students');
        if (students.length === 0) {
            students = await loadStudentsFromCSV();
            db.setAll('students', students);
        }

        // Combinar todos los usuarios
        const allUsers = [...users, ...students];

        // Generar credenciales (en producción, estas vendrían de la BD)
        const creds = allUsers.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role || 'student',
            password: user.password || 'genios2025', // Contraseña por defecto
            plan: user.plan || 'Plan Básico',
            status: user.status || 'Activo',
            docId: user.docId || 'N/A'
        }));

        setCredentials(creds);
        setFilteredCreds(creds);
    };

    const filterCredentials = () => {
        let filtered = credentials;

        // Filtrar por rol
        if (filterRole !== 'all') {
            filtered = filtered.filter(c => c.role === filterRole);
        }

        // Filtrar por búsqueda
        if (searchTerm) {
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.docId.includes(searchTerm)
            );
        }

        setFilteredCreds(filtered);
    };

    const togglePasswordVisibility = (id) => {
        setShowPasswords(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const exportToCSV = () => {
        const headers = ['Nombre', 'Email', 'Contraseña', 'Rol', 'Plan', 'Documento', 'Estado'];
        const rows = filteredCreds.map(c => [
            c.name,
            c.email,
            c.password,
            c.role === 'admin' ? 'Admin' : c.role === 'teacher' ? 'Profesor' : 'Estudiante',
            c.plan,
            c.docId,
            c.status
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `credenciales_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const getRoleBadge = (role) => {
        const styles = {
            admin: 'bg-orange-100 text-orange-700',
            teacher: 'bg-blue-100 text-blue-700',
            student: 'bg-green-100 text-green-700'
        };
        const labels = {
            admin: 'Admin',
            teacher: 'Profesor',
            student: 'Estudiante'
        };
        return (
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${styles[role] || styles.student}`}>
                {labels[role] || labels.student}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <Key className="text-blue-600" size={32} />
                        Gestión de Credenciales
                    </h1>
                    <p className="text-slate-500 mt-1">{filteredCreds.length} credenciales encontradas</p>
                </div>
                <Button onClick={exportToCSV}>
                    <Download size={18} /> Exportar CSV
                </Button>
            </div>

            {/* Filtros y Búsqueda */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Búsqueda */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email o documento..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filtro por Rol */}
                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-slate-400" />
                        <select
                            className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                        >
                            <option value="all">Todos los roles</option>
                            <option value="student">Estudiantes</option>
                            <option value="teacher">Profesores</option>
                            <option value="admin">Administradores</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Tabla de Credenciales */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Usuario</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Email</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Contraseña</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Rol</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Plan</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Estado</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCreds.map(cred => (
                                <tr key={cred.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-4">
                                        <div>
                                            <p className="font-medium text-slate-700">{cred.name}</p>
                                            <p className="text-xs text-slate-500">{cred.docId}</p>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-600">{cred.email}</span>
                                            <button
                                                onClick={() => copyToClipboard(cred.email, `email-${cred.id}`)}
                                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                            >
                                                {copiedId === `email-${cred.id}` ? (
                                                    <Check size={14} className="text-green-600" />
                                                ) : (
                                                    <Copy size={14} />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <code className="text-sm bg-slate-100 px-2 py-1 rounded">
                                                {showPasswords[cred.id] ? cred.password : '••••••••'}
                                            </code>
                                            <button
                                                onClick={() => togglePasswordVisibility(cred.id)}
                                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                            >
                                                {showPasswords[cred.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                            <button
                                                onClick={() => copyToClipboard(cred.password, `pass-${cred.id}`)}
                                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                            >
                                                {copiedId === `pass-${cred.id}` ? (
                                                    <Check size={14} className="text-green-600" />
                                                ) : (
                                                    <Copy size={14} />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        {getRoleBadge(cred.role)}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-600">
                                        {cred.plan}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${cred.status === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {cred.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <Button
                                            variant="ghost"
                                            className="text-xs"
                                            onClick={() => {
                                                copyToClipboard(`Email: ${cred.email}\nContraseña: ${cred.password}`, `full-${cred.id}`);
                                            }}
                                        >
                                            {copiedId === `full-${cred.id}` ? 'Copiado!' : 'Copiar Todo'}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{credentials.filter(c => c.role === 'student').length}</p>
                    <p className="text-sm text-slate-500 mt-1">Estudiantes</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{credentials.filter(c => c.role === 'teacher').length}</p>
                    <p className="text-sm text-slate-500 mt-1">Profesores</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{credentials.filter(c => c.role === 'admin').length}</p>
                    <p className="text-sm text-slate-500 mt-1">Administradores</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{credentials.filter(c => c.status === 'Activo').length}</p>
                    <p className="text-sm text-slate-500 mt-1">Activos</p>
                </Card>
            </div>
        </div>
    );
}
