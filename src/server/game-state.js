const crypto = require('crypto');

const {
    get
} = require('./settings');

const {
    key
} = require('./points');

const players =
    new Map();

const eliminatedPlayers =
    new Set();

const wins =
    new Map();

const roundParticipants =
    new Set();

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

let roundNumber = 1;
let roundStatus = 'playing';
let currentWinner = null;

const colors = [
    '#00ffff',
    '#ff00ff',
    '#ffff00',
    '#00ff00',
    '#ff8c00',
    '#ff1493',
    '#00bfff',
    '#7cfc00',
    '#ffd700',
    '#dc143c',
    '#8a2be2',
    '#00ff7f',
    '#ff69b4',
    '#40e0d0',
    '#ff4500',
    '#9400d3'
];

function number(value, fallback = 0) {
    const parsed =
        Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : fallback;
}

function clamp(value, minimum, maximum) {
    return Math.max(
        minimum,
        Math.min(maximum, value)
    );
}

function getColor(id) {
    const hash =
        crypto
            .createHash('md5')
            .update(String(id))
            .digest()[0];

    return colors[
        hash % colors.length
    ];
}

function calculateRadius(points, settings) {
    const baseRadius =
        Number(settings.baseRadius) || 24;

    const pointsPerRadius =
        Number(settings.pointsPerRadius) || 4;

    const maxRadius =
        Number(settings.maxRadius);

    const growth =
        Math.sqrt(
            Math.max(0, points) /
            pointsPerRadius
        ) * 12;

    const calculatedRadius =
        baseRadius + growth;

    if (
        !Number.isFinite(maxRadius) ||
        maxRadius <= 0
    ) {
        return calculatedRadius;
    }

    return Math.min(
        calculatedRadius,
        maxRadius
    );
}

function getMessageFromEvent(event) {
    if (
        event.type === 'comment'
    ) {
        return (
            event.message ||
            event.comment ||
            ''
        );
    }

    if (
        event.type === 'gift'
    ) {
        const giftName =
            event.giftName ||
            event.giftname ||
            'Gift';

        const repeatCount =
            number(
                event.repeatCount ||
                event.repeatcount,
                1
            );

        return (
            `🎁 ${giftName} ` +
            `x${repeatCount}`
        );
    }

    return '';
}

function getDisplayName(player) {
    return (
        player.nickname ||
        player.username ||
        player.uniqueId ||
        'viewer'
    );
}

function getPlayerId(event) {
    return String(
        key(event)
    );
}

function createPlayer(event, settings) {
    const playerId =
        getPlayerId(event);

    return {
        id: playerId,

        userId:
            String(
                event.userId ||
                event.uniqueId ||
                event.username ||
                playerId
            ),

        uniqueId:
            String(
                event.uniqueId ||
                event.username ||
                playerId
            ),

        username:
            event.username ||
            event.uniqueId ||
            'viewer',

        nickname:
            event.nickname ||
            event.username ||
            event.uniqueId ||
            'viewer',

        avatar:
            event.avatar ||
            '',

        points: 0,

        radius:
            number(
                settings.baseRadius,
                24
            ),

        color:
            getColor(playerId),

        x:
            0.12 +
            Math.random() *
            0.76,

        y:
            0.12 +
            Math.random() *
            0.76,

        vx:
            (
                Math.random() > 0.5
                    ? 1
                    : -1
            ) *
            (
                0.07 +
                Math.random() *
                0.12
            ),

        vy:
            (
                Math.random() > 0.5
                    ? 1
                    : -1
            ) *
            (
                0.07 +
                Math.random() *
                0.12
            ),

        message: '',
        messageUpdatedAt: 0,
        lastEventType: null,
        lastGiftName: '',
        lastEventAt: Date.now()
    };
}

