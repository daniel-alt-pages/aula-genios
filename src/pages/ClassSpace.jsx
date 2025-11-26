import React, { useState, useEffect } from 'react';
import {
    MessageSquare, Users, BookOpen, Video, Calendar,
    MoreVertical, Send, Award, CheckCircle,
    Clock, ArrowLeft, Plus, GripVertical, Edit2, Settings, Trash2, Sparkles,
    ChevronRight, ChevronLeft, Lock, Unlock
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import ClassChat from '../components/ClassChat';
import ClassForum from '../components/ClassForum';
import { GoogleIntegrationService } from '../services/GoogleIntegrationService';
import { FileManager } from '../lib/fileManager';
import { db } from '../lib/db';
import UploadMaterialModal from '../components/UploadMaterialModal';

export default function ClassSpace({ classId, onBack }) {
    const { user } = useAuth();
    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
    const [activeTab, setActiveTab] = useState('stream');
    const [loading, setLoading] = useState(true);

    // Data state
    const [classData, setClassData] = useState(null);
    const [modules, setModules] = useState([]);
    const [streamPosts, setStreamPosts] = useState([]);
    const [classMaterials, setClassMaterials] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [editForm, setEditForm] = useState({ title: '', code: '', description: '', icon: '', color: '' });

    useEffect(() => {
        const fetchClassData = async () => {
            try {
                // Cargar datos de la clase desde API
                const allClasses = await api.courses.getAll();
                const foundClass = allClasses.find(c => c.id === classId);
                setClassData(foundClass);

                if (foundClass) {
                    // Parse settings if string
                    const settings = typeof foundClass.settings === 'string'
                        ? JSON.parse(foundClass.settings || '{}')
                        : foundClass.settings || {};

                    setEditForm({
                        title: foundClass.title,
                        code: foundClass.code,
                        description: foundClass.description || '',
                        icon: settings.icon || '📚',
                        color: settings.color || 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600'
                    });
                }

                // Cargar posts del tablón (TODO: API)
                // const posts = await api.posts.getAll(classId);
                const posts = db.get('posts').filter(p => p.classId === classId);
                setStreamPosts(posts);

                // Cargar materiales de la clase (TODO: API)
                // const materials = await api.materials.getAll(classId);
                const materials = db.get('materials').filter(m => m.classId === classId);
                setClassMaterials(materials);

                // Cargar módulos (si existen en db)
                setModules([]);
            } catch (error) {
                console.error("Error loading class data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchClassData();
    }, [classId]);

    const handleDeleteMaterial = (materialId) => {
        if (window.confirm('¿Estás seguro de eliminar este material?')) {
            db.delete('materials', materialId);
            setClassMaterials(classMaterials.filter(m => m.id !== materialId));
        }
    };

    const handleMaterialUploaded = (newMaterial) => {
        setClassMaterials([newMaterial, ...classMaterials]);
    };

    const handleUpdateClass = async (e) => {
        e.preventDefault();
        try {
            // In a real app, we would call api.courses.update(classId, editForm)
            // For now, we update the local state and db
            const updatedClass = {
                ...classData,
                title: editForm.title,
                code: editForm.code,
                description: editForm.description,
                settings: {
                    ...classData.settings,
                    icon: editForm.icon,
                    color: editForm.color
                }
            };

            // Update DB
            const allClasses = db.get('classes');
            const index = allClasses.findIndex(c => c.id === parseInt(classId));
            if (index !== -1) {
                allClasses[index] = updatedClass;
                db.save('classes', allClasses);
            }

            // Also try to update via API if available
            try {
                await api.courses.update(classId, updatedClass);
            } catch (err) {
                console.warn('API update failed, falling back to local DB', err);
            }

            setClassData(updatedClass);
            setShowSettingsModal(false);
            alert('Clase actualizada correctamente');
        } catch (error) {
            console.error('Error updating class:', error);
            alert('Error al actualizar la clase');
        }
    };

    const handleCreateMeet = async () => {
        const meet = await GoogleIntegrationService.meet.createMeeting();
        const newPost = {
            id: Date.now(),
            author: user.name,
            content: `📞 He iniciado una videollamada para la clase.\nUnirse aquí: ${meet.url}`,
            date: 'Ahora mismo',
            comments: [],
            isMeet: true,
            type: 'post'
        };
        setStreamPosts([newPost, ...streamPosts]);
        window.open(meet.url, '_blank');
    };

    if (loading) return <div className="h-screen flex items-center justify-center">Cargando clase...</div>;
    if (!classData) return <div className="h-screen flex items-center justify-center">Clase no encontrada</div>;

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 overflow-hidden">
            {/* Header Futurista con Glassmorphism */}
            <div className="relative h-56 flex-shrink-0 overflow-hidden">
                <div className={`absolute inset-0 ${classData.settings?.color || 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600'}`}></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
                <div className="absolute inset-0 backdrop-blur-3xl bg-white/10"></div>

                <div className="relative z-10 h-full p-6 flex flex-col justify-between text-white">
                    <div className="flex justify-between items-start">
                        <Button variant="ghost" onClick={onBack} className="text-white hover:bg-white/20 backdrop-blur-sm border border-white/20">
                            <ArrowLeft size={20} className="mr-2" /> Volver
                        </Button>
                        <div className="flex gap-2">
                            {isTeacher && (
                                <Button onClick={handleCreateMeet} className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse">
                                    <Video size={18} className="mr-2" /> Clase en Vivo
                                </Button>
                            )}
                            <Button variant="ghost" onClick={() => setShowSettingsModal(true)} className="text-white hover:bg-white/20 backdrop-blur-sm border border-white/20">
                                <Settings size={20} />
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-5xl">{classData.settings?.icon || '📚'}</span>
                            <div>
                                <h1 className="text-4xl font-black tracking-tight drop-shadow-lg">{classData.title}</h1>
                                <p className="text-blue-100 text-lg font-medium">{classData.code}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navegación de Pestañas Moderna */}
            <div className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'stream', label: 'Tablón', icon: MessageSquare },
                            { id: 'materials', label: 'Materiales', icon: BookOpen },
                            { id: 'modules', label: 'Módulos', icon: BookOpen },
                            { id: 'forum', label: 'Foros', icon: MessageSquare },
                            { id: 'people', label: 'Personas', icon: Users },
                            ...(isTeacher ? [{ id: 'grades', label: 'Calificaciones', icon: Award }] : [])
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-all duration-300 whitespace-nowrap relative group ${activeTab === tab.id
                                    ? 'text-blue-600'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                <tab.icon size={18} className={activeTab === tab.id ? 'animate-pulse' : ''} />
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-full"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                    {/* STREAM */}
                    {activeTab === 'stream' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Sidebar */}
                            <div className="lg:col-span-3 space-y-4 order-2 lg:order-1">
                                <Card className="p-5 bg-gradient-to-br from-white to-blue-50/50 border-blue-100 shadow-lg">
                                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                        <Clock size={16} className="text-blue-600" />
                                        Próximas entregas
                                    </h3>
                                    <p className="text-sm text-slate-600 mb-3">No tienes tareas pendientes para esta semana.</p>
                                </Card>
                            </div>

                            {/* Feed */}
                            <div className="lg:col-span-9 space-y-5 order-1 lg:order-2">
                                <Card className="p-5 flex gap-4 items-center cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all duration-300 bg-gradient-to-r from-white to-blue-50/30 border-blue-100">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                                        {user.name[0]}
                                    </div>
                                    <div className="flex-1 text-slate-500 font-medium hover:text-slate-700 transition-colors">
                                        Anuncia algo a la clase...
                                    </div>
                                </Card>

                                {streamPosts.map(post => (
                                    <Card key={post.id} className={`overflow-hidden hover:shadow-xl transition-all duration-300 ${post.isMeet ? 'border-l-4 border-orange-500 bg-gradient-to-r from-orange-50/50 to-white' : 'bg-white'}`}>
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${post.type === 'system' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-purple-500 to-pink-500'}`}>
                                                        {post.type === 'system' ? <BookOpen size={22} /> : post.author[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{post.author}</p>
                                                        <p className="text-sm text-slate-500">{post.date}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">{post.content}</div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* MATERIALS (Gestión de Materiales) */}
                    {activeTab === 'materials' && (
                        <div className="space-y-6">
                            {/* Header con botón de subida */}
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">📚 Materiales de Clase</h2>
                                    <p className="text-slate-600 mt-1">Recursos y archivos compartidos</p>
                                </div>
                                {isTeacher && (
                                    <Button
                                        onClick={() => setShowUploadModal(true)}
                                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                    >
                                        <Plus size={18} className="mr-2" />
                                        Subir Material
                                    </Button>
                                )}
                            </div>

                            {/* Lista de materiales */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {classMaterials.length === 0 ? (
                                    <div className="col-span-full text-center py-12">
                                        <BookOpen size={64} className="mx-auto text-slate-300 mb-4" />
                                        <p className="text-slate-500 text-lg">No hay materiales publicados aún</p>
                                        {isTeacher && (
                                            <p className="text-slate-400 text-sm mt-2">Haz click en "Subir Material" para comenzar</p>
                                        )}
                                    </div>
                                ) : (
                                    classMaterials.map(material => (
                                        <Card
                                            key={material.id}
                                            className="p-5 hover:shadow-xl transition-all duration-300 cursor-pointer group"
                                            onClick={() => {
                                                if (material.type === 'link') {
                                                    window.open(material.url, '_blank');
                                                } else {
                                                    setSelectedMaterial(material);
                                                }
                                            }}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="text-5xl flex-shrink-0 group-hover:scale-110 transition-transform">
                                                    {material.type === 'link' ? '🔗' : FileManager.getFileIcon(material.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                                                        {material.title}
                                                    </h3>
                                                    {material.description && (
                                                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                                            {material.description}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                                                        <span>👤 {material.uploadedBy}</span>
                                                        <span>•</span>
                                                        <span>{new Date(material.uploadDate).toLocaleDateString()}</span>
                                                        {material.fileSize && (
                                                            <>
                                                                <span>•</span>
                                                                <span>{FileManager.formatSize(material.fileSize)}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {isTeacher && (
                                                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteMaterial(material.id);
                                                        }}
                                                        className="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-sm font-medium transition-colors"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            )}
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* MODULES (Linear Navigation) */}
                    {activeTab === 'modules' && (
                        <div className="space-y-8">
                            {modules.map((module, mIndex) => (
                                <div key={module.id} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm">Módulo {module.sequence_order}</span>
                                            {module.title}
                                        </h3>
                                        {module.unlock_at && (
                                            <span className="text-sm text-slate-500 flex items-center gap-1">
                                                <Lock size={14} /> Se desbloquea: {new Date(module.unlock_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {module.items.map((item, iIndex) => (
                                            <Card
                                                key={item.id}
                                                className={`p-4 flex items-center gap-4 transition-all duration-300 ${item.status === 'LOCKED'
                                                    ? 'opacity-60 bg-slate-50 cursor-not-allowed'
                                                    : 'hover:shadow-md hover:border-blue-300 cursor-pointer bg-white'
                                                    }`}
                                                onClick={() => {
                                                    if (item.status !== 'LOCKED') {
                                                        // Handle item click - open resource or navigate
                                                        if (item.resource_url) window.open(item.resource_url, '_blank');
                                                        else alert(`Abriendo: ${item.title}`);
                                                    }
                                                }}
                                            >
                                                <div className={`p-3 rounded-xl ${item.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                                                    item.status === 'LOCKED' ? 'bg-slate-200 text-slate-400' :
                                                        'bg-blue-100 text-blue-600'
                                                    }`}>
                                                    {item.status === 'COMPLETED' ? <CheckCircle size={24} /> :
                                                        item.status === 'LOCKED' ? <Lock size={24} /> :
                                                            item.type === 'VIDEO' ? <Video size={24} /> :
                                                                item.type === 'QUIZ' ? <Award size={24} /> :
                                                                    <BookOpen size={24} />}
                                                </div>

                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-800">{item.title}</h4>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                        <span className="uppercase font-semibold tracking-wider">{item.type}</span>
                                                        {item.metadata?.duration && <span>• {item.metadata.duration}</span>}
                                                        {item.metadata?.points && <span>• {item.metadata.points} pts</span>}
                                                    </div>
                                                </div>

                                                {item.status !== 'LOCKED' && (
                                                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-blue-600">
                                                        <ChevronRight size={20} />
                                                    </Button>
                                                )}
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* FORUM */}
                    {activeTab === 'forum' && <ClassForum classId={classId} />}

                    {/* PEOPLE */}
                    {activeTab === 'people' && (
                        <div className="text-center py-10 text-slate-500">
                            <p>Lista de personas (Próximamente)</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de subida de materiales */}
            {showUploadModal && (
                <UploadMaterialModal
                    classId={classId}
                    onClose={() => setShowUploadModal(false)}
                    onSuccess={handleMaterialUploaded}
                />
            )}

            {/* Modal de Configuración de Clase */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-xl">Configuración de la Clase</h3>
                            <button onClick={() => setShowSettingsModal(false)}><X className="text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleUpdateClass} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre de la Clase</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Código del Curso</label>
                                <input
                                    type="text"
                                    value={editForm.code}
                                    onChange={e => setEditForm({ ...editForm, code: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Icono (Emoji)</label>
                                <input
                                    type="text"
                                    value={editForm.icon}
                                    onChange={e => setEditForm({ ...editForm, icon: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    maxLength={2}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Tema de Color</label>
                                <select
                                    value={editForm.color}
                                    onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">Galaxia (Azul/Rosa)</option>
                                    <option value="bg-gradient-to-br from-emerald-500 to-teal-700">Naturaleza (Verde)</option>
                                    <option value="bg-gradient-to-br from-orange-500 to-red-600">Atardecer (Naranja/Rojo)</option>
                                    <option value="bg-gradient-to-br from-slate-700 to-slate-900">Oscuro (Gris)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button variant="ghost" type="button" onClick={() => setShowSettingsModal(false)}>Cancelar</Button>
                                <Button type="submit">Guardar Cambios</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
