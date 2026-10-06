const form =
    document.querySelector(
        '#settings-form'
    );

const accountForm =
    document.querySelector(
        '#account-form'
    );

const accountMessage =
    document.querySelector(
        '#account-message'
    );

const accountsList =
    document.querySelector(
        '#accounts-list'
    );

const adminCard =
    document.querySelector(
        '#admin-tools'
    );

const accountsNav =
    document.querySelector(
        '#accounts-nav'
    );

const sidebarNavItems =
    [...document.querySelectorAll('.sidebar-nav-item')];

document.querySelectorAll('[data-password-target]').forEach(toggle => {
    toggle.addEventListener('change', () => {
        const field = document.querySelector(`#${toggle.dataset.passwordTarget}`);
        if (field) {
            field.type = toggle.checked ? 'text' : 'password';
        }
    });
});

function selectView(viewId) {
    sidebarNavItems.forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewId);
    });

    document.querySelectorAll('#dashboard-view, #account-view').forEach(view => {
        view.hidden = view.id !== viewId;
    });
}

sidebarNavItems.forEach(item => {
    item.addEventListener('click', () => selectView(item.dataset.view));
});

const profileForm =
    document.querySelector(
        '#profile-form'
    );

const profileMessage =
    document.querySelector(
        '#profile-message'
    );

const profileWorkspaceId =
    document.querySelector(
        '#profile-workspace-id'
    );

