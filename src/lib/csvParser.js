// Utilidad para parsear el CSV de estudiantes
export const parseStudentsCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');

    return lines.slice(1).map((line, index) => {
        const values = line.split(',');
        return {
            id: `student_${index + 1}`,
            email: values[0]?.trim() || '',
            name: values[1]?.trim() || '',
            docType: values[2]?.trim() || '',
            docId: values[3]?.trim() || '',
            plan: values[4]?.trim() || 'Plan Básico',
            status: values[5]?.trim() || 'Activo',
            paymentDate: values[6]?.trim() || '',
            role: 'student',
            avatar: '👨‍🎓',
            stats: {
                xp: Math.floor(Math.random() * 500),
                level: Math.floor(Math.random() * 5) + 1,
                badges: [],
                coins: Math.floor(Math.random() * 100)
            }
        };
    });
};

// Cargar estudiantes desde el CSV
export const loadStudentsFromCSV = async () => {
    try {
        const response = await fetch('/BD_estudiantes - Hoja 1.csv');
        const csvText = await response.text();
        return parseStudentsCSV(csvText);
    } catch (error) {
        console.error('Error loading students:', error);
        return [];
    }
};
