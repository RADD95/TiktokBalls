function number(
    value,
    fallback = 0
) {
    const parsed =
        Number(value);


    return Number.isFinite(
        parsed
    )
        ? parsed
        : fallback;
}


function getArenaSize(
    settings
) {
    return {
        width:
            Math.max(
                320,
                Math.min(
                    1920,
                    number(
                        settings.width,
                        800
                    )
                )
            ),

        height:
            Math.max(
                240,
                Math.min(
                    1920,
                    number(
                        settings.height,
                        600
                    )
                )
            )
    };
}


function isActive(
    player
) {
    return (
        player &&
        player.status !==
        'defeated'
    );
}


function canCollide(
    first,
    second,
    distanceBetween
) {
    if (
        !isActive(first) ||
        !isActive(second) ||
        first.id === second.id
    ) {
        return false;
    }


    const firstRadius =
        number(
            first.radius,
            24
        );


    const secondRadius =
        number(
            second.radius,
            24
        );


    return (
        distanceBetween(
            first,
            second
        ) <=
        firstRadius +
        secondRadius
    );
}


function separatePlayers(
    first,
    second,
    settings
) {
    const arena =
        getArenaSize(
            settings
        );


    const dx =
        (
            second.x -
            first.x
        ) *
        arena.width;


    const dy =
        (
            second.y -
            first.y
        ) *
        arena.height;


    let distance =
        Math.sqrt(
            dx * dx +
            dy * dy
        );


    if (
        distance < 0.0001
    ) {
        distance =
            0.0001;
    }


    const firstRadius =
        number(
            first.radius,
            24
        );


    const secondRadius =
        number(
            second.radius,
            24
        );


    const normalX =
        dx / distance;


    const normalY =
        dy / distance;


    const overlap =
        firstRadius +
        secondRadius -
        distance;


    if (
        overlap <= 0
    ) {
        return {
            normalX,
            normalY
        };
    }


    const correction =
        overlap / 2 + 1;


    first.x -=
        (
            normalX *
            correction
        ) /
        arena.width;


    first.y -=
        (
            normalY *
            correction
        ) /
        arena.height;


    second.x +=
        (
            normalX *
            correction
        ) /
        arena.width;


    second.y +=
        (
            normalY *
            correction
        ) /
        arena.height;


    first.x =
        Math.max(
            0.001,
            Math.min(
                0.999,
                first.x
            )
        );


    first.y =
        Math.max(
            0.001,
            Math.min(
                0.999,
                first.y
            )
        );


    second.x =
        Math.max(
            0.001,
            Math.min(
                0.999,
                second.x
            )
        );


    second.y =
        Math.max(
            0.001,
            Math.min(
                0.999,
                second.y
            )
        );


    return {
        normalX,
        normalY
    };
}


function bounce(
    first,
    second,
    settings
) {
    const {
        normalX,
        normalY
    } =
        separatePlayers(
            first,
            second,
            settings
        );


    const relativeVelocity =
        (
            second.vx -
            first.vx
        ) *
        normalX +
        (
            second.vy -
            first.vy
        ) *
        normalY;


    if (
        relativeVelocity >= 0
    ) {
        return;
    }


    const impulse =
        relativeVelocity;


    first.vx +=
        impulse *
        normalX;


    first.vy +=
        impulse *
        normalY;


    second.vx -=
        impulse *
        normalX;


    second.vy -=
        impulse *
        normalY;
}


