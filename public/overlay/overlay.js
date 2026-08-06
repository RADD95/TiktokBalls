const socket = io();

const arena =
    document.querySelector('#arena');

const leaderboard =
    document.querySelector('#leaderboard');

const canvas =
    document.createElement('canvas');

canvas.id = 'game-canvas';
arena.appendChild(canvas);

const context =
    canvas.getContext('2d', {
        alpha: true,
        desynchronized: true
    });

const balls = new Map();
const avatarImages = new Map();
const pendingEats = new Set();
const pendingWinnerClaims = new Set();

const canvasWidth = 800;
const canvasHeight = 600;

const SPAWN_MARGIN = 18;
const SPAWN_PATH_TIME = 2.2;

let settings = {};
let gameState = null;
let lastFrameTime = performance.now();
let lastCollisionCheck = 0;
let lastWinnerCheck = 0;
let lastTextTime = 0;

const podium =
    document.createElement('aside');

podium.id = 'podium';
podium.className = 'hidden';
document.body.appendChild(podium);

const winnerBanner =
    document.createElement('div');

winnerBanner.id = 'winner-banner';
winnerBanner.className = 'hidden';

winnerBanner.innerHTML = `
    <div class="winner-title">🏆 GANADOR</div>
    <div class="winner-name"></div>
    <div class="winner-wins"></div>
`;

document.body.appendChild(winnerBanner);

const winnerName =
    winnerBanner.querySelector('.winner-name');

const winnerWins =
    winnerBanner.querySelector('.winner-wins');

function resizeCanvas() {
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

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

    context.imageSmoothingEnabled = true;
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

    if (avatarImages.has(url)) {
        return avatarImages.get(url);
    }

    const image = new Image();

    image.referrerPolicy =
        'no-referrer';

    image.src = url;

    avatarImages.set(url, image);

    return image;
}

function distancePixels(
    first,
    second
) {
    const dx =
        (first.x - second.x) * canvasWidth;

    const dy =
        (first.y - second.y) * canvasHeight;

    return Math.sqrt(
        (dx * dx) +
        (dy * dy)
    );
}

function pointToSegmentDistance(
    point,
    first,
    second
) {
    const px =
        point.x * canvasWidth;

    const py =
        point.y * canvasHeight;

    const ax =
        first.x * canvasWidth;

    const ay =
        first.y * canvasHeight;

    const bx =
        second.x * canvasWidth;

    const by =
        second.y * canvasHeight;

    const abx = bx - ax;
    const aby = by - ay;

    const lengthSquared =
        (abx * abx) +
        (aby * aby);

    if (!lengthSquared) {
        return Math.sqrt(
            ((px - ax) ** 2) +
            ((py - ay) ** 2)
        );
    }

    const projection =
        Math.max(
            0,
            Math.min(
                1,
                (
                    ((px - ax) * abx) +
                    ((py - ay) * aby)
                ) / lengthSquared
            )
        );

    const closestX =
        ax + projection * abx;

    const closestY =
        ay + projection * aby;

    return Math.sqrt(
        ((px - closestX) ** 2) +
        ((py - closestY) ** 2)
    );
}

function isSafeSpawn(
    x,
    y,
    radius,
    existingBalls
) {
    const candidate = {
        x,
        y
    };

    for (const ball of existingBalls) {
        if (!ball.alive) {
            continue;
        }

        const other =
            ball.player;

        const otherRadius =
            Number(other.radius) || 24;

        const minimumDistance =
            radius +
            otherRadius +
            SPAWN_MARGIN;

        if (
            distancePixels(
                candidate,
                other
            ) < minimumDistance
        ) {
            return false;
        }

        const seconds =
            SPAWN_PATH_TIME;

        const future = {
            x: Math.max(
                0.03,
                Math.min(
                    0.97,
                    other.x +
                    other.vx *
                    seconds
                )
            ),

            y: Math.max(
                0.04,
                Math.min(
                    0.96,
                    other.y +
                    other.vy *
                    seconds
                )
            )
        };

        if (
            pointToSegmentDistance(
                candidate,
                other,
                future
            ) < minimumDistance
        ) {
            return false;
        }
    }

    return true;
}

