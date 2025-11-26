/**
 * Script de prueba rápida para Google Drive API
 * Ejecuta: node test-drive.js
 */

import driveService from './googleDriveService.js';

async function testDriveConnection() {
    console.log('🧪 Iniciando pruebas de Google Drive API...\n');

    try {
        // Test 1: Inicializar conexión
        console.log('📡 Test 1: Inicializando conexión...');
        await driveService.initialize();
        console.log('✅ Conexión exitosa\n');

        // Test 2: Listar archivos
        console.log('📂 Test 2: Listando archivos...');
        const files = await driveService.listFiles(10);
        console.log(`✅ Se encontraron ${files.length} archivos:`);
        files.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.name} (${file.mimeType})`);
        });
        console.log('');

        // Test 3: Crear carpeta de prueba
        console.log('📁 Test 3: Creando carpeta de prueba...');
        const folder = await driveService.createFolder('Aula Genios - Test');
        console.log(`✅ Carpeta creada: ${folder.name}`);
        console.log(`   ID: ${folder.id}`);
        console.log(`   Link: ${folder.webViewLink}\n`);

        // Test 4: Buscar la carpeta que acabamos de crear
        console.log('🔍 Test 4: Buscando carpeta...');
        const searchResults = await driveService.searchFiles('Aula Genios - Test');
        console.log(`✅ Se encontraron ${searchResults.length} resultados\n`);

        // Test 5: Compartir carpeta (hacerla pública)
        console.log('🔗 Test 5: Compartiendo carpeta (público)...');
        await driveService.shareFile(folder.id, null, 'reader');
        console.log('✅ Carpeta compartida públicamente\n');

        // Resumen final
        console.log('═══════════════════════════════════════');
        console.log('🎉 ¡TODAS LAS PRUEBAS PASARON!');
        console.log('═══════════════════════════════════════');
        console.log('✅ Google Drive está correctamente configurado');
        console.log('✅ Puedes usar todos los endpoints de la API');
        console.log('\n📋 Información de la carpeta de prueba:');
        console.log(`   Nombre: ${folder.name}`);
        console.log(`   ID: ${folder.id}`);
        console.log(`   Link: ${folder.webViewLink}`);
        console.log('\n💡 Puedes eliminar esta carpeta desde Google Drive si lo deseas.');

    } catch (error) {
        console.error('\n❌ ERROR EN LAS PRUEBAS:');
        console.error('═══════════════════════════════════════');
        console.error(error.message);
        console.error('\n🔧 Posibles soluciones:');
        console.error('1. Verifica que google-credentials.json esté en la raíz del proyecto');
        console.error('2. Asegúrate de que el archivo JSON sea válido');
        console.error('3. Verifica que la Google Drive API esté habilitada en Google Cloud Console');
        console.error('4. Revisa que la cuenta de servicio tenga los permisos necesarios');
        process.exit(1);
    }
}

// Ejecutar pruebas
testDriveConnection();
