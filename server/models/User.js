import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Storing in plain text as requested by user
    rol: { type: String, required: true, enum: ['admin', 'teacher', 'student'] },
    avatar: { type: String },
    activo: { type: Boolean, default: true },
    fecha_creacion: { type: String }
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

export default User;
