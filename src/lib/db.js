// Sistema de Base de Datos Local con LocalStorage
const SESSION_KEY = 'aula_genios_session';
const DB_KEY = 'aula_genios_db';

const initialData = {
  users: [
    {
      id: 1,
      email: 'admin@aula.com',
      password: 'admin',
      name: 'Director General',
      role: 'admin',
      avatar: '🛡️',
      bio: 'Administrador del sistema',
      status: 'active',
      stats: { xp: 0, level: 1, badges: [], coins: 0 }
    },
    {
      id: 2,
      email: 'ana@aula.com',
      password: 'prof',
      name: 'Prof. Ana María',
      role: 'teacher',
      avatar: '👩‍🏫',
      bio: 'Profesora de Lectura Crítica',
      status: 'active',
      stats: { xp: 0, level: 1, badges: [], coins: 0 }
    },
    {
      id: 3,
      email: 'daniel@aula.com',
      password: 'est',
      name: 'Daniel Estudiante',
      role: 'student',
      avatar: '👨‍🎓',
      bio: 'Estudiante de Grado 11',
      status: 'active',
      stats: { xp: 450, level: 3, badges: ['first_login', 'task_master'], coins: 120 }
    }
  ],
  classes: [
    {
      id: 1,
      name: 'Lectura Crítica',
      section: 'Grado 11-A',
      teacherName: 'Prof. Ana María',
      color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      icon: '📚',
      students: 25,
      progress: 35,
      description: 'Preparación intensiva para el componente de Lectura Crítica del examen ICFES'
    },
    {
      id: 2,
      name: 'Matemáticas ICFES',
      section: 'Grado 11-B',
      teacherName: 'Prof. Carlos Ruiz',
      color: 'bg-gradient-to-br from-purple-500 to-pink-600',
      icon: '📐',
      students: 28,
      progress: 20,
      description: 'Razonamiento cuantitativo y resolución de problemas matemáticos'
    },
    {
      id: 3,
      name: 'Ciencias Naturales',
      section: 'Grado 11-A',
      teacherName: 'Prof. Laura Gómez',
      color: 'bg-gradient-to-br from-green-500 to-teal-600',
      icon: '🔬',
      students: 25,
      progress: 45,
      description: 'Biología, Química y Física aplicadas al examen ICFES'
    },
    {
      id: 4,
      name: 'Sociales y Ciudadanas',
      section: 'Grado 11-B',
      teacherName: 'Prof. Miguel Ángel',
      color: 'bg-gradient-to-br from-orange-500 to-red-600',
      icon: '🌍',
      students: 30,
      progress: 60,
      description: 'Competencias ciudadanas y pensamiento social'
    },
    {
      id: 5,
      name: 'Inglés',
      section: 'Grado 11-A',
      teacherName: 'Prof. Sarah Johnson',
      color: 'bg-gradient-to-br from-yellow-500 to-amber-600',
      icon: '🗣️',
      students: 25,
      progress: 50,
      description: 'Reading comprehension y grammar para el ICFES'
    }
  ],
  assignments: [
    {
      id: 1,
      classId: 1,
      title: 'Simulacro ICFES #1 - Lectura Crítica',
      description: 'Primer simulacro completo del componente de lectura crítica',
      type: 'simulacro',
      dueDate: '2025-12-15',
      points: 100,
      xpReward: 150,
      fileUrl: 'https://drive.google.com/file/d/1RcmZqjqQaxPtW2_Xk-qhYn8tIgcYjprY/view?usp=sharing',
      status: 'pending'
    },
    {
      id: 2,
      classId: 1,
      title: 'Análisis de Texto Argumentativo',
      description: 'Leer el texto proporcionado y responder las preguntas de comprensión',
      type: 'tarea',
      dueDate: '2025-12-10',
      points: 50,
      xpReward: 75,
      status: 'pending'
    },
    {
      id: 3,
      classId: 2,
      title: 'Ejercicios de Álgebra Lineal',
      description: 'Resolver los ejercicios del capítulo 3 del libro guía',
      type: 'tarea',
      dueDate: '2025-12-12',
      points: 50,
      xpReward: 75,
      status: 'pending'
    },
    {
      id: 4,
      classId: 2,
      title: 'Simulacro ICFES #1 - Matemáticas',
      description: 'Simulacro de razonamiento cuantitativo',
      type: 'simulacro',
      dueDate: '2025-12-18',
      points: 100,
      xpReward: 150,
      status: 'pending'
    },
    {
      id: 5,
      classId: 3,
      title: 'Laboratorio Virtual - Reacciones Químicas',
      description: 'Completar el laboratorio virtual y entregar informe',
      type: 'tarea',
      dueDate: '2025-12-14',
      points: 60,
      xpReward: 80,
      status: 'pending'
    }
  ],
  posts: [
    {
      id: 1,
      classId: 1,
      author: 'Prof. Ana María',
      authorAvatar: '👩‍🏫',
      content: 'Bienvenidos al curso de Lectura Crítica. Recuerden revisar el material de introducción en la sección de recursos.',
      date: 'Hace 2 días',
      comments: [
        { id: 1, author: 'Daniel Estudiante', content: '¡Gracias profe!', date: 'Hace 1 día' }
      ],
      type: 'announcement'
    },
    {
      id: 2,
      classId: 1,
      author: 'Sistema',
      authorAvatar: '🤖',
      content: 'Nueva tarea publicada: Simulacro ICFES #1',
      date: 'Ayer',
      comments: [],
      type: 'system'
    }
  ],
  materials: [
    {
      id: 1,
      classId: 1,
      title: 'Guía de Lectura Crítica ICFES 2025',
      type: 'PDF',
      url: 'https://drive.google.com/file/d/example1',
      uploadedBy: 'Prof. Ana María',
      uploadDate: '2025-11-20'
    },
    {
      id: 2,
      classId: 1,
      title: 'Video: Estrategias de Comprensión Lectora',
      type: 'VIDEO',
      url: 'https://youtube.com/watch?v=example',
      uploadedBy: 'Prof. Ana María',
      uploadDate: '2025-11-18'
    },
    {
      id: 3,
      classId: 2,
      title: 'Formulario de Matemáticas',
      type: 'PDF',
      url: 'https://drive.google.com/file/d/example2',
      uploadedBy: 'Prof. Carlos Ruiz',
      uploadDate: '2025-11-19'
    }
  ],
  grades: [
    {
      id: 1,
      studentId: 3,
      classId: 1,
      assignmentId: 1,
      score: 85,
      maxScore: 100,
      feedback: 'Buen trabajo, mejorar en inferencias',
      gradedBy: 'Prof. Ana María',
      gradedDate: '2025-11-22'
    }
  ],
  forums: [
    {
      id: 1,
      classId: 1,
      title: 'Dudas sobre el Simulacro #1',
      author: 'Daniel Estudiante',
      content: '¿Alguien puede explicar la pregunta 15?',
      date: '2025-11-23',
      replies: [
        {
          id: 1,
          author: 'Prof. Ana María',
          content: 'Claro, la pregunta 15 evalúa tu capacidad de...',
          date: '2025-11-23'
        }
      ],
      views: 45,
      likes: 12
    }
  ]
};

export const db = {
  init: () => {
    if (!localStorage.getItem(DB_KEY)) {
      localStorage.setItem(DB_KEY, JSON.stringify(initialData));
    }
  },

  get: (table) => {
    const data = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
    return data[table] || [];
  },

  set: (table, items) => {
    const data = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
    data[table] = items;
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  },

  add: (table, item) => {
    const items = db.get(table);
    const newItem = { ...item, id: Date.now() };
    items.push(newItem);
    db.set(table, items);
    return newItem;
  },

  update: (table, id, updates) => {
    const items = db.get(table);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      db.set(table, items);
      return items[index];
    }
    return null;
  },

  delete: (table, id) => {
    const items = db.get(table);
    const filtered = items.filter(item => item.id !== id);
    db.set(table, filtered);
  },

  getSession: () => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  setSession: (user) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  clearSession: () => {
    localStorage.removeItem(SESSION_KEY);
  }
};