function add(event, earnedPoints) {
    if (
        roundStatus !== 'playing'
    ) {
        return null;
    }

    const settings =
        get();

    const playerId =
        getPlayerId(event);

    if (
        eliminatedPlayers.has(playerId)
    ) {
        eliminatedPlayers.delete(
            playerId
        );
    }

    let player =
        players.get(playerId);

    if (!player) {
        player =
            createPlayer(
                event,
                settings
            );

        players.set(
            playerId,
            player
        );

        roundParticipants.add(
            playerId
        );
    }

    player.points +=
        number(
            earnedPoints,
            0
        );

    player.username =
        event.username ||
        event.uniqueId ||
        player.username;

    player.nickname =
        event.nickname ||
        player.nickname ||
        player.username;

    player.uniqueId =
        event.uniqueId ||
        player.uniqueId;

    if (event.userId) {
        player.userId =
            String(event.userId);
    }

    if (event.avatar) {
        player.avatar =
            event.avatar;
    }

    const message =
        getMessageFromEvent(event);

    if (message) {
        player.message =
            message;

        player.messageUpdatedAt =
            Date.now();
    }

    player.lastEventType =
        event.type;

    player.lastEventAt =
        Date.now();

    if (
        event.type === 'gift'
    ) {
        player.lastGiftName =
            event.giftName ||
            event.giftname ||
            'Gift';
    }

const calculatedRadius =
    calculateRadius(
        player.points,
        settings
    );

const currentRadius =
    number(
        player.radius,
        number(
            settings.baseRadius,
            24
        )
    );

player.radius =
    Math.max(
        currentRadius,
        calculatedRadius
    );

    return player;
}

function list() {
    return [
        ...players.values()
    ]
        .sort(
            (first, second) =>
                second.points -
                first.points
        );
}

function getPodium() {
    return [
        ...wins.entries()
    ]
        .map(([id, data]) => ({
            id,

            username:
                data.username,

            nickname:
                data.nickname,

            avatar:
                data.avatar,

            wins:
                data.wins
        }))
        .sort(
            (first, second) =>
                second.wins -
                first.wins
        )
        .slice(0, 10);
}

function registerWinner(player) {
    const playerId =
        String(player.id);

    const previous =
        wins.get(playerId) || {
            username:
                player.username,

            nickname:
                player.nickname,

            avatar:
                player.avatar || '',

            wins: 0
        };

    previous.username =
        player.username;

    previous.nickname =
        player.nickname;

    previous.avatar =
        player.avatar ||
        previous.avatar;

    previous.wins += 1;

    wins.set(
        playerId,
        previous
    );

    currentWinner = {
        id: playerId,

        userId:
            player.userId,

        username:
            player.username,

        nickname:
            getDisplayName(player),

        avatar:
            player.avatar || '',

        points:
            player.points,

        radius:
            player.radius,

        wins:
            previous.wins
    };

    roundStatus =
        'finished';

    return currentWinner;
}

function distanceBetween(first, second) {
    const dx =
        (
            first.x -
            second.x
        ) *
        CANVAS_WIDTH;

    const dy =
        (
            first.y -
            second.y
        ) *
        CANVAS_HEIGHT;

    return Math.sqrt(
        dx * dx +
        dy * dy
    );
}

function canEat(eater, target) {
    if (
        !eater ||
        !target ||
        eater.id === target.id
    ) {
        return false;
    }

    const eaterRadius =
        number(
            eater.radius,
            24
        );

    const targetRadius =
        number(
            target.radius,
            24
        );

    if (
        eaterRadius <
        targetRadius * 1.15
    ) {
        return false;
    }

    const collisionDistance =
        eaterRadius +
        targetRadius;

    return (
        distanceBetween(
            eater,
            target
        ) <= collisionDistance
    );
}

function consume(eaterId, targetId) {
    if (
        roundStatus !== 'playing'
    ) {
        return {
            ok: false,
            reason: 'round_finished'
        };
    }

    const eater =
        players.get(
            String(eaterId)
        );

    const target =
        players.get(
            String(targetId)
        );

    if (
        !eater ||
        !target
    ) {
        return {
            ok: false,
            reason: 'player_not_found'
        };
    }

    if (
        eater.id === target.id
    ) {
        return {
            ok: false,
            reason: 'same_player'
        };
    }

    if (
        !canEat(eater, target)
    ) {
        return {
            ok: false,
            reason: 'collision_not_valid'
        };
    }

    const eaterRadius =
        number(
            eater.radius,
            24
        );

    const targetRadius =
        number(
            target.radius,
            24
        );

    const targetPoints =
        number(
            target.points,
            0
        );

    eater.radius =
        Math.sqrt(
            eaterRadius *
            eaterRadius +
            targetRadius *
            targetRadius
        );

    eater.points +=
        targetPoints;

    eater.message =
        `💥 Comió a ` +
        getDisplayName(target);

    eater.messageUpdatedAt =
        Date.now();

    eater.lastEventType =
        'eat';

    eater.lastEventAt =
        Date.now();

    players.delete(
        target.id
    );

    eliminatedPlayers.add(
        target.id
    );

    let winner = null;

    if (
        players.size === 1 &&
        roundParticipants.size >= 2
    ) {
        winner =
            registerWinner(
                eater
            );
    }

    return {
        ok: true,

        eater: {
            ...eater
        },

        eaten: {
            id:
                target.id,

            username:
                target.username,

            nickname:
                target.nickname,

            points:
                target.points
        },

        winner,

        state:
            snapshot()
    };
}

