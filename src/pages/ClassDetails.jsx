import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Calendar, TrendingUp, BookOpen, Clock, Target, Award } from 'lucide-react';
import { db } from '../lib/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';

export default function ClassDetails({ classId, onBack }) {
    const [classData, setClassData] = useState(null);
    const [assignments, setAssignments] = useState([]);

    useEffect(() => {
        loadClassData();
    }, [classId]);

    const loadClassData = () => {
        const cls = db.getById('classes', classId);
        const classAssignments = db.find('assignments', a => a.classId === classId);
        setClassData(cls);
        setAssignments(classAssignments);
    };

    if (!classData) return <div>Cargando...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header con botón volver */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
                    <ArrowLeft size={20} />
                    Volver
                </Button>
            </div>

            {/* Banner de la clase */}
            <Card className={`${classData.color} text-white p-8 relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                <div className="relative z-10">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="text-6xl">{classData.icon}</div>
                            <div>
                                <h1 className="text-4xl font-bold mb-2">{classData.name}</h1>
                                <p className="text-white/90 text-lg">{classData.section}</p>
                                <p className="text-white/80 mt-1">👨‍🏫 {classData.teacherName}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold">{classData.students}</div>
                            <div className="text-white/80">Estudiantes</div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Descripción y progreso */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6">
                    <h2 className="font-bold text-xl mb-4 flex items-center gap-2">
                        <BookOpen className="text-blue-600" />
                        Descripción del Área
                    </h2>
                    <p className="text-slate-600 mb-6">{classData.description}</p>

                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Target className="text-purple-600" />
                        Temas del ICFES
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {classData.topics.map((topic, idx) => (
                            <span key={idx} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                                {topic}
                            </span>
                        ))}
                    </div>
                </Card>

                <div className="space-y-4">
                    <Card className="p-6">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <TrendingUp className="text-green-600" />
                            Progreso General
                        </h3>
                        <div className="text-center mb-4">
                            <div className="text-4xl font-bold text-green-600">{classData.progress}%</div>
                            <p className="text-sm text-slate-500 mt-1">Completado</p>
                        </div>
                        <ProgressBar value={classData.progress} max={100} color="green" />
                    </Card>

                    <Card className="p-6">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Calendar className="text-orange-600" />
                            Próxima Clase
                        </h3>
                        <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <Clock className="text-orange-600" size={24} />
                            <div>
                                <p className="font-medium text-slate-800">
                                    {new Date(classData.nextClass).toLocaleDateString('es-ES', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long'
                                    })}
                                </p>
                                <p className="text-sm text-slate-600">
                                    {new Date(classData.nextClass).toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Tareas y Simulacros */}
            <Card className="p-6">
                <h2 className="font-bold text-xl mb-6 flex items-center gap-2">
                    <Award className="text-blue-600" />
                    Tareas y Simulacros ICFES ({assignments.length})
                </h2>

                <div className="space-y-4">
                    {assignments.map(assignment => (
                        <Card key={assignment.id} className="p-5 hover:shadow-lg transition-shadow border-l-4 border-blue-500">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${assignment.type === 'simulacro'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {assignment.type === 'simulacro' ? '📝 SIMULACRO ICFES' : '📚 TALLER'}
                                        </span>
                                        {assignment.questions && (
                                            <span className="text-xs text-slate-500">
                                                {assignment.questions} preguntas • {assignment.timeLimit} min
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="font-bold text-lg text-slate-800 mb-1">{assignment.title}</h3>
                                    <p className="text-sm text-slate-600 mb-3">{assignment.description}</p>

                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="flex items-center gap-1 text-slate-600">
                                            <Calendar size={14} />
                                            Vence: {new Date(assignment.dueDate).toLocaleDateString('es-ES')}
                                        </span>
                                        <span className="flex items-center gap-1 text-green-600 font-medium">
                                            <Award size={14} />
                                            {assignment.points} pts • {assignment.xpReward} XP
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-3">
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {assignment.submissions}/{assignment.totalStudents}
                                        </div>
                                        <div className="text-xs text-slate-500">Entregas</div>
                                    </div>
                                    <Button className="whitespace-nowrap">
                                        {assignment.type === 'simulacro' ? 'Iniciar Simulacro' : 'Ver Taller'}
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-4">
                                <ProgressBar
                                    value={assignment.submissions}
                                    max={assignment.totalStudents}
                                    color="blue"
                                    showPercentage={true}
                                />
                            </div>
                        </Card>
                    ))}
                </div>
            </Card>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                    <div className="text-3xl mb-2">📝</div>
                    <div className="text-2xl font-bold text-blue-600">{assignments.length}</div>
                    <div className="text-sm text-slate-500">Actividades</div>
                </Card>
                <Card className="p-4 text-center">
                    <div className="text-3xl mb-2">🎯</div>
                    <div className="text-2xl font-bold text-purple-600">
                        {assignments.filter(a => a.type === 'simulacro').length}
                    </div>
                    <div className="text-sm text-slate-500">Simulacros</div>
                </Card>
                <Card className="p-4 text-center">
                    <div className="text-3xl mb-2">👥</div>
                    <div className="text-2xl font-bold text-green-600">{classData.students}</div>
                    <div className="text-sm text-slate-500">Estudiantes</div>
                </Card>
                <Card className="p-4 text-center">
                    <div className="text-3xl mb-2">⭐</div>
                    <div className="text-2xl font-bold text-orange-600">
                        {Math.round(assignments.reduce((acc, a) => acc + (a.submissions / a.totalStudents * 100), 0) / assignments.length)}%
                    </div>
                    <div className="text-sm text-slate-500">Participación</div>
                </Card>
            </div>
        </div>
    );
}
