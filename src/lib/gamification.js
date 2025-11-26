export const LEVEL_THRESHOLDS = [
    0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800, 9100, 10500
];

export const BADGES = {
    FIRST_LOGIN: { id: 'first_login', name: 'Novato Curioso', icon: '🌱', description: 'Iniciaste sesión por primera vez' },
    HOMEWORK_HERO: { id: 'homework_hero', name: 'Héroe de Tareas', icon: '📚', description: 'Completaste 5 tareas seguidas' },
    QUIZ_MASTER: { id: 'quiz_master', name: 'Maestro del Quiz', icon: '🧠', description: 'Obtuviste 100% en un examen' },
    EARLY_BIRD: { id: 'early_bird', name: 'Madrugador', icon: '🌅', description: 'Estudiaste antes de las 7 AM' },
    NIGHT_OWL: { id: 'night_owl', name: 'Búho Nocturno', icon: '🦉', description: 'Estudiaste después de las 10 PM' }
};

export const calculateLevel = (xp) => {
    let level = 1;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (xp >= LEVEL_THRESHOLDS[i]) {
            level = i + 1;
        } else {
            break;
        }
    }
    return level;
};

export const getNextLevelXp = (currentLevel) => {
    return LEVEL_THRESHOLDS[currentLevel] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
};

export const getLevelProgress = (xp) => {
    const level = calculateLevel(xp);
    const currentLevelXp = LEVEL_THRESHOLDS[level - 1];
    const nextLevelXp = getNextLevelXp(level);

    const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
    return Math.min(Math.max(progress, 0), 100); // Clamp between 0 and 100
};
