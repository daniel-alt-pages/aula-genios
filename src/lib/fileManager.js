// File Manager - Gestión de archivos con localStorage
export const FileManager = {
    // Convertir archivo a base64 para almacenamiento
    uploadFile: async (file) => {
        return new Promise((resolve, reject) => {
            if (file.size > 5 * 1024 * 1024) { // 5MB límite
                reject(new Error('El archivo es demasiado grande (máx 5MB)'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({
                    id: Date.now(),
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: e.target.result, // base64
                    uploadDate: new Date().toISOString()
                });
            };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsDataURL(file);
        });
    },

    // Formatear tamaño de archivo
    formatSize: (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    },

    // Obtener ícono según tipo de archivo
    getFileIcon: (type) => {
        if (type.includes('pdf')) return '📄';
        if (type.includes('image')) return '🖼️';
        if (type.includes('video')) return '🎥';
        if (type.includes('word') || type.includes('document')) return '📝';
        if (type.includes('excel') || type.includes('sheet')) return '📊';
        if (type.includes('powerpoint') || type.includes('presentation')) return '📽️';
        return '📎';
    },

    // Validar tipo de archivo
    isValidType: (type) => {
        const validTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        return validTypes.includes(type);
    }
};
