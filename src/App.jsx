import React, { useState } from 'react';
import { BookOpen, Calendar, Settings, LogOut, Menu, X, MessageSquare } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import AdminPanel from './pages/AdminPanel';
import CalendarPage from './pages/Calendar';
import SettingsPage from './pages/Settings';
import ClassSpace from './pages/ClassSpace';
import { Button } from './components/ui/Button';

import GlobalChat from './components/GlobalChat';

// Layout Principal (Menú lateral + Contenido)
const AppShell = () => {
  const { user, logout } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard'); // dashboard, calendar, settings, class
  const [activeClassId, setActiveClassId] = useState(null);
  const [showChat, setShowChat] = useState(false);

  // Función para navegar a una clase específica
  const navigateToClass = (classId) => {
    setActiveClassId(classId);
    setCurrentPage('class');
  };

  // Deshabilitar Ctrl+R para evitar redirección, solo recargar
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        window.location.reload();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderContent = () => {
    if (currentPage === 'class' && activeClassId) {
      return <ClassSpace classId={activeClassId} onBack={() => setCurrentPage('dashboard')} />;
    }

    if (currentPage === 'calendar') return <CalendarPage />;
    if (currentPage === 'settings') return <SettingsPage />;
    if (currentPage === 'credentials' && user?.role === 'admin') return <AdminPanel initialTab="credentials" />;

    // Dashboard por defecto según rol
    if (user?.role === 'admin') return <AdminPanel />;
    if (user?.role === 'teacher') return <TeacherDashboard onClassClick={navigateToClass} />;
    return <StudentDashboard onClassClick={navigateToClass} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">

      {/* Sidebar Responsiva */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 p-6 flex flex-col shadow-xl z-50 transition-transform duration-300 md:relative md:translate-x-0 
        ${mobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>

        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
            <div className="bg-blue-50 p-2 rounded-lg"><BookOpen size={24} /></div>
            <span>AULA-GENIOS</span>
          </div>
          <button onClick={() => setMobileMenu(false)} className="md:hidden text-slate-400"><X /></button>
        </div>

        <nav className="flex-1 space-y-2">
          <Button
            variant={currentPage === 'dashboard' ? 'secondary' : 'ghost'}
            className={`w-full justify-start ${currentPage === 'dashboard' ? 'font-bold bg-blue-50 text-blue-700 border-blue-100' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
          >
            <BookOpen size={18} className="mr-2" /> Tablero
          </Button>
          <Button
            variant={currentPage === 'calendar' ? 'secondary' : 'ghost'}
            className={`w-full justify-start ${currentPage === 'calendar' ? 'font-bold bg-blue-50 text-blue-700 border-blue-100' : ''}`}
            onClick={() => setCurrentPage('calendar')}
          >
            <Calendar size={18} className="mr-2" /> Agenda
          </Button>
          <Button
            variant={currentPage === 'settings' ? 'secondary' : 'ghost'}
            className={`w-full justify-start ${currentPage === 'settings' ? 'font-bold bg-blue-50 text-blue-700 border-blue-100' : ''}`}
            onClick={() => setCurrentPage('settings')}
          >
            <Settings size={18} className="mr-2" /> Ajustes
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-600 hover:text-blue-600 hover:bg-blue-50"
            onClick={() => setShowChat(true)}
          >
            <MessageSquare size={18} className="mr-2" /> Chat General
          </Button>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm overflow-hidden text-2xl border border-slate-200">
              {user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data')) ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span>{user.avatar || '👤'}</span>
              )}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role === 'teacher' ? 'Docente' : user.role === 'student' ? 'Estudiante' : 'Admin'}</p>
            </div>
          </div>
          <Button variant="danger" className="w-full justify-start" onClick={logout}><LogOut size={18} className="mr-2" /> Salir</Button>
        </div>
      </aside>

      {/* Overlay para Móvil */}
      {mobileMenu && <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setMobileMenu(false)} />}

      {/* Contenido Dinámico */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-screen bg-slate-50/50 relative">
        {/* Header Móvil */}
        <div className="md:hidden flex items-center justify-between mb-6 bg-white p-4 rounded-xl shadow-sm">
          <button onClick={() => setMobileMenu(!mobileMenu)} className="text-slate-600">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <img src="https://images.prismic.io/seamosgenios2026/aMSzIWGNHVfTPKS1_logosg.png?auto=format,compress" alt="Logo" className="h-8" />
          </div>
          <div className="w-8"></div> {/* Spacer */}
        </div>

        {renderContent()}
      </main>

      {/* Global Chat Sidebar */}
      <GlobalChat isOpen={showChat} onClose={() => setShowChat(false)} />
    </div >
  );
};

// Punto de Entrada
const AppContent = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center text-blue-600 font-bold animate-pulse">Cargando Motor Local...</div>;
  return user ? <AppShell /> : <Login />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
