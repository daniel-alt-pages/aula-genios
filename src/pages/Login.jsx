import React, { useState, useEffect } from 'react';
import { Mail, Shield, GraduationCap, Laptop, X, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

export default function Login() {
  const { login } = useAuth();
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const DEMO_CREDENTIALS = {
    student: { email: 'juan@aula.com', pass: '00' },
    teacher: { email: 'profesor@aula.com', pass: 'profesor2025' },
    admin: { email: 'admin@aula.com', pass: 'admin2025' }
  };

  useEffect(() => {
    setEmail(DEMO_CREDENTIALS[role].email);
    setPassword(DEMO_CREDENTIALS[role].pass);
    setError('');
  }, [role]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const RoleIcon = role === 'admin' ? Shield : role === 'teacher' ? Laptop : GraduationCap;
  const themeColor = role === 'admin' ? 'from-orange-600 to-red-600' : role === 'teacher' ? 'from-blue-600 to-indigo-600' : 'from-emerald-500 to-teal-600';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: 'url(https://images.prismic.io/seamosgenios2026/aR-VA2GnmrmGqGJ-_FONDO.png?auto=format,compress)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-blue-900/80 to-slate-900/90 backdrop-blur-sm animate-in fade-in duration-1000"></div>

      <div className="absolute top-8 left-8 z-20 animate-in slide-in-from-top-10 duration-700">
        <img
          src="https://images.prismic.io/seamosgenios2026/aMSzIWGNHVfTPKS1_logosg.png?auto=format,compress"
          alt="Seamos Genios Logo"
          className="h-12 md:h-16 w-auto drop-shadow-2xl hover:scale-105 transition-transform duration-300"
        />
      </div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden relative z-10 border border-white/20 animate-in zoom-in-95 duration-500">
        <div className={`h-48 p-8 flex flex-col justify-end bg-gradient-to-br ${themeColor} relative overflow-hidden transition-all duration-500`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>

          <div className="absolute top-6 right-6 text-white/20 transform rotate-12">
            <RoleIcon size={100} strokeWidth={1} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                Versión 2.0
              </span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-1">AULA-GENIOS</h1>
            <p className="text-white/80 font-medium text-sm">Plataforma Educativa Integral</p>
          </div>
        </div>

        <div className="p-8 bg-white/95">
          <div className="flex bg-slate-100 p-1.5 rounded-xl mb-8 shadow-inner">
            {['student', 'teacher', 'admin'].map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all duration-300 ${role === r
                  ? 'bg-white shadow-sm text-slate-900 scale-100 ring-1 ring-black/5'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
                  }`}
              >
                {r === 'student' ? '👨‍🎓 Alumno' : r === 'teacher' ? '👨‍🏫 Docente' : '🛡️ Admin'}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Correo Electrónico"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700 font-medium placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700 font-medium placeholder:text-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-xs font-medium bg-red-50 p-3 rounded-lg flex items-center gap-2 border border-red-100 animate-in shake">
                <X size={14} />
                {error}
              </div>
            )}

            <Button
              className={`w-full py-4 text-base font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 ${role === 'admin' ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700' :
                role === 'teacher' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' :
                  'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                }`}
              disabled={loading}
            >
              {loading ? (
                <span className="animate-pulse">Iniciando Sesión...</span>
              ) : (
                <>Ingresar al Sistema <ArrowRight size={18} /></>
              )}
            </Button>

            <div className="text-center">
              <p className="text-xs text-slate-400">
                ¿Olvidaste tu contraseña? <a href="#" className="text-blue-600 hover:underline font-medium">Recuperar acceso</a>
              </p>
            </div>
          </form>
        </div>

        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            Sistema Seguro • Encriptación SSL
          </p>
        </div>
      </div>
    </div>
  );
}
