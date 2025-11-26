// Aula JavaScript
let currentMateria = '';
let currentUser = {};

// ImgBB API configuration
const IMGBB_API_KEY = '0d447185d3dc7cba69ee1c6df144f146';
const IMGBB_API_URL = 'https://api.imgbb.com/1/upload';

document.addEventListener('DOMContentLoaded', function () {
    checkAuthentication();
    loadUserInfo();
    getCurrentMateria();
    setupEventListeners();
    setupTabs();
});

// Check authentication
function checkAuthentication() {
    currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');

    if (!currentUser.id) {
        window.location.href = '../index.html';
        return;
    }
}

// Get current materia from URL
function getCurrentMateria() {
    const urlParams = new URLSearchParams(window.location.search);
    currentMateria = urlParams.get('materia');

    if (!currentMateria) {
        window.location.href = 'Clases.html';
        return;
    }

    // Set title
    const materias = {
        'matematicas': 'Matemáticas',
        'lectura': 'Lectura Crítica',
        'sociales': 'Ciencias Sociales',
        'naturales': 'Ciencias Naturales',
        'ingles': 'Inglés'
    };

    document.getElementById('aulaTitle').textContent = materias[currentMateria] || 'Aula';

    // Show create buttons for admin
    if (currentUser.tipoUsuario === 'admin') {
        document.getElementById('createPostContainer').style.display = 'block';
        document.getElementById('createTaskContainer').style.display = 'block';
        document.getElementById('createMaterialContainer').style.display = 'block';
        document.getElementById('estudiantesTab').style.display = 'flex';
    }

    // Load content
    loadAnuncios();
}

// Load user info
async function loadUserInfo() {
    if (currentUser.nombre) {
        document.getElementById('userName').textContent = currentUser.nombre.toUpperCase();
    }

    await cargarFotoPerfil(currentUser.id);
}

// Cargar foto de perfil
async function cargarFotoPerfil(usuarioId) {
    try {
        if (!window.firebaseDB) {
            await esperarFirebase();
        }

        const db = window.firebaseDB;
        const usuarioDoc = await db.collection('usuarios').doc(usuarioId).get();

        if (usuarioDoc.exists) {
            const datosUsuario = usuarioDoc.data();

            if (datosUsuario.fotoPerfil) {
                const avatarDefault = document.getElementById('userAvatarDefault');
                const avatarImage = document.getElementById('userAvatarImage');

                if (avatarDefault && avatarImage) {
                    avatarDefault.style.display = 'none';
                    avatarImage.src = datosUsuario.fotoPerfil;
                    avatarImage.style.display = 'block';
                }
            }
        }
    } catch (error) {
        console.error('Error al cargar foto de perfil:', error);
    }
}

// Esperar Firebase
function esperarFirebase() {
    return new Promise(resolve => {
        const verificar = () => {
            if (window.firebaseDB) {
                resolve();
            } else {
                setTimeout(verificar, 100);
            }
        };
        verificar();
    });
}

// Setup tabs
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');

            // Remove active class from all tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            // Add active class to clicked tab
            btn.classList.add('active');
            document.getElementById(`${tabName}Pane`).classList.add('active');

            // Load content based on tab
            switch (tabName) {
                case 'anuncios':
                    loadAnuncios();
                    break;
                case 'tareas':
                    loadTareas();
                    break;
                case 'materiales':
                    loadMateriales();
                    break;
                case 'estudiantes':
                    loadEstudiantes();
                    break;
            }
        });
    });
}

// Load anuncios
async function loadAnuncios() {
    try {
        await esperarFirebase();
        const db = window.firebaseDB;

        const postsContainer = document.getElementById('postsContainer');
        postsContainer.innerHTML = '<div class="loading-spinner"><i class="bi bi-arrow-clockwise"></i></div>';

        const snapshot = await db.collection('anuncios')
            .where('materia', '==', currentMateria)
            .get();

        if (snapshot.empty) {
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-megaphone"></i>
                    <p>No hay anuncios aún</p>
                </div>
            `;
            return;
        }

        // Sort manually by tipo (clases primero) y luego por fecha
        const anuncios = [];
        snapshot.forEach(doc => {
            anuncios.push({ id: doc.id, data: doc.data() });
        });

        anuncios.sort((a, b) => {
            // Primero ordenar por tipo (clases primero)
            const tipoA = a.data.tipo === 'clase' ? 0 : 1;
            const tipoB = b.data.tipo === 'clase' ? 0 : 1;
            
            if (tipoA !== tipoB) {
                return tipoA - tipoB;
            }
            
            // Luego ordenar por fecha (más reciente primero)
            const fechaA = a.data.fecha ? a.data.fecha.seconds : 0;
            const fechaB = b.data.fecha ? b.data.fecha.seconds : 0;
            return fechaB - fechaA; // Descending order
        });

        postsContainer.innerHTML = '';

        for (const anuncio of anuncios) {
            const postCard = await createPostCard(anuncio.id, anuncio.data);
            postsContainer.appendChild(postCard);
        }

    } catch (error) {
        console.error('Error al cargar anuncios:', error);
        document.getElementById('postsContainer').innerHTML = `
            <div class="empty-state">
                <i class="bi bi-exclamation-triangle"></i>
                <p>Error al cargar anuncios</p>
            </div>
        `;
    }
}

// Create post card
async function createPostCard(id, anuncio) {
    const card = document.createElement('div');
    card.className = 'post-card';
    
    // Agregar clase si el anuncio está cancelado
    if (anuncio.cancelada === true) {
        card.classList.add('cancelled');
    }

    // Get author info
    let authorName = 'Usuario';
    let authorPhoto = '';

    try {
        const db = window.firebaseDB;
        const authorDoc = await db.collection('usuarios').doc(anuncio.autorId).get();
        if (authorDoc.exists) {
            const authorData = authorDoc.data();
            authorName = authorData.nombre;
            authorPhoto = authorData.fotoPerfil || '';
        }
    } catch (error) {
        console.error('Error al obtener autor:', error);
    }

    const fecha = anuncio.fecha ? new Date(anuncio.fecha.seconds * 1000) : new Date();
    const fechaStr = formatearFecha(fecha);

    // Build media HTML (images and videos in grid)
    let mediaHTML = '';
    let mediaItems = [];

    // Add image if exists
    if (anuncio.imagenUrl) {
        mediaItems.push(`
            <div class="post-image" onclick="openMediaModal('${anuncio.imagenUrl}', 'image')">
                <img src="${anuncio.imagenUrl}" alt="Imagen del anuncio">
                <div class="media-overlay">
                    <i class="bi bi-zoom-in"></i>
                </div>
            </div>
        `);
    }

    // Add video if exists
    if (anuncio.videoTipo && anuncio.videoUrl) {
        if (anuncio.videoTipo === 'youtube') {
            const videoId = extractYouTubeId(anuncio.videoUrl);
            if (videoId) {
                mediaItems.push(`
                    <div class="post-video">
                        <div class="video-container-small" onclick="openMediaModal('${videoId}', 'youtube')">
                            <iframe 
                                src="https://www.youtube.com/embed/${videoId}" 
                                frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen>
                            </iframe>
                            <div class="media-overlay">
                                <i class="bi bi-play-circle"></i>
                            </div>
                        </div>
                    </div>
                `);
            }
        } else if (anuncio.videoTipo === 'drive') {
            const fileId = extractDriveFileId(anuncio.videoUrl);
            if (fileId) {
                mediaItems.push(`
                    <div class="post-video">
                        <div class="drive-container-small" onclick="openMediaModal('${fileId}', 'drive')">
                            <iframe 
                                src="https://drive.google.com/file/d/${fileId}/preview" 
                                frameborder="0" 
                                allow="autoplay">
                            </iframe>
                            <div class="media-overlay">
                                <i class="bi bi-play-circle"></i>
                            </div>
                        </div>
                    </div>
                `);
            }
        }
    }

    // Wrap media items in grid container if there are any
    if (mediaItems.length > 0) {
        mediaHTML = `<div class="post-media-container">${mediaItems.join('')}</div>`;
    }

    card.innerHTML = `
        <div class="post-header">
            <div class="post-avatar">
                ${authorPhoto ? `<img src="${authorPhoto}" alt="${authorName}">` : '<i class="bi bi-person-fill"></i>'}
            </div>
            <div class="post-info">
                <div class="post-author">${authorName}</div>
                <div class="post-date">${fechaStr}</div>
            </div>
            ${currentUser.tipoUsuario === 'admin' ? `
                <div class="post-actions">
                    <button class="post-action-btn" onclick="editarAnuncio('${id}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="post-action-btn" onclick="eliminarAnuncio('${id}')" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            ` : ''}
        </div>
        ${anuncio.titulo ? `<h3 class="post-title">${anuncio.titulo}</h3>` : ''}
        <div class="post-content">${convertirEnlacesAClickeables(anuncio.contenido)}</div>
        ${mediaHTML}
    `;

    return card;
}

// Load tareas
async function loadTareas() {
    try {
        await esperarFirebase();
        const db = window.firebaseDB;

        const tasksContainer = document.getElementById('tasksContainer');
        tasksContainer.innerHTML = '<div class="loading-spinner"><i class="bi bi-arrow-clockwise"></i></div>';

        const snapshot = await db.collection('tareas')
            .where('materia', '==', currentMateria)
            .get();

        if (snapshot.empty) {
            tasksContainer.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-clipboard-check"></i>
                    <p>No hay tareas asignadas</p>
                </div>
            `;
            return;
        }

        // Sort manually by fechaEntrega
        const tareas = [];
        snapshot.forEach(doc => {
            tareas.push({ id: doc.id, data: doc.data() });
        });

        tareas.sort((a, b) => {
            const fechaA = a.data.fechaEntrega ? a.data.fechaEntrega.seconds : 0;
            const fechaB = b.data.fechaEntrega ? b.data.fechaEntrega.seconds : 0;
            return fechaA - fechaB; // Ascending order
        });

        tasksContainer.innerHTML = '';

        for (const tarea of tareas) {
            const taskCard = await createTaskCard(tarea.id, tarea.data);
            tasksContainer.appendChild(taskCard);
        }

    } catch (error) {
        console.error('Error al cargar tareas:', error);
        document.getElementById('tasksContainer').innerHTML = `
            <div class="empty-state">
                <i class="bi bi-exclamation-triangle"></i>
                <p>Error al cargar tareas</p>
            </div>
        `;
    }
}

