const form =
    document.querySelector(
        '#settings-form'
    );

const message =
    document.querySelector(
        '#settings-message'
    );

const connectionStatus =
    document.querySelector(
        '#connection-status'
    );

const connectButton =
    document.querySelector(
        '#connect-tiktok'
    );

const overlayFrame =
    document.querySelector(
        '#overlay-frame'
    );

const overlayUrl =
    document.querySelector(
        '#overlay-url'
    );

const rankingUrl =
    document.querySelector(
        '#ranking-url'
    );

const podiumUrl =
    document.querySelector(
        '#podium-url'
    );

const podiumDetailedUrl =
    document.querySelector(
        '#podium-detailed-url'
    );

const openOverlayButton =
    document.querySelector(
        '#open-overlay'
    );

const resetButton =
    document.querySelector(
        '#reset-game'
    );

const gameModeInput =
    form.elements.gameMode;


const battleDamageInput =
    form.elements.battleDamage;


const battleDamageField =
    battleDamageInput
        ?.closest('.field');

const battleRespawnInput =
    form.elements.battleRespawn;


const battleRespawnField =
    battleRespawnInput
        ?.closest('.field');

const statStatus =
    document.querySelector(
        '#stat-status'
    );

const statPlayers =
    document.querySelector(
        '#stat-players'
    );

const statEvents =
    document.querySelector(
        '#stat-events'
    );

const socket =
    io();

let eventCount = 0;

const settingsKeys = [
    'tiktokUsername',

    'width',
    'height',

    'commentPoints',
    'commentMultiplier',

    'likePoints',
    'likeMultiplier',

    'followPoints',
    'followMultiplier',

    'sharePoints',
    'shareMultiplier',

    'giftPoints',
    'giftMultiplier',

    'maxPointsPerMinute',

    'baseRadius',
    'pointsPerRadius',
    'maxRadius',
    'gameMode',
    'battleDamage',
    'battleRespawn',
    'speed',


    'showNames',
    'showPoints',
    'showLeaderboard',
    'showPodium',
    'showChat',

    'nameFontFamily',
    'nameFontSize',
    'nameFontWeight',
    'nameTextColor',
    'nameTextShadow',

    'chatFontFamily',
    'chatFontSize',
    'chatFontWeight',
    'chatTextColor',
    'chatTextShadow',


    'rankingLimit',
    'rankingFontFamily',
    'rankingFontSize',
    'rankingFontWeight',
    'rankingTextColor',
    'rankingTitleColor',
    'rankingPointsColor',
    'rankingTitleSize',


    'podiumLimit',
    'podiumFontFamily',
    'podiumFontSize',
    'podiumFontWeight',
    'podiumTextColor',
    'podiumTitleColor',
    'podiumWinsColor',
    'podiumTitleSize'
];

function showMessage(
    text,
    error = false
) {
    message.textContent =
        text;

    message.classList.toggle(
        'error',
        error
    );
}

function updateGameModeFields() {
    const isBattle =
        gameModeInput?.value ===
        'battle';

    if (
        battleDamageField
    ) {
        battleDamageField.hidden =
            !isBattle;
    }

    if (
        battleRespawnField
    ) {
        battleRespawnField.hidden =
            !isBattle;
    }
}

