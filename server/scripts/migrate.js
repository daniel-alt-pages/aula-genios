import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Course from '../models/Course.js';
import connectDB from '../config/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CREDENTIALS_FILE = join(__dirname, '..', '..', 'credenciales.json');
const COURSES_FILE = join(__dirname, '..', '..', 'cursos.json');

const migrateData = async () => {
    try {
        await connectDB();

        // Migrate Users
        console.log('Reading credentials.json...');
        const credentialsData = await readFile(CREDENTIALS_FILE, 'utf-8');
        const credentials = JSON.parse(credentialsData);

        console.log(`Found ${credentials.usuarios.length} users. Migrating...`);

        // Clear existing users to avoid duplicates during testing
        await User.deleteMany({});

        await User.insertMany(credentials.usuarios);
        console.log('✅ Users migrated successfully');

        // Migrate Courses
        console.log('Reading cursos.json...');
        const coursesData = await readFile(COURSES_FILE, 'utf-8');
        const courses = JSON.parse(coursesData);

        console.log(`Found ${courses.cursos.length} courses. Migrating...`);

        // Clear existing courses
        await Course.deleteMany({});

        await Course.insertMany(courses.cursos);
        console.log('✅ Courses migrated successfully');

        process.exit();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateData();
