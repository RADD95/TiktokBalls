const crypto =
    require('crypto');


const {
    get
} =
    require('./settings');


const {
    key
} =
    require('./points');


const podium =
    require('./podium');


const classicMode =
    require('./game/classic-mode');


const battleMode =
    require('./game/battle-mode');


const players =
    new Map();


const eliminatedPlayers =
    new Set();


const roundParticipants =
    new Set();


const DEFAULT_WIDTH =
    800;


const DEFAULT_HEIGHT =
    600;


let roundNumber =
    1;


let roundStatus =
    'playing';


let currentWinner =
    null;


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


function number(
    value,
    fallback = 0
) {
    const parsed =
        Number(value);


    return Number.isFinite(parsed)
        ? parsed
        : fallback;
}


function clamp(
    value,
    minimum,
    maximum
) {
    return Math.max(
        minimum,
        Math.min(
            maximum,
            value
        )
    );
}


function getArenaSize() {
    const settings =
        get();


    return {
        width:
            Math.max(
                320,
                Math.min(
                    1920,
                    Number(
                        settings.width
                    ) || DEFAULT_WIDTH
                )
            ),

        height:
            Math.max(
                240,
                Math.min(
                    1920,
                    Number(
                        settings.height
                    ) || DEFAULT_HEIGHT
                )
            )
    };
}


function getColor(id) {
    const hash =
        crypto
            .createHash('md5')
            .update(
                String(id)
            )
            .digest()[0];


    return colors[
        hash % colors.length
    ];
}


function calculateRadius(
    points,
    settings
) {
    const baseRadius =
        Number(
            settings.baseRadius
        ) || 24;


    const pointsPerRadius =
        Number(
            settings.pointsPerRadius
        ) || 4;


    const maxRadius =
        Number(
            settings.maxRadius
        );


    const growth =
        Math.sqrt(
            Math.max(
                0,
                points
            ) /
            pointsPerRadius
        ) * 12;


    const calculatedRadius =
        baseRadius + growth;


    if (
        !Number.isFinite(
            maxRadius
        ) ||
        maxRadius <= 0
    ) {
        return calculatedRadius;
    }


    return Math.min(
        calculatedRadius,
        maxRadius
    );
}


