const socket = io();

const arena =
    document.querySelector('#arena');

const leaderboard =
    document.querySelector('#leaderboard');

const canvas =
    document.createElement('canvas');

canvas.id =
    'game-canvas';

arena.appendChild(
    canvas
);

const context =
    canvas.getContext(
        '2d',
        {
            alpha: true,
            desynchronized: true
        }
    );

let canvasWidth = 800;
let canvasHeight = 600;

const balls =
    new Map();

const avatarImages =
    new Map();

const defeatParticles = [];

const DEFEAT_DURATION =
    650;

const defaultSettings = {
    showNames: true,
    showPoints: true,
    showLeaderboard: true,
    showPodium: true,
    showChat: true,

    nameFontFamily: 'Arial',
    nameFontSize: 14,
    nameFontWeight: '700',
    nameTextColor: '#ffffff',
    nameTextShadow: true,

    chatFontFamily: 'Arial',
    chatFontSize: 16,
    chatFontWeight: '400',
    chatTextColor: '#ffffff',
    chatTextShadow: true,

    rankingLimit: 5,
    rankingFontFamily: 'Arial',
    rankingFontSize: 14,
    rankingFontWeight: '700',
    rankingTextColor: '#ffffff',
    rankingTitleColor: '#5ee7ff',
    rankingPointsColor: '#ffe66d',
    rankingTitleSize: 14,

    podiumLimit: 5,
    podiumFontFamily: 'Arial',
    podiumFontSize: 14,
    podiumFontWeight: '700',
    podiumTextColor: '#ffffff',
    podiumTitleColor: '#ffe66d',
    podiumWinsColor: '#ffe66d',
    podiumTitleSize: 14
};

let settings = {
    ...defaultSettings
};

let gameState = null;
let lastFrameTime =
    performance.now();

let pendingCanvasResize = null;

const podium =
    document.createElement(
        'aside'
    );

podium.id =
    'podium';

podium.className =
    'hidden';

document.body.appendChild(
    podium
);

const winnerBanner =
    document.createElement(
        'div'
    );

winnerBanner.id =
    'winner-banner';

winnerBanner.className =
    'hidden';

winnerBanner.innerHTML = `
    <div class="winner-title">
        🏆 GANADOR
    </div>

    <div class="winner-name"></div>

    <div class="winner-wins"></div>
`;

document.body.appendChild(
    winnerBanner
);

const winnerName =
    winnerBanner.querySelector(
        '.winner-name'
    );

const winnerWins =
    winnerBanner.querySelector(
        '.winner-wins'
    );

function resizeCanvas(
    width = canvasWidth,
    height = canvasHeight
) {
    const nextWidth =
        Math.max(
            320,
            Math.min(
                1920,
                Number(width) || 800
            )
        );

    const nextHeight =
        Math.max(
            240,
            Math.min(
                1920,
                Number(height) || 600
            )
        );

    if (
        nextWidth === canvasWidth &&
        nextHeight === canvasHeight &&
        canvas.width === nextWidth &&
        canvas.height === nextHeight
    ) {
        return;
    }

    canvasWidth =
        nextWidth;

    canvasHeight =
        nextHeight;

    canvas.width =
        canvasWidth;

    canvas.height =
        canvasHeight;

    canvas.style.width =
        `${canvasWidth}px`;

    canvas.style.height =
        `${canvasHeight}px`;

    arena.style.width =
        `${canvasWidth}px`;

    arena.style.height =
        `${canvasHeight}px`;

    context.setTransform(
        1,
        0,
        0,
        1,
        0,
        0
    );

    context.imageSmoothingEnabled =
        true;

    normalizeAllBalls();
    drawFrame();
}

function normalizeAllBalls() {
    for (
        const ball of balls.values()
    ) {
        const player =
            ball.player;

        const currentX =
            Number(
                player.x
            );

        const currentY =
            Number(
                player.y
            );

        if (
            Number.isFinite(currentX)
        ) {
            ball.displayX =
                currentX > 1
                    ? currentX / canvasWidth
                    : currentX;

            ball.targetX =
                ball.displayX;
        }

        if (
            Number.isFinite(currentY)
        ) {
            ball.displayY =
                currentY > 1
                    ? currentY / canvasHeight
                    : currentY;

            ball.targetY =
                ball.displayY;
        }
    }
}

