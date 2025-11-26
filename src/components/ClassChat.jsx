import React, { useState, useEffect, useRef } from 'react';
import { Send, MoreVertical } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ClassChat({ classId, className }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    // Simular conexión a WebSocket/Firebase
    useEffect(() => {
        // Cargar historial simulado
        setMessages([
            { id: 1, user: 'Prof. Andrés', text: '¡Hola a todos! Bienvenidos al chat de la clase.', time: '10:00 AM', isMe: false },
            { id: 2, user: 'María González', text: 'Hola profe, gracias.', time: '10:05 AM', isMe: false }
        ]);
    }, [classId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const msg = {
            id: Date.now(),
            user: user.name,
            text: newMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMe: true
        };

        setMessages([...messages, msg]);
        setNewMessage('');
    };

    return (
        <div className={`flex flex-col h-[500px] bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                <div>
                    <h3 className="font-bold text-slate-800">Chat de Clase</h3>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        En línea
                    </p>
                </div>
                <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={18} /></button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] ${msg.isMe ? 'order-1' : 'order-2'}`}>
                            <div className={`flex items-end gap-2 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                {!msg.isMe && (
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs text-indigo-600 font-bold">
                                        {msg.user.charAt(0)}
                                    </div>
                                )}
                                <div className={`p-3 rounded-2xl text-sm ${msg.isMe
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                                    }`}>
                                    {!msg.isMe && <p className="text-[10px] font-bold text-slate-400 mb-1">{msg.user}</p>}
                                    {msg.text}
                                </div>
                                <span className="text-[10px] text-slate-400 mb-1">{msg.time}</span>
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white rounded-b-xl">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </form>
        </div>
    );
}
