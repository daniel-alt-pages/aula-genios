import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, User, Clock, ChevronRight, MessageCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function ClassForum({ classId }) {
    const { user } = useAuth();
    const [threads, setThreads] = useState([]);
    const [activeThread, setActiveThread] = useState(null);
    const [replies, setReplies] = useState([]);
    const [newReply, setNewReply] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadThreads();
    }, [classId]);

    useEffect(() => {
        if (activeThread) {
            loadReplies(activeThread.id);
        }
    }, [activeThread]);

    const loadThreads = async () => {
        try {
            const data = await api.forum.getThreads(classId);
            setThreads(data.threads);
        } catch (error) {
            console.error('Error loading threads:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadReplies = async (threadId) => {
        try {
            const data = await api.forum.getReplies(threadId);
            setReplies(data.replies);
        } catch (error) {
            console.error('Error loading replies:', error);
        }
    };

    const handleCreateThread = async () => {
        const title = prompt('Título del nuevo tema:');
        if (!title) return;

        const content = prompt('Contenido del tema:');
        if (!content) return;

        try {
            await api.forum.createThread(classId, {
                title,
                content,
                tags: ['General'] // Could be improved with a proper modal
            });
            loadThreads();
        } catch (error) {
            console.error('Error creating thread:', error);
            alert('Error al crear el tema');
        }
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!newReply.trim()) return;

        try {
            await api.forum.reply(activeThread.id, newReply);
            setNewReply('');
            loadReplies(activeThread.id);
            // Update reply count in thread list locally or reload threads
            loadThreads();
        } catch (error) {
            console.error('Error replying:', error);
            alert('Error al enviar respuesta');
        }
    };

    if (loading) return <div className="text-center p-8">Cargando foro...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <MessageCircle className="text-blue-600" /> Foros de Discusión
                </h2>
                {!activeThread && (
                    <Button onClick={handleCreateThread}>
                        <Plus size={18} className="mr-2" /> Nuevo Tema
                    </Button>
                )}
            </div>

            {/* Lista de Temas */}
            {!activeThread ? (
                <div className="space-y-4">
                    {threads.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                            <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
                            <p>No hay temas de discusión aún.</p>
                            <Button variant="link" onClick={handleCreateThread}>Sé el primero en preguntar</Button>
                        </div>
                    ) : (
                        threads.map(thread => (
                            <Card
                                key={thread.id}
                                className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-blue-500"
                                onClick={() => setActiveThread(thread)}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800 mb-1">{thread.title}</h3>
                                        <p className="text-sm text-slate-500 mb-3 line-clamp-2">{thread.content}</p>
                                        <div className="flex items-center gap-4 text-xs text-slate-400">
                                            <span className="flex items-center gap-1"><User size={12} /> {thread.author_name}</span>
                                            <span className="flex items-center gap-1"><Clock size={12} /> {new Date(thread.created_at).toLocaleDateString()}</span>
                                            <div className="flex gap-1">
                                                {JSON.parse(thread.tags || '[]').map((tag, i) => (
                                                    <span key={i} className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center bg-slate-50 p-2 rounded-lg min-w-[60px]">
                                        <span className="font-bold text-blue-600 text-lg">{thread.reply_count}</span>
                                        <span className="text-[10px] text-slate-400 uppercase">Resp.</span>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            ) : (
                /* Vista de Hilo Individual */
                <div className="space-y-6 animate-in slide-in-from-right-10">
                    <Button variant="ghost" onClick={() => setActiveThread(null)} className="mb-4">
                        ← Volver a los temas
                    </Button>

                    <Card className="p-6 border-l-4 border-blue-600">
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">{activeThread.title}</h1>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6 pb-4 border-b border-slate-100">
                            <User size={16} /> {activeThread.author_name} • <Clock size={16} /> {new Date(activeThread.created_at).toLocaleString()}
                        </div>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{activeThread.content}</p>
                    </Card>

                    <h3 className="font-bold text-slate-700 mt-8 mb-4">Respuestas ({replies.length})</h3>

                    <div className="space-y-4">
                        {replies.map(reply => (
                            <Card key={reply.id} className="p-4 bg-white">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-slate-700 flex items-center gap-2">
                                        <User size={14} /> {reply.author_name}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(reply.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-slate-600 whitespace-pre-wrap">{reply.content}</p>
                            </Card>
                        ))}
                    </div>

                    {/* Formulario de Respuesta */}
                    <Card className="p-4 bg-slate-50 mt-6">
                        <form onSubmit={handleReply}>
                            <textarea
                                value={newReply}
                                onChange={e => setNewReply(e.target.value)}
                                placeholder="Escribe tu respuesta aquí..."
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                            />
                            <div className="flex justify-end mt-2">
                                <Button type="submit" disabled={!newReply.trim()}>Responder</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
