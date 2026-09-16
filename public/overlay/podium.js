const socket = io();

const podium = document.querySelector('#podium');

const urlParameters = new URLSearchParams(window.location.search);

const showDetailedStats = urlParameters.get('detailed') === 'true';

let podiumCanvas = null;
let podiumContext = null;
let animationFrameId = null;

let currentPlayers = [];
let currentMode = 'classic';

let podiumSettings = {
    podiumLimit: 10,
    podiumFontFamily: 'Verdana',
    podiumFontSize: 26,
    podiumFontWeight: '700',
    podiumTextColor: '#ffffff',
    podiumTitleColor: '#ffe66d',
    podiumWinsColor: '#ffe66d',
    podiumTitleSize: 32
};

function getDisplayName(player) {
    return player.nickname || player.username || player.uniqueId || 'viewer';
}

function getNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

// Auxiliar para parsear colores HEX a RGB
function parseHexColor(color) {
    if (!color) return { r: 255, g: 255, b: 255 };
    const hex = color.replace('#', '').slice(0, 6);
    return {
        r: parseInt(hex.slice(0, 2), 16) || 0,
        g: parseInt(hex.slice(2, 4), 16) || 0,
        b: parseInt(hex.slice(4, 6), 16) || 0
    };
}

// Soporta tanto array 'colors' como 'color1' / 'color2' antiguos
function getPlayerColorConfig(player) {
    const customColor = player?.customColor;
    if (!customColor || typeof customColor !== 'object') {
        return { type: 'solid', colors: [podiumSettings.podiumTextColor || '#ffffff'] };
    }

    let colors = [];
    if (Array.isArray(customColor.colors) && customColor.colors.length > 0) {
        colors = customColor.colors;
    } else {
        if (customColor.color1) colors.push(customColor.color1);
        if (customColor.color2) colors.push(customColor.color2);
    }

    if (colors.length === 0) {
        colors = [podiumSettings.podiumTextColor || '#ffffff'];
    }

    return {
        type: customColor.type || 'solid',
        colors: colors
    };
}

function getModeLabel(mode) {
    return mode === 'battle' ? 'Batalla' : 'Clásico';
}

function getFont(size, weight, family) {
    return `${weight} ${size}px ${family}`;
}

function resizePodiumCanvas() {
    if (!podiumCanvas || !podiumContext) return;

    const width = Math.max(320, podium.clientWidth || 800);
    const height = Math.max(240, podium.clientHeight || 600);
    const pixelRatio = window.devicePixelRatio || 1;

    podiumCanvas.width = Math.floor(width * pixelRatio);
    podiumCanvas.height = Math.floor(height * pixelRatio);
    podiumCanvas.style.width = `${width}px`;
    podiumCanvas.style.height = `${height}px`;

    podiumContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawPodium();
}

function drawRoundedRect(context, x, y, width, height, radius, fillStyle) {
    context.beginPath();
    if (typeof context.roundRect === 'function') {
        context.roundRect(x, y, width, height, radius);
    } else {
        context.moveTo(x + radius, y);
        context.lineTo(x + width - radius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + radius);
        context.lineTo(x + width, y + height - radius);
        context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        context.lineTo(x + radius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - radius);
        context.lineTo(x, y + radius);
        context.quadraticCurveTo(x, y, x + radius, y);
    }
    context.fillStyle = fillStyle;
    context.fill();
}

function drawText(context, text, x, y, font, color, align = 'left') {
    context.font = font;
    context.textAlign = align;
    context.textBaseline = 'middle';
    context.fillStyle = color;
    context.fillText(text, x, y);
}

