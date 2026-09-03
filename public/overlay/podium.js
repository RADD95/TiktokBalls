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

function getPlayerColorConfig(player) {
    const customColor = player?.customColor;
    if (!customColor || typeof customColor !== 'object') {
        return { type: 'solid', color1: podiumSettings.podiumTextColor || '#ffffff', color2: null };
    }
    return {
        type: customColor.type || 'solid',
        color1: customColor.color1 || podiumSettings.podiumTextColor || '#ffffff',
        color2: customColor.color2 || null
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
    } else if (config.type === 'gradient' && config.color1 && config.color2) {
        const gradient = context.createLinearGradient(x, y, x + textWidth, y);
        gradient.addColorStop(0, config.color1);
        gradient.addColorStop(1, config.color2);
        context.fillStyle = gradient;
    } else if (config.type === 'animated' && config.color1 && config.color2) {
        const time = Date.now() / 20;

        const r1 = parseInt(config.color1.slice(1, 3), 16);
        const g1 = parseInt(config.color1.slice(3, 5), 16);
        const b1 = parseInt(config.color1.slice(5, 7), 16);

        const r2 = parseInt(config.color2.slice(1, 3), 16);
        const g2 = parseInt(config.color2.slice(3, 5), 16);
        const b2 = parseInt(config.color2.slice(5, 7), 16);

        const gradient = context.createLinearGradient(x, y, x + textWidth, y);

        for (let index = 0; index <= 6; index += 1) {
            const position = index / 6;
            const shift = (time + index * 60) % 360;

            const r = Math.round(r1 + (r2 - r1) * (Math.sin(shift * Math.PI / 180) + 1) / 2);
            const g = Math.round(g1 + (g2 - g1) * (Math.sin(shift * Math.PI / 180) + 1) / 2);
            const b = Math.round(b1 + (b2 - b1) * (Math.sin(shift * Math.PI / 180) + 1) / 2);

            gradient.addColorStop(position, `rgb(${r}, ${g}, ${b})`);
        }

        context.fillStyle = gradient;
    } else {
        context.fillStyle = config.color1 || '#ffffff';
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
    drawText(context, damage, x + fontSize * 5, y, statsFont, statsColor, 'right');
    drawText(context, hits, x + fontSize * 10, y, statsFont, statsColor, 'right');
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