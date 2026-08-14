const {
    TikTokLiveConnection,
    SignConfig
} = require('tiktok-live-connector');

const {
    points
} = require('./points');

const gameState = require('./game-state');

const {
    get
} = require('./settings');

const eulerApiKey = String(
    process.env.EULER_FALLBACK_API_KEY || ''
).trim();

if (eulerApiKey && SignConfig) {
    SignConfig.apiKey = eulerApiKey;
}

let realtime = null;
let connection = null;
let currentUsername = null;
let isConnecting = false;
let isConnected = false;

function normalizeUsername(username) {
    return String(username || '')
        .trim()
        .replace(/^@/, '');
}

function formatError(error) {
    if (!error) {
        return 'Error desconocido';
    }

    if (typeof error === 'string') {
        return error;
    }

    if (error.message) {
        return error.message;
    }

    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}

function getPossibleUserObjects(data) {
    return [
        data?.user,
        data?.userDetails,
        data?.userInfo,
        data?.author,
        data?.sender
    ].filter(Boolean);
}

function isImageUrl(value) {
    if (typeof value !== 'string') {
        return false;
    }

    const text = value.trim();

    return (
        text.startsWith('http://') ||
        text.startsWith('https://') ||
        text.startsWith('//')
    );
}

function findAvatarUrl(value, visited = new Set(), depth = 0) {
    if (!value || depth > 6) {
        return '';
    }

    if (typeof value === 'string') {
        return isImageUrl(value) ? value : '';
    }

    if (typeof value !== 'object') {
        return '';
    }

    if (visited.has(value)) {
        return '';
    }

    visited.add(value);

    if (Array.isArray(value)) {
        for (const item of value) {
            const result = findAvatarUrl(
                item,
                visited,
                depth + 1
            );

            if (result) {
                return result;
            }
        }

        return '';
    }

    const preferredKeys = [
        'profilePicture',
        'profilePictureUrl',
        'profile_picture_url',
        'avatar',
        'avatarUrl',
        'avatar_url',
        'avatarLarger',
        'avatarMedium',
        'avatarThumb',
        'photoUrl',
        'photo_url',
        'imageUrl',
        'image_url',
        'urlList',
        'url_list',
        'urls',
        'url'
    ];

    for (const key of preferredKeys) {
        if (!(key in value)) {
            continue;
        }

        const result = findAvatarUrl(
            value[key],
            visited,
            depth + 1
        );

        if (result) {
            return result;
        }
    }

    return '';
}

function getUserData(data) {
    const candidates = [
        data?.user,
        data?.userDetails,
        data?.userInfo,
        data?.author,
        data?.sender,
        data
    ].filter(Boolean);

    function firstValue(selectors) {
        for (const candidate of candidates) {
            for (const selector of selectors) {
                let value;

                try {
                    value = selector(candidate);
                } catch {
                    value = null;
                }

                if (
                    value !== undefined &&
                    value !== null &&
                    String(value).trim() !== ''
                ) {
                    return value;
                }
            }
        }

        return null;
    }

    const uniqueId = firstValue([
        (value) => value.uniqueId,
        (value) => value.unique_id,
        (value) => value.username,
        (value) => value.userName,
        (value) => value.user_name
    ]);

    const nickname = firstValue([
        (value) => value.nickname,
        (value) => value.displayName,
        (value) => value.display_name,
        (value) => value.name
    ]);

    const userId = firstValue([
        (value) => value.userId,
        (value) => value.user_id,
        (value) => value.id
    ]);

    let avatar = '';

    for (const candidate of candidates) {
        avatar = findAvatarUrl(candidate);

        if (avatar) {
            break;
        }
    }

    const finalUsername =
        uniqueId ||
        nickname ||
        'viewer';

    return {
        userId: String(
            userId ||
            finalUsername
        ),

        uniqueId: String(finalUsername),

        username: String(finalUsername),

        nickname: String(
            nickname ||
            finalUsername
        ),

        avatar
    };
}

function getCommentText(data) {
    return String(
        data?.comment ||
        data?.message ||
        data?.text ||
        data?.content ||
        ''
    );
}