function drawPlayerName(player, x, y, maxWidth) {
    const context = podiumContext;
    const config = getPlayerColorConfig(player);
    const fontSize = getNumber(podiumSettings.podiumFontSize, 26);
    const fontWeight = podiumSettings.podiumFontWeight || '700';
    const fontFamily = podiumSettings.podiumFontFamily || 'Verdana';
    const font = getFont(fontSize, fontWeight, fontFamily);
    const name = getDisplayName(player);

    context.save();
    context.font = font;
    context.textAlign = 'left';
    context.textBaseline = 'middle';

    const textMetrics = context.measureText(name);
    const textWidth = Math.max(textMetrics.width, 1);

    if (config.type === 'rainbow') {
        const time = Date.now() / 20;
        const gradient = context.createLinearGradient(x, y, x + textWidth, y);
        for (let index = 0; index <= 6; index += 1) {
            const hue = (time + index * 60) % 360;
            gradient.addColorStop(index / 6, `hsl(${hue}, 100%, 50%)`);
        }
        context.fillStyle = gradient;

    } else if (config.type === 'gradient' && config.colors.length >= 2) {
        const gradient = context.createLinearGradient(x, y, x + textWidth, y);
        const lastIndex = config.colors.length - 1;
        config.colors.forEach((col, idx) => {
            const hex = col.startsWith('#') ? col : `#${col}`;
            gradient.addColorStop(idx / lastIndex, hex);
        });
        context.fillStyle = gradient;

    } else if (config.type === 'animated' && config.colors.length >= 2) {
        const colors = config.colors;
        const count = colors.length;

        // 1. Normalizar la velocidad global: 
        // 5000ms (5s) por vuelta completa divididos entre la cantidad de colores.
        // Así nunca irá "más rápido" solo por tener más colores.
        const speedFactor = 1000 * count; 
        const timeOffset = (Date.now() % speedFactor) / speedFactor;

        const gradient = context.createLinearGradient(x, y, x + textWidth, y);

        // 2. Muestreo fluido independiente del contraste
        const steps = 8; // Número de puntos de muestra en el texto
        for (let i = 0; i <= steps; i++) {
            const pos = i / steps;

            // Avance suave continuo sobre el ciclo de colores
            const rawProgress = pos + timeOffset;
            const progress = (rawProgress - Math.floor(rawProgress)) * count;
            
            const idx1 = Math.floor(progress) % count;
            const idx2 = (idx1 + 1) % count;
            const factor = progress - Math.floor(progress);

            const c1 = parseHexColor(colors[idx1]);
            const c2 = parseHexColor(colors[idx2]);

            // Interpolación de canales RGB
            const r = Math.round(c1.r + (c2.r - c1.r) * factor);
            const g = Math.round(c1.g + (c2.g - c1.g) * factor);
            const b = Math.round(c1.b + (c2.b - c1.b) * factor);

            gradient.addColorStop(pos, `rgb(${r}, ${g}, ${b})`);
        }

        context.fillStyle = gradient;

    } else {
        const firstColor = config.colors[0] || '#ffffff';
        context.fillStyle = firstColor.startsWith('#') ? firstColor : `#${firstColor}`;
    }

    context.fillText(name, x, y);
    context.restore();
}

function drawClassicStats(context, player, x, y, fontSize) {
    const statsFont = getFont(fontSize, '700', podiumSettings.podiumFontFamily || 'Verdana');
    const statsColor = podiumSettings.podiumWinsColor || '#ffe66d';

    const wins = `${player.wins || 0} 🏆`;
    const balls = `${player.ballsEaten || 0} 🍽️`;
    const points = `${player.pointsEarned || 0} pts`;

    drawText(context, wins, x, y, statsFont, statsColor, 'right');
    drawText(context, balls, x + fontSize * 4.5, y, statsFont, statsColor, 'right');
    drawText(context, points, x + fontSize * 9, y, statsFont, statsColor, 'right');
}

function drawBattleStats(context, player, x, y, fontSize) {
    const statsFont = getFont(fontSize, '700', podiumSettings.podiumFontFamily || 'Verdana');
    const statsColor = podiumSettings.podiumWinsColor || '#ffe66d';

    const wins = `${player.wins || 0} 🏆`;
    const damage = `${player.damageDealt || 0} daño`;
    const hits = `${player.hitsGiven || 0} golpes`;

    drawText(context, wins, x, y, statsFont, statsColor, 'right');
    drawText(context, `  ${damage}`, x - fontSize * 4.5, y, statsFont, statsColor, 'right');
    drawText(context, `  ${hits}`, x - fontSize * 9.5, y, statsFont, statsColor, 'right');
}