function setConnectionState(state) {
    const connected =
        Boolean(
            state?.connected
        );

    const connecting =
        Boolean(
            state?.connecting
        );

    const hasError =
        Boolean(
            state?.error ||
            state?.status === 'error'
        );

    connectionStatus.className =
        'connection-pill';

    if (connected) {
        connectionStatus.classList.add(
            'connected'
        );
    } else if (connecting) {
        connectionStatus.classList.add(
            'connecting'
        );
    } else if (hasError) {
        connectionStatus.classList.add(
            'error'
        );
    }

    connectButton.disabled =
        connecting;

    if (connecting) {
        connectionStatus.textContent =
            'Conectando...';

        connectButton.textContent =
            'Conectando...';

        statStatus.textContent =
            'Conectando';

        return;
    }

    if (connected) {
        const username =
            state.username
                ? `@${state.username}`
                : '';

        connectionStatus.textContent =
            `Conectado ${username}`;

        connectButton.textContent =
            'Desconectar TikTok';

        statStatus.textContent =
            'Online';

        return;
    }

    if (hasError) {
        connectionStatus.textContent =
            'Error de conexión';

        connectButton.textContent =
            'Conectar TikTok';

        statStatus.textContent =
            'Error';

        return;
    }

    connectionStatus.textContent =
        'Desconectado';

    connectButton.textContent =
        'Conectar TikTok';

    statStatus.textContent =
        'Offline';
}

function fillSettings(settings) {
    for (
        const key of settingsKeys
    ) {
        const input =
            form.elements[key];

        if (!input) {
            continue;
        }

        if (
            input.type === 'checkbox'
        ) {
            input.checked =
                Boolean(
                    settings[key]
                );
        } else {
            input.value =
                settings[key] ?? '';
        }
    }

    updateGameModeFields();
}

function updateOverlayDimensions(
    width,
    height
) {
    const safeWidth =
        Number(width) || 800;

    const safeHeight =
        Number(height) || 600;

    const subtitle =
        document.querySelector(
            '.brand-subtitle'
        );

    if (subtitle) {
        subtitle.textContent =
            `Control panel · overlay ` +
            `${safeWidth} × ${safeHeight}`;
    }

    const frame =
        document.querySelector(
            '#overlay-frame'
        );

    if (frame) {
        frame.style.aspectRatio =
            `${safeWidth} / ${safeHeight}`;
    }
}

function readSettings() {
    const settings = {};

    for (
        const key of settingsKeys
    ) {
        const input =
            form.elements[key];

        if (!input) {
            continue;
        }

        if (
            input.type === 'checkbox'
        ) {
            settings[key] =
                input.checked;
        } else if (
            input.type === 'number'
        ) {
            settings[key] =
                Number(
                    input.value
                );
        } else {
            settings[key] =
                input.value;
        }
    }

    return settings;
}

async function loadSettings() {
    try {
        const response =
            await fetch(
                '/api/settings'
            );

        const settings =
            await response.json();

        fillSettings(
            settings
        );

        updateOverlayDimensions(
            settings.width,
            settings.height
        );

        const overlayBaseUrl =
            `${location.origin}/overlay`;

        const rankingOverlayUrl =
            `${location.origin}/overlay/ranking`;

        const podiumOverlayUrldetailed =
            `${location.origin}/overlay/podium?detailed=true`;

        const podiumOverlayUrl =
            `${location.origin}/overlay/podium`;

        overlayUrl.value =
            overlayBaseUrl;

        rankingUrl.value =
            rankingOverlayUrl;

        podiumDetailedUrl.value =
            podiumOverlayUrldetailed;

        podiumUrl.value =
            podiumOverlayUrl;

        overlayFrame.src =
            overlayBaseUrl;

        try {
            const connectionResponse =
                await fetch(
                    '/api/connection'
                );

            if (
                connectionResponse.ok
            ) {
                setConnectionState(
                    await connectionResponse.json()
                );
            }
        } catch {
            setConnectionState({
                connected: false,
                connecting: false
            });
        }
    } catch (error) {
        showMessage(
            'No se pudieron cargar los settings.',
            true
        );

        console.error(error);
    }
}

async function saveSettings(event) {
    event.preventDefault();

    try {
        const response =
            await fetch(
                '/api/settings',
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type':
                            'application/json'
                    },
                    body: JSON.stringify(
                        readSettings()
                    )
                }
            );

        const result =
            await response.json();

        if (!response.ok) {
            throw new Error(
                result.error ||
                'No se pudieron guardar los settings.'
            );
        }

        const savedSettings =
            result.settings ||
            result;

        fillSettings(
            savedSettings
        );

        updateOverlayDimensions(
            savedSettings.width,
            savedSettings.height
        );

        showMessage(
            'Settings guardados correctamente.'
        );
    } catch (error) {
        showMessage(
            error.message,
            true
        );
    }
}

