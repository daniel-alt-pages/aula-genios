import React, { useState, useEffect } from 'react';
import {
    Upload,
    FolderPlus,
    Search,
    Grid,
    List,
    Download,
    Share2,
    Trash2,
    Eye,
    FileText,
    Image as ImageIcon,
    Film,
    File,
    Folder,
    RefreshCw,
    Cloud,
    AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

export default function DrivePanel() {
    const { user } = useAuth();
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' o 'list'
    const [searchQuery, setSearchQuery] = useState('');
    const [driveStatus, setDriveStatus] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    const token = localStorage.getItem('token');

    // Verificar estado de Google Drive al cargar
    useEffect(() => {
        checkDriveStatus();
        loadFiles();
    }, []);

    const checkDriveStatus = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/drive/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setDriveStatus(data);
        } catch (error) {
            console.error('Error al verificar estado:', error);
        }
    };

    const loadFiles = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/drive/files?pageSize=50', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setFiles(data.files);
            }
        } catch (error) {
            console.error('Error al cargar archivos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadProgress('Subiendo a Google Drive...');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:3001/api/drive/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                setUploadProgress('¡Archivo subido exitosamente!');
                setTimeout(() => setUploadProgress(null), 3000);
                loadFiles();
            } else {
                setUploadProgress('Error al subir archivo');
            }
        } catch (error) {
            console.error('Error:', error);
            setUploadProgress('Error al subir archivo');
        }
    };

    const handleCreateFolder = async () => {
        const folderName = prompt('Nombre de la nueva carpeta:');
        if (!folderName) return;

        try {
            const response = await fetch('http://localhost:3001/api/drive/folders', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ folderName })
            });

            const data = await response.json();
            if (data.success) {
                alert(`Carpeta "${folderName}" creada exitosamente`);
                loadFiles();
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al crear carpeta');
        }
    };

    const handleDelete = async (fileId, fileName) => {
        if (!confirm(`¿Eliminar "${fileName}"?`)) return;

        try {
            const response = await fetch(`http://localhost:3001/api/drive/files/${fileId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success) {
                alert('Archivo eliminado');
                loadFiles();
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al eliminar archivo');
        }
    };

    const handleShare = async (fileId, fileName) => {
        const email = prompt(`Compartir "${fileName}" con (email):\n(Deja vacío para hacer público)`);

        try {
            const response = await fetch(`http://localhost:3001/api/drive/share/${fileId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email || null,
                    role: 'reader'
                })
            });

            const data = await response.json();
            if (data.success) {
                alert(email ? `Compartido con ${email}` : 'Archivo ahora es público');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al compartir');
        }
    };

    const getFileIcon = (mimeType) => {
        if (mimeType.includes('folder')) return <Folder className="text-yellow-500" size={40} />;
        if (mimeType.includes('image')) return <ImageIcon className="text-blue-500" size={40} />;
        if (mimeType.includes('video')) return <Film className="text-purple-500" size={40} />;
        if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileText className="text-red-500" size={40} />;
        return <File className="text-gray-500" size={40} />;
    };

    const formatSize = (bytes) => {
        if (!bytes) return 'N/A';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const filteredFiles = files.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <Cloud className="text-blue-500" size={36} />
                        Google Drive
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Gestiona tus archivos en la nube
                    </p>
                </div>

                {/* Estado de conexión */}
                {driveStatus && (
                    <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${driveStatus.initialized
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${driveStatus.initialized ? 'bg-green-500' : 'bg-yellow-500'
                            }`} />
                        {driveStatus.initialized ? 'Conectado' : 'Desconectado'}
                    </div>
                )}
            </div>

            {/* Barra de acciones */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Búsqueda */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar archivos..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-2">
                        <label className="cursor-pointer">
                            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                                <Upload size={18} className="mr-2" />
                                Subir Archivo
                            </Button>
                            <input
                                type="file"
                                onChange={handleUpload}
                                className="hidden"
                            />
                        </label>

                        <Button
                            onClick={handleCreateFolder}
                            variant="outline"
                        >
                            <FolderPlus size={18} className="mr-2" />
                            Nueva Carpeta
                        </Button>

                        <Button
                            onClick={loadFiles}
                            variant="ghost"
                        >
                            <RefreshCw size={18} />
                        </Button>

                        {/* Toggle vista */}
                        <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}
                            >
                                <Grid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}
                            >
                                <List size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Progreso de subida */}
                {uploadProgress && (
                    <div className="mt-3 p-3 bg-blue-50 text-blue-800 rounded-lg flex items-center gap-2">
                        <Cloud size={18} />
                        {uploadProgress}
                    </div>
                )}
            </Card>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Total Archivos</p>
                            <p className="text-2xl font-bold text-slate-800">{files.length}</p>
                        </div>
                        <File className="text-blue-500" size={32} />
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Carpetas</p>
                            <p className="text-2xl font-bold text-slate-800">
                                {files.filter(f => f.mimeType?.includes('folder')).length}
                            </p>
                        </div>
                        <Folder className="text-yellow-500" size={32} />
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Documentos</p>
                            <p className="text-2xl font-bold text-slate-800">
                                {files.filter(f => !f.mimeType?.includes('folder')).length}
                            </p>
                        </div>
                        <FileText className="text-purple-500" size={32} />
                    </div>
                </Card>
            </div>

            {/* Lista de archivos */}
            {loading ? (
                <div className="text-center py-12">
                    <RefreshCw className="animate-spin mx-auto text-blue-500 mb-4" size={48} />
                    <p className="text-slate-500">Cargando archivos...</p>
                </div>
            ) : filteredFiles.length === 0 ? (
                <Card className="p-12 text-center">
                    <Cloud className="mx-auto text-slate-300 mb-4" size={64} />
                    <p className="text-slate-500 text-lg">
                        {searchQuery ? 'No se encontraron archivos' : 'No hay archivos aún'}
                    </p>
                    <p className="text-slate-400 text-sm mt-2">
                        Sube tu primer archivo para comenzar
                    </p>
                </Card>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredFiles.map((file) => (
                        <Card key={file.id} className="p-4 hover:shadow-lg transition-shadow">
                            <div className="text-center mb-3">
                                {getFileIcon(file.mimeType)}
                            </div>
                            <h3 className="font-semibold text-sm text-slate-800 mb-1 truncate" title={file.name}>
                                {file.name}
                            </h3>
                            <p className="text-xs text-slate-500 mb-3">
                                {formatSize(file.size)} • {formatDate(file.createdTime)}
                            </p>
                            <div className="flex gap-1 justify-center">
                                {file.webViewLink && (
                                    <a
                                        href={file.webViewLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="Ver"
                                    >
                                        <Eye size={16} />
                                    </a>
                                )}
                                <button
                                    onClick={() => handleShare(file.id, file.name)}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                                    title="Compartir"
                                >
                                    <Share2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(file.id, file.name)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <div className="divide-y divide-slate-100">
                        {filteredFiles.map((file) => (
                            <div key={file.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    {getFileIcon(file.mimeType)}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-slate-800 truncate">{file.name}</h3>
                                        <p className="text-sm text-slate-500">
                                            {formatSize(file.size)} • {formatDate(file.createdTime)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {file.webViewLink && (
                                        <a
                                            href={file.webViewLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        >
                                            <Eye size={18} />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handleShare(file.id, file.name)}
                                        className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                                    >
                                        <Share2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(file.id, file.name)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