function getDisplayName(player) {
    return (
        player.nickname ||
        player.username ||
        player.uniqueId ||
        'viewer'
    );
}

function getAvatar(url) {
    if (!url) {
        return null;
    }

    if (
        avatarImages.has(url)
    ) {
        return avatarImages.get(
            url
        );
    }

    const image =
        new Image();

    image.referrerPolicy =
        'no-referrer';

    image.onload = () => {
        drawFrame();
    };

    image.onerror = () => {
        avatarImages.delete(
            url
        );
    };

    image.src =
        url;

    avatarImages.set(
        url,
        image
    );

    return image;
}

function normalizePosition(
    value,
    dimension
) {
    const parsed =
        Number(value);

    if (
        !Number.isFinite(parsed)
    ) {
        return 0.5;
    }

    if (parsed > 1) {
        return parsed / dimension;
    }

    return parsed;
}

function normalizePlayer(player) {
    return {
        ...player,

        x:
            normalizePosition(
                player.x,
                canvasWidth
            ),

        y:
            normalizePosition(
                player.y,
                canvasHeight
            ),

        radius:
            Number.isFinite(
                Number(player.radius)
            )
                ? Number(player.radius)
                : 24,

        points:
            Number(
                player.points
            ) || 0
    };
}

function createBall(player) {
    const normalized =
        normalizePlayer(
            player
        );

    const ball = {
        player: normalized,

        targetX:
            normalized.x,

        targetY:
            normalized.y,

        displayX:
            normalized.x,

        displayY:
            normalized.y,

        message:
            normalized.message ||
            '',

        messageUntil:
            Number(
                normalized.messageUpdatedAt
            ) + 8000 || 0,

        effectUntil: 0,
        alive: true,
        defeatStartedAt: 0,
        defeatParticlesCreated: false
    };

    balls.set(
        String(normalized.id),
        ball
    );

    return ball;
}

function updateBall(player) {
    const id =
        String(player.id);

    const normalized =
        normalizePlayer(
            player
        );

    let ball =
        balls.get(id);

    if (!ball) {
        return createBall(
            normalized
        );
    }

    const wasDefeated =
        ball.player.status ===
        'defeated';

    const becomesDefeated =
        settings.gameMode ===
        'battle' &&
        normalized.status ===
        'defeated' &&
        !wasDefeated;

if (
    becomesDefeated
) {
    ball.defeatStartedAt =
        performance.now();

    ball.defeatRadius =
        Number(
            ball.player.radius
        ) || 24;

    ball.defeatParticlesCreated =
        false;

    ball.alive =
        true;
}

    ball.player = {
        ...ball.player,
        ...normalized
    };

    ball.targetX =
        normalized.x;

    ball.targetY =
        normalized.y;

    if (
        normalized.message &&
        normalized.messageUpdatedAt
    ) {
        ball.message =
            normalized.message;

        ball.messageUntil =
            Number(
                normalized.messageUpdatedAt
            ) + 8000;
    }

    return ball;
}

function startBattleDefeat(
    defeatedPlayer
) {
    if (
        !defeatedPlayer ||
        !defeatedPlayer.id
    ) {
        return;
    }


    const id =
        String(
            defeatedPlayer.id
        );


    const normalized =
        normalizePlayer(
            defeatedPlayer
        );


    let ball =
        balls.get(
            id
        );


    if (
        !ball
    ) {
        ball =
            createBall(
                normalized
            );
    }


    /*
     * Conserva la posición que la bolita tenía
     * justo antes de ser eliminada. Si el backend
     * envía la posición, se actualiza; si no, se
     * usa la última posición visible local.
     */
    const currentX =
        Number(
            normalized.x
        );


    const currentY =
        Number(
            normalized.y
        );


    if (
        Number.isFinite(
            currentX
        )
    ) {
        ball.targetX =
            currentX;


        ball.displayX =
            currentX;
    }


    if (
        Number.isFinite(
            currentY
        )
    ) {
        ball.targetY =
            currentY;


        ball.displayY =
            currentY;
    }


    ball.player = {
        ...ball.player,
        ...normalized,

        status:
            'defeated',

        points:
            0
    };


    ball.defeatStartedAt =
        performance.now();


    ball.defeatRadius =
        Math.max(
            24,
            Number(
                defeatedPlayer.previousRadius
            ) ||
            Number(
                ball.player.radius
            ) ||
            24
        );


    ball.defeatParticlesCreated =
        false;


    ball.alive =
        true;
}

