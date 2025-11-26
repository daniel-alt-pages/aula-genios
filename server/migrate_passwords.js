import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CREDENTIALS_FILE = join(__dirname, '..', 'credenciales.json');

async function migratePasswords() {
    try {
        console.log('Reading credentials...');
        const data = await readFile(CREDENTIALS_FILE, 'utf-8');
        const credentials = JSON.parse(data);
        let updatedCount = 0;

        console.log(`Found ${credentials.usuarios.length} users.`);

        for (const user of credentials.usuarios) {
            // Check if password is already hashed (starts with $2a$ or $2b$ and length is 60)
            if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
                console.log(`Hashing password for user: ${user.email}`);
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
                updatedCount++;
            } else {
                console.log(`Password for user ${user.email} is already hashed.`);
            }
        }

        if (updatedCount > 0) {
            credentials.fecha_actualizacion = new Date().toISOString().split('T')[0];
            await writeFile(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), 'utf-8');
            console.log(`Successfully migrated ${updatedCount} passwords.`);
        } else {
            console.log('No passwords needed migration.');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migratePasswords();