function getGiftData(data) {
    const giftDetails = data?.giftDetails || {};
    const extendedGiftInfo = data?.extendedGiftInfo || {};

    const giftType =
        giftDetails.giftType ??
        extendedGiftInfo.type ??
        data?.giftType ??
        0;

    const giftName =
        giftDetails.giftName ||
        giftDetails.name ||
        extendedGiftInfo.name ||
        data?.giftName ||
        data?.gift?.name ||
        'Gift';

    const repeatCount =
        Number(data?.repeatCount) ||
        Number(data?.repeatcount) ||
        1;

    const diamondCount =
        Number(data?.diamondCount) ||
        Number(data?.diamond_count) ||
        Number(giftDetails.diamondCount) ||
        Number(extendedGiftInfo.diamondCount) ||
        1;

    const repeatEnd =
        data?.repeatEnd ??
        data?.repeat_end ??
        true;

    return {
        giftType,
        giftName,
        repeatCount,
        diamondCount,
        repeatEnd
    };
}

function emitGameEvent(type, data, extra = {}) {
    if (!realtime) {
        return;
    }

    const user = getUserData(data);

    const event = {
        type,
        ...user,
        ...extra
    };

    const earnedPoints = points(event);

console.log('[TikTok] Evento normalizado:', {
    type: event.type,
    userId: event.userId,
    username: event.username,
    nickname: event.nickname,
    avatar: event.avatar || '',
    comment: event.comment || '',
    message: event.message || '',
    giftName: event.giftName || '',
    points: earnedPoints
});

    if (!earnedPoints) {
        return;
    }

    gameState.add(event, earnedPoints);

    realtime.event({
        ...event,
        points: earnedPoints
    });

    realtime.state();
}

function setupListeners() {
    if (!connection) {
        return;
    }

    connection.on('chat', (data) => {
        const user = getUserData(data);
        const comment = getCommentText(data);

        console.log(
            `[TikTok] CHAT @${user.username} (${user.nickname}): ${comment}`
        );

        emitGameEvent('comment', data, {
            comment,
            message: comment,
            platform: 'tiktok'
        });
    });

    connection.on('gift', (data) => {
        const user = getUserData(data);
        const gift = getGiftData(data);

        // Los regalos streak pueden emitir varios eventos.
        // Procesamos el evento final.
        if (
            Number(gift.giftType) === 1 &&
            gift.repeatEnd === false
        ) {
            return;
        }

        console.log(
            `[TikTok] GIFT @${user.username} (${user.nickname}): ${gift.giftName} x${gift.repeatCount}`
        );

        emitGameEvent('gift', data, {
            giftName: gift.giftName,
            giftname: gift.giftName,
            repeatCount: gift.repeatCount,
            repeatcount: gift.repeatCount,
            diamondCount: gift.diamondCount,
            platform: 'tiktok'
        });
    });

connection.on('like', (data) => {
    const user = getUserData(data);

    const likeCount =
        Number(data?.likeCount) ||
        Number(data?.likecount) ||
        1;

    console.log(
        `[TikTok] LIKE @${user.username} (${user.nickname}): ${likeCount}`
    );

    emitGameEvent('like', data, {
        likeCount,
        likecount: likeCount,
        platform: 'tiktok'
    });
});

connection.on('follow', (data) => {
    const user = getUserData(data);

    console.log(
        `[TikTok] FOLLOW @${user.username} (${user.nickname})`
    );

    emitGameEvent('follow', data, {
        platform: 'tiktok'
    });
});

connection.on('share', (data) => {
    const user = getUserData(data);

    console.log(
        `[TikTok] SHARE @${user.username} (${user.nickname})`
    );

    emitGameEvent('share', data, {
        platform: 'tiktok'
    });
});

    connection.on('connected', (data) => {
        isConnected = true;
        isConnecting = false;

        console.log(
            `[TikTok] Evento connected recibido para @${currentUsername}`
        );

        if (realtime) {
            realtime.event({
                type: 'connection',
                status: 'connected',
                username: currentUsername,
                roomId: data?.roomId || null
            });
        }
    });

    connection.on('disconnected', () => {
        isConnected = false;
        isConnecting = false;

        console.log(
            `[TikTok] Conexión cerrada para @${currentUsername}`
        );

        if (realtime) {
            realtime.event({
                type: 'connection',
                status: 'disconnected',
                username: currentUsername
            });
        }
    });

    connection.on('streamEnd', () => {
        isConnected = false;
        isConnecting = false;

        console.log(
            `[TikTok] El LIVE de @${currentUsername} terminó`
        );

        if (realtime) {
            realtime.event({
                type: 'connection',
                status: 'streamEnd',
                username: currentUsername
            });
        }
    });

    connection.on('error', (error) => {
        isConnected = false;
        isConnecting = false;

        const message = formatError(error);

        console.error(
            `[TikTok] Error en la conexión: ${message}`
        );

        if (realtime) {
            realtime.event({
                type: 'connection',
                status: 'error',
                username: currentUsername,
                message
            });
        }
    });
}