function renderState(state) {
    if (!state) {
        return;
    }

    const nextSettings = {
        ...defaultSettings,
        ...(state.settings || {})
    };

    const nextWidth =
        Number(nextSettings.width);

    const nextHeight =
        Number(nextSettings.height);

    if (
        Number.isFinite(nextWidth) &&
        Number.isFinite(nextHeight) &&
        nextWidth > 0 &&
        nextHeight > 0
    ) {
        resizeCanvas(
            nextWidth,
            nextHeight
        );
    }

    settings =
        nextSettings;

    gameState =
        state.game || state;

    const players =
        state.players ||
        gameState.players ||
        [];

        const visiblePlayers =
    players.filter(
        player =>
            !(
                settings.gameMode ===
                    'battle' &&
                player.status ===
                    'defeated'
            )
    );

    const activeIds =
        new Set(
            players.map(
                (player) =>
                    String(player.id)
            )
        );

for (
    const id of balls.keys()
) {
    if (
        !activeIds.has(id)
    ) {
        const ball =
            balls.get(id);

        if (
            ball?.player.status ===
            'defeated' &&
            ball.alive
        ) {
            continue;
        }

        balls.delete(id);
    }
}

    players.forEach(
        updateBall
    );

renderLeaderboard(
    visiblePlayers
);

    renderPodium(
        gameState.podium || []
    );
}

function updateAvatar(event) {
    if (
        !event?.userId ||
        !event?.avatar
    ) {
        return;
    }

    const ball =
        balls.get(
            String(event.userId)
        );

    if (!ball) {
        return;
    }

    ball.player.avatar =
        event.avatar;

    getAvatar(
        event.avatar
    );
}

function updateEventMessage(event) {
    if (
        !event ||
        !event.userId ||
        settings.showChat === false
    ) {
        return;
    }

    const ball =
        balls.get(
            String(event.userId)
        );

    if (!ball) {
        return;
    }

    if (
        event.type === 'comment'
    ) {
        ball.message =
            event.message ||
            event.comment ||
            '';

        ball.messageUntil =
            Date.now() + 8000;
    }

    if (
        event.type === 'gift'
    ) {
        const giftName =
            event.giftName ||
            event.giftname ||
            'Gift';

        const repeatCount =
            event.repeatCount ||
            event.repeatcount ||
            1;

        ball.message =
            `🎁 ${giftName} x${repeatCount}`;

        ball.messageUntil =
            Date.now() + 8000;
    }

    if (
        event.type === 'comment' ||
        event.type === 'gift'
    ) {
        ball.effectUntil =
            Date.now() + 700;
    }
}