function getMessageFromEvent(
    event
) {
    if (
        event.type ===
        'comment'
    ) {
        return (
            event.message ||
            event.comment ||
            ''
        );
    }


    if (
        event.type ===
        'gift'
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


function getDisplayName(
    player
) {
    return (
        player.nickname ||
        player.username ||
        player.uniqueId ||
        'viewer'
    );
}


function getPlayerId(
    event
) {
    return String(
        key(event)
    );
}


function createPlayer(
    event,
    settings
) {
    const playerId =
        getPlayerId(
            event
        );


    return {
        id:
            playerId,

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

        points:
            0,

        radius:
            number(
                settings.baseRadius,
                24
            ),

        color:
            getColor(
                playerId
            ),

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

        message:
            '',

        messageUpdatedAt:
            0,

        lastEventType:
            null,

        lastGiftName:
            '',

        lastEventAt:
            Date.now()
    };
}


function add(
    event,
    earnedPoints
) {
    if (
        roundStatus !==
        'playing'
    ) {
        return null;
    }


    const settings =
        get();


    const playerId =
        getPlayerId(
            event
        );


    const wasEliminated =
        eliminatedPlayers.has(
            playerId
        );


    const canRespawn =
        settings.gameMode ===
            'classic' ||
        (
            settings.gameMode ===
                'battle' &&
            settings.battleRespawn ===
                true
        );


    if (
        wasEliminated &&
        !canRespawn
    ) {
        return null;
    }


    let player =
        players.get(
            playerId
        );


    if (
        !player
    ) {
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


        eliminatedPlayers.delete(
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


    if (
        event.userId
    ) {
        player.userId =
            String(
                event.userId
            );
    }


    if (
        event.avatar
    ) {
        player.avatar =
            event.avatar;
    }


    const message =
        getMessageFromEvent(
            event
        );


    if (
        message
    ) {
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
        event.type ===
        'gift'
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


    player.status =
        'active';


    return player;
}


function list() {
    return [
        ...players.values()
    ]
        .sort(
            (
                first,
                second
            ) =>
                second.points -
                first.points
        );
}


function getCurrentMode() {
    const settings =
        get();


    return settings.gameMode ===
        'battle'
        ? 'battle'
        : 'classic';
}


function getPodium() {
    return podium.get(
        getCurrentMode(),
        10
    );
}


function recordCollisionStats(
    result
) {
    const stats =
        result?.stats;


    if (
        !stats
    ) {
        return;
    }


    const mode =
        getCurrentMode();


    if (
        result.type ===
        'eat'
    ) {
        const eater =
            players.get(
                String(
                    stats.eaterId
                )
            );


        const target =
            players.get(
                String(
                    stats.targetId
                )
            ) ||
            result.eaten;


        if (
            eater
        ) {
            podium.record(
                mode,
                eater,
                {
                    ballsEaten:
                        stats.ballsEaten,

                    pointsEarned:
                        stats.pointsFromEating,

                    radius:
                        stats.eaterRadius
                }
            );
        }


        if (
            target
        ) {
            podium.record(
                mode,
                target,
                {
                    timesEaten:
                        stats.timesEaten
                }
            );
        }


        return;
    }


    if (
        result.type ===
        'battle-hit'
    ) {
        const attacker =
            players.get(
                String(
                    stats.attackerId
                )
            );


        const target =
            players.get(
                String(
                    stats.targetId
                )
            ) ||
            result.target;


        if (
            attacker
        ) {
            podium.record(
                mode,
                attacker,
                {
                    hitsGiven:
                        stats.hitsGiven,

                    damageDealt:
                        stats.damageDealt,

                    radius:
                        attacker.radius
                }
            );
        }


        if (
            target
        ) {
            podium.record(
                mode,
                target,
                {
                    hitsReceived:
                        stats.hitsReceived,

                    damageReceived:
                        stats.damageReceived
                }
            );
        }
    }
}


function registerWinner(
    player
) {
    const savedPlayer =
        podium.registerWinner(
            getCurrentMode(),
            player
        );


    currentWinner = {
        id:
            String(
                player.id
            ),

        userId:
            player.userId,

        username:
            player.username,

        nickname:
            getDisplayName(
                player
            ),

        avatar:
            player.avatar ||
            '',

        points:
            player.points,

        radius:
            player.radius,

        wins:
            savedPlayer.wins
    };


    roundStatus =
        'finished';


    return currentWinner;
}


function distanceBetween(
    first,
    second
) {
    const arena =
        getArenaSize();


    const dx =
        (
            first.x -
            second.x
        ) *
        arena.width;


    const dy =
        (
            first.y -
            second.y
        ) *
        arena.height;


    return Math.sqrt(
        dx * dx +
        dy * dy
    );
}


function consume(
    eaterId,
    targetId
) {
    if (
        roundStatus !==
        'playing'
    ) {
        return {
            ok: false,
            reason:
                'round_finished'
        };
    }


    const eater =
        players.get(
            String(
                eaterId
            )
        );


    const target =
        players.get(
            String(
                targetId
            )
        );


    if (
        !eater ||
        !target
    ) {
        return {
            ok: false,
            reason:
                'player_not_found'
        };
    }


    return classicMode.consume({
        eater,
        target,
        distanceBetween,
        players,
        eliminatedPlayers,
        roundParticipants,
        registerWinner,
        snapshot
    });
}


function movePlayer(
    player,
    deltaSeconds
) {
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


    const arena =
        getArenaSize();


    const normalizedRadiusX =
        radius /
        arena.width;


    const normalizedRadiusY =
        radius /
        arena.height;


    const canMoveX =
        normalizedRadiusX <
        0.5;


    const canMoveY =
        normalizedRadiusY <
        0.5;


    if (
        canMoveX
    ) {
        player.x +=
            player.vx *
            deltaSeconds *
            speed;


        const minX =
            normalizedRadiusX;


        const maxX =
            1 -
            normalizedRadiusX;


        if (
            player.x <= minX ||
            player.x >= maxX
        ) {
            player.vx *= -1;
        }


        player.x =
            clamp(
                player.x,
                minX,
                maxX
            );
    } else {
        /*
         * La bola es más ancha que la arena.
         * No hay límites válidos para moverla:
         * se mantiene centrada horizontalmente.
         */
        player.x =
            0.5;


        player.vx =
            0;
    }


    if (
        canMoveY
    ) {
        player.y +=
            player.vy *
            deltaSeconds *
            speed;


        const minY =
            normalizedRadiusY;


        const maxY =
            1 -
            normalizedRadiusY;


        if (
            player.y <= minY ||
            player.y >= maxY
        ) {
            player.vy *= -1;
        }


        player.y =
            clamp(
                player.y,
                minY,
                maxY
            );
    } else {
        /*
         * La bola es más alta que la arena.
         * Se mantiene centrada verticalmente.
         */
        player.y =
            0.5;


        player.vy =
            0;
    }
}

function findCollisionPairs() {
    const settings =
        get();


    if (
        settings.gameMode ===
        'battle'
    ) {
        return battleMode.findCollisions({
            activePlayers:
                list(),

            distanceBetween
        });
    }


    return classicMode.findCollisions({
        activePlayers:
            list(),

        distanceBetween
    });
}


function tick(
    deltaSeconds = 0.05
) {
    if (
        roundStatus !==
        'playing'
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
        const player of
        players.values()
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
        const collision of
        collisions
    ) {
        const settings =
            get();


        let result;


        if (
            settings.gameMode ===
            'battle'
        ) {
            const first =
                players.get(
                    String(
                        collision.firstId
                    )
                );


            const second =
                players.get(
                    String(
                        collision.secondId
                    )
                );


            result =
                battleMode.hit({
                    first,
                    second,
                    settings,
                    distanceBetween,
                    players,
                    eliminatedPlayers,
                    roundParticipants,
                    registerWinner,
                    snapshot
                });
        } else {
            result =
                consume(
                    collision.eaterId,
                    collision.targetId
                );
        }


        if (
            !result.ok
        ) {
            continue;
        }


        recordCollisionStats(
            result
        );


        eaten.push(
            result
        );


        if (
            result.winner
        ) {
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
        roundStatus !==
        'playing'
    ) {
        return {
            ok: false,
            reason:
                'round_finished'
        };
    }


    const player =
        players.get(
            String(
                playerId
            )
        );


    if (
        !player
    ) {
        return {
            ok: false,
            reason:
                'player_not_found'
        };
    }


    if (
        roundParticipants.size <
        2
    ) {
        return {
            ok: false,
            reason:
                'not_enough_players'
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
        radius <
        minDimension * 0.42
    ) {
        return {
            ok: false,
            reason:
                'not_large_enough'
        };
    }


    const winner =
        registerWinner(
            player
        );


    return {
        ok: true,
        winner,
        state:
            snapshot()
    };
}


function reset() {
    players.clear();


    eliminatedPlayers.clear();


    roundParticipants.clear();


    roundNumber +=
        1;


    roundStatus =
        'playing';


    currentWinner =
        null;
}


function snapshot() {
    return {
        players:
            list(),

        settings:
            get(),

        game: {
            roundNumber,

            status:
                roundStatus,

            winner:
                currentWinner,

            podium:
                getPodium(),

            podiumMode:
                getCurrentMode(),

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