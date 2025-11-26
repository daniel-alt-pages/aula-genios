import React from 'react';
import { X, Upload, Eye, Download, Trash2, FileText, Image as ImageIcon, Video, File } from 'lucide-react';
import { Button } from './Button';

export const FileUploader = ({ onFileSelect, accept = "*/*", multiple = false }) => {
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (onFileSelect) {
            onFileSelect(multiple ? files : files[0]);
        }
    };

    return (
        <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center bg-blue-50/50 cursor-pointer relative hover:bg-blue-100/50 transition-colors">
            <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileChange}
                accept={accept}
                multiple={multiple}
            />
            <Upload className="mx-auto text-blue-500 mb-2" size={40} />
            <p className="text-sm text-slate-600 font-medium">
                Click para subir archivos
            </p>
            <p className="text-xs text-slate-400 mt-1">
                {accept === "image/*" ? "Imágenes" : accept === "video/*" ? "Videos" : "Cualquier archivo"}
            </p>
        </div>
    );
};

export const FilePreview = ({ file, onRemove }) => {
    const getFileIcon = () => {
        if (file.type?.startsWith('image/')) return <ImageIcon size={24} className="text-blue-600" />;
        if (file.type?.startsWith('video/')) return <Video size={24} className="text-purple-600" />;
        if (file.type?.includes('pdf')) return <FileText size={24} className="text-red-600" />;
        return <File size={24} className="text-slate-600" />;
    };

    const getPreviewUrl = () => {
        if (file.url) return file.url;
        if (file instanceof File) return URL.createObjectURL(file);
        return null;
    };

    const isImage = file.type?.startsWith('image/');
    const isVideo = file.type?.startsWith('video/');
    const previewUrl = getPreviewUrl();

    return (
        <div className="border border-slate-200 rounded-lg p-4 flex items-center gap-4 hover:border-blue-400 transition-colors group">
            {/* Preview */}
            <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                {isImage && previewUrl ? (
                    <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
                ) : isVideo && previewUrl ? (
                    <video src={previewUrl} className="w-full h-full object-cover" />
                ) : (
                    getFileIcon()
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-500">
                    {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Tamaño desconocido'}
                </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                {previewUrl && (
                    <Button
                        variant="ghost"
                        className="text-xs"
                        onClick={() => window.open(previewUrl, '_blank')}
                    >
                        <Eye size={16} />
                    </Button>
                )}
                {onRemove && (
                    <Button
                        variant="ghost"
                        className="text-xs text-red-600 hover:bg-red-50"
                        onClick={() => onRemove(file)}
                    >
                        <Trash2 size={16} />
                    </Button>
                )}
            </div>
        </div>
    );
};

export const FileViewer = ({ file, onClose }) => {
    const isImage = file.type?.startsWith('image/');
    const isVideo = file.type?.startsWith('video/');
    const isPDF = file.type?.includes('pdf');
    const url = file.url || (file instanceof File ? URL.createObjectURL(file) : null);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="font-bold text-lg">{file.name}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
                    {isImage && url && (
                        <img src={url} alt={file.name} className="w-full h-auto rounded-lg" />
                    )}
                    {isVideo && url && (
                        <video src={url} controls className="w-full h-auto rounded-lg" />
                    )}
                    {isPDF && url && (
                        <iframe src={url} className="w-full h-[600px] rounded-lg border" />
                    )}
                    {!isImage && !isVideo && !isPDF && (
                        <div className="text-center py-12">
                            <File size={64} className="mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-500">Vista previa no disponible</p>
                            <Button className="mt-4" onClick={() => window.open(url, '_blank')}>
                                <Download size={18} /> Descargar Archivo
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