// Create task card
async function createTaskCard(id, tarea) {
    const card = document.createElement('div');
    card.className = 'task-card';

    const fechaEntrega = tarea.fechaEntrega ? new Date(tarea.fechaEntrega.seconds * 1000) : new Date();
    const ahora = new Date();
    let status = 'pending';
    let statusText = 'Pendiente';

    // Check if student has submitted
    let isSubmitted = false;
    let submissionStatus = '';

    if (currentUser.tipoUsuario === 'estudiante') {
        const db = window.firebaseDB;
        const submissionSnapshot = await db.collection('entregas')
            .where('tareaId', '==', id)
            .where('estudianteId', '==', currentUser.id)
            .get();

        if (!submissionSnapshot.empty) {
            isSubmitted = true;
            status = 'completed';
            statusText = 'Entregada';

            // Check if graded
            const submissionData = submissionSnapshot.docs[0].data();
            if (submissionData.calificacion !== undefined) {
                const maxPoints = tarea.puntos || 100;
                const percentage = (submissionData.calificacion / maxPoints) * 100;

                // Determine color based on percentage
                let bgColor, textColor;
                if (percentage >= 90) {
                    // Excelente: Verde oscuro
                    bgColor = '#d4edda';
                    textColor = '#155724';
                } else if (percentage >= 70) {
                    // Bueno: Verde claro
                    bgColor = '#d1ecf1';
                    textColor = '#0c5460';
                } else if (percentage >= 50) {
                    // Regular: Amarillo
                    bgColor = '#fff3cd';
                    textColor = '#856404';
                } else {
                    // Malo: Rojo
                    bgColor = '#f8d7da';
                    textColor = '#721c24';
                }

                submissionStatus = `<span class="submissions-count" style="background: ${bgColor}; color: ${textColor}; padding: 0.3rem 0.8rem; border-radius: 20px; font-weight: 600;">Calificación: ${submissionData.calificacion}/${maxPoints}</span>`;
            }
        } else if (fechaEntrega < ahora) {
            status = 'overdue';
            statusText = 'Vencida';
        }
    } else if (currentUser.tipoUsuario === 'admin') {
        // Count submissions for admin
        const db = window.firebaseDB;
        const submissionsSnapshot = await db.collection('entregas')
            .where('tareaId', '==', id)
            .get();

        const submissionsCount = submissionsSnapshot.size;
        submissionStatus = `<span class="submissions-count">${submissionsCount} entrega(s)</span>`;

        if (fechaEntrega < ahora) {
            status = 'overdue';
            statusText = 'Vencida';
        }
    }

    // Build media HTML (images and videos in grid)
    let mediaHTML = '';
    let mediaItems = [];

    // Add image if exists
    if (tarea.imagenUrl) {
        mediaItems.push(`
            <div class="task-image" onclick="openMediaModal('${tarea.imagenUrl}', 'image')">
                <img src="${tarea.imagenUrl}" alt="Imagen de la tarea">
                <div class="media-overlay">
                    <i class="bi bi-zoom-in"></i>
                </div>
            </div>
        `);
    }

    // Add video if exists
    if (tarea.videoTipo && tarea.videoUrl) {
        if (tarea.videoTipo === 'youtube') {
            const videoId = extractYouTubeId(tarea.videoUrl);
            if (videoId) {
                mediaItems.push(`
                    <div class="task-video">
                        <div class="video-container-small" onclick="openMediaModal('${videoId}', 'youtube')">
                            <iframe 
                                src="https://www.youtube.com/embed/${videoId}" 
                                frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen>
                            </iframe>
                            <div class="media-overlay">
                                <i class="bi bi-play-circle"></i>
                            </div>
                        </div>
                    </div>
                `);
            }
        } else if (tarea.videoTipo === 'drive') {
            const fileId = extractDriveFileId(tarea.videoUrl);
            if (fileId) {
                mediaItems.push(`
                    <div class="task-video">
                        <div class="drive-container-small" onclick="openMediaModal('${fileId}', 'drive')">
                            <iframe 
                                src="https://drive.google.com/file/d/${fileId}/preview" 
                                frameborder="0" 
                                allow="autoplay">
                            </iframe>
                            <div class="media-overlay">
                                <i class="bi bi-play-circle"></i>
                            </div>
                        </div>
                    </div>
                `);
            }
        }
    }

    // Wrap media items in grid container if there are any
    if (mediaItems.length > 0) {
        mediaHTML = `<div class="task-media-container">${mediaItems.join('')}</div>`;
    }

    // Build Drive files HTML
    let driveFilesHTML = '';
    if (tarea.driveUrl) {
        driveFilesHTML = `
            <div class="task-drive-files">
                <a href="${tarea.driveUrl}" target="_blank" class="drive-file-link">
                    <i class="bi bi-google"></i>
                    <span>Ver archivos en Drive</span>
                    <i class="bi bi-box-arrow-up-right"></i>
                </a>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="task-header">
            <div>
                <h3 class="task-title">${tarea.titulo}</h3>
                ${tarea.puntos ? `<span class="task-points">${tarea.puntos} puntos</span>` : ''}
            </div>
            <div class="task-status-container">
                <span class="task-status ${status}">${statusText}</span>
                ${submissionStatus}
            </div>
        </div>
        <div class="task-description">${tarea.descripcion}</div>
        ${mediaHTML}
        ${driveFilesHTML}
        <div class="task-footer">
            <div class="task-due-date">
                <i class="bi bi-calendar-event"></i>
                <span>Entrega: ${formatearFecha(fechaEntrega)}</span>
            </div>
            <div class="task-actions">
                ${currentUser.tipoUsuario === 'estudiante' && !isSubmitted ? `
                    <button class="submit-task-btn" onclick="openSubmitTaskModal('${id}', '${tarea.titulo}')">
                        <i class="bi bi-send"></i>
                        Entregar Tarea
                    </button>
                ` : ''}
                ${currentUser.tipoUsuario === 'admin' ? `
                    <button class="view-submissions-btn" onclick="viewSubmissions('${id}', '${tarea.titulo}')">
                        <i class="bi bi-eye"></i>
                        Ver Entregas
                    </button>
                    <button class="post-action-btn" onclick="editarTarea('${id}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="post-action-btn" onclick="eliminarTarea('${id}')" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `;

    return card;
}

// Load materiales
async function loadMateriales() {
    try {
        await esperarFirebase();
        const db = window.firebaseDB;

        const materialsContainer = document.getElementById('materialsContainer');
        materialsContainer.innerHTML = '<div class="loading-spinner"><i class="bi bi-arrow-clockwise"></i></div>';

        const snapshot = await db.collection('materiales')
            .where('materia', '==', currentMateria)
            .get();

        if (snapshot.empty) {
            materialsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-folder"></i>
                    <p>No hay materiales disponibles</p>
                </div>
            `;
            return;
        }

        // Sort manually by fecha
        const materiales = [];
        snapshot.forEach(doc => {
            materiales.push({ id: doc.id, data: doc.data() });
        });

        materiales.sort((a, b) => {
            const fechaA = a.data.fecha ? a.data.fecha.seconds : 0;
            const fechaB = b.data.fecha ? b.data.fecha.seconds : 0;
            return fechaB - fechaA; // Descending order
        });

        materialsContainer.innerHTML = '';

        materiales.forEach(material => {
            const materialCard = createMaterialCard(material.id, material.data);
            materialsContainer.appendChild(materialCard);
        });

    } catch (error) {
        console.error('Error al cargar materiales:', error);
        document.getElementById('materialsContainer').innerHTML = `
            <div class="empty-state">
                <i class="bi bi-exclamation-triangle"></i>
                <p>Error al cargar materiales</p>
            </div>
        `;
    }
}

// Create material card
function createMaterialCard(id, material) {
    const card = document.createElement('div');
    card.className = 'material-card';

    // Build media HTML (images and videos in grid)
    let mediaHTML = '';
    let mediaItems = [];

    // Add images if exist
    if (material.imageUrls && material.imageUrls.length > 0) {
        material.imageUrls.forEach(imageUrl => {
            mediaItems.push(`
                <div class="material-image" onclick="openMediaModal('${imageUrl}', 'image')">
                    <img src="${imageUrl}" alt="Imagen del material">
                    <div class="media-overlay">
                        <i class="bi bi-zoom-in"></i>
                    </div>
                </div>
            `);
        });
    }

    // Add videos if exist
    if (material.videos && material.videos.length > 0) {
        material.videos.forEach(video => {
            if (video.tipo === 'youtube') {
                const videoId = extractYouTubeId(video.url);
                if (videoId) {
                    mediaItems.push(`
                        <div class="material-video">
                            <div class="video-container-medium" onclick="openMediaModal('${videoId}', 'youtube')">
                                <iframe 
                                    src="https://www.youtube.com/embed/${videoId}" 
                                    frameborder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowfullscreen>
                                </iframe>
                                <div class="media-overlay">
                                    <i class="bi bi-play-circle"></i>
                                </div>
                            </div>
                        </div>
                    `);
                }
            } else if (video.tipo === 'drive') {
                const fileId = extractDriveFileId(video.url);
                if (fileId) {
                    mediaItems.push(`
                        <div class="material-video">
                            <div class="drive-container-medium" onclick="openMediaModal('${fileId}', 'drive')">
                                <iframe 
                                    src="https://drive.google.com/file/d/${fileId}/preview" 
                                    frameborder="0" 
                                    allow="autoplay">
                                </iframe>
                                <div class="media-overlay">
                                    <i class="bi bi-play-circle"></i>
                                </div>
                            </div>
                        </div>
                    `);
                }
            }
        });
    }

    // Wrap media items in grid container if there are any
    if (mediaItems.length > 0) {
        mediaHTML = `<div class="material-media-container">${mediaItems.join('')}</div>`;
    }

    // Build Drive files HTML
    let driveFilesHTML = '';
    if (material.driveUrl) {
        driveFilesHTML = `
            <div class="material-drive-files">
                <a href="${material.driveUrl}" target="_blank" class="drive-file-link">
                    <i class="bi bi-google"></i>
                    <span>Ver archivos en Drive</span>
                    <i class="bi bi-box-arrow-up-right"></i>
                </a>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="material-header">
            <div class="material-content">
                <h3 class="material-title">${material.titulo}</h3>
                ${material.descripcion ? `<p class="material-description">${material.descripcion}</p>` : ''}
            </div>
            ${currentUser.tipoUsuario === 'admin' ? `
                <div class="material-actions">
                    <button class="post-action-btn" onclick="editarMaterial('${id}')" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="post-action-btn" onclick="eliminarMaterial('${id}')" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            ` : ''}
        </div>
        ${mediaHTML}
        ${driveFilesHTML}
    `;

    return card;
}

// Extract YouTube video ID from URL
function extractYouTubeId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}

// Extract Google Drive file ID from URL
function extractDriveFileId(url) {
    const patterns = [
        /\/file\/d\/([^\/]+)/,
        /id=([^&]+)/,
        /^([a-zA-Z0-9_-]+)$/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}

// Convertir enlaces en texto a enlaces clickeables
function convertirEnlacesAClickeables(texto) {
    if (!texto) return '';
    
    // Escapar HTML para prevenir XSS
    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
    
    // Escapar el texto primero
    let textoEscapado = escapeHtml(texto);
    
    // Patrón para detectar URLs (http, https, www)
    const urlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
    
    // Reemplazar URLs con enlaces clickeables
    textoEscapado = textoEscapado.replace(urlPattern, (match) => {
        let url = match;
        let displayUrl = match;
        
        // Si no tiene protocolo, agregarlo
        if (!url.match(/^https?:\/\//i)) {
            url = 'https://' + url;
        }
        
        // Limpiar caracteres al final
        url = url.replace(/[.,;:!?)\]]+$/, '');
        displayUrl = displayUrl.replace(/[.,;:!?)\]]+$/, '');
        
        // Acortar URL para mostrar si es muy larga
        if (displayUrl.length > 50) {
            displayUrl = displayUrl.substring(0, 47) + '...';
        }
        
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="content-link" title="${url}">${displayUrl}</a>`;
    });
    
    // Restaurar saltos de línea
    textoEscapado = textoEscapado.replace(/\n/g, '<br>');
    
    return textoEscapado;
}

// Load estudiantes
async function loadEstudiantes() {
    try {
        await esperarFirebase();
        const db = window.firebaseDB;

        const studentsContainer = document.getElementById('studentsContainer');
        studentsContainer.innerHTML = '<div class="loading-spinner"><i class="bi bi-arrow-clockwise"></i></div>';

        const snapshot = await db.collection('usuarios')
            .where('tipoUsuario', '==', 'estudiante')
            .where('clasesPermitidas', 'array-contains', currentMateria)
            .get();

        if (snapshot.empty) {
            studentsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-people"></i>
                    <p>No hay estudiantes inscritos</p>
                </div>
            `;
            return;
        }

        studentsContainer.innerHTML = '';

        snapshot.forEach(doc => {
            const estudiante = doc.data();
            const studentItem = createStudentItem(estudiante);
            studentsContainer.appendChild(studentItem);
        });

    } catch (error) {
        console.error('Error al cargar estudiantes:', error);
    }
}

// Create student item
function createStudentItem(estudiante) {
    const item = document.createElement('div');
    item.className = 'student-item';

    item.innerHTML = `
        <div class="student-avatar">
            ${estudiante.fotoPerfil ? `<img src="${estudiante.fotoPerfil}" alt="${estudiante.nombre}">` : '<i class="bi bi-person-fill"></i>'}
        </div>
        <div class="student-info">
            <div class="student-name">${estudiante.nombre}</div>
            <div class="student-email">${estudiante.usuario}</div>
        </div>
    `;

    return item;
}

// Setup event listeners
function setupEventListeners() {
    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'Clases.html';
        });
    }

    // User menu dropdown
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    
    if (userMenuBtn && userDropdownMenu) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdownMenu.classList.toggle('active');
        });

        // Cerrar dropdown al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (!userMenuBtn.contains(e.target) && !userDropdownMenu.contains(e.target)) {
                userDropdownMenu.classList.remove('active');
            }
        });
    }

    // Logout button en dropdown
    const logoutBtnDropdown = document.getElementById('logoutBtnDropdown');
    if (logoutBtnDropdown) {
        logoutBtnDropdown.addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = '../index.html';
        });
    }

    // Create post button
    const createPostBtn = document.getElementById('createPostBtn');
    if (createPostBtn) {
        createPostBtn.addEventListener('click', () => {
            document.getElementById('createPostModal').classList.add('active');
        });
    }

    // Create task button
    const createTaskBtn = document.getElementById('createTaskBtn');
    if (createTaskBtn) {
        createTaskBtn.addEventListener('click', () => {
            document.getElementById('createTaskModal').classList.add('active');
        });
    }

    // Create material button
    const createMaterialBtn = document.getElementById('createMaterialBtn');
    if (createMaterialBtn) {
        createMaterialBtn.addEventListener('click', () => {
            document.getElementById('createMaterialModal').classList.add('active');
        });
    }

    // Close modals
    setupModalListeners();

    // Forms
    setupForms();
}

// Setup modal listeners
function setupModalListeners() {
    const modals = ['createPostModal', 'createTaskModal', 'createMaterialModal', 'submitTaskModal', 'viewSubmissionsModal'];

    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        const closeBtn = modal.querySelector('.close-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// Setup forms
function setupForms() {
    // Image preview handler for posts
    const postImage = document.getElementById('postImage');
    const imagePreview = document.getElementById('imagePreview');
    const imagePreviewImg = document.getElementById('imagePreviewImg');
    const removeImageBtn = document.getElementById('removeImageBtn');

    if (postImage) {
        postImage.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreviewImg.src = e.target.result;
                    imagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', () => {
            postImage.value = '';
            imagePreview.style.display = 'none';
            imagePreviewImg.src = '';
        });
    }

    // Image preview handler for tasks
    const taskImage = document.getElementById('taskImage');
    const taskImagePreview = document.getElementById('taskImagePreview');
    const taskImagePreviewImg = document.getElementById('taskImagePreviewImg');
    const removeTaskImageBtn = document.getElementById('removeTaskImageBtn');

    if (taskImage) {
        taskImage.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    taskImagePreviewImg.src = e.target.result;
                    taskImagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removeTaskImageBtn) {
        removeTaskImageBtn.addEventListener('click', () => {
            taskImage.value = '';
            taskImagePreview.style.display = 'none';
            taskImagePreviewImg.src = '';
        });
    }

    // Video type change handler for posts
    const postVideoType = document.getElementById('postVideoType');
    const postVideoUrlGroup = document.getElementById('postVideoUrlGroup');
    const postVideoHelp = document.getElementById('postVideoHelp');
    const postVideoHelpText = document.getElementById('postVideoHelpText');

    if (postVideoType) {
        postVideoType.addEventListener('change', (e) => {
            const type = e.target.value;

            if (type === 'youtube') {
                postVideoUrlGroup.style.display = 'block';
                postVideoHelp.style.display = 'flex';
                postVideoHelpText.textContent = 'Pega el enlace de YouTube (ej: https://www.youtube.com/watch?v=VIDEO_ID)';
            } else if (type === 'drive') {
                postVideoUrlGroup.style.display = 'block';
                postVideoHelp.style.display = 'flex';
                postVideoHelpText.textContent = 'Pega el enlace de Google Drive. Asegúrate de que el archivo tenga permisos públicos';
            } else {
                postVideoUrlGroup.style.display = 'none';
                postVideoHelp.style.display = 'none';
            }
        });
    }

    // Video type change handler for tasks
    const taskVideoType = document.getElementById('taskVideoType');
    const taskVideoUrlGroup = document.getElementById('taskVideoUrlGroup');
    const taskVideoHelp = document.getElementById('taskVideoHelp');
    const taskVideoHelpText = document.getElementById('taskVideoHelpText');

    if (taskVideoType) {
        taskVideoType.addEventListener('change', (e) => {
            const type = e.target.value;

            if (type === 'youtube') {
                taskVideoUrlGroup.style.display = 'block';
                taskVideoHelp.style.display = 'flex';
                taskVideoHelpText.textContent = 'Pega el enlace de YouTube (ej: https://www.youtube.com/watch?v=VIDEO_ID)';
            } else if (type === 'drive') {
                taskVideoUrlGroup.style.display = 'block';
                taskVideoHelp.style.display = 'flex';
                taskVideoHelpText.textContent = 'Pega el enlace de Google Drive. Asegúrate de que el archivo tenga permisos públicos';
            } else {
                taskVideoUrlGroup.style.display = 'none';
                taskVideoHelp.style.display = 'none';
            }
        });
    }

    // Create post form
    document.getElementById('createPostForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await crearAnuncio();
    });

    // Create task form
    document.getElementById('createTaskForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await crearTarea();
    });

    // Submit task form
    document.getElementById('submitTaskForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitTask();
    });

    // Edit forms
    document.getElementById('editPostForm').addEventListener('submit', actualizarAnuncio);
    document.getElementById('editTaskForm').addEventListener('submit', actualizarTarea);
    document.getElementById('editMaterialForm').addEventListener('submit', actualizarMaterial);

    // Edit post video type change handler
    const editPostVideoType = document.getElementById('editPostVideoType');
    if (editPostVideoType) {
        editPostVideoType.addEventListener('change', (e) => {
            const type = e.target.value;
            const urlGroup = document.getElementById('editPostVideoUrlGroup');

            if (type === 'youtube' || type === 'drive') {
                urlGroup.style.display = 'block';
            } else {
                urlGroup.style.display = 'none';
            }
        });
    }

    // Create material form
    document.getElementById('createMaterialForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await crearMaterial();
    });

    // Material images upload handler
    window.currentMaterialVideos = [];

    const uploadMaterialImagesBtn = document.getElementById('uploadMaterialImagesBtn');
    const materialImages = document.getElementById('materialImages');
    const materialImagesPreview = document.getElementById('materialImagesPreview');

    if (uploadMaterialImagesBtn && materialImages) {
        uploadMaterialImagesBtn.addEventListener('click', () => {
            materialImages.click();
        });

        materialImages.addEventListener('change', (e) => {
            materialImagesPreview.innerHTML = '';
            const files = e.target.files;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const reader = new FileReader();

                reader.onload = (e) => {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'preview-item';
                    previewItem.innerHTML = `
                        <img src="${e.target.result}" alt="Preview">
                        <button type="button" class="remove-preview-btn" onclick="removeMaterialImage(${i})">
                            <i class="bi bi-x"></i>
                        </button>
                    `;
                    materialImagesPreview.appendChild(previewItem);
                };

                reader.readAsDataURL(file);
            }
        });
    }

    // Material videos handler
    const addMaterialVideoBtn = document.getElementById('addMaterialVideoBtn');
    const materialVideoType = document.getElementById('materialVideoType');
    const materialVideoUrl = document.getElementById('materialVideoUrl');
    const materialVideosPreview = document.getElementById('materialVideosPreview');

    if (addMaterialVideoBtn) {
        addMaterialVideoBtn.addEventListener('click', () => {
            const tipo = materialVideoType.value;
            const url = materialVideoUrl.value;

            if (!tipo || !url) {
                showAlertModal('Error', 'Selecciona el tipo de video e ingresa la URL');
                return;
            }

            // Add to array
            window.currentMaterialVideos.push({ tipo, url });

            // Add to preview
            const previewItem = document.createElement('div');
            previewItem.className = 'video-preview-item';
            previewItem.innerHTML = `
                <i class="bi bi-${tipo === 'youtube' ? 'youtube' : 'google'}"></i>
                <span>${tipo === 'youtube' ? 'YouTube' : 'Drive'}: ${url.substring(0, 40)}...</span>
                <button type="button" class="remove-preview-btn" onclick="removeMaterialVideo(${window.currentMaterialVideos.length - 1})">
                    <i class="bi bi-x"></i>
                </button>
            `;
            materialVideosPreview.appendChild(previewItem);

            // Clear inputs
            materialVideoType.value = '';
            materialVideoUrl.value = '';
        });
    }

    // Edit material images upload handler
    const uploadEditMaterialImagesBtn = document.getElementById('uploadEditMaterialImagesBtn');
    const editMaterialNewImages = document.getElementById('editMaterialNewImages');
    const editMaterialNewImagesPreview = document.getElementById('editMaterialNewImagesPreview');

    if (uploadEditMaterialImagesBtn && editMaterialNewImages) {
        uploadEditMaterialImagesBtn.addEventListener('click', () => {
            editMaterialNewImages.click();
        });

        editMaterialNewImages.addEventListener('change', (e) => {
            editMaterialNewImagesPreview.innerHTML = '';
            const files = e.target.files;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const reader = new FileReader();

                reader.onload = (e) => {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'preview-item';
                    previewItem.innerHTML = `
                        <img src="${e.target.result}" alt="Preview">
                        <button type="button" class="remove-preview-btn" onclick="removeEditMaterialNewImage(${i})">
                            <i class="bi bi-x"></i>
                        </button>
                    `;
                    editMaterialNewImagesPreview.appendChild(previewItem);
                };

                reader.readAsDataURL(file);
            }
        });
    }

    // Edit material videos handler
    const addEditMaterialVideoBtn = document.getElementById('addEditMaterialVideoBtn');
    const editMaterialVideoType = document.getElementById('editMaterialVideoType');
    const editMaterialVideoUrl = document.getElementById('editMaterialVideoUrl');
    const editMaterialNewVideosPreview = document.getElementById('editMaterialNewVideosPreview');

    if (addEditMaterialVideoBtn) {
        addEditMaterialVideoBtn.addEventListener('click', () => {
            const tipo = editMaterialVideoType.value;
            const url = editMaterialVideoUrl.value;

            if (!tipo || !url) {
                showAlertModal('Error', 'Selecciona el tipo de video e ingresa la URL');
                return;
            }

            // Initialize array if needed
            if (!window.editMaterialNewVideos) {
                window.editMaterialNewVideos = [];
            }

            // Add to array
            window.editMaterialNewVideos.push({ tipo, url });

            // Add to preview
            const previewItem = document.createElement('div');
            previewItem.className = 'video-preview-item';
            previewItem.innerHTML = `
                <i class="bi bi-${tipo === 'youtube' ? 'youtube' : 'google'}"></i>
                <span>${tipo === 'youtube' ? 'YouTube' : 'Drive'}: ${url.substring(0, 40)}...</span>
                <button type="button" class="remove-preview-btn" onclick="removeEditMaterialNewVideo(${window.editMaterialNewVideos.length - 1})">
                    <i class="bi bi-x"></i>
                </button>
            `;
            editMaterialNewVideosPreview.appendChild(previewItem);

            // Clear inputs
            editMaterialVideoType.value = '';
            editMaterialVideoUrl.value = '';
        });
    }

    // Edit post image upload handler
    const uploadEditPostImageBtn = document.getElementById('uploadEditPostImageBtn');
    const editPostNewImage = document.getElementById('editPostNewImage');
    const editPostNewImagePreview = document.getElementById('editPostNewImagePreview');

    if (uploadEditPostImageBtn && editPostNewImage) {
        uploadEditPostImageBtn.addEventListener('click', () => {
            editPostNewImage.click();
        });

        editPostNewImage.addEventListener('change', (e) => {
            editPostNewImagePreview.innerHTML = '';
            const file = e.target.files[0];

            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'preview-item';
                    previewItem.innerHTML = `
                        <img src="${e.target.result}" alt="Preview">
                        <button type="button" class="remove-preview-btn" onclick="clearEditPostNewImage()">
                            <i class="bi bi-x"></i>
                        </button>
                    `;
                    editPostNewImagePreview.appendChild(previewItem);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Edit task image upload handler
    const uploadEditTaskImageBtn = document.getElementById('uploadEditTaskImageBtn');
    const editTaskNewImage = document.getElementById('editTaskNewImage');
    const editTaskNewImagePreview = document.getElementById('editTaskNewImagePreview');

    if (uploadEditTaskImageBtn && editTaskNewImage) {
        uploadEditTaskImageBtn.addEventListener('click', () => {
            editTaskNewImage.click();
        });

        editTaskNewImage.addEventListener('change', (e) => {
            editTaskNewImagePreview.innerHTML = '';
            const file = e.target.files[0];

            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'preview-item';
                    previewItem.innerHTML = `
                        <img src="${e.target.result}" alt="Preview">
                        <button type="button" class="remove-preview-btn" onclick="clearEditTaskNewImage()">
                            <i class="bi bi-x"></i>
                        </button>
                    `;
                    editTaskNewImagePreview.appendChild(previewItem);
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// Remove new image from edit material preview
function removeEditMaterialNewImage(index) {
    const editMaterialNewImages = document.getElementById('editMaterialNewImages');
    const dt = new DataTransfer();
    const files = editMaterialNewImages.files;

    for (let i = 0; i < files.length; i++) {
        if (i !== index) {
            dt.items.add(files[i]);
        }
    }

    editMaterialNewImages.files = dt.files;

    // Trigger change event to update preview
    const event = new Event('change');
    editMaterialNewImages.dispatchEvent(event);
}

// Upload image to ImgBB
async function uploadImageToImgBB(file) {
    try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch(`${IMGBB_API_URL}?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            return data.data.url;
        } else {
            throw new Error('Error al subir imagen');
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

// Crear anuncio
async function crearAnuncio() {
    const submitBtn = document.querySelector('#createPostForm .submit-btn');
    const originalBtnText = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Publicando...';

        const db = window.firebaseDB;
        const titulo = document.getElementById('postTitle').value;
        const contenido = document.getElementById('postContent').value;
        const imageFile = document.getElementById('postImage').files[0];
        const videoType = document.getElementById('postVideoType').value;
        const videoUrl = document.getElementById('postVideoUrl').value;

        const anuncioData = {
            materia: currentMateria,
            titulo: titulo,
            contenido: contenido,
            autorId: currentUser.id,
            fecha: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Upload image if provided
        if (imageFile) {
            submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Subiendo imagen...';
            const imageUrl = await uploadImageToImgBB(imageFile);
            anuncioData.imagenUrl = imageUrl;
        }

        // Add video if provided
        if (videoType && videoUrl) {
            anuncioData.videoTipo = videoType;
            anuncioData.videoUrl = videoUrl;
        }

        await db.collection('anuncios').add(anuncioData);

        document.getElementById('createPostModal').classList.remove('active');
        document.getElementById('createPostForm').reset();
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('postVideoUrlGroup').style.display = 'none';
        loadAnuncios();

    } catch (error) {
        console.error('Error al crear anuncio:', error);
        alert('Error al crear el anuncio: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// Crear tarea
async function crearTarea() {
    const submitBtn = document.querySelector('#createTaskForm .submit-btn');
    const originalBtnText = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Creando...';

        const db = window.firebaseDB;
        const titulo = document.getElementById('taskTitle').value;
        const descripcion = document.getElementById('taskDescription').value;
        const puntos = document.getElementById('taskPoints').value;
        const fechaEntrega = new Date(document.getElementById('taskDueDate').value);
        const imageFile = document.getElementById('taskImage').files[0];
        const videoType = document.getElementById('taskVideoType').value;
        const videoUrl = document.getElementById('taskVideoUrl').value;
        const driveUrl = document.getElementById('taskDriveUrl').value;

        const tareaData = {
            materia: currentMateria,
            titulo: titulo,
            descripcion: descripcion,
            fechaEntrega: firebase.firestore.Timestamp.fromDate(fechaEntrega),
            fecha: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (puntos) {
            tareaData.puntos = parseInt(puntos);
        }

        // Upload image if provided
        if (imageFile) {
            submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Subiendo imagen...';
            const imageUrl = await uploadImageToImgBB(imageFile);
            tareaData.imagenUrl = imageUrl;
        }

        // Add video if provided
        if (videoType && videoUrl) {
            tareaData.videoTipo = videoType;
            tareaData.videoUrl = videoUrl;
        }

        // Add Drive URL if provided
        if (driveUrl) {
            tareaData.driveUrl = driveUrl;
        }

        await db.collection('tareas').add(tareaData);

        document.getElementById('createTaskModal').classList.remove('active');
        document.getElementById('createTaskForm').reset();
        document.getElementById('taskImagePreview').style.display = 'none';
        document.getElementById('taskVideoUrlGroup').style.display = 'none';
        loadTareas();

    } catch (error) {
        console.error('Error al crear tarea:', error);
        alert('Error al crear la tarea: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// Open submit task modal
function openSubmitTaskModal(taskId, taskTitle) {
    document.getElementById('submitTaskId').value = taskId;
    document.getElementById('submitTaskModal').classList.add('active');
}

// Close submit task modal
function closeSubmitTaskModal() {
    document.getElementById('submitTaskModal').classList.remove('active');
    document.getElementById('submitTaskForm').reset();
}

// Submit task (student)
async function submitTask() {
    const submitBtn = document.querySelector('#submitTaskForm .submit-btn');
    const originalBtnText = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Enviando...';

        const db = window.firebaseDB;
        const taskId = document.getElementById('submitTaskId').value;
        const comment = document.getElementById('submissionComment').value;
        const driveUrl = document.getElementById('submissionDriveUrl').value;

        await db.collection('entregas').add({
            tareaId: taskId,
            estudianteId: currentUser.id,
            estudianteNombre: currentUser.nombre,
            comentario: comment,
            driveUrl: driveUrl,
            fecha: firebase.firestore.FieldValue.serverTimestamp()
        });

        closeSubmitTaskModal();
        loadTareas();
        showAlertModal('Éxito', '¡Tarea entregada exitosamente!');

    } catch (error) {
        console.error('Error al entregar tarea:', error);
        showAlertModal('Error', 'Error al entregar la tarea: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// View submissions (teacher)
async function viewSubmissions(taskId, taskTitle) {
    try {
        const db = window.firebaseDB;

        // Get task details to get max points
        const taskDoc = await db.collection('tareas').doc(taskId).get();
        const taskData = taskDoc.data();
        const maxPoints = taskData.puntos || 100;

        const submissionsSnapshot = await db.collection('entregas')
            .where('tareaId', '==', taskId)
            .get();

        const submissionsContainer = document.getElementById('submissionsContainer');

        if (submissionsSnapshot.empty) {
            submissionsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-inbox"></i>
                    <p>No hay entregas aún</p>
                </div>
            `;
        } else {
            submissionsContainer.innerHTML = '<h4 style="margin-bottom: 1rem;">Entregas para: ' + taskTitle + '</h4>';

            submissionsSnapshot.forEach(doc => {
                const submission = doc.data();
                const submissionId = doc.id;
                const fecha = submission.fecha ? new Date(submission.fecha.seconds * 1000) : new Date();

                const submissionCard = document.createElement('div');
                submissionCard.className = 'submission-card';

                // Build grade section
                let gradeSection = '';
                if (submission.calificacion !== undefined) {
                    const percentage = (submission.calificacion / maxPoints) * 100;

                    // Determine grade class based on percentage
                    let gradeClass;
                    if (percentage >= 90) {
                        gradeClass = 'grade-excellent';
                    } else if (percentage >= 70) {
                        gradeClass = 'grade-good';
                    } else if (percentage >= 50) {
                        gradeClass = 'grade-regular';
                    } else {
                        gradeClass = 'grade-poor';
                    }

                    gradeSection = `
                        <div class="submission-grade">
                            <div class="current-grade ${gradeClass}">
                                <i class="bi bi-check-circle-fill"></i>
                                <span>Calificación: ${submission.calificacion} / ${maxPoints}</span>
                            </div>
                            <button class="grade-btn" onclick="editGrade('${submissionId}', ${submission.calificacion}, ${maxPoints})">
                                <i class="bi bi-pencil"></i>
                                Editar
                            </button>
                        </div>
                    `;
                } else {
                    gradeSection = `
                        <div class="submission-grade">
                            <label>Calificar:</label>
                            <div class="grade-input-group">
                                <input type="number" 
                                       class="grade-input" 
                                       id="grade-${submissionId}" 
                                       min="0" 
                                       max="${maxPoints}" 
                                       placeholder="0">
                                <span class="grade-max">/ ${maxPoints}</span>
                                <button class="grade-btn" onclick="saveGrade('${submissionId}', ${maxPoints})">
                                    Guardar
                                </button>
                            </div>
                        </div>
                    `;
                }

                submissionCard.innerHTML = `
                    <div class="submission-header">
                        <div class="submission-student">
                            <i class="bi bi-person-circle"></i>
                            <span>${submission.estudianteNombre}</span>
                        </div>
                        <div class="submission-date">
                            <i class="bi bi-clock"></i>
                            <span>${formatearFecha(fecha)}</span>
                        </div>
                    </div>
                    ${submission.comentario ? `<div class="submission-comment">${submission.comentario}</div>` : ''}
                    <div class="submission-link">
                        <a href="${submission.driveUrl}" target="_blank" class="drive-file-link">
                            <i class="bi bi-google"></i>
                            <span>Ver entrega en Drive</span>
                            <i class="bi bi-box-arrow-up-right"></i>
                        </a>
                    </div>
                    ${gradeSection}
                `;
                submissionsContainer.appendChild(submissionCard);
            });
        }

        document.getElementById('viewSubmissionsModal').classList.add('active');

    } catch (error) {
        console.error('Error al cargar entregas:', error);
        showAlertModal('Error', 'Error al cargar las entregas');
    }
}

// Save grade
async function saveGrade(submissionId, maxPoints) {
    try {
        const gradeInput = document.getElementById(`grade-${submissionId}`);
        const grade = parseFloat(gradeInput.value);

        if (isNaN(grade)) {
            showAlertModal('Error', 'Por favor ingresa una calificación válida');
            return;
        }

        if (grade < 0 || grade > maxPoints) {
            showAlertModal('Error', `La calificación debe estar entre 0 y ${maxPoints}`);
            return;
        }

        const db = window.firebaseDB;
        await db.collection('entregas').doc(submissionId).update({
            calificacion: grade,
            fechaCalificacion: firebase.firestore.FieldValue.serverTimestamp()
        });

        showAlertModal('Éxito', 'Calificación guardada exitosamente');

        // Reload submissions to show updated grade
        const modal = document.getElementById('viewSubmissionsModal');
        const taskId = gradeInput.closest('.submission-card').dataset.taskId;
        closeSubmissionsModal();

        // Reload the current task's submissions
        loadTareas();

    } catch (error) {
        console.error('Error al guardar calificación:', error);
        showAlertModal('Error', 'Error al guardar la calificación');
    }
}

// Edit grade
async function editGrade(submissionId, currentGrade, maxPoints) {
    const newGrade = prompt(`Ingresa la nueva calificación (0-${maxPoints}):`, currentGrade);

    if (newGrade === null) return; // User cancelled

    const grade = parseFloat(newGrade);

    if (isNaN(grade)) {
        showAlertModal('Error', 'Por favor ingresa una calificación válida');
        return;
    }

    if (grade < 0 || grade > maxPoints) {
        showAlertModal('Error', `La calificación debe estar entre 0 y ${maxPoints}`);
        return;
    }

    try {
        const db = window.firebaseDB;
        await db.collection('entregas').doc(submissionId).update({
            calificacion: grade,
            fechaCalificacion: firebase.firestore.FieldValue.serverTimestamp()
        });

        showAlertModal('Éxito', 'Calificación actualizada exitosamente');
        closeSubmissionsModal();
        loadTareas();

    } catch (error) {
        console.error('Error al actualizar calificación:', error);
        showAlertModal('Error', 'Error al actualizar la calificación');
    }
}

// Close submissions modal
function closeSubmissionsModal() {
    document.getElementById('viewSubmissionsModal').classList.remove('active');
}

// ========== MODAL UTILITIES ==========

// Show confirmation modal
function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').classList.add('active');

    const confirmBtn = document.getElementById('confirmBtn');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', () => {
        closeConfirmModal();
        onConfirm();
    });
}

// Close confirmation modal
function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
}

// Show alert modal
function showAlertModal(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertModal').classList.add('active');
}

// Close alert modal
function closeAlertModal() {
    document.getElementById('alertModal').classList.remove('active');
}

// ========== EDIT ANUNCIO ==========

// Global variable to track if media should be removed
let removePostImage = false;
let removePostVideo = false;

// Open edit post modal
async function editarAnuncio(id) {
    try {
        const db = window.firebaseDB;
        const doc = await db.collection('anuncios').doc(id).get();

        if (!doc.exists) {
            showAlertModal('Error', 'No se encontró el anuncio');
            return;
        }

        const data = doc.data();
        document.getElementById('editPostId').value = id;
        document.getElementById('editPostTitle').value = data.titulo || '';
        document.getElementById('editPostContent').value = data.contenido || '';

        // Store current data
        window.editPostCurrentImage = data.imagenUrl || null;
        window.editPostCurrentVideoType = data.videoTipo || null;
        window.editPostCurrentVideoUrl = data.videoUrl || null;

        // Display current image
        const currentImageContainer = document.getElementById('editPostCurrentImageContainer');
        currentImageContainer.innerHTML = '';

        if (window.editPostCurrentImage) {
            const imageItem = document.createElement('div');
            imageItem.className = 'current-media-item';
            imageItem.innerHTML = `
                <img src="${window.editPostCurrentImage}" alt="Imagen actual">
                <button type="button" class="remove-current-btn" onclick="removeEditPostCurrentImage()">
                    <i class="bi bi-trash"></i>
                    Eliminar
                </button>
            `;
            currentImageContainer.appendChild(imageItem);
        } else {
            currentImageContainer.innerHTML = '<p class="no-media-text">No hay imagen</p>';
        }

        // Display current video
        const currentVideoContainer = document.getElementById('editPostCurrentVideoContainer');
        currentVideoContainer.innerHTML = '';

        if (window.editPostCurrentVideoType && window.editPostCurrentVideoUrl) {
            const videoItem = document.createElement('div');
            videoItem.className = 'current-media-item';
            videoItem.innerHTML = `
                <div class="video-info">
                    <i class="bi bi-${window.editPostCurrentVideoType === 'youtube' ? 'youtube' : 'google'}"></i>
                    <span>${window.editPostCurrentVideoType === 'youtube' ? 'YouTube' : 'Drive'}: ${window.editPostCurrentVideoUrl.substring(0, 50)}...</span>
                </div>
                <button type="button" class="remove-current-btn" onclick="removeEditPostCurrentVideo()">
                    <i class="bi bi-trash"></i>
                    Eliminar
                </button>
            `;
            currentVideoContainer.appendChild(videoItem);
        } else {
            currentVideoContainer.innerHTML = '<p class="no-media-text">No hay video</p>';
        }

        // Clear new media previews
        document.getElementById('editPostNewImagePreview').innerHTML = '';
        document.getElementById('editPostVideoType').value = '';
        document.getElementById('editPostVideoUrl').value = '';

        document.getElementById('editPostModal').classList.add('active');
    } catch (error) {
        console.error('Error al cargar anuncio:', error);
        showAlertModal('Error', 'Error al cargar el anuncio');
    }
}

// Remove current post image
function removeEditPostCurrentImage() {
    window.editPostCurrentImage = null;
    const currentImageContainer = document.getElementById('editPostCurrentImageContainer');
    currentImageContainer.innerHTML = '<p class="no-media-text">No hay imagen</p>';
}

// Remove current post video
function removeEditPostCurrentVideo() {
    window.editPostCurrentVideoType = null;
    window.editPostCurrentVideoUrl = null;
    const currentVideoContainer = document.getElementById('editPostCurrentVideoContainer');
    currentVideoContainer.innerHTML = '<p class="no-media-text">No hay video</p>';
}

// Close edit post modal
function closeEditPostModal() {
    document.getElementById('editPostModal').classList.remove('active');
    document.getElementById('editPostForm').reset();
    window.editPostCurrentImage = null;
    window.editPostCurrentVideoType = null;
    window.editPostCurrentVideoUrl = null;
}

// Update post
async function actualizarAnuncio(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('.submit-btn');
    const originalBtnText = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Guardando...';

        const db = window.firebaseDB;
        const id = document.getElementById('editPostId').value;
        const titulo = document.getElementById('editPostTitle').value;
        const contenido = document.getElementById('editPostContent').value;
        const newImageFile = document.getElementById('editPostNewImage').files[0];
        const newVideoType = document.getElementById('editPostVideoType').value;
        const newVideoUrl = document.getElementById('editPostVideoUrl').value;

        const updateData = {
            titulo: titulo,
            contenido: contenido
        };

        // Handle image
        let finalImageUrl = window.editPostCurrentImage;

        if (newImageFile) {
            // Upload new image
            submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Subiendo imagen...';
            const formData = new FormData();
            formData.append('image', newImageFile);
            const response = await fetch(`${IMGBB_API_URL}?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                finalImageUrl = data.data.url;
            }
        }

        if (finalImageUrl) {
            updateData.imagenUrl = finalImageUrl;
        } else {
            updateData.imagenUrl = firebase.firestore.FieldValue.delete();
        }

        // Handle video
        let finalVideoType = window.editPostCurrentVideoType;
        let finalVideoUrl = window.editPostCurrentVideoUrl;

        if (newVideoType && newVideoUrl) {
            finalVideoType = newVideoType;
            finalVideoUrl = newVideoUrl;
        }

        if (finalVideoType && finalVideoUrl) {
            updateData.videoTipo = finalVideoType;
            updateData.videoUrl = finalVideoUrl;
        } else {
            updateData.videoTipo = firebase.firestore.FieldValue.delete();
            updateData.videoUrl = firebase.firestore.FieldValue.delete();
        }

        await db.collection('anuncios').doc(id).update(updateData);

        closeEditPostModal();
        showAlertModal('Éxito', 'Anuncio actualizado correctamente');
        loadAnuncios();

    } catch (error) {
        console.error('Error al actualizar anuncio:', error);
        showAlertModal('Error', 'Error al actualizar el anuncio');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// ========== EDIT TAREA ==========

// Open edit task modal
async function editarTarea(id) {
    try {
        const db = window.firebaseDB;
        const doc = await db.collection('tareas').doc(id).get();

        if (!doc.exists) {
            showAlertModal('Error', 'No se encontró la tarea');
            return;
        }

        const data = doc.data();
        document.getElementById('editTaskId').value = id;
        document.getElementById('editTaskTitle').value = data.titulo || '';
        document.getElementById('editTaskDescription').value = data.descripcion || '';
        document.getElementById('editTaskPoints').value = data.puntos || '';
        document.getElementById('editTaskDriveUrl').value = data.driveUrl || '';

        if (data.fechaEntrega) {
            const fecha = new Date(data.fechaEntrega.seconds * 1000);
            const fechaLocal = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
            document.getElementById('editTaskDueDate').value = fechaLocal.toISOString().slice(0, 16);
        }

        // Store current data
        window.editTaskCurrentImage = data.imagenUrl || null;
        window.editTaskCurrentVideoType = data.videoTipo || null;
        window.editTaskCurrentVideoUrl = data.videoUrl || null;

        // Display current image
        const currentImageContainer = document.getElementById('editTaskCurrentImageContainer');
        currentImageContainer.innerHTML = '';

        if (window.editTaskCurrentImage) {
            const imageItem = document.createElement('div');
            imageItem.className = 'current-media-item';
            imageItem.innerHTML = `
                <img src="${window.editTaskCurrentImage}" alt="Imagen actual">
                <button type="button" class="remove-current-btn" onclick="removeEditTaskCurrentImage()">
                    <i class="bi bi-trash"></i>
                    Eliminar
                </button>
            `;
            currentImageContainer.appendChild(imageItem);
        } else {
            currentImageContainer.innerHTML = '<p class="no-media-text">No hay imagen</p>';
        }

        // Display current video
        const currentVideoContainer = document.getElementById('editTaskCurrentVideoContainer');
        currentVideoContainer.innerHTML = '';

        if (window.editTaskCurrentVideoType && window.editTaskCurrentVideoUrl) {
            const videoItem = document.createElement('div');
            videoItem.className = 'current-media-item';
            videoItem.innerHTML = `
                <div class="video-info">
                    <i class="bi bi-${window.editTaskCurrentVideoType === 'youtube' ? 'youtube' : 'google'}"></i>
                    <span>${window.editTaskCurrentVideoType === 'youtube' ? 'YouTube' : 'Drive'}: ${window.editTaskCurrentVideoUrl.substring(0, 50)}...</span>
                </div>
                <button type="button" class="remove-current-btn" onclick="removeEditTaskCurrentVideo()">
                    <i class="bi bi-trash"></i>
                    Eliminar
                </button>
            `;
            currentVideoContainer.appendChild(videoItem);
        } else {
            currentVideoContainer.innerHTML = '<p class="no-media-text">No hay video</p>';
        }

        // Clear new media previews
        document.getElementById('editTaskNewImagePreview').innerHTML = '';
        document.getElementById('editTaskVideoType').value = '';
        document.getElementById('editTaskVideoUrl').value = '';

        document.getElementById('editTaskModal').classList.add('active');
    } catch (error) {
        console.error('Error al cargar tarea:', error);
        showAlertModal('Error', 'Error al cargar la tarea');
    }
}

// Remove current task image
function removeEditTaskCurrentImage() {
    window.editTaskCurrentImage = null;
    const currentImageContainer = document.getElementById('editTaskCurrentImageContainer');
    currentImageContainer.innerHTML = '<p class="no-media-text">No hay imagen</p>';
}

// Remove current task video
function removeEditTaskCurrentVideo() {
    window.editTaskCurrentVideoType = null;
    window.editTaskCurrentVideoUrl = null;
    const currentVideoContainer = document.getElementById('editTaskCurrentVideoContainer');
    currentVideoContainer.innerHTML = '<p class="no-media-text">No hay video</p>';
}

// Close edit task modal
function closeEditTaskModal() {
    document.getElementById('editTaskModal').classList.remove('active');
    document.getElementById('editTaskForm').reset();
    window.editTaskCurrentImage = null;
    window.editTaskCurrentVideoType = null;
    window.editTaskCurrentVideoUrl = null;
}

// Update task
async function actualizarTarea(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('.submit-btn');
    const originalBtnText = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Guardando...';

        const db = window.firebaseDB;
        const id = document.getElementById('editTaskId').value;
        const titulo = document.getElementById('editTaskTitle').value;
        const descripcion = document.getElementById('editTaskDescription').value;
        const puntos = document.getElementById('editTaskPoints').value;
        const fechaEntrega = new Date(document.getElementById('editTaskDueDate').value);
        const driveUrl = document.getElementById('editTaskDriveUrl').value;
        const newImageFile = document.getElementById('editTaskNewImage').files[0];
        const newVideoType = document.getElementById('editTaskVideoType').value;
        const newVideoUrl = document.getElementById('editTaskVideoUrl').value;

        const updateData = {
            titulo: titulo,
            descripcion: descripcion,
            fechaEntrega: firebase.firestore.Timestamp.fromDate(fechaEntrega)
        };

        if (puntos) {
            updateData.puntos = parseInt(puntos);
        }

        // Handle image
        let finalImageUrl = window.editTaskCurrentImage;

        if (newImageFile) {
            // Upload new image
            submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Subiendo imagen...';
            const formData = new FormData();
            formData.append('image', newImageFile);
            const response = await fetch(`${IMGBB_API_URL}?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                finalImageUrl = data.data.url;
            }
        }

        if (finalImageUrl) {
            updateData.imagenUrl = finalImageUrl;
        } else {
            updateData.imagenUrl = firebase.firestore.FieldValue.delete();
        }

        // Handle video
        let finalVideoType = window.editTaskCurrentVideoType;
        let finalVideoUrl = window.editTaskCurrentVideoUrl;

        if (newVideoType && newVideoUrl) {
            finalVideoType = newVideoType;
            finalVideoUrl = newVideoUrl;
        }

        if (finalVideoType && finalVideoUrl) {
            updateData.videoTipo = finalVideoType;
            updateData.videoUrl = finalVideoUrl;
        } else {
            updateData.videoTipo = firebase.firestore.FieldValue.delete();
            updateData.videoUrl = firebase.firestore.FieldValue.delete();
        }

        // Handle Drive URL
        if (driveUrl) {
            updateData.driveUrl = driveUrl;
        } else {
            updateData.driveUrl = firebase.firestore.FieldValue.delete();
        }

        await db.collection('tareas').doc(id).update(updateData);

        closeEditTaskModal();
        showAlertModal('Éxito', 'Tarea actualizada correctamente');
        loadTareas();

    } catch (error) {
        console.error('Error al actualizar tarea:', error);
        showAlertModal('Error', 'Error al actualizar la tarea');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// ========== EDIT MATERIAL ==========

// Open edit material modal
async function editarMaterial(id) {
    try {
        const db = window.firebaseDB;
        const doc = await db.collection('materiales').doc(id).get();

        if (!doc.exists) {
            showAlertModal('Error', 'No se encontró el material');
            return;
        }

        const data = doc.data();
        document.getElementById('editMaterialId').value = id;
        document.getElementById('editMaterialTitle').value = data.titulo || '';
        document.getElementById('editMaterialDescription').value = data.descripcion || '';
        document.getElementById('editMaterialDriveUrl').value = data.driveUrl || '';

        // Store current data
        window.editMaterialCurrentImages = data.imageUrls || [];
        window.editMaterialCurrentVideos = data.videos || [];
        window.editMaterialNewVideos = [];

        // Display current images
        const currentImagesContainer = document.getElementById('editMaterialCurrentImages');
        currentImagesContainer.innerHTML = '';

        if (window.editMaterialCurrentImages.length > 0) {
            window.editMaterialCurrentImages.forEach((imageUrl, index) => {
                const imageItem = document.createElement('div');
                imageItem.className = 'current-media-item';
                imageItem.innerHTML = `
                    <img src="${imageUrl}" alt="Imagen ${index + 1}">
                    <button type="button" class="remove-current-btn" onclick="removeEditMaterialCurrentImage(${index})">
                        <i class="bi bi-trash"></i>
                        Eliminar
                    </button>
                `;
                currentImagesContainer.appendChild(imageItem);
            });
        } else {
            currentImagesContainer.innerHTML = '<p class="no-media-text">No hay imágenes</p>';
        }

        // Display current videos
        const currentVideosContainer = document.getElementById('editMaterialCurrentVideos');
        currentVideosContainer.innerHTML = '';

        if (window.editMaterialCurrentVideos.length > 0) {
            window.editMaterialCurrentVideos.forEach((video, index) => {
                const videoItem = document.createElement('div');
                videoItem.className = 'current-media-item';
                videoItem.innerHTML = `
                    <div class="video-info">
                        <i class="bi bi-${video.tipo === 'youtube' ? 'youtube' : 'google'}"></i>
                        <span>${video.tipo === 'youtube' ? 'YouTube' : 'Drive'}: ${video.url.substring(0, 50)}...</span>
                    </div>
                    <button type="button" class="remove-current-btn" onclick="removeEditMaterialCurrentVideo(${index})">
                        <i class="bi bi-trash"></i>
                        Eliminar
                    </button>
                `;
                currentVideosContainer.appendChild(videoItem);
            });
        } else {
            currentVideosContainer.innerHTML = '<p class="no-media-text">No hay videos</p>';
        }

        // Clear new media previews
        document.getElementById('editMaterialNewImagesPreview').innerHTML = '';
        document.getElementById('editMaterialNewVideosPreview').innerHTML = '';

        document.getElementById('editMaterialModal').classList.add('active');
    } catch (error) {
        console.error('Error al cargar material:', error);
        showAlertModal('Error', 'Error al cargar el material');
    }
}

// Close edit material modal
function closeEditMaterialModal() {
    document.getElementById('editMaterialModal').classList.remove('active');
    document.getElementById('editMaterialForm').reset();
    window.editMaterialCurrentImages = [];
    window.editMaterialCurrentVideos = [];
    window.editMaterialNewVideos = [];
}

// Update material
async function actualizarMaterial(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('.submit-btn');
    const originalBtnText = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Guardando...';

        const db = window.firebaseDB;
        const id = document.getElementById('editMaterialId').value;
        const titulo = document.getElementById('editMaterialTitle').value;
        const descripcion = document.getElementById('editMaterialDescription').value;
        const driveUrl = document.getElementById('editMaterialDriveUrl').value;

        // Upload new images
        const newImageUrls = [];
        const newImageFiles = document.getElementById('editMaterialNewImages').files;

        if (newImageFiles.length > 0) {
            for (let i = 0; i < newImageFiles.length; i++) {
                const file = newImageFiles[i];
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch(`${IMGBB_API_URL}?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                if (data.success) {
                    newImageUrls.push(data.data.url);
                }
            }
        }

        // Combine current and new images
        const allImageUrls = [...window.editMaterialCurrentImages, ...newImageUrls];

        // Combine current and new videos
        const allVideos = [...window.editMaterialCurrentVideos, ...window.editMaterialNewVideos];

        await db.collection('materiales').doc(id).update({
            titulo: titulo,
            descripcion: descripcion,
            imageUrls: allImageUrls,
            videos: allVideos,
            driveUrl: driveUrl || null
        });

        closeEditMaterialModal();
        showAlertModal('Éxito', 'Material actualizado correctamente');
        loadMateriales();

    } catch (error) {
        console.error('Error al actualizar material:', error);
        showAlertModal('Error', 'Error al actualizar el material');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// Crear material
async function crearMaterial() {
    try {
        const submitBtn = document.querySelector('#createMaterialForm .submit-btn');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Creando...';

        const db = window.firebaseDB;
        const titulo = document.getElementById('materialTitle').value;
        const descripcion = document.getElementById('materialDescription').value;
        const driveUrl = document.getElementById('materialDriveUrl').value;

        // Upload images
        const imageUrls = [];
        const imageFiles = document.getElementById('materialImages').files;

        if (imageFiles.length > 0) {
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch(`${IMGBB_API_URL}?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                if (data.success) {
                    imageUrls.push(data.data.url);
                }
            }
        }

        // Get videos
        const videos = window.currentMaterialVideos || [];

        await db.collection('materiales').add({
            materia: currentMateria,
            titulo: titulo,
            descripcion: descripcion,
            imageUrls: imageUrls,
            videos: videos,
            driveUrl: driveUrl || null,
            fecha: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('createMaterialModal').classList.remove('active');
        document.getElementById('createMaterialForm').reset();
        document.getElementById('materialImagesPreview').innerHTML = '';
        document.getElementById('materialVideosPreview').innerHTML = '';
        window.currentMaterialVideos = [];

        showAlertModal('Éxito', 'Material creado correctamente');
        loadMateriales();

    } catch (error) {
        console.error('Error al crear material:', error);
        showAlertModal('Error', 'Error al crear el material');
    } finally {
        const submitBtn = document.querySelector('#createMaterialForm .submit-btn');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Agregar Material';
    }
}

// Eliminar anuncio
function eliminarAnuncio(id) {
    showConfirmModal(
        'Eliminar Anuncio',
        '¿Estás seguro de que deseas eliminar este anuncio? Esta acción no se puede deshacer.',
        async () => {
            try {
                const db = window.firebaseDB;
                await db.collection('anuncios').doc(id).delete();
                showAlertModal('Éxito', 'Anuncio eliminado correctamente');
                loadAnuncios();
            } catch (error) {
                console.error('Error al eliminar anuncio:', error);
                showAlertModal('Error', 'Error al eliminar el anuncio');
            }
        }
    );
}

// Eliminar tarea
function eliminarTarea(id) {
    showConfirmModal(
        'Eliminar Tarea',
        '¿Estás seguro de que deseas eliminar esta tarea? Se eliminarán también todas las entregas asociadas.',
        async () => {
            try {
                const db = window.firebaseDB;
                await db.collection('tareas').doc(id).delete();

                // Delete associated submissions
                const submissions = await db.collection('entregas').where('tareaId', '==', id).get();
                const batch = db.batch();
                submissions.forEach(doc => batch.delete(doc.ref));
                await batch.commit();

                showAlertModal('Éxito', 'Tarea eliminada correctamente');
                loadTareas();
            } catch (error) {
                console.error('Error al eliminar tarea:', error);
                showAlertModal('Error', 'Error al eliminar la tarea');
            }
        }
    );
}

// Eliminar material
function eliminarMaterial(id) {
    showConfirmModal(
        'Eliminar Material',
        '¿Estás seguro de que deseas eliminar este material? Esta acción no se puede deshacer.',
        async () => {
            try {
                const db = window.firebaseDB;
                await db.collection('materiales').doc(id).delete();
                showAlertModal('Éxito', 'Material eliminado correctamente');
                loadMateriales();
            } catch (error) {
                console.error('Error al eliminar material:', error);
                showAlertModal('Error', 'Error al eliminar el material');
            }
        }
    );
}

// Remove material image from preview
function removeMaterialImage(index) {
    const materialImages = document.getElementById('materialImages');
    const dt = new DataTransfer();
    const files = materialImages.files;

    for (let i = 0; i < files.length; i++) {
        if (i !== index) {
            dt.items.add(files[i]);
        }
    }

    materialImages.files = dt.files;

    // Trigger change event to update preview
    const event = new Event('change');
    materialImages.dispatchEvent(event);
}

// Remove material video from preview
function removeMaterialVideo(index) {
    window.currentMaterialVideos.splice(index, 1);

    // Rebuild preview
    const materialVideosPreview = document.getElementById('materialVideosPreview');
    materialVideosPreview.innerHTML = '';

    window.currentMaterialVideos.forEach((video, i) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'video-preview-item';
        previewItem.innerHTML = `
            <i class="bi bi-${video.tipo === 'youtube' ? 'youtube' : 'google'}"></i>
            <span>${video.tipo === 'youtube' ? 'YouTube' : 'Drive'}: ${video.url.substring(0, 40)}...</span>
            <button type="button" class="remove-preview-btn" onclick="removeMaterialVideo(${i})">
                <i class="bi bi-x"></i>
            </button>
        `;
        materialVideosPreview.appendChild(previewItem);
    });
}

// Remove current image from edit material
function removeEditMaterialCurrentImage(index) {
    window.editMaterialCurrentImages.splice(index, 1);

    // Rebuild display
    const currentImagesContainer = document.getElementById('editMaterialCurrentImages');
    currentImagesContainer.innerHTML = '';

    if (window.editMaterialCurrentImages.length > 0) {
        window.editMaterialCurrentImages.forEach((imageUrl, i) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'current-media-item';
            imageItem.innerHTML = `
                <img src="${imageUrl}" alt="Imagen ${i + 1}">
                <button type="button" class="remove-current-btn" onclick="removeEditMaterialCurrentImage(${i})">
                    <i class="bi bi-trash"></i>
                    Eliminar
                </button>
            `;
            currentImagesContainer.appendChild(imageItem);
        });
    } else {
        currentImagesContainer.innerHTML = '<p class="no-media-text">No hay imágenes</p>';
    }
}

// Remove current video from edit material
function removeEditMaterialCurrentVideo(index) {
    window.editMaterialCurrentVideos.splice(index, 1);

    // Rebuild display
    const currentVideosContainer = document.getElementById('editMaterialCurrentVideos');
    currentVideosContainer.innerHTML = '';

    if (window.editMaterialCurrentVideos.length > 0) {
        window.editMaterialCurrentVideos.forEach((video, i) => {
            const videoItem = document.createElement('div');
            videoItem.className = 'current-media-item';
            videoItem.innerHTML = `
                <div class="video-info">
                    <i class="bi bi-${video.tipo === 'youtube' ? 'youtube' : 'google'}"></i>
                    <span>${video.tipo === 'youtube' ? 'YouTube' : 'Drive'}: ${video.url.substring(0, 50)}...</span>
                </div>
                <button type="button" class="remove-current-btn" onclick="removeEditMaterialCurrentVideo(${i})">
                    <i class="bi bi-trash"></i>
                    Eliminar
                </button>
            `;
            currentVideosContainer.appendChild(videoItem);
        });
    } else {
        currentVideosContainer.innerHTML = '<p class="no-media-text">No hay videos</p>';
    }
}

// Remove new video from edit material
function removeEditMaterialNewVideo(index) {
    window.editMaterialNewVideos.splice(index, 1);

    // Rebuild preview
    const newVideosPreview = document.getElementById('editMaterialNewVideosPreview');
    newVideosPreview.innerHTML = '';

    window.editMaterialNewVideos.forEach((video, i) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'video-preview-item';
        previewItem.innerHTML = `
            <i class="bi bi-${video.tipo === 'youtube' ? 'youtube' : 'google'}"></i>
            <span>${video.tipo === 'youtube' ? 'YouTube' : 'Drive'}: ${video.url.substring(0, 40)}...</span>
            <button type="button" class="remove-preview-btn" onclick="removeEditMaterialNewVideo(${i})">
                <i class="bi bi-x"></i>
            </button>
        `;
        newVideosPreview.appendChild(previewItem);
    });
}

// Clear edit post new image
function clearEditPostNewImage() {
    document.getElementById('editPostNewImage').value = '';
    document.getElementById('editPostNewImagePreview').innerHTML = '';
}

// Clear edit task new image
function clearEditTaskNewImage() {
    document.getElementById('editTaskNewImage').value = '';
    document.getElementById('editTaskNewImagePreview').innerHTML = '';
}

// Formatear fecha
function formatearFecha(fecha) {
    const opciones = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return fecha.toLocaleDateString('es-ES', opciones);
}

// Open media modal
function openMediaModal(src, type) {
    const modal = document.getElementById('mediaModal');
    const modalContent = document.getElementById('mediaModalContent');

    if (type === 'image') {
        modalContent.innerHTML = `
            <img src="${src}" alt="Imagen" style="max-width: 100%; max-height: 90vh; border-radius: 8px;">
        `;
    } else if (type === 'youtube') {
        modalContent.innerHTML = `
            <div class="video-container-fullscreen">
                <iframe 
                    src="https://www.youtube.com/embed/${src}?autoplay=1" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            </div>
        `;
    } else if (type === 'drive') {
        modalContent.innerHTML = `
            <div class="drive-container-fullscreen">
                <iframe 
                    src="https://drive.google.com/file/d/${src}/preview" 
                    frameborder="0" 
                    allow="autoplay">
                </iframe>
            </div>
        `;
    }

    modal.classList.add('active');
}

// Close media modal
function closeMediaModal() {
    const modal = document.getElementById('mediaModal');
    const modalContent = document.getElementById('mediaModalContent');
    modal.classList.remove('active');
    modalContent.innerHTML = '';
}