const copyProfileWorkspace =
    document.querySelector(
        '#copy-profile-workspace'
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

const accountName =
    document.querySelector(
        '#account-name'
    );

const logoutButton =
    document.querySelector(
        '#logout-button'
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

const battleScaledDamageInput =
    form.elements.battleScaledDamage;

const battleScaledDamageField =
    battleScaledDamageInput
        ?.closest('.field');

const battleDamageMultiplierInput =
    form.elements.battleDamageMultiplier;

const battleDamageMultiplierField =
    battleDamageMultiplierInput
        ?.closest('.field');


const marbleGravityInput = form.elements.marbleGravity;
const marbleGravityField = marbleGravityInput?.closest('.field');

const marblePegRadiusInput = form.elements.marblePegRadius;
const marblePegRadiusField = marblePegRadiusInput?.closest('.field');

const marbleRowsInput = form.elements.marbleRows;
const marbleRowsField = marbleRowsInput?.closest('.field');

const marbleColsInput = form.elements.marbleCols;
const marbleColsField = marbleColsInput?.closest('.field');

const marblesRoundDurationInput = form.elements.marblesRoundDuration;
const marblesRoundDurationField = marblesRoundDurationInput?.closest('.field');

const marblesCountdownDurationInput = form.elements.marblesCountdownDuration;
const marblesCountdownDurationField = marblesCountdownDurationInput?.closest('.field');

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
    'marbleGravity',
    'marblePegRadius',
    'marbleRows',
    'marbleCols',
    'marblesRoundDuration',   
    'marblesCountdownDuration', 
    'battleDamage',
    'battleRespawn',
    'battleScaledDamage',
    'battleDamageMultiplier',
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
    const isBattle = gameModeInput?.value === 'battle';
    const isMarbles = gameModeInput?.value === 'marbles';

    if (battleDamageField) {
        battleDamageField.hidden = !isBattle;
    }
    if (battleScaledDamageField) {
        battleScaledDamageField.hidden = !isBattle;
    }
    if (battleDamageMultiplierField) {
        battleDamageMultiplierField.hidden = !isBattle;
    }
    if (battleRespawnField) {
        battleRespawnField.hidden = !isBattle;
    }

    if (marbleGravityField) {
        marbleGravityField.hidden = !isMarbles;
    }
    if (marblePegRadiusField) {
        marblePegRadiusField.hidden = !isMarbles;
    }

    if (marbleRowsField) marbleRowsField.hidden = !isMarbles;
if (marbleColsField) marbleColsField.hidden = !isMarbles;

if (marblesRoundDurationField) marblesRoundDurationField.hidden = !isMarbles;
    if (marblesCountdownDurationField) marblesCountdownDurationField.hidden = !isMarbles;
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

        const overlayResponse = await fetch('/api/overlay-url');
        const overlayLinks = await overlayResponse.json();
        if (!overlayResponse.ok) {
            throw new Error(overlayLinks.error || 'No se pudieron generar los enlaces');
        }

        const overlayBaseUrl = overlayLinks.url;
        const rankingOverlayUrl = overlayLinks.rankingUrl;
        const podiumOverlayUrldetailed = overlayLinks.podiumDetailedUrl;
        const podiumOverlayUrl = overlayLinks.podiumUrl;

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

async function loadAccounts() {
    if (!accountForm) return;

    try {
        const response = await fetch('/api/admin/accounts');
        if (response.status === 403) {
            adminCard.hidden = true;
            return;
        }

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudieron cargar las cuentas');

        adminCard.hidden = false;
        accountsList.innerHTML = `
            <div class="accounts-table-header">
                <span>Usuario</span>
                <span>Nombre</span>
                <span>Arena</span>
                <span>Workspace ID</span>
                <span>Rol</span>
                <span>Acciones</span>
            </div>
            ${result.accounts.map(account => `
                <div class="account-row" data-user-id="${account.id}">
                    <strong>${account.username}</strong>
                    <span>${account.displayName || '-'}</span>
                    <span>${account.workspaceName}</span>
                    <span class="workspace-cell"><code>${account.workspaceId}</code><button type="button" data-copy-workspace="${account.workspaceId}">Copiar</button></span>
                    <span class="role-badge ${account.role}">${account.role}</span>
                    <div class="account-actions">
                        <button type="button" data-account-action="edit">Editar</button>
                        <button type="button" data-account-action="delete">Eliminar</button>
                    </div>
                </div>
            `).join('')}
        `;
    } catch (error) {
        accountMessage.textContent = error.message;
        accountMessage.classList.add('error');
    }
}

async function copyText(value, button) {
    try {
        await navigator.clipboard.writeText(value);
    } catch {
        const helper = document.createElement('textarea');
        helper.value = value;
        document.body.appendChild(helper);
        helper.select();
        document.execCommand('copy');
        helper.remove();
    }

    const label = button.textContent;
    button.textContent = 'Copiado';
    setTimeout(() => { button.textContent = label; }, 1200);
}

accountsList.addEventListener('click', async event => {
    const copyButton = event.target.closest('[data-copy-workspace]');
    if (copyButton) {
        await copyText(copyButton.dataset.copyWorkspace, copyButton);
        return;
    }

    const button = event.target.closest('[data-account-action]');
    if (!button) return;

    const row = button.closest('[data-user-id]');
    const userId = row.dataset.userId;
    const username = row.querySelector('strong').textContent;

    if (button.dataset.accountAction === 'delete') {
        if (!window.confirm(`¿Eliminar la cuenta ${username}?`)) return;

        const response = await fetch(`/api/admin/accounts/${userId}`, { method: 'DELETE' });
        const result = await response.json();
        accountMessage.textContent = result.ok ? 'Cuenta eliminada.' : result.error;
        loadAccounts();
        return;
    }

    const nextUsername = window.prompt('Nuevo username:', username);
    if (!nextUsername) return;
    const nextPassword = window.prompt('Nueva contraseña (vacío para conservarla):', '');
    const nextDisplayName = window.prompt('Nombre visible:', username);
    const response = await fetch(`/api/admin/accounts/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: nextUsername,
            password: nextPassword,
            displayName: nextDisplayName
        })
    });
    const result = await response.json();
    accountMessage.textContent = result.ok ? 'Cuenta actualizada.' : result.error;
    loadAccounts();
});

async function loadCurrentAccount() {
    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) return;
        const result = await response.json();
        accountName.textContent = result.user.displayName || result.user.username;
        profileForm.elements.username.value = result.user.username;
        profileForm.elements.displayName.value = result.user.displayName || '';
        profileWorkspaceId.value = result.workspaceId || '';
    } catch {
        accountName.textContent = 'Sin sesión';
    }
}

async function updateProfile(event) {
    event.preventDefault();
    profileMessage.textContent = '';
    profileMessage.classList.remove('error');

    try {
        const body = Object.fromEntries(new FormData(profileForm).entries());
        if (body.password && body.password !== body.passwordConfirmation) {
            throw new Error('Las contraseñas no coinciden');
        }

        delete body.passwordConfirmation;

        const response = await fetch('/api/account', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo actualizar la cuenta');

        accountName.textContent = result.user.displayName || result.user.username;
        profileMessage.textContent = 'Cuenta actualizada.';
        profileForm.elements.password.value = '';
        profileForm.elements.passwordConfirmation.value = '';
    } catch (error) {
        profileMessage.textContent = error.message;
        profileMessage.classList.add('error');
    }
}

async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login/';
}

async function createAccount(event) {
    event.preventDefault();
    accountMessage.textContent = '';
    accountMessage.classList.remove('error');

    try {
        const body = Object.fromEntries(new FormData(accountForm).entries());
        if (body.password !== body.passwordConfirmation) {
            throw new Error('Las contraseñas no coinciden');
        }

        delete body.passwordConfirmation;

        const response = await fetch('/api/admin/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo crear la cuenta');

        accountForm.reset();
        accountMessage.textContent = 'Cuenta creada correctamente.';
        loadAccounts();
    } catch (error) {
        accountMessage.textContent = error.message;
        accountMessage.classList.add('error');
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

if (accountForm) {
    accountForm.addEventListener('submit', createAccount);
}

profileForm.addEventListener('submit', updateProfile);

logoutButton.addEventListener('click', logout);

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
loadAccounts();
loadCurrentAccount();

copyProfileWorkspace.addEventListener('click', () => {
    copyText(profileWorkspaceId.value, copyProfileWorkspace);
});

if (accountForm) {
    accountForm.reset();
}
