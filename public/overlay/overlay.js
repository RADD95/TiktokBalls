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

const canvasWidth = 800;
const canvasHeight = 600;

const balls =
    new Map();

const avatarImages =
    new Map();

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
    chatTextShadow: true
};

let settings = {
    ...defaultSettings
};

let gameState = null;
let lastFrameTime =
    performance.now();

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

function resizeCanvas() {
    canvas.width =
        canvasWidth;

    canvas.height =
        canvasHeight;

    canvas.style.width =
        `${canvasWidth}px`;

    canvas.style.height =
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

function normalizePosition(value) {
    const parsed =
        Number(value);

    if (
        !Number.isFinite(parsed)
    ) {
        return 0.5;
    }

    if (parsed > 1) {
        return parsed / canvasWidth;
    }

    return parsed;
}

function normalizePlayer(player) {
    return {
        ...player,

        x:
            normalizePosition(
                player.x
            ),

        y:
            normalizePosition(
                player.y
            ),

        radius:
            Number(
                player.radius
            ) || 24,

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
        alive: true
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

function renderState(state) {
    if (!state) {
        return;
    }

    settings = {
        ...defaultSettings,
        ...(state.settings || {})
    };

    gameState =
        state.game || state;

    const players =
        state.players ||
        gameState.players ||
        [];

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
            balls.delete(id);
        }
    }

    players.forEach(
        updateBall
    );

    renderLeaderboard(
        players
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

    const title =
        document.createElement(
            'strong'
        );

    title.textContent =
        'Ranking';

    leaderboard.appendChild(
        title
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
            .slice(0, 5);

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

    players
        .slice(0, 5)
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

                const name =
                    document.createElement(
                        'span'
                    );

                name.textContent =
                    getDisplayName(
                        player
                    );

                const wins =
                    document.createElement(
                        'span'
                    );

                wins.textContent =
                    `${player.wins || 0} 🏆`;

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

    for (
        const ball of balls.values()
    ) {
        if (
            ball.alive
        ) {
            drawPlayer(
                ball
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
    resizeCanvas
);

requestAnimationFrame(
    animationLoop
);