function calculateRadius(
    points,
    settings
) {
    const baseRadius =
        number(
            settings.baseRadius,
            24
        );


    const pointsPerRadius =
        Math.max(
            0.01,
            number(
                settings.pointsPerRadius,
                4
            )
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
        baseRadius +
        growth;


    const maxRadius =
        number(
            settings.maxRadius,
            0
        );


    if (
        maxRadius <= 0
    ) {
        return calculatedRadius;
    }


    return Math.min(
        calculatedRadius,
        maxRadius
    );
}


function findCollisions({
    activePlayers,
    distanceBetween
}) {
    const collisions =
        [];


    for (
        let firstIndex = 0;
        firstIndex <
        activePlayers.length;
        firstIndex += 1
    ) {
        for (
            let secondIndex =
                firstIndex + 1;
            secondIndex <
            activePlayers.length;
            secondIndex += 1
        ) {
            const first =
                activePlayers[
                    firstIndex
                ];


            const second =
                activePlayers[
                    secondIndex
                ];


            if (
                canCollide(
                    first,
                    second,
                    distanceBetween
                )
            ) {
                collisions.push({
                    firstId:
                        first.id,

                    secondId:
                        second.id
                });
            }
        }
    }


    return collisions;
}


function createDefeatedSnapshot(
    target,
    now
) {
    return {
        ...target,

        points:
            0,

        status:
            'defeated',

        previousRadius:
            number(
                target.radius,
                24
            ),

        message:
            '💥',

        messageUpdatedAt:
            now,

        lastEventType:
            'battle-defeat',

        lastEventAt:
            now
    };
}


function hit({
    first,
    second,
    settings,
    distanceBetween,
    players,
    eliminatedPlayers,
    roundParticipants,
    registerWinner,
    snapshot
}) {
    if (
        !isActive(first) ||
        !isActive(second)
    ) {
        return {
            ok: false,
            reason:
                'player_not_found'
        };
    }


    const now =
        Date.now();


    const cooldown =
        400;


    const firstLastHit =
        number(
            first.lastBattleHitAt,
            0
        );


    const secondLastHit =
        number(
            second.lastBattleHitAt,
            0
        );


    if (
        now - firstLastHit <
        cooldown ||
        now - secondLastHit <
        cooldown
    ) {
        return {
            ok: false,
            reason:
                'battle_cooldown'
        };
    }


    const firstPoints =
        number(
            first.points,
            0
        );


    const secondPoints =
        number(
            second.points,
            0
        );


    bounce(
        first,
        second,
        settings
    );


    first.lastBattleHitAt =
        now;


    second.lastBattleHitAt =
        now;


    if (
        firstPoints ===
        secondPoints
    ) {
        first.message =
            '⚖️';


        second.message =
            '⚖️';


        first.messageUpdatedAt =
            now;


        second.messageUpdatedAt =
            now;


        first.lastEventType =
            'battle-draw';


        second.lastEventType =
            'battle-draw';


        first.lastEventAt =
            now;


        second.lastEventAt =
            now;


        return {
            ok: true,

            type:
                'battle-draw',

            first: {
                ...first
            },

            second: {
                ...second
            },

            defeated: [],

            winner:
                null,

            state:
                snapshot()
        };
    }


    const attacker =
        firstPoints >
        secondPoints
            ? first
            : second;


    const target =
        attacker.id === first.id
            ? second
            : first;


    const damage =
        Math.max(
            1,
            number(
                settings.battleDamage,
                1
            )
        );


    target.points =
        Math.max(
            0,
            number(
                target.points,
                0
            ) -
            damage
        );


    target.radius =
        calculateRadius(
            target.points,
            settings
        );


    target.damagePopup = {
        amount:
            damage,

        createdAt:
            now
    };


    target.lastEventType =
        'battle-hit';


    target.lastEventAt =
        now;


    target.message =
        `-${damage}`;


    target.messageUpdatedAt =
        now;


    const defeated =
        [];


    let defeatedPlayer =
        null;


    if (
        target.points <= 0
    ) {
        defeatedPlayer =
            createDefeatedSnapshot(
                target,
                now
            );


        players.delete(
            target.id
        );


        eliminatedPlayers.add(
            target.id
        );


        defeated.push(
            defeatedPlayer
        );
    }


    let winner =
        null;


    const activePlayers =
        [
            ...players.values()
        ]
            .filter(
                isActive
            );


    if (
        activePlayers.length === 1 &&
        roundParticipants.size >= 2
    ) {
        winner =
            registerWinner(
                activePlayers[0]
            );
    }


    return {
        ok: true,

        type:
            'battle-hit',

        attacker: {
            ...attacker
        },

        target:
            defeatedPlayer ||
            {
                ...target
            },

        defeated,

        stats: {
            attackerId:
                attacker.id,

            targetId:
                target.id,

            hitsGiven:
                1,

            hitsReceived:
                1,

            damageDealt:
                damage,

            damageReceived:
                damage,

            targetDefeated:
                Boolean(
                    defeatedPlayer
                )
        },

        winner,

        state:
            snapshot()
    };
}


module.exports = {
    findCollisions,
    hit
};