function renderLeaderboard(players) {
    if (!leaderboard) {
        return;
    }

    leaderboard.innerHTML =
        '';

    if (
        settings.showLeaderboard === false
    ) {
        leaderboard.classList.add(
            'hidden'
        );

        return;
    }

    leaderboard.classList.remove(
        'hidden'
    );

    leaderboard.style.setProperty(
        '--ranking-font-family',
        settings.rankingFontFamily ||
        'Arial'
    );

    leaderboard.style.setProperty(
        '--ranking-font-size',
        `${Number(
            settings.rankingFontSize
        ) || 14}px`
    );

    leaderboard.style.setProperty(
        '--ranking-font-weight',
        settings.rankingFontWeight ||
        '700'
    );

    leaderboard.style.setProperty(
        '--ranking-text-color',
        settings.rankingTextColor ||
        '#ffffff'
    );

    leaderboard.style.setProperty(
        '--ranking-title-color',
        settings.rankingTitleColor ||
        '#5ee7ff'
    );

    leaderboard.style.setProperty(
        '--ranking-points-color',
        settings.rankingPointsColor ||
        '#ffe66d'
    );

    leaderboard.style.setProperty(
        '--ranking-title-size',
        `${Number(
            settings.rankingTitleSize
        ) || 14}px`
    );

    const title =
        document.createElement(
            'strong'
        );

    title.textContent =
        'Ranking';



    leaderboard.appendChild(
        title
    );

    const limit =
        Math.max(
            1,
            Math.floor(
                Number(
                    settings.rankingLimit
                ) || 5
            )
        );

    const sortedPlayers =
        [...players]
            .sort(
                (first, second) =>
                    Number(
                        second.points || 0
                    ) -
                    Number(
                        first.points || 0
                    )
            )
            .slice(
                0,
                limit
            );

    sortedPlayers.forEach(
        (player, index) => {
            const row =
                document.createElement(
                    'div'
                );

            row.className =
                'row';

            const name =
                document.createElement(
                    'span'
                );

            name.textContent =
                `${index + 1}. ` +
                getDisplayName(player);

            name.style.color =
                settings.rankingTextColor ||
                '#ffffff';

            const points =
                document.createElement(
                    'span'
                );

            points.textContent =
                Math.floor(
                    Number(
                        player.points || 0
                    )
                );

            points.style.color =
                settings.rankingPointsColor ||
                '#ffe66d';

            row.appendChild(
                name
            );

            row.appendChild(
                points
            );

            leaderboard.appendChild(
                row
            );
        }
    );
}

function renderPodium(players) {
    podium.innerHTML =
        '';

    if (
        settings.showPodium === false
    ) {
        podium.classList.add(
            'hidden'
        );

        return;
    }

    podium.classList.remove(
        'hidden'
    );

    podium.style.setProperty(
        '--podium-font-family',
        settings.podiumFontFamily ||
        'Arial'
    );

    podium.style.setProperty(
        '--podium-font-size',
        `${Number(
            settings.podiumFontSize
        ) || 14}px`
    );

    podium.style.setProperty(
        '--podium-font-weight',
        settings.podiumFontWeight ||
        '700'
    );

    podium.style.setProperty(
        '--podium-text-color',
        settings.podiumTextColor ||
        '#ffffff'
    );

    podium.style.setProperty(
        '--podium-title-color',
        settings.podiumTitleColor ||
        '#ffe66d'
    );

    podium.style.setProperty(
        '--podium-wins-color',
        settings.podiumWinsColor ||
        '#ffe66d'
    );

    podium.style.setProperty(
        '--podium-title-size',
        `${Number(
            settings.podiumTitleSize
        ) || 14}px`
    );

    const title =
        document.createElement(
            'strong'
        );

    title.textContent =
        '🏆 Podio histórico';


    podium.appendChild(
        title
    );

    if (
        !players ||
        !players.length
    ) {
        const empty =
            document.createElement(
                'div'
            );

        empty.className =
            'podium-empty';

        empty.textContent =
            'Todavía no hay victorias';

        podium.appendChild(
            empty
        );

        return;
    }

    const limit =
        Math.max(
            1,
            Math.floor(
                Number(
                    settings.podiumLimit
                ) || 5
            )
        );

    players
        .slice(
            0,
            limit
        )
        .forEach(
            (player, index) => {
                const row =
                    document.createElement(
                        'div'
                    );

                row.className =
                    'podium-row';

                const position =
                    document.createElement(
                        'span'
                    );

                position.textContent =
                    `${index + 1}.`;

                position.style.color =
                    settings.podiumWinsColor ||
                    '#ffe66d';

                const name =
                    document.createElement(
                        'span'
                    );

                name.textContent =
                    getDisplayName(
                        player
                    );

                name.style.color =
                    settings.podiumTextColor ||
                    '#ffffff';

                const wins =
                    document.createElement(
                        'span'
                    );

                wins.textContent =
                    `${player.wins || 0} 🏆`;

                wins.style.color =
                    settings.podiumWinsColor ||
                    '#ffe66d';

                row.appendChild(
                    position
                );

                row.appendChild(
                    name
                );

                row.appendChild(
                    wins
                );

                podium.appendChild(
                    row
                );
            }
        );
}

