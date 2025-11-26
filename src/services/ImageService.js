import { CONFIG } from '../lib/config';

export const ImageService = {
    uploadImage: async (file) => {
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(`${CONFIG.IMGBB_UPLOAD_URL}?key=${CONFIG.IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                return data.data.url; // Retorna la URL directa de la imagen
            } else {
                throw new Error('Error al subir imagen a ImgBB: ' + (data.error?.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }
};
