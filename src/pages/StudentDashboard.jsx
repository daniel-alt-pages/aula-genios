import React, { useState, useEffect } from 'react';
import { GraduationCap, Award, FileText, Save, CheckCircle, Trophy, Target, Calendar, TrendingUp, Star, Zap, Clock } from 'lucide-react';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useAuth } from '../context/AuthContext';
import { calculateLevel, getLevelProgress, getNextLevelXp, BADGES } from '../lib/gamification';

export default function StudentDashboard({ onClassClick }) {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('classes');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch classes where this student is enrolled
        const response = await api.enrollment.getStudentClasses(user.id);
        setClasses(response.classes || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.id]);

  const stats = user.stats || { xp: 0, level: 1, badges: [], coins: 0 };
  const progress = getLevelProgress(stats.xp);
  const nextLevelXp = getNextLevelXp(stats.level);

  const studentStats = {
    completedTasks: 0, // TODO: Fetch real stats
    totalTasks: 0,
    streak: 5,
    rank: 3
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando tu dashboard...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Gamification Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-12 -mb-12 blur-2xl"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
          <div className="relative">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-5xl border-4 border-white/30 backdrop-blur-sm shadow-lg overflow-hidden">
              {user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:')) ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span>{user.avatar || '👨‍🎓'}</span>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full px-3 py-1 text-xs font-bold shadow-lg">
              Nv. {stats.level}
            </div>
          </div>

          <div className="flex-1 w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-3">
              <div>
                <h1 className="text-3xl font-bold">¡Hola, {user.name.split(' ')[0]}!</h1>
                <p className="text-indigo-100 mt-1 flex items-center gap-2">
                  <Zap size={16} className="text-yellow-300" />
                  Nivel {stats.level} • Aprendiz Genial
                </p>
              </div>
              <div className="text-right mt-2 md:mt-0">
                <span className="text-4xl font-bold">{stats.xp}</span>
                <span className="text-sm text-indigo-200"> / {nextLevelXp} XP</span>
              </div>
            </div>

            <div className="relative">
              <div className="h-4 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 transition-all duration-1000 ease-out relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <p className="text-xs text-indigo-200 mt-1">
                {nextLevelXp - stats.xp} XP para el siguiente nivel
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/20">
            <p className="text-xs text-indigo-200">Monedas</p>
            <p className="text-2xl font-bold flex items-center gap-1">
              <span className="text-yellow-300">🪙</span> {stats.coins || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'classes', label: '🏫 Mis Clases', icon: GraduationCap },
          { id: 'tasks', label: '📚 Tareas', icon: FileText },
          { id: 'progress', label: '📊 Progreso', icon: TrendingUp },
          { id: 'badges', label: '🏆 Insignias', icon: Trophy }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors whitespace-nowrap ${selectedTab === tab.id
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {selectedTab === 'classes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(cls => (
            <Card
              key={cls.id}
              className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-t-4 border-t-blue-500 overflow-hidden"
              onClick={() => onClassClick && onClassClick(cls.id)}
            >
              <div className={`h-28 ${cls.settings?.color || 'bg-blue-500'} relative p-4 flex flex-col justify-between`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative z-10 flex justify-between items-start text-white">
                  <span className="bg-black/20 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium">
                    {cls.code}
                  </span>
                  <span className="text-3xl">{cls.settings?.icon || '📚'}</span>
                </div>
                <h3 className="relative z-10 text-white font-bold text-xl leading-tight">{cls.title}</h3>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <span>👨‍🏫 {cls.term || 'Profesor'}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-medium text-slate-400">
                  <span>Progreso</span>
                  <span>{cls.progress || 0}%</span>
                </div>
                <ProgressBar value={cls.progress || 0} max={100} color="blue" className="mt-1 h-1.5" />
              </div>
            </Card>
          ))}
          {classes.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              <GraduationCap size={48} className="mx-auto mb-4 text-slate-300" />
              <p>No estás inscrito en ninguna clase aún.</p>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'tasks' && (
        <div className="text-center py-10 text-slate-500">
          <p>Funcionalidad de Tareas en desarrollo (Fase 2)</p>
        </div>
      )}

      {selectedTab === 'progress' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={CheckCircle} label="Tareas Completadas" value={studentStats.completedTasks} color="green" />
            <StatCard icon={Target} label="Tareas Pendientes" value={studentStats.totalTasks - studentStats.completedTasks} color="orange" />
            <StatCard icon={Trophy} label="Racha de Días" value={`${studentStats.streak} 🔥`} color="red" />
            <StatCard icon={Star} label="Ranking en Clase" value={`#${studentStats.rank}`} color="purple" />
          </div>
        </div>
      )}

      {selectedTab === 'badges' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.values(BADGES).map(badge => {
            const unlocked = stats.badges?.includes(badge.id);
            return (
              <Card key={badge.id} className={`p-6 text-center transition-all ${unlocked ? 'border-yellow-400 bg-yellow-50 shadow-lg' : 'opacity-50 grayscale'}`}>
                <div className="text-5xl mb-3">{badge.icon}</div>
                <h4 className="font-bold text-sm">{badge.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{badge.description}</p>
                {unlocked && (
                  <span className="inline-block mt-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">✓ Desbloqueado</span>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