async function disposeConnection() {
    if (!connection) {
        return;
    }

    try {
        connection.removeAllListeners();
    } catch (error) {
        console.warn(
            '[TikTok] No se pudieron eliminar los listeners:',
            formatError(error)
        );
    }

    try {
        await connection.disconnect();
    } catch (error) {
        console.warn(
            '[TikTok] Error cerrando conexión:',
            formatError(error)
        );
    }

    connection = null;
    isConnected = false;
    isConnecting = false;
}

async function connect(username) {
    const cleanUsername = normalizeUsername(username);

    if (!cleanUsername) {
        throw new Error(
            'Debes escribir un usuario de TikTok'
        );
    }

    if (isConnecting) {
        throw new Error(
            'Ya hay una conexión con TikTok en progreso'
        );
    }

    if (
        isConnected &&
        currentUsername === cleanUsername
    ) {
        console.log(
            `[TikTok] Ya conectado a @${cleanUsername}`
        );

        return {
            username: cleanUsername,
            alreadyConnected: true
        };
    }

    isConnecting = true;

    await disposeConnection();

    currentUsername = cleanUsername;

    console.log(
        `[TikTok] Intentando conectar con @${cleanUsername}...`
    );

    console.log(
        `[TikTok] API key de Euler cargada: ${Boolean(eulerApiKey)}`
    );

    connection = new TikTokLiveConnection(
        cleanUsername,
        {
            processInitialData: false,
            fetchRoomInfoOnConnect: true,
            connectWithUniqueId: true,
            enableExtendedConfig: true,
            enableExtendedGiftInfo: false,
            enableWebsocketUpgrade: true,
            disableEulerFallbacks: false,
            signApiKey: eulerApiKey || undefined
        }
    );

    setupListeners();

    try {
        const result = await connection.connect();

        isConnected = true;
        isConnecting = false;

        console.log(
            `[TikTok] Conexión establecida con @${cleanUsername}`
        );

        if (realtime) {
            realtime.event({
                type: 'connection',
                status: 'connected',
                username: cleanUsername,
                roomId: result?.roomId || null
            });
        }

        return {
            username: cleanUsername,
            roomId: result?.roomId || null
        };
    } catch (error) {
        isConnected = false;
        isConnecting = false;

        const message = formatError(error);

        console.error(
            `[TikTok] No se pudo conectar con @${cleanUsername}:`
        );

        console.error(message);

        if (realtime) {
            realtime.event({
                type: 'connection',
                status: 'error',
                username: cleanUsername,
                message
            });
        }

        await disposeConnection();

        throw new Error(message);
    }
}

async function disconnect() {
    if (!connection) {
        isConnected = false;
        isConnecting = false;

        if (realtime) {
            realtime.event({
                type: 'connection',
                status: 'disconnected',
                username: currentUsername
            });
        }

        return {
            ok: true,
            alreadyDisconnected: true
        };
    }

    const disconnectedUsername =
        currentUsername;

    console.log(
        `[TikTok] Desconectando de @${disconnectedUsername}...`
    );

    await disposeConnection();

    currentUsername = null;
    isConnected = false;
    isConnecting = false;

    if (realtime) {
        realtime.event({
            type: 'connection',
            status: 'disconnected',
            username: disconnectedUsername
        });
    }

    console.log(
        '[TikTok] Desconectado correctamente.'
    );

    return {
        ok: true,
        username: disconnectedUsername
    };
}

function init(socketApi) {
    realtime = socketApi;

    console.log(
        '[TikTok] Sistema realtime inicializado.'
    );

    console.log(
        '[TikTok] Conexión automática desactivada. Esperando conexión manual.'
    );
}

module.exports = {
    init,
    connect,
    disconnect
};