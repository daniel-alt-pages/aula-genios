import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Bell, Plus, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Calendar() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddEvent, setShowAddEvent] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', description: '', start_date: '', time: '', type: 'class' });
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        fetchEvents();
    }, []);

    const changeMonth = (offset) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };

    const getDaysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const renderCalendarDays = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const days = [];

        // Empty cells for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="aspect-square bg-slate-50 rounded-lg border border-transparent" />);
        }

        // Days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const hasEvent = events.some(e => {
                const eventDate = new Date(e.start_date);
                return eventDate.getDate() === day &&
                    eventDate.getMonth() === currentDate.getMonth() &&
                    eventDate.getFullYear() === currentDate.getFullYear();
            });

            const isToday = new Date().toDateString() === date.toDateString();

            days.push(
                <div
                    key={day}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg border transition-all cursor-pointer relative
                        ${isToday ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200 hover:bg-slate-50'}
                        ${hasEvent ? 'font-bold' : ''}
                    `}
                    onClick={() => {
                        setNewEvent({ ...newEvent, start_date: date.toISOString().split('T')[0] });
                        setShowAddEvent(true);
                    }}
                >
                    <span className={isToday ? 'text-blue-600' : 'text-slate-700'}>{day}</span>
                    {hasEvent && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1"></div>}
                </div>
            );
        }

        return days;
    };

    const fetchEvents = async () => {
        try {
            const response = await api.events.getAll();
            setEvents(response.events || []);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        try {
            // Combine date and time
            const startDateTime = new Date(`${newEvent.start_date}T${newEvent.time || '00:00'}`).toISOString();

            await api.events.create({
                ...newEvent,
                start_date: startDateTime
            });

            fetchEvents();
            setShowAddEvent(false);
            setNewEvent({ title: '', description: '', start_date: '', time: '', type: 'class' });
            alert('Evento creado exitosamente');
        } catch (error) {
            console.error('Error creating event:', error);
            alert('Error al crear el evento');
        }
    };

    const getEventColor = (type) => {
        switch (type) {
            case 'exam': return 'bg-red-100 border-red-300 text-red-700';
            case 'assignment': return 'bg-blue-100 border-blue-300 text-blue-700';
            case 'class': return 'bg-purple-100 border-purple-300 text-purple-700';
            default: return 'bg-slate-100 border-slate-300 text-slate-700';
        }
    };

    const getEventIcon = (type) => {
        switch (type) {
            case 'exam': return '📝';
            case 'assignment': return '📚';
            case 'class': return '🎓';
            default: return '📅';
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando agenda...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <CalendarIcon className="text-blue-600" size={32} />
                        Mi Agenda
                    </h1>
                    <p className="text-slate-500 mt-1">Organiza tus actividades y eventos</p>
                </div>
                <Button onClick={() => setShowAddEvent(true)}>
                    <Plus size={18} /> Nuevo Evento
                </Button>
            </div>

            {/* Calendario Visual */}
            <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 capitalize">
                        {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => changeMonth(-1)}>←</Button>
                        <Button variant="ghost" onClick={() => changeMonth(1)}>→</Button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-4">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                        <div key={day} className="text-center font-bold text-slate-600 text-sm py-2">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {renderCalendarDays()}
                </div>
            </Card>

            {/* Lista de Eventos */}
            <div>
                <h2 className="font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">
                    <Bell className="text-orange-500" />
                    Próximos Eventos
                </h2>
                <div className="space-y-3">
                    {events.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No hay eventos programados.</p>
                    ) : (
                        events.map(event => (
                            <Card key={event.id} className={`p-4 border-l-4 ${getEventColor(event.type || 'class')}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <span className="text-3xl">{getEventIcon(event.type || 'class')}</span>
                                        <div>
                                            <h3 className="font-bold text-slate-800">{event.title}</h3>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                                                <span className="flex items-center gap-1">
                                                    <CalendarIcon size={14} />
                                                    {new Date(event.start_date).toLocaleDateString('es-ES', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={14} />
                                                    {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            {event.description && <p className="text-sm text-slate-500 mt-2">{event.description}</p>}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Modal Agregar Evento */}
            {showAddEvent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-xl">Nuevo Evento</h3>
                            <button onClick={() => setShowAddEvent(false)}>
                                <X className="text-slate-400 hover:text-slate-600" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateEvent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Título</label>
                                <input
                                    type="text"
                                    value={newEvent.title}
                                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        value={newEvent.start_date}
                                        onChange={e => setNewEvent({ ...newEvent, start_date: e.target.value })}
                                        className="w-full p-2 border rounded"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Hora</label>
                                    <input
                                        type="time"
                                        value={newEvent.time}
                                        onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                                        className="w-full p-2 border rounded"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Tipo</label>
                                <select
                                    value={newEvent.type}
                                    onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}
                                    className="w-full p-2 border rounded"
                                >
                                    <option value="class">Clase</option>
                                    <option value="exam">Examen</option>
                                    <option value="assignment">Tarea/Entrega</option>
                                    <option value="other">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Descripción</label>
                                <textarea
                                    value={newEvent.description}
                                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                    className="w-full p-2 border rounded h-24"
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button variant="ghost" type="button" onClick={() => setShowAddEvent(false)}>Cancelar</Button>
                                <Button type="submit">Crear Evento</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