function findSafeSpawn(
    player,
    existingBalls
) {
    const radius =
        Number(player.radius) || 24;

    const normalizedRadiusX =
        radius / canvasWidth;

    const normalizedRadiusY =
        radius / canvasHeight;

    const minX =
        0.04 + normalizedRadiusX;

    const maxX =
        0.96 - normalizedRadiusX;

    const minY =
        0.06 + normalizedRadiusY;

    const maxY =
        0.94 - normalizedRadiusY;

    for (let i = 0; i < 80; i += 1) {
        const x =
            minX +
            Math.random() *
            Math.max(0.01, maxX - minX);

        const y =
            minY +
            Math.random() *
            Math.max(0.01, maxY - minY);

        if (
            isSafeSpawn(
                x,
                y,
                radius,
                existingBalls
            )
        ) {
            return {
                x,
                y
            };
        }
    }

    let best = {
        x: player.x || 0.5,
        y: player.y || 0.5
    };

    let bestDistance = -1;

    for (let i = 0; i < 30; i += 1) {
        const x =
            minX +
            Math.random() *
            Math.max(0.01, maxX - minX);

        const y =
            minY +
            Math.random() *
            Math.max(0.01, maxY - minY);

        const candidate = {
            x,
            y
        };

        let nearest = Infinity;

        for (const ball of existingBalls) {
            nearest = Math.min(
                nearest,
                distancePixels(
                    candidate,
                    ball.player
                )
            );
        }

        if (nearest > bestDistance) {
            bestDistance = nearest;
            best = candidate;
        }
    }

    return best;
}

function createBall(player) {
    const spawn =
        findSafeSpawn(
            player,
            [...balls.values()]
        );

    const ball = {
        player: {
            ...player,
            x: spawn.x,
            y: spawn.y
        },

        alive: true,

        message:
            player.message || '',

        messageUntil:
            Number(player.messageUpdatedAt) + 8000 || 0,

        effect: '',
        effectUntil: 0,

        lastWinnerClaim: 0
    };

    balls.set(
        String(player.id),
        ball
    );

    return ball;
}

function renderPlayer(player) {
    const id = String(player.id);
    const ball = balls.get(id);

    if (!ball) {
        createBall(player);
        return;
    }

    const oldPosition = {
        x: ball.player.x,
        y: ball.player.y,
        vx: ball.player.vx,
        vy: ball.player.vy
    };

    ball.player = {
        ...ball.player,
        ...player,
        ...oldPosition
    };

    if (
        player.message &&
        player.messageUpdatedAt
    ) {
        ball.message =
            player.message;

        ball.messageUntil =
            Number(player.messageUpdatedAt) + 8000;
    }
}