async function connectTikTok() {
    const username =
        form.elements
            .tiktokUsername
            .value
            .trim();

    if (!username) {
        showMessage(
            'Escribe primero el usuario de TikTok.',
            true
        );

        return;
    }

    setConnectionState({
        connected: false,
        connecting: true,
        username
    });

    try {
        const response =
            await fetch(
                '/api/connect',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json'
                    },
                    body: JSON.stringify({
                        username
                    })
                }
            );

        const result =
            await response.json();

        if (
            !response.ok ||
            !result.ok
        ) {
            throw new Error(
                result.error ||
                'No se pudo conectar.'
            );
        }

        setConnectionState({
            connected: true,
            connecting: false,
            username:
                result.username ||
                username,
            status: 'connected'
        });

        showMessage(
            'TikTok conectado correctamente.'
        );
    } catch (error) {
        setConnectionState({
            connected: false,
            connecting: false,
            username,
            status: 'error',
            error: error.message
        });

        showMessage(
            error.message,
            true
        );
    }
}

async function disconnectTikTok() {
    connectButton.disabled =
        true;

    connectButton.textContent =
        'Desconectando...';

    try {
        const response =
            await fetch(
                '/api/disconnect',
                {
                    method: 'POST'
                }
            );

        const result =
            await response.json();

        if (
            !response.ok ||
            result.ok === false
        ) {
            throw new Error(
                result.error ||
                'No se pudo desconectar.'
            );
        }

        setConnectionState({
            connected: false,
            connecting: false,
            status: 'disconnected'
        });

        showMessage(
            'TikTok desconectado.'
        );
    } catch (error) {
        showMessage(
            error.message,
            true
        );
    } finally {
        connectButton.disabled =
            false;
    }
}

async function toggleConnection() {
    const connected =
        connectionStatus.classList.contains(
            'connected'
        );

    if (connected) {
        await disconnectTikTok();
    } else {
        await connectTikTok();
    }
}

async function resetGame() {
    if (
        !window.confirm(
            '¿Reiniciar la partida actual?'
        )
    ) {
        return;
    }

    try {
        const response =
            await fetch(
                '/api/reset',
                {
                    method: 'POST'
                }
            );

        if (!response.ok) {
            throw new Error(
                'No se pudo reiniciar la partida.'
            );
        }

        showMessage(
            'Partida reiniciada.'
        );
    } catch (error) {
        showMessage(
            error.message,
            true
        );
    }
}

function handleState(state) {
    if (!state) {
        return;
    }

    const players =
        state.players ||
        state.game?.players ||
        [];

    statPlayers.textContent =
        players.length;

    if (state.connection) {
        setConnectionState(
            state.connection
        );
    }
}

socket.on(
    'arena:resize',
    (size) => {
        updateOverlayDimensions(
            size.width,
            size.height
        );
    }
);

socket.on(
    'state:init',
    handleState
);

socket.on(
    'state:update',
    handleState
);

socket.on(
    'state',
    handleState
);

socket.on(
    'connection',
    setConnectionState
);

socket.on(
    'activity',
    () => {
        eventCount += 1;

        statEvents.textContent =
            eventCount;
    }
);

if (gameModeInput) {
    gameModeInput.addEventListener(
        'change',
        updateGameModeFields
    );
}

form.addEventListener(
    'submit',
    saveSettings
);

connectButton.addEventListener(
    'click',
    toggleConnection
);

resetButton.addEventListener(
    'click',
    resetGame
);

openOverlayButton.addEventListener(
    'click',
    () => {
        window.open(
            overlayUrl.value,
            '_blank',
            'noopener,noreferrer'
        );
    }
);

loadSettings();
