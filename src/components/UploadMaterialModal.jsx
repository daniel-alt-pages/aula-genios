import React, { useState } from 'react';
import { X, Upload, File, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { FileManager } from '../lib/fileManager';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';

export default function UploadMaterialModal({ classId, onClose, onSuccess }) {
    const { user } = useAuth();
    const [type, setType] = useState('file');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (selectedFile) => {
        if (!FileManager.isValidType(selectedFile.type)) {
            setError('Tipo de archivo no válido. Solo PDF, imágenes y documentos de Office.');
            return;
        }
        if (selectedFile.size > 10 * 1024 * 1024) {
            setError('El archivo es demasiado grande. Máximo 10MB.');
            return;
        }
        setFile(selectedFile);
        setError('');
        if (!title) {
            setTitle(selectedFile.name);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setUploading(true);

        try {
            let material;
            const token = localStorage.getItem('token');

            if (type === 'file') {
                if (!file) {
                    setError('Selecciona un archivo');
                    setUploading(false);
                    return;
                }

                // Intentar subir a Google Drive
                let driveUrl = null;
                let driveFileId = null;

                if (token) {
                    try {
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('classId', classId);

                        const uploadResponse = await fetch('http://localhost:3001/api/drive/upload', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                            body: formData
                        });

                        if (uploadResponse.ok) {
                            const driveData = await uploadResponse.json();
                            driveUrl = driveData.file.webViewLink;
                            driveFileId = driveData.file.id;
                            console.log('✅ Archivo subido a Google Drive');
                        }
                    } catch (driveError) {
                        console.warn('⚠️ Google Drive no disponible, usando almacenamiento local');
                    }
                }

                // Si no se pudo subir a Drive, usar FileManager local
                if (!driveUrl) {
                    const fileData = await FileManager.uploadFile(file);
                    driveUrl = fileData.data;
                }

                material = {
                    id: Date.now(),
                    classId,
                    title,
                    description,
                    type: file.type,
                    url: driveUrl,
                    driveFileId: driveFileId,
                    fileName: file.name,
                    fileSize: file.size,
                    uploadedBy: user.name,
                    uploadedById: user.id,
                    uploadDate: new Date().toISOString(),
                    source: driveFileId ? 'google-drive' : 'local'
                };
            } else {
                if (!url) {
                    setError('Ingresa una URL');
                    setUploading(false);
                    return;
                }

                material = {
                    id: Date.now(),
                    classId,
                    title,
                    description,
                    type: 'link',
                    url,
                    uploadedBy: user.name,
                    uploadedById: user.id,
                    uploadDate: new Date().toISOString(),
                    source: 'external-link'
                };
            }

            db.add('materials', material);

            db.add('posts', {
                id: Date.now(),
                classId,
                author: user.name,
                authorAvatar: user.avatar,
                content: `📎 Nuevo material: ${title}${material.source === 'google-drive' ? ' ☁️' : ''}`,
                date: 'Ahora mismo',
                comments: [],
                type: 'system'
            });

            onSuccess && onSuccess(material);
            onClose();
        } catch (err) {
            console.error('Error:', err);
            setError(err.message || 'Error al subir el material');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-purple-50">
                    <h2 className="text-2xl font-bold text-slate-800">📎 Subir Material</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setType('file')}
                            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${type === 'file' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-800'
                                }`}
                        >
                            <Upload size={18} className="inline mr-2" />
                            Subir Archivo
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('link')}
                            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${type === 'link' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-800'
                                }`}
                        >
                            <LinkIcon size={18} className="inline mr-2" />
                            Link Externo
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Título del Material *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ej: Guía de Lectura Crítica"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Descripción (opcional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            rows="3"
                            placeholder="Describe brevemente el contenido..."
                        />
                    </div>

                    {type === 'file' && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Archivo *
                            </label>
                            <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'
                                    }`}
                            >
                                {file ? (
                                    <div className="space-y-3">
                                        <div className="text-5xl">{FileManager.getFileIcon(file.type)}</div>
                                        <p className="font-bold text-slate-800">{file.name}</p>
                                        <p className="text-sm text-slate-500">{FileManager.formatSize(file.size)}</p>
                                        <button
                                            type="button"
                                            onClick={() => setFile(null)}
                                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <Upload size={48} className="mx-auto text-slate-400" />
                                        <p className="text-slate-600 font-medium">
                                            Arrastra un archivo aquí o haz click para seleccionar
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            PDF, imágenes, Word, Excel (máx 10MB)
                                        </p>
                                        <input
                                            type="file"
                                            onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                                            className="hidden"
                                            id="file-upload"
                                            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                                        >
                                            Seleccionar Archivo
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {type === 'link' && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                URL del Material *
                            </label>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="https://drive.google.com/..."
                                required={type === 'link'}
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                Puedes usar links de Google Drive, YouTube, etc.
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1"
                            disabled={uploading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            disabled={uploading}
                        >
                            {uploading ? 'Subiendo...' : 'Publicar Material'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