function getNameFont() {
    const family =
        settings.nameFontFamily ||
        'Arial';

    const size =
        Number(
            settings.nameFontSize
        ) || 14;

    const weight =
        settings.nameFontWeight ||
        '700';

    return (
        `${weight} ${size}px "${family}"`
    );
}

function getChatFont() {
    const family =
        settings.chatFontFamily ||
        'Arial';

    const size =
        Number(
            settings.chatFontSize
        ) || 16;

    const weight =
        settings.chatFontWeight ||
        '400';

    return (
        `${weight} ${size}px "${family}"`
    );
}

function applyTextShadow(enabled) {
    if (enabled) {
        context.shadowColor =
            '#000000';

        context.shadowBlur =
            5;

        context.shadowOffsetX =
            0;

        context.shadowOffsetY =
            2;

        return;
    }

    context.shadowColor =
        'transparent';

    context.shadowBlur =
        0;

    context.shadowOffsetX =
        0;

    context.shadowOffsetY =
        0;
}

function drawCircle(
    x,
    y,
    radius,
    color
) {
    context.beginPath();

    context.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
    );

    context.fillStyle =
        color;

    context.fill();
}

function drawGlow(
    x,
    y,
    radius,
    color,
    active
) {
    context.save();

    context.globalAlpha =
        active
            ? 0.3
            : 0.16;

    drawCircle(
        x,
        y,
        radius + (
            active
                ? 9
                : 5
        ),
        color
    );

    context.restore();
}

function drawAvatar(
    image,
    x,
    y,
    radius
) {
    if (
        !image ||
        !image.complete ||
        image.naturalWidth <= 0
    ) {
        return;
    }

    context.save();

    context.beginPath();

    context.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
    );

    context.clip();

    context.drawImage(
        image,
        x - radius,
        y - radius,
        radius * 2,
        radius * 2
    );

    context.restore();
}

function truncateText(
    value,
    maximumWidth
) {
    const text =
        String(value || '');

    if (
        context.measureText(text)
            .width <= maximumWidth
    ) {
        return text;
    }

    let result =
        '';

    for (
        const character of text
    ) {
        const candidate =
            `${result}${character}…`;

        if (
            context.measureText(
                candidate
            ).width > maximumWidth
        ) {
            break;
        }

        result +=
            character;
    }

    return `${result}…`;
}

function wrapText(
    value,
    maximumWidth
) {
    const lines = [];
    let line = '';

    for (
        const character of String(value || '')
    ) {
        const candidate =
            `${line}${character}`;

        if (
            line &&
            context.measureText(
                candidate
            ).width > maximumWidth
        ) {
            lines.push(line);
            line = character;
        } else {
            line = candidate;
        }
    }

    if (line) {
        lines.push(line);
    }

    return lines.length
        ? lines
        : [''];
}

function drawRoundedRect(
    x,
    y,
    width,
    height,
    radius,
    color
) {
    context.beginPath();

    if (
        typeof context.roundRect ===
        'function'
    ) {
        context.roundRect(
            x,
            y,
            width,
            height,
            radius
        );
    } else {
        context.moveTo(
            x + radius,
            y
        );

        context.lineTo(
            x + width - radius,
            y
        );

        context.quadraticCurveTo(
            x + width,
            y,
            x + width,
            y + radius
        );

        context.lineTo(
            x + width,
            y + height - radius
        );

        context.quadraticCurveTo(
            x + width,
            y + height,
            x + width - radius,
            y + height
        );

        context.lineTo(
            x + radius,
            y + height
        );

        context.quadraticCurveTo(
            x,
            y + height,
            x,
            y + height - radius
        );

        context.lineTo(
            x,
            y + radius
        );

        context.quadraticCurveTo(
            x,
            y,
            x + radius,
            y
        );
    }

    context.fillStyle =
        color;

    context.fill();
}

