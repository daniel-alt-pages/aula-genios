import { useState } from 'react';

/**
 * Componente de ejemplo para interactuar con Google Drive
 * Muestra cómo subir archivos, listar y gestionar archivos en Drive
 */
export default function GoogleDriveManager() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(null);

    // Obtener el token de autenticación (ajusta según tu implementación)
    const getAuthToken = () => {
        return localStorage.getItem('token');
    };

    // Verificar estado de Google Drive
    const checkDriveStatus = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/drive/status', {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });
            const data = await response.json();
            setStatus(data);
            return data.initialized;
        } catch (error) {
            console.error('Error al verificar estado:', error);
            return false;
        }
    };

    // Listar archivos de Google Drive
    const listFiles = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/drive/files?pageSize=50', {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });
            const data = await response.json();

            if (data.success) {
                setFiles(data.files);
            }
        } catch (error) {
            console.error('Error al listar archivos:', error);
            alert('Error al cargar archivos de Google Drive');
        } finally {
            setLoading(false);
        }
    };

    // Subir archivo a Google Drive
    const uploadFile = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploadProgress('Subiendo...');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:3001/api/drive/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setUploadProgress('¡Archivo subido exitosamente!');
                setTimeout(() => setUploadProgress(null), 3000);
                // Recargar lista de archivos
                listFiles();
            } else {
                setUploadProgress('Error al subir archivo');
            }
        } catch (error) {
            console.error('Error al subir archivo:', error);
            setUploadProgress('Error al subir archivo');
        }
    };

    // Eliminar archivo
    const deleteFile = async (fileId, fileName) => {
        if (!confirm(`¿Estás seguro de eliminar "${fileName}"?`)) return;

        try {
            const response = await fetch(`http://localhost:3001/api/drive/files/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });

            const data = await response.json();

            if (data.success) {
                alert('Archivo eliminado exitosamente');
                listFiles();
            }
        } catch (error) {
            console.error('Error al eliminar archivo:', error);
            alert('Error al eliminar archivo');
        }
    };

    // Crear carpeta
    const createFolder = async () => {
        const folderName = prompt('Nombre de la nueva carpeta:');
        if (!folderName) return;

        try {
            const response = await fetch('http://localhost:3001/api/drive/folders', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ folderName })
            });

            const data = await response.json();

            if (data.success) {
                alert(`Carpeta "${folderName}" creada exitosamente`);
                listFiles();
            }
        } catch (error) {
            console.error('Error al crear carpeta:', error);
            alert('Error al crear carpeta');
        }
    };

    // Compartir archivo
    const shareFile = async (fileId, fileName) => {
        const email = prompt(`Compartir "${fileName}" con (email):\n(Deja vacío para hacer público)`);

        try {
            const response = await fetch(`http://localhost:3001/api/drive/share/${fileId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email || null,
                    role: 'reader'
                })
            });

            const data = await response.json();

            if (data.success) {
                alert(email
                    ? `Archivo compartido con ${email}`
                    : 'Archivo ahora es público'
                );
            }
        } catch (error) {
            console.error('Error al compartir archivo:', error);
            alert('Error al compartir archivo');
        }
    };

    // Formatear tamaño de archivo
    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    // Formatear fecha
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="google-drive-manager p-6 max-w-6xl mx-auto">
            <div className="header mb-6">
                <h1 className="text-3xl font-bold mb-4">📁 Google Drive Manager</h1>

                {/* Estado de conexión */}
                <div className="mb-4">
                    <button
                        onClick={checkDriveStatus}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Verificar Estado
                    </button>

                    {status && (
                        <div className={`mt-2 p-3 rounded ${status.initialized ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {status.message}
                        </div>
                    )}
                </div>

                {/* Acciones principales */}
                <div className="flex gap-3 mb-4">
                    <button
                        onClick={listFiles}
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
                    >
                        {loading ? 'Cargando...' : '🔄 Listar Archivos'}
                    </button>

                    <label className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer">
                        📤 Subir Archivo
                        <input
                            type="file"
                            onChange={uploadFile}
                            className="hidden"
                        />
                    </label>

                    <button
                        onClick={createFolder}
                        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                    >
                        📁 Nueva Carpeta
                    </button>
                </div>

                {/* Progreso de subida */}
                {uploadProgress && (
                    <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded">
                        {uploadProgress}
                    </div>
                )}
            </div>

            {/* Lista de archivos */}
            <div className="files-list">
                <h2 className="text-2xl font-semibold mb-4">
                    Archivos ({files.length})
                </h2>

                {files.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded">
                        <p className="text-gray-500">
                            No hay archivos. Haz clic en "Listar Archivos" para cargar.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {files.map((file) => (
                            <div
                                key={file.id}
                                className="file-item p-4 border rounded-lg hover:shadow-md transition-shadow bg-white"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg mb-1">
                                            {file.mimeType === 'application/vnd.google-apps.folder' ? '📁' : '📄'} {file.name}
                                        </h3>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p>Tipo: {file.mimeType}</p>
                                            <p>Tamaño: {formatFileSize(file.size)}</p>
                                            <p>Creado: {formatDate(file.createdTime)}</p>
                                            <p>Modificado: {formatDate(file.modifiedTime)}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {file.webViewLink && (
                                            <a
                                                href={file.webViewLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                                            >
                                                👁️ Ver
                                            </a>
                                        )}

                                        <button
                                            onClick={() => shareFile(file.id, file.name)}
                                            className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                                        >
                                            🔗 Compartir
                                        </button>

                                        <button
                                            onClick={() => deleteFile(file.id, file.name)}
                                            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                                        >
                                            🗑️ Eliminar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
