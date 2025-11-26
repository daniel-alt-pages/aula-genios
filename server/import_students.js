import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^\ufeff/, ''));

    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());

        if (values.length >= headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            data.push(row);
        }
    }
    return data;
}

async function importStudents() {
    console.log('Iniciando importación de estudiantes...');
    const students = readCSV(path.join(__dirname, 'students_to_import.csv'));
    const credentials = [];

    // Preparar statements (usando el wrapper de db.js)
    const insertUser = db.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, profile_data)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const checkUser = db.prepare('SELECT id FROM users WHERE email = ?');

    // Obtener admins existentes
    const getAdmins = db.prepare("SELECT email, role FROM users WHERE role = 'admin'");

    for (const student of students) {
        const email = student['correo electronico'];
        const name = student['nombre'];
        const docId = student['id'];

        if (!email || !docId) {
            console.log('Saltando fila inválida:', student);
            continue;
        }

        // Verificar si existe
        const existing = await checkUser.get(email);
        if (existing) {
            console.log(`Usuario ${email} ya existe. Saltando.`);
            credentials.push({ email, password: docId, role: 'student (ya existía)' });
            continue;
        }

        const id = uuidv4();
        const passwordHash = await bcrypt.hash(docId, 10);
        const role = 'student';

        const profileData = JSON.stringify({
            tipoDoc: student['tipoDoc'],
            documento: docId,
            plan: student['plan'],
            estado: student['estado'],
            fechaPago: student['fechaPago'],
            avatar: '👨‍🎓',
            bio: `Estudiante - ${student['plan']}`
        });

        try {
            await insertUser.run(id, email, passwordHash, name, role, profileData);
            console.log(`Creado usuario: ${name} (${email})`);
            credentials.push({ email, password: docId, role: 'student' });
        } catch (error) {
            console.error(`Error creando usuario ${email}:`, error.message);
        }
    }

    const admins = await getAdmins.all();

    // Generar reporte CSV
    let csvContent = 'Email,Password (Inicial),Role\n';

    // Agregar admins
    if (admins && admins.length > 0) {
        admins.forEach(admin => {
            csvContent += `${admin.email},[PROTEGIDA],admin\n`;
        });
    }

    // Agregar nuevos estudiantes
    credentials.forEach(cred => {
        csvContent += `${cred.email},${cred.password},${cred.role}\n`;
    });

    const outputPath = path.join(__dirname, 'generated_credentials.csv');
    fs.writeFileSync(outputPath, csvContent);
    console.log(`Importación completada. Credenciales guardadas en ${outputPath}`);
}

importStudents().catch(console.error);
