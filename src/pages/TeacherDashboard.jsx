import React, { useState } from 'react';
import {
  BookOpen,
  Users,
  Clock,
  Plus,
  MoreVertical,
  Search,
  GripVertical,
  Edit,
  Trash2,
  BarChart2
} from 'lucide-react';
import { db } from '../lib/db';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function TeacherDashboard({ onClassClick }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState(null);

  // Cargar clases desde la API
  React.useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/classes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      } else {
        const localClasses = db.get('classes').filter(c => c.teacherId === 'prof1');
        setClasses(localClasses);
      }
    } catch (error) {
      console.error('Error al cargar clases:', error);
      const localClasses = db.get('classes').filter(c => c.teacherId === 'prof1');
      setClasses(localClasses);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = e => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;
    const newClasses = [...classes];
    const draggedClass = newClasses[draggedItem];
    newClasses.splice(draggedItem, 1);
    newClasses.splice(index, 0, draggedClass);
    setClasses(newClasses);
    setDraggedItem(index);
  };

  const handleCreateClass = async () => {
    const name = prompt('Nombre de la nueva clase:');
    if (!name) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/classes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });

      if (response.ok) {
        const data = await response.json();
        setClasses([...classes, data.class]);
        alert('✅ Clase creada exitosamente');
      } else {
        throw new Error('Error al crear clase');
      }
    } catch (error) {
      console.error('Error:', error);
      const newClass = {
        id: Date.now(),
        name,
        section: 'Nueva Sección',
        students: 0,
        color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
        icon: '📘',
        teacherId: 'prof1',
        teacherName: 'Profesor',
        progress: 0
      };
      db.add('classes', newClass);
      setClasses([...classes, newClass]);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Cargando clases...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Panel Docente</h1>
          <p className="text-slate-500">Gestiona tus clases y contenidos</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar clase..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            />
          </div>
          <Button onClick={handleCreateClass} className="shadow-lg hover:shadow-blue-200/50 transition-all">
            <Plus size={20} className="mr-2" /> Crear Clase
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls, index) => (
          <div
            key={cls.id}
            draggable
            onDragStart={e => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={e => handleDragOver(e, index)}
            className={`transition-all duration-300 transform ${draggedItem === index ? 'scale-105 rotate-2 shadow-2xl z-10' : 'hover:-translate-y-1 hover:shadow-xl'
              }`}
          >
            <Card className="p-0 overflow-hidden h-full flex flex-col border-0 shadow-md group relative">
              <div className="absolute top-2 left-2 z-20 p-2 bg-black/20 rounded-lg text-white opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity backdrop-blur-sm">
                <GripVertical size={20} />
              </div>

              <div
                className={`h-32 ${cls.color} relative cursor-pointer`}
                onClick={() => onClassClick(cls.id)}
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                <div className="absolute bottom-4 left-4 text-white">
                  <div className="text-3xl mb-2 drop-shadow-md">{cls.icon}</div>
                  <h2 className="font-bold text-xl leading-tight drop-shadow-md">{cls.name}</h2>
                  <p className="text-white/90 text-sm font-medium">{cls.section}</p>
                </div>
                <button className="absolute top-2 right-2 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between bg-white">
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-slate-600 text-sm">
                    <Users size={16} className="mr-3 text-blue-500" />
                    <span className="font-medium">{cls.students} Estudiantes</span>
                  </div>
                  <div className="flex items-center text-slate-600 text-sm">
                    <Clock size={16} className="mr-3 text-orange-500" />
                    <span>Próxima: Lun 8:00 AM</span>
                  </div>
                  <div className="flex items-center text-slate-600 text-sm">
                    <BarChart2 size={16} className="mr-3 text-purple-500" />
                    <span>Progreso: {cls.progress}%</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <button className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wide">
                    Ver Calificaciones
                  </button>
                  <div className="flex gap-1">
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Editar">
                      <Edit size={16} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Archivar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}

        <button
          onClick={handleCreateClass}
          className="h-full min-h-[300px] border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
        >
          <div className="w-16 h-16 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center mb-4 transition-colors">
            <Plus size={32} />
          </div>
          <span className="font-bold text-lg">Crear Nueva Clase</span>
        </button>
      </div>
    </div>
  );
}
