// API Service - Connects frontend to backend
const API_URL = 'http://localhost:3002/api';

const getToken = () => localStorage.getItem('token');
const setToken = (token) => localStorage.setItem('token', token);
const removeToken = () => localStorage.removeItem('token');

async function apiFetch(endpoint, options = {}) {
    const token = getToken();

    const config = {
        ...options,
        headers: {
            ...options.headers,
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...(!(options.body instanceof FormData) && { 'Content-Type': 'application/json' })
        }
    };

    const response = await fetch(`${API_URL}${endpoint}`, config);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || 'Request failed');
    }

    return response.json();
}

export const authAPI = {
    login: async (email, password) => {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (data.token) setToken(data.token);
        return data.user;
    },
    me: async () => apiFetch('/auth/me'),
    logout: () => removeToken()
};

export const coursesAPI = {
    getAll: async () => apiFetch('/courses'),
    getModules: async (courseId) => apiFetch(`/courses/${courseId}/modules`),
    create: async (courseData) => apiFetch('/courses', {
        method: 'POST',
        body: JSON.stringify(courseData)
    }),
    update: async (id, courseData) => apiFetch(`/courses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(courseData)
    })
};

export const usersAPI = {
    getAll: async () => apiFetch('/users'),
    create: async (userData) => apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(userData)
    }),
    update: async (id, userData) => apiFetch(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
    }),
    delete: async (id) => apiFetch(`/users/${id}`, {
        method: 'DELETE'
    })
};

export const chatAPI = {
    getMessages: async (classId = 'global') => apiFetch(`/chat/${classId}`),
    sendMessage: async (classId = 'global', content) => apiFetch(`/chat/${classId}`, {
        method: 'POST',
        body: JSON.stringify({ content })
    })
};

export const eventsAPI = {
    getAll: async () => apiFetch('/events'),
    create: async (eventData) => apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify(eventData)
    })
};

export const enrollmentAPI = {
    enroll: async (enrollmentData) => apiFetch(`/classes/${enrollmentData.classId}/enroll`, {
        method: 'POST',
        body: JSON.stringify({ studentId: enrollmentData.studentId })
    }),
    getStudentClasses: async (studentId) => {
        // El backend ya filtra por el usuario autenticado en /classes
        const data = await apiFetch('/classes');
        return data; // El backend devuelve { success: true, classes: [] }
    }
};

export const forumAPI = {
    getThreads: async (classId) => apiFetch(`/forum/${classId}`),
    createThread: async (classId, threadData) => apiFetch(`/forum/${classId}`, {
        method: 'POST',
        body: JSON.stringify(threadData)
    }),
    getReplies: async (threadId) => apiFetch(`/forum/thread/${threadId}`),
    reply: async (threadId, content) => apiFetch(`/forum/thread/${threadId}`, {
        method: 'POST',
        body: JSON.stringify({ content })
    })
};

export const settingsAPI = {
    getAll: async () => apiFetch('/settings'),
    update: async (settings) => apiFetch('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
    })
};

export const credentialsAPI = {
    getAll: async () => apiFetch('/credentials'),
    create: async (userData) => apiFetch('/credentials', {
        method: 'POST',
        body: JSON.stringify(userData)
    }),
    update: async (id, userData) => apiFetch(`/credentials/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
    }),
    delete: async (id) => apiFetch(`/credentials/${id}`, {
        method: 'DELETE'
    }),
    exportCSV: async () => {
        const token = getToken();
        const response = await fetch(`${API_URL}/credentials/export/csv`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Error al exportar');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `credenciales_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
};

export const classesAPI = {
    getAll: async () => {
        const data = await apiFetch('/classes');
        return data.classes || [];
    },
    create: async (classData) => {
        const data = await apiFetch('/classes', {
            method: 'POST',
            body: JSON.stringify(classData)
        });
        return data.class;
    },
    update: async (id, classData) => apiFetch(`/classes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(classData)
    }),
    delete: async (id) => apiFetch(`/classes/${id}`, {
        method: 'DELETE'
    })
};

export default {
    auth: authAPI,
    courses: coursesAPI,
    classes: classesAPI,
    users: usersAPI,
    chat: chatAPI,
    events: eventsAPI,
    enrollment: enrollmentAPI,
    forum: forumAPI,
    settings: settingsAPI,
    credentials: credentialsAPI
};
