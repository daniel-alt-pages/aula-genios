import React, { useState } from 'react';
import { BookOpen, Calendar, Settings, LogOut, Menu, X } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import TeacherPanel from './pages/TeacherDashboard';
import StudentPanel from './pages/StudentDashboard';
import { Button } from './components/ui/Button';

// Panel Admin (Placeholder para futuro)
const AdminPanel = () => (
  <div className="p-10 text-center flex flex-col items-center justify-center h-full">
    <h2 className="text-2xl font-bold text-slate-800 mb-2">Panel Director</h2>
    <p className="text-slate-500">Gestión global en desarrollo para v2.0</p>
  </div>
);

// Layout Principal (Menú lateral + Contenido)
const AppShell = () => {
  const { user, logout } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);

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
          <button onClick={() => setMobileMenu(false)} className="md:hidden text-slate-400"><X/></button>
        </div>

        <nav className="flex-1 space-y-2">
          <Button variant="secondary" className="w-full justify-start font-bold bg-blue-50 text-blue-700 border-blue-100">
            <BookOpen size={18}/> Tablero
          </Button>
          <Button variant="ghost" className="w-full justify-start"><Calendar size={18}/> Agenda</Button>
          <Button variant="ghost" className="w-full justify-start"><Settings size={18}/> Ajustes</Button>
        </nav>

        <div className="pt-6 border-t border-slate-100 mt-6">
          <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-2xl">{user.avatar}</div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500 capitalize">{user.role === 'teacher' ? 'Docente' : user.role === 'student' ? 'Estudiante' : 'Admin'}</p>
            </div>
          </div>
          <Button variant="danger" className="w-full justify-start" onClick={logout}><LogOut size={18}/> Salir</Button>
        </div>
      </aside>

      {/* Overlay para Móvil */}
      {mobileMenu && <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setMobileMenu(false)} />}

      {/* Contenido Dinámico */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="md:hidden bg-white border-b p-4 flex justify-between items-center">
           <span className="font-bold text-slate-700">Aula-Genios</span>
           <button onClick={() => setMobileMenu(true)}><Menu className="text-slate-600"/></button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto">
            {/* Ruteo Manual de Roles */}
            {user.role === 'admin' ? <AdminPanel /> : user.role === 'teacher' ? <TeacherPanel /> : <StudentPanel />}
          </div>
        </div>
      </main>
    </div>
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
