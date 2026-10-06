// test-bot.js
const PORT = 3000; // Cambia esto si tu puerto es distinto
const BASE_URL = `http://localhost:${PORT}`;

// Configuración de prueba
const USERNAME = 'radd';     // Usuario para login
const PASSWORD = 'admin123'; // Contraseña

// 🎯 Datos fijos para acumular puntos en UN SOLO jugador
const TARGET_USER = 'JugadorTitán';
const TARGET_ID = 'titán_001';

const workspaces = [
    'legacy',
    'a1541859-d1bb-4838-9a0d-53aeb3790cba'
];

let sessionCookie = '';
let counter = 1;

async function login() {
    try {
        console.log('🔑 Autenticando bot en el servidor...');
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: USERNAME, password: PASSWORD })
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            throw new Error(data.error || 'Credenciales incorrectas');
        }

        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
            sessionCookie = setCookieHeader.split(';')[0];
            console.log('✅ Sesión iniciada con éxito.\n');
            return true;
        } else {
            console.warn('⚠️ Inicio de sesión exitoso pero no se recibió header Cookie.');
            return false;
        }
    } catch (error) {
        console.error(`❌ Error al autenticar: ${error.message}`);
        return false;
    }
}

async function sendTestEvent(workspaceId) {
    const payload = {
        workspaceId: workspaceId,
        username: TARGET_USER,
        userId: TARGET_ID,
        message: `Comentario #${counter} para acumular puntos 🤖`
    };

    try {
        const response = await fetch(`${BASE_URL}/api/test/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': sessionCookie
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            const totalPts = data.player ? (data.player.points || data.player.score || 'Acumulando') : 'N/A';
            console.log(`✅ [${workspaceId}] -> ${TARGET_USER} | Pts ganados: ${data.points} | Pts totales jugador: ${totalPts}`);
        } else {
            console.error(`❌ [${workspaceId}] -> Error: ${data.error}`);
        }
    } catch (error) {
        console.error(`🔌 [${workspaceId}] -> Fallo de conexión: ${error.message}`);
    }
}

async function start() {
    const loggedIn = await login();
    if (!loggedIn) {
        console.error('⛔ No se pudo iniciar sesión. Revisa las credenciales USERNAME y PASSWORD.');
        process.exit(1);
    }

    console.log(`🚀 Sumando puntos continuamente a @${TARGET_USER}...`);
    console.log('Presiona CTRL+C para detener.\n');

    setInterval(() => {
        workspaces.forEach(workspaceId => {
            sendTestEvent(workspaceId);
        });
        counter++;
    }, 1000);
}

start();