function movePlayer(player, deltaSeconds) {
    const settings =
        get();

    const speed =
        number(
            settings.speed,
            1
        );

    const radius =
        number(
            player.radius,
            24
        );

    const normalizedRadiusX =
        radius / CANVAS_WIDTH;

    const normalizedRadiusY =
        radius / CANVAS_HEIGHT;

    player.x +=
        player.vx *
        deltaSeconds *
        speed;

    player.y +=
        player.vy *
        deltaSeconds *
        speed;

    const minX =
        Math.max(
            0.02,
            normalizedRadiusX
        );

    const maxX =
        Math.min(
            0.98,
            1 - normalizedRadiusX
        );

    const minY =
        Math.max(
            0.03,
            normalizedRadiusY
        );

    const maxY =
        Math.min(
            0.97,
            1 - normalizedRadiusY
        );

    if (
        player.x <= minX ||
        player.x >= maxX
    ) {
        player.vx *= -1;
    }

    if (
        player.y <= minY ||
        player.y >= maxY
    ) {
        player.vy *= -1;
    }

    player.x =
        clamp(
            player.x,
            minX,
            maxX
        );

    player.y =
        clamp(
            player.y,
            minY,
            maxY
        );
}

function findCollisionPairs() {
    const activePlayers =
        list();

    const collisions = [];

    for (
        let firstIndex = 0;
        firstIndex < activePlayers.length;
        firstIndex += 1
    ) {
        for (
            let secondIndex =
                firstIndex + 1;
            secondIndex < activePlayers.length;
            secondIndex += 1
        ) {
            const first =
                activePlayers[firstIndex];

            const second =
                activePlayers[secondIndex];

            if (
                canEat(first, second)
            ) {
                collisions.push({
                    eaterId: first.id,
                    targetId: second.id
                });

                continue;
            }

            if (
                canEat(second, first)
            ) {
                collisions.push({
                    eaterId: second.id,
                    targetId: first.id
                });
            }
        }
    }

    return collisions;
}

function tick(deltaSeconds = 0.05) {
    if (
        roundStatus !== 'playing'
    ) {
        return {
            eaten: [],
            winners: []
        };
    }

    const safeDelta =
        Math.min(
            0.1,
            Math.max(
                0,
                number(
                    deltaSeconds,
                    0.05
                )
            )
        );

    for (
        const player of players.values()
    ) {
        movePlayer(
            player,
            safeDelta
        );
    }

    const collisions =
        findCollisionPairs();

    const eaten = [];
    const winners = [];

    for (
        const collision of collisions
    ) {
        const result =
            consume(
                collision.eaterId,
                collision.targetId
            );

        if (!result.ok) {
            continue;
        }

        eaten.push(result);

        if (result.winner) {
            winners.push(
                result.winner
            );

            break;
        }
    }

    return {
        eaten,
        winners
    };
}

function claimWinner(
    playerId,
    viewportMin,
    clientRadius
) {
    if (
        roundStatus !== 'playing'
    ) {
        return {
            ok: false,
            reason: 'round_finished'
        };
    }

    const player =
        players.get(
            String(playerId)
        );

    if (!player) {
        return {
            ok: false,
            reason: 'player_not_found'
        };
    }

    if (
        roundParticipants.size < 2
    ) {
        return {
            ok: false,
            reason: 'not_enough_players'
        };
    }

    const minDimension =
        number(
            viewportMin,
            0
        );

    const radius =
        number(
            clientRadius,
            player.radius
        );

    if (
        minDimension <= 0 ||
        radius < minDimension * 0.42
    ) {
        return {
            ok: false,
            reason: 'not_large_enough'
        };
    }

    const winner =
        registerWinner(player);

    return {
        ok: true,
        winner,
        state: snapshot()
    };
}

function reset() {
    players.clear();

    eliminatedPlayers.clear();

    roundParticipants.clear();

    roundNumber += 1;
    roundStatus = 'playing';
    currentWinner = null;
}

function snapshot() {
    return {
        players: list(),

        settings: get(),

        game: {
            roundNumber,
            status: roundStatus,
            winner: currentWinner,
            podium: getPodium(),
            eliminatedPlayers: [
                ...eliminatedPlayers
            ]
        }
    };
}

module.exports = {
    add,
    list,
    tick,
    consume,
    claimWinner,
    reset,
    snapshot,
    getPodium
};