function drawPlayerName(
    player,
    x,
    y,
    radius
) {
    if (
        settings.showNames === false
    ) {
        return;
    }

    context.save();

    context.font =
        getNameFont();

    context.textAlign =
        'center';

    context.textBaseline =
        'top';

    context.fillStyle =
        settings.nameTextColor ||
        '#ffffff';

    applyTextShadow(
        settings.nameTextShadow !== false
    );

    const displayName =
        getDisplayName(
            player
        );

    const points =
        Math.floor(
            Number(
                player.points || 0
            )
        );

    const text =
        settings.showPoints === false
            ? displayName
            : `${displayName} · ${points}`;

    const safeText =
        truncateText(
            text,
            280
        );

    const textWidth =
        context.measureText(
            safeText
        ).width;

    const fontSize =
        Number(
            settings.nameFontSize
        ) || 14;

    const boxWidth =
        Math.max(
            110,
            Math.min(
                300,
                textWidth + 18
            )
        );

    const boxHeight =
        Math.max(
            24,
            fontSize + 11
        );

    const boxY =
        Math.round(
            y + radius + 8
        );

    drawRoundedRect(
        Math.round(
            x - boxWidth / 2
        ),
        boxY,
        Math.round(boxWidth),
        Math.round(boxHeight),
        6,
        'rgba(0, 0, 0, 0.72)'
    );

    context.fillStyle =
        settings.nameTextColor ||
        '#ffffff';

    context.fillText(
        safeText,
        Math.round(x),
        boxY + 5
    );

    context.restore();
}

function drawPlayerMessage(
    ball,
    x,
    y,
    radius
) {
    if (
        settings.showChat === false ||
        !ball.message ||
        ball.messageUntil <= Date.now()
    ) {
        return;
    }

    context.save();

    context.font =
        getChatFont();

    context.textAlign =
        'center';

    context.textBaseline =
        'middle';

    context.fillStyle =
        settings.chatTextColor ||
        '#ffffff';

    applyTextShadow(
        settings.chatTextShadow !== false
    );

    const lines =
        wrapText(
            ball.message,
            Math.min(
                340,
                canvasWidth - 30
            )
        );

    const fontSize =
        Number(
            settings.chatFontSize
        ) || 16;

    const lineHeight =
        Math.max(
            17,
            fontSize + 4
        );

    const horizontalPadding =
        12;

    const verticalPadding =
        8;

    const longestLineWidth =
        Math.max(
            ...lines.map(
                (line) =>
                    context.measureText(
                        line
                    ).width
            )
        );

    const boxWidth =
        Math.min(
            canvasWidth - 20,
            longestLineWidth +
            horizontalPadding * 2
        );

    const boxHeight =
        lines.length *
        lineHeight +
        verticalPadding * 2;

    const centerY =
        Math.max(
            boxHeight / 2 + 4,
            y -
            radius -
            14 -
            boxHeight / 2
        );

    const boxX =
        x - boxWidth / 2;

    const boxY =
        centerY - boxHeight / 2;

    drawRoundedRect(
        Math.round(boxX),
        Math.round(boxY),
        Math.round(boxWidth),
        Math.round(boxHeight),
        7,
        'rgba(0, 0, 0, 0.84)'
    );

    context.fillStyle =
        settings.chatTextColor ||
        '#ffffff';

    lines.forEach(
        (line, index) => {
            const lineY =
                boxY +
                verticalPadding +
                lineHeight / 2 +
                index * lineHeight;

            context.fillText(
                line,
                Math.round(x),
                Math.round(lineY)
            );
        }
    );

    context.restore();
}

function createDefeatParticles(
    ball,
    x,
    y,
    radius
) {
    if (
        ball.defeatParticlesCreated
    ) {
        return;
    }

    ball.defeatParticlesCreated =
        true;

    const color =
        ball.player.color ||
        '#5ee7ff';

    for (
        let index = 0;
        index < 14;
        index += 1
    ) {
        const angle =
            Math.random() *
            Math.PI *
            2;

        const speed =
            70 +
            Math.random() * 130;

        defeatParticles.push({
            x,
            y,
            vx:
                Math.cos(angle) *
                speed,

            vy:
                Math.sin(angle) *
                speed,

            radius:
                2 +
                Math.random() * 4,

            color,
            startedAt:
                performance.now(),

            duration:
                450 +
                Math.random() * 200
        });
    }
}

