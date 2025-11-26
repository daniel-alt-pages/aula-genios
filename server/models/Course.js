import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    code: { type: String },
    seccion: { type: String },
    profesorId: { type: String },
    profesorNombre: { type: String },
    color: { type: String },
    icono: { type: String },
    descripcion: { type: String },
    estudiantes: [{ type: String }], // Array of student IDs (strings)
    modulos: [{ type: Object }], // Flexible object for modules
    posts: [{
        id: { type: Number },
        author: { type: String },
        authorId: { type: String },
        content: { type: String },
        date: { type: String },
        timestamp: { type: String },
        comments: [{ type: Object }],
        type: { type: String }
    }],
    fecha_creacion: { type: String }
}, {
    timestamps: true
});

const Course = mongoose.model('Course', courseSchema);

export default Course;
