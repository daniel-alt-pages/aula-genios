import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Search, Download, X } from 'lucide-react';
import { db } from '../lib/db';
import { loadStudentsFromCSV } from '../lib/csvParser';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function StudentManagement() {
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        docType: 'T.I.',
        docId: '',
        plan: 'Plan Básico',
        status: 'Activo',
        paymentDate: ''
    });

    useEffect(() => {
        loadStudents();
    }, []);

    useEffect(() => {
        if (searchTerm) {
            const filtered = students.filter(s =>
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.docId.includes(searchTerm)
            );
            setFilteredStudents(filtered);
        } else {
            setFilteredStudents(students);
        }
    }, [searchTerm, students]);

    const loadStudents = async () => {
        let existingStudents = db.get('students');
        if (existingStudents.length === 0) {
            const csvStudents = await loadStudentsFromCSV();
            db.setAll('students', csvStudents);
            existingStudents = csvStudents;
        }
        setStudents(existingStudents);
        setFilteredStudents(existingStudents);
    };

    const handleAdd = () => {
        setEditingStudent(null);
        setFormData({
            name: '',
            email: '',
            docType: 'T.I.',
            docId: '',
            plan: 'Plan Básico',
            status: 'Activo',
            paymentDate: ''
        });
        setShowModal(true);
    };

    const handleEdit = (student) => {
        setEditingStudent(student);
        setFormData({
            name: student.name,
            email: student.email,
            docType: student.docType,
            docId: student.docId,
            plan: student.plan,
            status: student.status,
            paymentDate: student.paymentDate
        });
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de eliminar este estudiante?')) {
            db.remove('students', id);
            loadStudents();
        }
    };

    const handleSave = () => {
        if (!formData.name || !formData.email) {
            alert('Por favor completa los campos obligatorios');
            return;
        }

        if (editingStudent) {
            db.update('students', editingStudent.id, formData);
        } else {
            const newStudent = {
                ...formData,
                role: 'student',
                avatar: '👨‍🎓',
                password: 'genios2025',
                stats: { xp: 0, level: 1, badges: [], coins: 0 }
            };
            db.add('students', newStudent);
        }

        setShowModal(false);
        loadStudents();
    };

    const getPlanColor = (plan) => {
        if (plan.includes('Premium')) return 'bg-purple-100 text-purple-700';
        if (plan.includes('Intermedio')) return 'bg-blue-100 text-blue-700';
        return 'bg-slate-100 text-slate-700';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="text-blue-600" />
                        Gestión de Estudiantes
                    </h2>
                    <p className="text-slate-500 mt-1">{students.length} estudiantes registrados</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={loadStudents}>
                        <Download size={18} /> Recargar CSV
                    </Button>
                    <Button onClick={handleAdd}>
                        <Plus size={18} /> Agregar Estudiante
                    </Button>
                </div>
            </div>

            <Card className="p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email o documento..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Estudiante</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Documento</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Plan</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Estado</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Fecha Pago</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map(student => (
                                <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="text-2xl">{student.avatar || '👨‍🎓'}</div>
                                            <div>
                                                <p className="font-medium text-slate-700">{student.name}</p>
                                                <p className="text-xs text-slate-500">{student.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-600">
                                        {student.docType} {student.docId}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getPlanColor(student.plan)}`}>
                                            {student.plan}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${student.status === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {student.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-600">
                                        {student.paymentDate}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" className="text-xs" onClick={() => handleEdit(student)}>
                                                <Edit size={16} />
                                            </Button>
                                            <Button variant="ghost" className="text-xs text-red-600 hover:bg-red-50" onClick={() => handleDelete(student.id)}>
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {showModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-2xl p-8 shadow-2xl">
                        <div className="flex justify-between mb-6">
                            <h3 className="font-bold text-2xl text-slate-800">
                                {editingStudent ? 'Editar Estudiante' : 'Nuevo Estudiante'}
                            </h3>
                            <button onClick={() => setShowModal(false)}>
                                <X className="text-slate-400 hover:text-slate-600" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Nombre Completo *</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                                <input
                                    type="email"
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Documento</label>
                                    <select
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.docType}
                                        onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
                                    >
                                        <option>T.I.</option>
                                        <option>CC</option>
                                        <option>CE</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Número de Documento</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.docId}
                                        onChange={(e) => setFormData({ ...formData, docId: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Plan</label>
                                    <select
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.plan}
                                        onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                                    >
                                        <option>Plan Básico</option>
                                        <option>Plan Intermedio</option>
                                        <option>Plan Premium</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>
                                    <select
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option>Activo</option>
                                        <option>Inactivo</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Fecha de Pago</label>
                                <input
                                    type="date"
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.paymentDate}
                                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="ghost" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleSave}>
                                    Guardar
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