function drawDefeatParticles() {
    const now =
        performance.now();

    for (
        let index =
            defeatParticles.length - 1;
        index >= 0;
        index -= 1
    ) {
        const particle =
            defeatParticles[index];

        const progress =
            Math.min(
                1,
                (
                    now -
                    particle.startedAt
                ) /
                particle.duration
            );

        if (
            progress >= 1
        ) {
            defeatParticles.splice(
                index,
                1
            );

            continue;
        }

        const seconds =
            1 / 60;

        particle.x +=
            particle.vx *
            seconds;

        particle.y +=
            particle.vy *
            seconds;

        particle.vy +=
            120 *
            seconds;

        context.save();

        context.globalAlpha =
            1 - progress;

        drawCircle(
            particle.x,
            particle.y,
            particle.radius *
            (
                1 - progress
            ),
            particle.color
        );

        context.restore();
    }
}

function drawDefeatedPlayer(
    ball
) {
    const player =
        ball.player;

    const x =
        Math.round(
            ball.displayX *
            canvasWidth
        );

    const y =
        Math.round(
            ball.displayY *
            canvasHeight
        );

const originalRadius =
    Math.max(
        24,
        Number(
            ball.defeatRadius
        ) || 24
    );

    const elapsed =
        performance.now() -
        ball.defeatStartedAt;

    const progress =
        Math.min(
            1,
            elapsed /
            DEFEAT_DURATION
        );

    if (
        progress >= 1
    ) {
        ball.alive =
            false;

        return;
    }

    if (
        !ball.defeatParticlesCreated
    ) {
        createDefeatParticles(
            ball,
            x,
            y,
            originalRadius
        );
    }

    const popProgress =
        Math.min(
            1,
            progress / 0.18
        );

    const shrinkProgress =
        Math.max(
            0,
            (
                progress - 0.18
            ) /
            0.82
        );

    const popScale =
        1 +
        Math.sin(
            popProgress *
            Math.PI
        ) *
        0.18;

    const scale =
        popScale *
        (
            1 -
            shrinkProgress
        );

    const radius =
        Math.max(
            1,
            originalRadius *
            scale
        );

    context.save();

    context.globalAlpha =
        1 - progress;

    drawGlow(
        x,
        y,
        radius,
        player.color ||
        '#5ee7ff',
        true
    );

    drawCircle(
        x,
        y,
        radius,
        player.color ||
        '#5ee7ff'
    );

    context.font =
        '900 24px Arial';

    context.textAlign =
        'center';

    context.textBaseline =
        'middle';

    context.fillStyle =
        '#ff3b3b';

    context.fillText(
        '💥',
        x,
        y
    );

    context.restore();
}

function drawPlayer(ball) {
    const player =
        ball.player;

    const x =
        Math.round(
            ball.displayX *
            canvasWidth
        );

    const y =
        Math.round(
            ball.displayY *
            canvasHeight
        );

    const radius =
        Math.round(
            Number(
                player.radius
            ) || 24
        );

    const color =
        player.color ||
        '#5ee7ff';

    const image =
        getAvatar(
            player.avatar || ''
        );

    const activeEffect =
        ball.effectUntil >
        Date.now();

    drawGlow(
        x,
        y,
        radius,
        color,
        activeEffect
    );

    drawCircle(
        x,
        y,
        radius,
        color
    );

    drawAvatar(
        image,
        x,
        y,
        radius
    );

    drawPlayerName(
        player,
        x,
        y,
        radius
    );

    drawPlayerMessage(
        ball,
        x,
        y,
        radius
    );
}

function interpolateBalls(
    deltaTime
) {
    const factor =
        Math.min(
            1,
            deltaTime * 10
        );

    for (
        const ball of balls.values()
    ) {
        ball.displayX +=
            (
                ball.targetX -
                ball.displayX
            ) * factor;

        ball.displayY +=
            (
                ball.targetY -
                ball.displayY
            ) * factor;
    }
}

