import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { ImageService } from '../services/ImageService';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Camera, Save, User, Mail, Lock, Loader, Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        bio: user?.bio || '',
        password: ''
    });
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');

    // System Settings (Admin only)
    const [systemSettings, setSystemSettings] = useState({});
    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (isAdmin) {
            loadSystemSettings();
        }
    }, [isAdmin]);

    const loadSystemSettings = async () => {
        try {
            const data = await api.settings.getAll();
            setSystemSettings(data.settings || {});
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
            // 1. Subir a ImgBB
            const url = await ImageService.uploadImage(file);
            setAvatarUrl(url);

            // 2. Guardar en API
            await api.users.update(user.id, {
                profile_data: { ...user, avatar: url }
            });

            // Recargar para reflejar cambios (o actualizar contexto si fuera posible)
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert('Error al subir imagen.');
            setLoading(false);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const updateData = {
                name: formData.name,
                email: formData.email,
                profile_data: { ...user, bio: formData.bio }
            };

            // Solo enviar password si se cambió
            if (formData.password) {
                // Nota: El endpoint de update usuario debería manejar cambio de password si se envía
                // Por ahora asumimos que el backend lo maneja o ignoramos si no está implementado
            }

            await api.users.update(user.id, updateData);
            alert('Perfil actualizado correctamente. Por favor recarga la página.');
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert('Error al guardar perfil.');
            setLoading(false);
        }
    };

    const handleSaveSystemSettings = async () => {
        try {
            await api.settings.update(systemSettings);
            alert('Ajustes del sistema guardados.');
        } catch (error) {
            alert('Error al guardar ajustes del sistema.');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold text-slate-800">Configuración</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Perfil */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="p-8">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <User className="text-blue-600" /> Perfil de Usuario
                        </h2>

                        <div className="flex flex-col items-center mb-8">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-slate-100">
                                    {avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data')) ? (
                                        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl">{avatarUrl || '👤'}</div>
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                                    {loading ? <Loader size={20} className="animate-spin" /> : <Camera size={20} />}
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={loading} />
                                </label>
                            </div>
                        </div>

                        <form onSubmit={handleSaveProfile} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Nombre Completo</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Correo Electrónico</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Nueva Contraseña (opcional)</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Dejar en blanco para mantener la actual"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Biografía</label>
                                <textarea
                                    value={formData.bio}
                                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                                <Save size={20} className="mr-2" /> Guardar Perfil
                            </Button>
                        </form>
                    </Card>
                </div>

                {/* Ajustes del Sistema (Admin) */}
                {isAdmin && (
                    <div className="md:col-span-1 space-y-6">
                        <Card className="p-6 border-l-4 border-purple-500">
                            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <SettingsIcon className="text-purple-600" /> Ajustes del Sistema
                            </h2>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700">Modo Mantenimiento</span>
                                    <button
                                        onClick={() => setSystemSettings({ ...systemSettings, maintenance: !systemSettings.maintenance })}
                                        className={`w-12 h-6 rounded-full relative transition-colors ${systemSettings.maintenance ? 'bg-purple-600' : 'bg-slate-200'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${systemSettings.maintenance ? 'right-1' : 'left-1'}`}></div>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700">Registro Público</span>
                                    <button
                                        onClick={() => setSystemSettings({ ...systemSettings, public_registration: !systemSettings.public_registration })}
                                        className={`w-12 h-6 rounded-full relative transition-colors ${systemSettings.public_registration ? 'bg-green-500' : 'bg-slate-200'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${systemSettings.public_registration ? 'right-1' : 'left-1'}`}></div>
                                    </button>
                                </div>

                                <div className="pt-4">
                                    <Button onClick={handleSaveSystemSettings} variant="secondary" className="w-full">
                                        Guardar Ajustes
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