function renderState(state) {
    settings = state.settings || {};
    gameState = state.game || null;

    const players =
        state.players || [];

    const activeIds =
        new Set(
            players.map(player =>
                String(player.id)
            )
        );

    for (const id of balls.keys()) {
        if (!activeIds.has(id)) {
            balls.delete(id);
        }
    }

    players.forEach(renderPlayer);

    renderLeaderboard(players);
    renderPodium(
        gameState?.podium || []
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
        balls.get(String(event.userId));

    if (!ball) {
        return;
    }

    ball.player.avatar =
        event.avatar;
}

function renderLeaderboard(players) {
    leaderboard.innerHTML = '';

    if (
        settings.showLeaderboard === false
    ) {
        leaderboard.classList.add('hidden');
        return;
    }

    leaderboard.classList.remove('hidden');

    const title =
        document.createElement('strong');

    title.textContent = 'Ranking';
    leaderboard.appendChild(title);

    players
        .slice(0, 5)
        .forEach((player, index) => {
            const row =
                document.createElement('div');

            row.className = 'row';

            const name =
                document.createElement('span');

            name.textContent =
                `${index + 1}. ${getDisplayName(player)}`;

            const points =
                document.createElement('span');

            points.textContent =
                Math.floor(
                    player.points || 0
                );

            row.appendChild(name);
            row.appendChild(points);
            leaderboard.appendChild(row);
        });
}

function renderPodium(players) {
    podium.innerHTML = '';

    if (
        settings.showPodium === false
    ) {
        podium.classList.add('hidden');
        return;
    }

    podium.classList.remove('hidden');

    const title =
        document.createElement('strong');

    title.textContent =
        '🏆 Podio histórico';

    podium.appendChild(title);

    if (!players.length) {
        const empty =
            document.createElement('div');

        empty.className =
            'podium-empty';

        empty.textContent =
            'Todavía no hay victorias';

        podium.appendChild(empty);
        return;
    }

    players
        .slice(0, 5)
        .forEach((player, index) => {
            const row =
                document.createElement('div');

            row.className =
                'podium-row';

            const position =
                document.createElement('span');

            position.textContent =
                `${index + 1}.`;

            const name =
                document.createElement('span');

            name.textContent =
                getDisplayName(player);

            const wins =
                document.createElement('span');

            wins.textContent =
                `${player.wins || 0} 🏆`;

            row.appendChild(position);
            row.appendChild(name);
            row.appendChild(wins);

            podium.appendChild(row);
        });
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
    activeEffect
) {
    context.save();

    context.globalAlpha =
        activeEffect ? 0.28 : 0.16;

    drawCircle(
        x,
        y,
        radius + (
            activeEffect ? 8 : 5
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

    const drawX =
        Math.round(x - radius);

    const drawY =
        Math.round(y - radius);

    const drawSize =
        Math.round(radius * 2);

    context.save();

    context.beginPath();

    context.arc(
        Math.round(x),
        Math.round(y),
        Math.round(radius),
        0,
        Math.PI * 2
    );

    context.clip();

    context.drawImage(
        image,
        drawX,
        drawY,
        drawSize,
        drawSize
    );

    context.restore();
}

function drawPlayer(ball) {
    const player =
        ball.player;

    const x =
        Math.round(
            player.x * canvasWidth
        );

    const y =
        Math.round(
            player.y * canvasHeight
        );

    const radius =
        Math.round(
            Number(player.radius) || 24
        );

    const color =
        player.color || '#5ee7ff';

    const image =
        getAvatar(
            player.avatar || ''
        );

    const activeEffect =
        ball.effectUntil > Date.now();

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

function truncateText(
    text,
    maxWidth
) {
    const value =
        String(text || '');

    if (
        context.measureText(value).width <=
        maxWidth
    ) {
        return value;
    }

    let result = '';

    for (const character of value) {
        const candidate =
            `${result}${character}…`;

        if (
            context.measureText(candidate).width >
            maxWidth
        ) {
            break;
        }

        result += character;
    }

    return `${result}…`;
}

function wrapText(
    text,
    maxWidth
) {
    const lines = [];
    let line = '';

    for (const character of String(text || '')) {
        const candidate =
            `${line}${character}`;

        if (
            line &&
            context.measureText(candidate).width >
            maxWidth
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

    context.roundRect(
        x,
        y,
        width,
        height,
        radius
    );

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
        'bold 13px Arial';

    context.textAlign =
        'center';

    context.textBaseline =
        'top';

    const text =
        `${getDisplayName(player)} · ${Math.floor(player.points || 0)}`;

    const safeText =
        truncateText(text, 250);

    const textWidth =
        context.measureText(safeText).width;

    const boxWidth =
        Math.round(
            Math.max(
                120,
                Math.min(
                    280,
                    textWidth + 18
                )
            )
        );

    const labelY =
        Math.round(y + radius + 8);

    drawRoundedRect(
        Math.round(x - boxWidth / 2),
        labelY,
        boxWidth,
        24,
        6,
        'rgba(0, 0, 0, 0.72)'
    );

    context.fillStyle =
        '#ffffff';

    context.fillText(
        safeText,
        Math.round(x),
        labelY + 5
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
        !ball.message ||
        ball.messageUntil <= Date.now()
    ) {
        return;
    }

    context.save();

    context.font =
        '13px Arial';

    context.textAlign =
        'center';

    context.textBaseline =
        'middle';

    const maxTextWidth =
        Math.min(
            300,
            canvasWidth - 30
        );

    const lines =
        wrapText(
            ball.message,
            maxTextWidth
        );

    const lineHeight = 17;
    const horizontalPadding = 12;
    const verticalPadding = 8;

    const longestLineWidth =
        Math.max(
            ...lines.map(line =>
                context.measureText(line).width
            )
        );

    const boxWidth =
        Math.round(
            Math.min(
                canvasWidth - 20,
                longestLineWidth +
                horizontalPadding * 2
            )
        );

    const boxHeight =
        Math.round(
            lines.length * lineHeight +
            verticalPadding * 2
        );

    /*
     * El mensaje siempre conserva la posición superior.
     * Si no cabe arriba, se recorta contra el límite superior;
     * nunca se cambia debajo de la bolita.
     */
    const desiredCenterY =
        y - radius - 12 -
        boxHeight / 2;

    const messageCenterY =
        Math.max(
            boxHeight / 2 + 4,
            desiredCenterY
        );

    const boxX =
        Math.round(
            x - boxWidth / 2
        );

    const boxY =
        Math.round(
            messageCenterY -
            boxHeight / 2
        );

    drawRoundedRect(
        boxX,
        boxY,
        boxWidth,
        boxHeight,
        7,
        'rgba(0, 0, 0, 0.82)'
    );

    context.fillStyle =
        '#ffffff';

    lines.forEach((line, index) => {
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
    });

    context.restore();
}

function drawFrame() {
    context.clearRect(
        0,
        0,
        canvasWidth,
        canvasHeight
    );

    for (const ball of balls.values()) {
        drawPlayer(ball);
    }
}

function distance(first, second) {
    return Math.sqrt(
        ((first.x - second.x) ** 2) +
        ((first.y - second.y) ** 2)
    );
}

function canEat(eater, target) {
    if (
        !eater.alive ||
        !target.alive
    ) {
        return false;
    }

    const eaterRadius =
        Number(eater.player.radius) || 24;

    const targetRadius =
        Number(target.player.radius) || 24;

    if (
        eaterRadius <
        targetRadius * 1.15
    ) {
        return false;
    }

    const minDimension =
        Math.min(
            canvasWidth,
            canvasHeight
        );

    const collisionDistance =
        Math.max(
            0.01,
            eaterRadius / minDimension -
            (targetRadius / minDimension) * 0.25
        );

    return distance(
        eater.player,
        target.player
    ) <= collisionDistance;
}

function requestEat(eater, target) {
    const eaterId =
        String(eater.player.id);

    const targetId =
        String(target.player.id);

    const requestId =
        `${eaterId}:${targetId}`;

    if (pendingEats.has(requestId)) {
        return;
    }

    pendingEats.add(requestId);

    socket.emit(
        'game:eat',
        {
            eaterId,
            targetId
        }
    );

    setTimeout(() => {
        pendingEats.delete(requestId);
    }, 2000);
}

function checkCollisions() {
    const aliveBalls =
        [...balls.values()]
            .filter(ball => ball.alive);

    for (
        let i = 0;
        i < aliveBalls.length;
        i += 1
    ) {
        for (
            let j = i + 1;
            j < aliveBalls.length;
            j += 1
        ) {
            const first =
                aliveBalls[i];

            const second =
                aliveBalls[j];

            if (canEat(first, second)) {
                requestEat(first, second);
            } else if (
                canEat(second, first)
            ) {
                requestEat(second, first);
            }
        }
    }
}

function claimWinnerIfLargeEnough(
    ball,
    currentTime
) {
    if (
        !ball ||
        !ball.alive ||
        gameState?.status !== 'playing'
    ) {
        return;
    }

    const playerId =
        String(ball.player.id);

    if (
        pendingWinnerClaims.has(playerId)
    ) {
        return;
    }

    if (
        currentTime -
        ball.lastWinnerClaim <
        1000
    ) {
        return;
    }

    const minDimension =
        Math.min(
            canvasWidth,
            canvasHeight
        );

    const radius =
        Number(ball.player.radius) || 24;

    if (
        radius <
        minDimension * 0.42
    ) {
        return;
    }

    ball.lastWinnerClaim =
        currentTime;

    pendingWinnerClaims.add(
        playerId
    );

    socket.emit(
        'game:claim-win',
        {
            playerId,
            viewportMin: minDimension,
            radius
        }
    );

    setTimeout(() => {
        pendingWinnerClaims.delete(
            playerId
        );
    }, 3000);
}

function showEventMessage(event) {
    if (!event.userId) {
        return;
    }

    const ball =
        balls.get(String(event.userId));

    if (!ball) {
        return;
    }

    if (event.type === 'comment') {
        ball.message =
            event.message ||
            event.comment ||
            '';

        ball.messageUntil =
            Date.now() + 8000;
    }

    if (event.type === 'gift') {
        const giftName =
            event.giftName ||
            event.giftname ||
            'Gift';

        const count =
            event.repeatCount ||
            event.repeatcount ||
            1;

        ball.message =
            `🎁 ${giftName} x${count}`;

        ball.messageUntil =
            Date.now() + 8000;
    }

    if (
        event.type === 'comment' ||
        event.type === 'gift'
    ) {
        ball.effect = 'pop';
        ball.effectUntil =
            Date.now() + 700;
    }
}

function showWinner(winner) {
    winnerName.textContent =
        getDisplayName(winner);

    winnerWins.textContent =
        `${winner.wins || 1} victoria(s)`;

    winnerBanner.classList.remove(
        'hidden'
    );

    const ball =
        balls.get(String(winner.id));

    if (ball) {
        ball.effect = 'eat';
        ball.effectUntil =
            Date.now() + 700;
    }
}

function hideWinner() {
    winnerBanner.classList.add('hidden');
    winnerName.textContent = '';
    winnerWins.textContent = '';
}

function resetLocalRound() {
    pendingEats.clear();
    pendingWinnerClaims.clear();
    hideWinner();
    balls.clear();
}

function updateMovement(currentTime) {
    const elapsed =
        Math.min(
            (currentTime - lastFrameTime) / 1000,
            0.05
        );

    lastFrameTime =
        currentTime;

    const speed =
        Number(settings.speed) || 1;

    for (const ball of balls.values()) {
        if (!ball.alive) {
            continue;
        }

        const player =
            ball.player;

        const radius =
            Number(player.radius) || 24;

        const factor =
            Math.max(
                0.3,
                1 - ((radius - 24) / 240)
            );

        player.x +=
            player.vx *
            elapsed *
            speed *
            factor;

        player.y +=
            player.vy *
            elapsed *
            speed *
            factor;

        const horizontalLimit =
            Math.max(
                0.04,
                radius / canvasWidth
            );

        const verticalLimit =
            Math.max(
                0.07,
                radius / canvasHeight
            );

        if (
            player.x <= horizontalLimit ||
            player.x >= 1 - horizontalLimit
        ) {
            player.vx *= -1;
        }

        if (
            player.y <= verticalLimit ||
            player.y >= 1 - verticalLimit
        ) {
            player.vy *= -1;
        }

        player.x = Math.max(
            horizontalLimit,
            Math.min(
                1 - horizontalLimit,
                player.x
            )
        );

        player.y = Math.max(
            verticalLimit,
            Math.min(
                1 - verticalLimit,
                player.y
            )
        );
    }
}

function animationLoop(currentTime) {
    updateMovement(currentTime);

    if (
        gameState?.status === 'playing' &&
        currentTime - lastCollisionCheck >= 100
    ) {
        lastCollisionCheck =
            currentTime;

        checkCollisions();
    }

    if (
        currentTime - lastWinnerCheck >= 250
    ) {
        lastWinnerCheck =
            currentTime;

        for (const ball of balls.values()) {
            claimWinnerIfLargeEnough(
                ball,
                currentTime
            );
        }
    }

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
    'game:event',
    event => {
        if (
            event?.type === 'avatar-update'
        ) {
            updateAvatar(event);
            return;
        }

        showEventMessage(event);
    }
);

socket.on(
    'game:eaten',
    result => {
        pendingEats.clear();

        if (
            !result?.eaten ||
            !result?.eater
        ) {
            return;
        }

        const eater =
            balls.get(
                String(result.eater.id)
            );

        if (eater) {
            const position = {
                x: eater.player.x,
                y: eater.player.y,
                vx: eater.player.vx,
                vy: eater.player.vy
            };

            eater.player = {
                ...eater.player,
                ...result.eater,
                ...position
            };

            eater.effect = 'eat';
            eater.effectUntil =
                Date.now() + 700;
        }

        if (result.state) {
            renderState(result.state);
        }
    }
);

socket.on(
    'game:win',
    payload => {
        if (payload?.winner) {
            showWinner(
                payload.winner
            );
        }

        if (payload?.state) {
            renderState(
                payload.state
            );
        }
    }
);

socket.on(
    'game:eat-rejected',
    () => {
        pendingEats.clear();
    }
);

socket.on(
    'game:win-rejected',
    () => {
        pendingWinnerClaims.clear();
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

resizeCanvas();

window.addEventListener(
    'resize',
    resizeCanvas
);

requestAnimationFrame(
    animationLoop
);