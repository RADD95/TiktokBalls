const overlayToken = new URLSearchParams(window.location.search).get('token');
const socket = io({
    auth: { token: overlayToken },
    query: { token: overlayToken }
});

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

// --- OPTIMIZACIÓN DE RENDIMIENTO Y ANIMACIÓN ---
let lastFrameTime = performance.now();
let globalAnimTime = 0;

// Caché para evitar el cálculo de métricas de texto (Layout Thrashing) en cada frame
const textWidthCache = new Map();

// Objeto mutable para evitar instanciar basura en memoria en cada frame
const tempRGB1 = { r: 0, g: 0, b: 0 };
const tempRGB2 = { r: 0, g: 0, b: 0 };

function getDisplayName(player) {
    return player.nickname || player.username || player.uniqueId || 'viewer';
}

function getNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function hexToRGB(hexStr, targetObj) {
    if (!hexStr) {
        targetObj.r = 255; targetObj.g = 255; targetObj.b = 255;
        return targetObj;
    }
    const cleanHex = hexStr.replace('#', '').slice(0, 6);
    targetObj.r = parseInt(cleanHex.slice(0, 2), 16) || 0;
    targetObj.g = parseInt(cleanHex.slice(2, 4), 16) || 0;
    targetObj.b = parseInt(cleanHex.slice(4, 6), 16) || 0;
    return targetObj;
}

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
    if (mode === 'battle') return 'Batalla';
    if (mode === 'marbles') return 'Canicas'; // <-- NUEVO
    return 'Clásico';
}

function getFont(size, weight, family) {
    return `${weight} ${size}px ${family}`;
}

// Medición de texto optimizada con Map Caché
function getCachedTextWidth(context, text, font) {
    const key = `${text}_${font}`;
    if (textWidthCache.has(key)) {
        return textWidthCache.get(key);
    }
    context.font = font;
    const width = Math.max(context.measureText(text).width, 1);
    textWidthCache.set(key, width);
    return width;
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
    textWidthCache.clear();
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

    const textWidth = getCachedTextWidth(context, name, font);

    if (config.type === 'rainbow') {
        const time = globalAnimTime * 50;
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

        const timeOffset = (globalAnimTime * 0.5) % 1;
        const gradient = context.createLinearGradient(x, y, x + textWidth, y);

        const steps = 6; // Reducido levemente para acelerar el rasterizado
        for (let i = 0; i <= steps; i++) {
            const pos = i / steps;

            const rawProgress = pos + timeOffset;
            const progress = (rawProgress - Math.floor(rawProgress)) * count;
            
            const idx1 = Math.floor(progress) % count;
            const idx2 = (idx1 + 1) % count;
            const factor = progress - Math.floor(progress);

            hexToRGB(colors[idx1], tempRGB1);
            hexToRGB(colors[idx2], tempRGB2);

            const r = Math.round(tempRGB1.r + (tempRGB2.r - tempRGB1.r) * factor);
            const g = Math.round(tempRGB1.g + (tempRGB2.g - tempRGB1.g) * factor);
            const b = Math.round(tempRGB1.b + (tempRGB2.b - tempRGB1.b) * factor);

            gradient.addColorStop(pos, `rgb(${r},${g},${b})`);
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

function drawMarblesStats(context, player, x, y, fontSize) {
    const statsFont = getFont(fontSize, '700', podiumSettings.podiumFontFamily || 'Verdana');
    const statsColor = podiumSettings.podiumWinsColor || '#ffe66d';

    const wins = `${player.wins || 0} 🏆`;
    const points = `${player.pointsEarned || 0} pts`;

    drawText(context, wins, x, y, statsFont, statsColor, 'right');
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

    const panelPadding = 20;
    const panelMaxWidth = 760;
    const panelWidth = Math.min(panelMaxWidth, viewportWidth - panelPadding * 2);
    const panelX = (viewportWidth - panelWidth) / 2;
    const panelY = panelPadding;

    context.clearRect(0, 0, viewportWidth, viewportHeight);

    const fontSize = getNumber(podiumSettings.podiumFontSize, 26);
    const titleSize = getNumber(podiumSettings.podiumTitleSize, 32);
    const limit = Math.max(1, Math.floor(getNumber(podiumSettings.podiumLimit, 10)));
    const players = currentPlayers.slice(0, limit);

    const rowHeight = showDetailedStats ? fontSize * 2.2 : fontSize * 1.8;
    const headerHeight = titleSize + 50; 
    const contentHeight = players.length > 0 ? players.length * rowHeight : rowHeight;
    const calculatedPanelHeight = headerHeight + contentHeight + panelPadding * 2;

    const panelHeight = Math.min(calculatedPanelHeight, viewportHeight - panelY * 2);

    drawRoundedRect(
        context,
        panelX,
        panelY,
        panelWidth,
        panelHeight,
        16,
        'rgba(0, 0, 0, 0.65)'
    );

    const innerWidth = panelWidth - panelPadding * 2;
    const innerX = panelX + panelPadding;
    const titleFont = getFont(titleSize, '700', podiumSettings.podiumFontFamily || 'Verdana');

    drawText(
        context,
        `🏆 Podio histórico - ${getModeLabel(currentMode)}`,
        innerX + innerWidth / 2,
        panelY + titleSize + 10,
        titleFont,
        podiumSettings.podiumTitleColor || '#ffe66d',
        'center'
    );

    const firstRowY = panelY + headerHeight + rowHeight / 2;
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
            } else if (currentMode === 'marbles') {
                drawMarblesStats(context, player, innerX + innerWidth - 18 - fontSize * 9, y, fontSize);
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

    function animate(currentTime) {
        // Cálculo delta time suave para evitar saltos repentinos
        const deltaTime = (currentTime - lastFrameTime) / 1000;
        lastFrameTime = currentTime;

        // Evita saltos gigantes si el proceso se ralentiza por abrir un juego
        if (deltaTime < 0.25) {
            globalAnimTime += deltaTime;
        }

        drawPodium();
        animationFrameId = requestAnimationFrame(animate);
    }

    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(animate);
}

function setupPodiumCanvas() {
    if (podiumCanvas) return;

    podium.innerHTML = '';

    podiumCanvas = document.createElement('canvas');
    podiumCanvas.id = 'podium-canvas';
    podiumCanvas.style.display = 'block';
    podiumCanvas.style.width = '100%';
    podiumCanvas.style.height = '100%';

    podium.appendChild(podiumCanvas);
    podiumContext = podiumCanvas.getContext('2d', { alpha: true, desynchronized: true });

    resizePodiumCanvas();
    startPodiumAnimation();
}

function handleState(state) {
    if (!state) return;

    podiumSettings = { ...podiumSettings, ...(state.settings || {}) };
    const game = state.game || {};
    
    // <-- NUEVO: Reconocer marbles
    if (game.podiumMode === 'battle') currentMode = 'battle';
    else if (game.podiumMode === 'marbles') currentMode = 'marbles';
    else currentMode = 'classic';

    currentPlayers = game.podium || [];
    textWidthCache.clear();
}

setupPodiumCanvas();
window.addEventListener('resize', resizePodiumCanvas);

socket.on('state:init', handleState);
socket.on('state:update', handleState);
socket.on('state', handleState);