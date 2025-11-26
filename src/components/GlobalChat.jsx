import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, User } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function GlobalChat({ isOpen, onClose }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    const fetchMessages = async () => {
        try {
            const response = await api.chat.getMessages('global');
            setMessages(response.messages || []);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchMessages();
            const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await api.chat.sendMessage('global', newMessage);
            setNewMessage('');
            fetchMessages();
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="flex items-center gap-2">
                    <MessageSquare size={20} />
                    <h3 className="font-bold">Chat General</h3>
                </div>
                <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {loading ? (
                    <div className="text-center text-slate-500 mt-10">Cargando mensajes...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-slate-500 mt-10">
                        <p>¡Sé el primero en escribir!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.user_id === user.id;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${isMe
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                                    }`}>
                                    {!isMe && (
                                        <p className="text-xs font-bold text-blue-600 mb-1">{msg.user_name}</p>
                                    )}
                                    <p className="text-sm">{msg.content}</p>
                                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </form>
        </div>
    );
}
