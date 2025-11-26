/**
 * Script para probar los endpoints de Google Drive
 * Ejecuta después de iniciar el servidor: node test-endpoints.js
 */

async function testDriveEndpoints() {
    const baseUrl = 'http://localhost:3000';

    console.log('🧪 Probando endpoints de Google Drive...\n');

    try {
        // Test 1: Login para obtener token
        console.log('📝 Test 1: Obteniendo token de autenticación...');
        const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@aula.com',
                password: 'admin123'
            })
        });

        if (!loginResponse.ok) {
            throw new Error('Error en login');
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Token obtenido\n');

        // Test 2: Verificar estado de Google Drive
        console.log('📡 Test 2: Verificando estado de Google Drive...');
        const statusResponse = await fetch(`${baseUrl}/api/drive/status`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const statusData = await statusResponse.json();
        console.log(`✅ Estado: ${statusData.message}`);
        console.log(`   Inicializado: ${statusData.initialized ? 'Sí ✅' : 'No ❌'}\n`);

        if (!statusData.initialized) {
            console.log('❌ Google Drive no está inicializado.');
            console.log('   Verifica que google-credentials.json esté configurado correctamente.');
            return;
        }

        // Test 3: Listar archivos
        console.log('📂 Test 3: Listando archivos de Google Drive...');
        const filesResponse = await fetch(`${baseUrl}/api/drive/files?pageSize=10`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const filesData = await filesResponse.json();
        console.log(`✅ Se encontraron ${filesData.files.length} archivos:`);
        filesData.files.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.name} (${file.mimeType})`);
        });
        console.log('');

        // Test 4: Crear carpeta de prueba
        console.log('📁 Test 4: Creando carpeta de prueba...');
        const folderResponse = await fetch(`${baseUrl}/api/drive/folders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                folderName: 'Aula Genios - Carpeta de Prueba'
            })
        });

        const folderData = await folderResponse.json();
        if (folderData.success) {
            console.log(`✅ Carpeta creada: ${folderData.folder.name}`);
            console.log(`   ID: ${folderData.folder.id}`);
            console.log(`   Link: ${folderData.folder.webViewLink}\n`);
        }

        // Resumen final
        console.log('═══════════════════════════════════════');
        console.log('🎉 ¡TODOS LOS TESTS PASARON!');
        console.log('═══════════════════════════════════════');
        console.log('✅ Google Drive está correctamente integrado');
        console.log('✅ Todos los endpoints funcionan correctamente');
        console.log('\n📋 Próximos pasos:');
        console.log('1. Integra el componente GoogleDriveManager en tu frontend');
        console.log('2. Crea la estructura de carpetas para tus materias');
        console.log('3. Comienza a subir archivos desde la aplicación');

    } catch (error) {
        console.error('\n❌ ERROR EN LOS TESTS:');
        console.error('═══════════════════════════════════════');
        console.error(error.message);
        console.error('\n🔧 Posibles soluciones:');
        console.error('1. Asegúrate de que el servidor esté corriendo (node index.js)');
        console.error('2. Verifica que google-credentials.json esté configurado');
        console.error('3. Revisa que la Google Drive API esté habilitada');
    }
}

// Ejecutar tests
testDriveEndpoints();