function drawFrame() {
    context.clearRect(
        0,
        0,
        canvasWidth,
        canvasHeight
    );


    const drawableBalls =
        [
            ...balls.values()
        ]
            .filter(
                (ball) =>
                    ball.alive
            )
            .sort(
                (first, second) => {
                    const firstRadius =
                        Number(
                            first.player.radius
                        ) || 24;


                    const secondRadius =
                        Number(
                            second.player.radius
                        ) || 24;


                    /*
                     * Las bolas grandes se dibujan primero,
                     * en el fondo. Las pequeñas se dibujan
                     * después, por encima.
                     */
                    return (
                        secondRadius -
                        firstRadius
                    );
                }
            );


    for (
        const ball of drawableBalls
    ) {
        if (
            settings.gameMode ===
            'battle' &&
            ball.player.status ===
            'defeated'
        ) {
            drawDefeatedPlayer(
                ball
            );


            continue;
        }


        drawPlayer(
            ball
        );
    }


    /*
     * Las partículas se dibujan después de todas las bolas,
     * para que la explosión nunca quede detrás de una gigante.
     */
    drawDefeatParticles();


    for (
        const [id, ball] of balls.entries()
    ) {
        if (
            !ball.alive
        ) {
            balls.delete(
                id
            );
        }
    }
}

function showWinner(winner) {
    if (!winner) {
        return;
    }

    winnerName.textContent =
        getDisplayName(
            winner
        );

    winnerWins.textContent =
        `${winner.wins || 1} victoria(s)`;

    winnerBanner.classList.remove(
        'hidden'
    );
}

function resetLocalRound() {
    balls.clear();

defeatParticles.length =
    0;

    winnerBanner.classList.add(
        'hidden'
    );

    winnerName.textContent =
        '';

    winnerWins.textContent =
        '';
}

function animationLoop(currentTime) {
    const deltaTime =
        Math.min(
            (
                currentTime -
                lastFrameTime
            ) / 1000,
            0.05
        );

    lastFrameTime =
        currentTime;

    interpolateBalls(
        deltaTime
    );

    drawFrame();

    requestAnimationFrame(
        animationLoop
    );
}

socket.on(
    'arena:resize',
    (size) => {
        pendingCanvasResize = {
            width:
                size.width,

            height:
                size.height
        };

        resizeCanvas(
            pendingCanvasResize.width,
            pendingCanvasResize.height
        );

        pendingCanvasResize = null;
    }
);

socket.on(
    'state:init',
    renderState
);

socket.on(
    'state:update',
    renderState
);

socket.on(
    'state',
    renderState
);

socket.on(
    'game:event',
    (event) => {
        if (
            event?.type ===
            'avatar-update'
        ) {
            updateAvatar(
                event
            );

            return;
        }

        updateEventMessage(
            event
        );
    }
);

socket.on(
    'game:eaten',
    (result) => {
        if (
            result?.state
        ) {
            renderState(
                result.state
            );
        }

        const eaterId =
            result?.eater?.id;

        if (!eaterId) {
            return;
        }

        const ball =
            balls.get(
                String(eaterId)
            );

        if (ball) {
            ball.effectUntil =
                Date.now() + 700;
        }
    }
);

socket.on(
    'game:battle-hit',
    (result) => {
        const defeatedPlayers =
            result?.defeated || [];


        for (
            const defeatedPlayer of
            defeatedPlayers
        ) {
            startBattleDefeat(
                defeatedPlayer
            );
        }


        if (
            result?.state
        ) {
            renderState(
                result.state
            );
        }
    }
);

socket.on(
    'game:battle-draw',
    (result) => {
        if (
            result?.state
        ) {
            renderState(
                result.state
            );
        }
    }
);

socket.on(
    'game:win',
    (payload) => {
        if (
            payload?.winner
        ) {
            showWinner(
                payload.winner
            );
        }

        if (
            payload?.state
        ) {
            renderState(
                payload.state
            );
        }
    }
);

socket.on(
    'game:round-reset',
    resetLocalRound
);

socket.on(
    'game:reset',
    resetLocalRound
);

socket.on(
    'connect',
    () => {
        console.log(
            '[Overlay] Socket conectado'
        );
    }
);

socket.on(
    'disconnect',
    () => {
        console.log(
            '[Overlay] Socket desconectado'
        );
    }
);

resizeCanvas();

window.addEventListener(
    'resize',
    () => {
        resizeCanvas(
            canvasWidth,
            canvasHeight
        );
    }
);

requestAnimationFrame(
    animationLoop
);