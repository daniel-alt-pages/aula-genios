import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Servicio para interactuar con Google Drive API
 */
class GoogleDriveService {
    constructor() {
        this.drive = null;
        this.auth = null;
    }

    /**
     * Inicializa la autenticación con Google Drive
     */
    async initialize() {
        try {
            // Ruta al archivo de credenciales
            const credentialsPath = path.join(__dirname, '..', 'google-credentials.json');

            // Verificar que el archivo existe
            if (!fs.existsSync(credentialsPath)) {
                throw new Error('Archivo google-credentials.json no encontrado. Por favor, coloca tus credenciales de Google Cloud en la raíz del proyecto.');
            }

            // Leer las credenciales
            const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

            // Crear cliente de autenticación
            this.auth = new google.auth.GoogleAuth({
                credentials,
                scopes: [
                    'https://www.googleapis.com/auth/drive.file',
                    'https://www.googleapis.com/auth/drive'
                ]
            });

            // Crear cliente de Drive
            this.drive = google.drive({ version: 'v3', auth: this.auth });

            console.log('✅ Google Drive API inicializada correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar Google Drive API:', error.message);
            throw error;
        }
    }

    /**
     * Sube un archivo a Google Drive
     * @param {string} filePath - Ruta local del archivo
     * @param {string} fileName - Nombre del archivo en Drive
     * @param {string} mimeType - Tipo MIME del archivo
     * @param {string} folderId - ID de la carpeta de destino (opcional)
     * @returns {Promise<object>} - Información del archivo subido
     */
    async uploadFile(filePath, fileName, mimeType, folderId = null) {
        try {
            if (!this.drive) {
                await this.initialize();
            }

            const fileMetadata = {
                name: fileName,
                ...(folderId && { parents: [folderId] })
            };

            const media = {
                mimeType,
                body: fs.createReadStream(filePath)
            };

            const response = await this.drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id, name, webViewLink, webContentLink'
            });

            console.log(`✅ Archivo subido: ${fileName} (ID: ${response.data.id})`);
            return response.data;
        } catch (error) {
            console.error('❌ Error al subir archivo:', error.message);
            throw error;
        }
    }

    /**
     * Lista archivos en Google Drive
     * @param {number} pageSize - Número de archivos a listar
     * @param {string} folderId - ID de la carpeta (opcional)
     * @returns {Promise<Array>} - Lista de archivos
     */
    async listFiles(pageSize = 10, folderId = null) {
        try {
            if (!this.drive) {
                await this.initialize();
            }

            const query = folderId ? `'${folderId}' in parents` : null;

            const response = await this.drive.files.list({
                pageSize,
                fields: 'files(id, name, mimeType, createdTime, modifiedTime, size, webViewLink)',
                ...(query && { q: query })
            });

            return response.data.files || [];
        } catch (error) {
            console.error('❌ Error al listar archivos:', error.message);
            throw error;
        }
    }

    /**
     * Descarga un archivo de Google Drive
     * @param {string} fileId - ID del archivo en Drive
     * @param {string} destPath - Ruta de destino local
     * @returns {Promise<string>} - Ruta del archivo descargado
     */
    async downloadFile(fileId, destPath) {
        try {
            if (!this.drive) {
                await this.initialize();
            }

            const dest = fs.createWriteStream(destPath);

            const response = await this.drive.files.get(
                { fileId, alt: 'media' },
                { responseType: 'stream' }
            );

            return new Promise((resolve, reject) => {
                response.data
                    .on('end', () => {
                        console.log(`✅ Archivo descargado: ${destPath}`);
                        resolve(destPath);
                    })
                    .on('error', err => {
                        console.error('❌ Error al descargar:', err);
                        reject(err);
                    })
                    .pipe(dest);
            });
        } catch (error) {
            console.error('❌ Error al descargar archivo:', error.message);
            throw error;
        }
    }

    /**
     * Elimina un archivo de Google Drive
     * @param {string} fileId - ID del archivo a eliminar
     * @returns {Promise<boolean>} - true si se eliminó correctamente
     */
    async deleteFile(fileId) {
        try {
            if (!this.drive) {
                await this.initialize();
            }

            await this.drive.files.delete({ fileId });
            console.log(`✅ Archivo eliminado: ${fileId}`);
            return true;
        } catch (error) {
            console.error('❌ Error al eliminar archivo:', error.message);
            throw error;
        }
    }

    /**
     * Crea una carpeta en Google Drive
     * @param {string} folderName - Nombre de la carpeta
     * @param {string} parentFolderId - ID de la carpeta padre (opcional)
     * @returns {Promise<object>} - Información de la carpeta creada
     */
    async createFolder(folderName, parentFolderId = null) {
        try {
            if (!this.drive) {
                await this.initialize();
            }

            const fileMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                ...(parentFolderId && { parents: [parentFolderId] })
            };

            const response = await this.drive.files.create({
                requestBody: fileMetadata,
                fields: 'id, name, webViewLink'
            });

            console.log(`✅ Carpeta creada: ${folderName} (ID: ${response.data.id})`);
            return response.data;
        } catch (error) {
            console.error('❌ Error al crear carpeta:', error.message);
            throw error;
        }
    }

    /**
     * Comparte un archivo o carpeta
     * @param {string} fileId - ID del archivo/carpeta
     * @param {string} email - Email del usuario (opcional, si no se proporciona será público)
     * @param {string} role - Rol: 'reader', 'writer', 'commenter'
     * @returns {Promise<object>} - Información del permiso
     */
    async shareFile(fileId, email = null, role = 'reader') {
        try {
            if (!this.drive) {
                await this.initialize();
            }

            const permission = {
                type: email ? 'user' : 'anyone',
                role,
                ...(email && { emailAddress: email })
            };

            const response = await this.drive.permissions.create({
                fileId,
                requestBody: permission,
                fields: 'id'
            });

            console.log(`✅ Archivo compartido: ${fileId}`);
            return response.data;
        } catch (error) {
            console.error('❌ Error al compartir archivo:', error.message);
            throw error;
        }
    }

    /**
     * Busca archivos por nombre
     * @param {string} fileName - Nombre del archivo a buscar
     * @returns {Promise<Array>} - Lista de archivos encontrados
     */
    async searchFiles(fileName) {
        try {
            if (!this.drive) {
                await this.initialize();
            }

            const response = await this.drive.files.list({
                q: `name contains '${fileName}'`,
                fields: 'files(id, name, mimeType, webViewLink)',
                pageSize: 20
            });

            return response.data.files || [];
        } catch (error) {
            console.error('❌ Error al buscar archivos:', error.message);
            throw error;
        }
    }

    /**
     * Busca una carpeta por nombre exacto
     * @param {string} folderName - Nombre de la carpeta
     * @returns {Promise<object|null>} - La carpeta encontrada o null
     */
    async findFolderByName(folderName) {
        try {
            if (!this.drive) {
                await this.initialize();
            }

            const response = await this.drive.files.list({
                q: `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`,
                fields: 'files(id, name)',
                pageSize: 1
            });

            const files = response.data.files;
            if (files && files.length > 0) {
                return files[0];
            }
            return null;
        } catch (error) {
            console.error('❌ Error al buscar carpeta:', error.message);
            throw error;
        }
    }
}

// Exportar una instancia única (Singleton)
const driveService = new GoogleDriveService();
export default driveService;
