import driveService from './googleDriveService.js';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inicializar Google Drive al arrancar
let driveInitialized = false;

export const initializeDrive = async () => {
    try {
        await driveService.initialize();
        driveInitialized = true;
        console.log('✅ Google Drive conectado');
        return true;
    } catch (err) {
        console.warn('⚠️  Google Drive no disponible:', err.message);
        console.warn('   Coloca google-credentials.json en la raíz del proyecto para habilitar Drive');
        return false;
    }
};

/**
 * Registra todas las rutas de Google Drive en la aplicación Express
 * @param {Express} app - Aplicación Express
 * @param {Function} authenticateToken - Middleware de autenticación
 * @param {Multer} upload - Middleware de Multer para subir archivos
 */
export const registerDriveRoutes = (app, authenticateToken, upload) => {

    // Subir archivo a Google Drive
    app.post('/api/drive/upload', authenticateToken, upload.single('file'), async (req, res) => {
        if (!driveInitialized) {
            return res.status(503).json({ error: 'Google Drive no está configurado' });
        }

        try {
            const { folderId: providedFolderId, classId } = req.body;
            const file = req.file;
            let targetFolderId = providedFolderId;

            if (!file) {
                return res.status(400).json({ error: 'No se proporcionó archivo' });
            }

            // Si se proporciona classId, buscar o crear carpeta de la clase
            if (classId && !targetFolderId) {
                const folderName = `Class_${classId}`;
                let classFolder = await driveService.findFolderByName(folderName);

                if (!classFolder) {
                    classFolder = await driveService.createFolder(folderName);
                }
                targetFolderId = classFolder.id;
            }

            // Subir a Google Drive
            const driveFile = await driveService.uploadFile(
                file.path,
                file.originalname,
                file.mimetype,
                targetFolderId || null
            );

            res.json({
                success: true,
                file: driveFile,
                message: 'Archivo subido a Google Drive exitosamente'
            });
        } catch (error) {
            console.error('Error al subir a Drive:', error);
            res.status(500).json({ error: 'Error al subir archivo a Google Drive' });
        }
    });

    // Listar archivos de Google Drive
    app.get('/api/drive/files', authenticateToken, async (req, res) => {
        if (!driveInitialized) {
            return res.status(503).json({ error: 'Google Drive no está configurado' });
        }

        try {
            const { pageSize = 20, folderId } = req.query;
            const files = await driveService.listFiles(parseInt(pageSize), folderId);

            res.json({
                success: true,
                files
            });
        } catch (error) {
            console.error('Error al listar archivos:', error);
            res.status(500).json({ error: 'Error al listar archivos de Google Drive' });
        }
    });

    // Descargar archivo de Google Drive
    app.get('/api/drive/download/:fileId', authenticateToken, async (req, res) => {
        if (!driveInitialized) {
            return res.status(503).json({ error: 'Google Drive no está configurado' });
        }

        try {
            const { fileId } = req.params;
            const destPath = join(__dirname, '..', 'uploads', `drive-${fileId}`);

            await driveService.downloadFile(fileId, destPath);

            res.download(destPath, (err) => {
                if (err) {
                    console.error('Error al enviar archivo:', err);
                }
            });
        } catch (error) {
            console.error('Error al descargar de Drive:', error);
            res.status(500).json({ error: 'Error al descargar archivo de Google Drive' });
        }
    });

    // Eliminar archivo de Google Drive
    app.delete('/api/drive/files/:fileId', authenticateToken, async (req, res) => {
        if (!driveInitialized) {
            return res.status(503).json({ error: 'Google Drive no está configurado' });
        }

        try {
            const { fileId } = req.params;
            await driveService.deleteFile(fileId);

            res.json({
                success: true,
                message: 'Archivo eliminado de Google Drive'
            });
        } catch (error) {
            console.error('Error al eliminar de Drive:', error);
            res.status(500).json({ error: 'Error al eliminar archivo de Google Drive' });
        }
    });

    // Crear carpeta en Google Drive
    app.post('/api/drive/folders', authenticateToken, async (req, res) => {
        if (!driveInitialized) {
            return res.status(503).json({ error: 'Google Drive no está configurado' });
        }

        try {
            const { folderName, parentFolderId } = req.body;

            if (!folderName) {
                return res.status(400).json({ error: 'Se requiere nombre de carpeta' });
            }

            const folder = await driveService.createFolder(folderName, parentFolderId);

            res.json({
                success: true,
                folder,
                message: 'Carpeta creada en Google Drive'
            });
        } catch (error) {
            console.error('Error al crear carpeta:', error);
            res.status(500).json({ error: 'Error al crear carpeta en Google Drive' });
        }
    });

    // Compartir archivo/carpeta
    app.post('/api/drive/share/:fileId', authenticateToken, async (req, res) => {
        if (!driveInitialized) {
            return res.status(503).json({ error: 'Google Drive no está configurado' });
        }

        try {
            const { fileId } = req.params;
            const { email, role = 'reader' } = req.body;

            const permission = await driveService.shareFile(fileId, email, role);

            res.json({
                success: true,
                permission,
                message: 'Archivo compartido exitosamente'
            });
        } catch (error) {
            console.error('Error al compartir archivo:', error);
            res.status(500).json({ error: 'Error al compartir archivo' });
        }
    });

    // Buscar archivos
    app.get('/api/drive/search', authenticateToken, async (req, res) => {
        if (!driveInitialized) {
            return res.status(503).json({ error: 'Google Drive no está configurado' });
        }

        try {
            const { query } = req.query;

            if (!query) {
                return res.status(400).json({ error: 'Se requiere parámetro de búsqueda' });
            }

            const files = await driveService.searchFiles(query);

            res.json({
                success: true,
                files
            });
        } catch (error) {
            console.error('Error al buscar archivos:', error);
            res.status(500).json({ error: 'Error al buscar archivos' });
        }
    });

    // Estado de Google Drive
    app.get('/api/drive/status', authenticateToken, async (req, res) => {
        res.json({
            initialized: driveInitialized,
            message: driveInitialized
                ? 'Google Drive está conectado y funcionando'
                : 'Google Drive no está configurado. Agrega google-credentials.json'
        });
    });
};