function drawPodium() {
    if (!podiumCanvas || !podiumContext) return;

    const context = podiumContext;
    const viewportWidth = podiumCanvas.clientWidth || 800;
    const viewportHeight = podiumCanvas.clientHeight || 600;

    const panelPadding = 24;
    const panelMaxWidth = 760;
    const panelWidth = Math.min(panelMaxWidth, viewportWidth - panelPadding * 2);
    const panelX = (viewportWidth - panelWidth) / 2;
    const panelY = panelPadding;
    const panelHeight = viewportHeight - panelPadding * 2;

    context.clearRect(0, 0, viewportWidth, viewportHeight);

    drawRoundedRect(
        context,
        panelX,
        panelY,
        panelWidth,
        panelHeight,
        16,
        'rgba(0, 0, 0, 0.58)'
    );

    const innerWidth = panelWidth - panelPadding * 2;
    const innerX = panelX + panelPadding;

    const fontSize = getNumber(podiumSettings.podiumFontSize, 26);
    const titleSize = getNumber(podiumSettings.podiumTitleSize, 32);
    const titleFont = getFont(titleSize, '700', podiumSettings.podiumFontFamily || 'Verdana');

    drawText(
        context,
        `🏆 Podio histórico - ${getModeLabel(currentMode)}`,
        innerX + innerWidth / 2,
        panelY + titleSize + 20,
        titleFont,
        podiumSettings.podiumTitleColor || '#ffe66d',
        'center'
    );

    const limit = Math.max(1, Math.floor(getNumber(podiumSettings.podiumLimit, 10)));
    const players = currentPlayers.slice(0, limit);

    const rowHeight = showDetailedStats ? fontSize * 2.2 : fontSize * 1.8;
    const firstRowY = panelY + titleSize + 70;
    const positionWidth = fontSize * 2;
    const statsWidth = showDetailedStats ? fontSize * 14 : fontSize * 4;
    const nameX = innerX + positionWidth + 24;
    const nameWidth = Math.max(120, innerWidth - positionWidth - statsWidth - 60);

    players.forEach((player, index) => {
        const y = firstRowY + index * rowHeight;

        if (index % 2 === 0) {
            drawRoundedRect(
                context,
                innerX + 8,
                y - rowHeight / 2 + 2,
                innerWidth - 16,
                rowHeight - 4,
                8,
                'rgba(255, 255, 255, 0.06)'
            );
        }

        const positionFont = getFont(fontSize, '700', podiumSettings.podiumFontFamily || 'Verdana');
        drawText(
            context,
            `${index + 1}.`,
            innerX + positionWidth / 2,
            y,
            positionFont,
            podiumSettings.podiumWinsColor || '#ffe66d',
            'center'
        );

        drawPlayerName(player, nameX, y, nameWidth);

        if (showDetailedStats) {
            if (currentMode === 'battle') {
                drawBattleStats(context, player, innerX + innerWidth - 18 - fontSize * 10, y, fontSize);
            } else {
                drawClassicStats(context, player, innerX + innerWidth - 18 - fontSize * 9, y, fontSize);
            }
        } else {
            const winsText = `${player.wins || 0} 🏆`;
            const winsFont = getFont(fontSize, '700', podiumSettings.podiumFontFamily || 'Verdana');
            drawText(
                context,
                winsText,
                innerX + innerWidth - 18,
                y,
                winsFont,
                podiumSettings.podiumWinsColor || '#ffe66d',
                'right'
            );
        }
    });
}

function startPodiumAnimation() {
    if (animationFrameId !== null) return;

    function animate() {
        drawPodium();
        animationFrameId = requestAnimationFrame(animate);
    }

    animationFrameId = requestAnimationFrame(animate);
}

function setupPodiumCanvas() {
    podium.innerHTML = '';

    podiumCanvas = document.createElement('canvas');
    podiumCanvas.id = 'podium-canvas';
    podiumCanvas.style.display = 'block';
    podiumCanvas.style.width = '100%';
    podiumCanvas.style.height = '100%';

    podium.appendChild(podiumCanvas);
    podiumContext = podiumCanvas.getContext('2d');

    resizePodiumCanvas();
    startPodiumAnimation();
}

function handleState(state) {
    if (!state) return;

    podiumSettings = { ...podiumSettings, ...(state.settings || {}) };
    const game = state.game || {};
    currentMode = game.podiumMode === 'battle' ? 'battle' : 'classic';
    currentPlayers = game.podium || [];

    drawPodium();
}

setupPodiumCanvas();
window.addEventListener('resize', resizePodiumCanvas);

socket.on('state:init', handleState);
socket.on('state:update', handleState);
socket.on('state', handleState);