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


function getRadius(
    player
) {
    return number(
        player.radius,
        24
    );
}


function getDistance(
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


    return Math.sqrt(
        dx * dx +
        dy * dy
    );
}


function isContained(
    first,
    second,
    distance
) {
    return (
        distance <=
        Math.abs(
            getRadius(first) -
            getRadius(second)
        )
    );
}


function dominatesArena(
    player,
    settings
) {
    const arena =
        getArenaSize(
            settings
        );


    const radius =
        getRadius(player);


    return (
        radius >=
        arena.width / 2 ||
        radius >=
        arena.height / 2
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


    const distance =
        distanceBetween(
            first,
            second
        );


    return (
        distance <=
        getRadius(first) +
        getRadius(second)
    );
}


function getNormal(
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


    const distance =
        Math.sqrt(
            dx * dx +
            dy * dy
        );


    if (
        distance < 0.0001
    ) {
        return {
            x: 0,
            y: second.y < first.y ? -1 : 1,
            distance: 0
        };
    }


    return {
        x:
            dx / distance,

        y:
            dy / distance,

        distance
    };
}


function keepPlayerInsideArena(
    player,
    settings
) {
    const arena =
        getArenaSize(
            settings
        );


    const radius =
        getRadius(
            player
        );


    const normalizedRadiusX =
        radius /
        arena.width;


    const normalizedRadiusY =
        radius /
        arena.height;


    if (
        normalizedRadiusX <
        0.5
    ) {
        player.x =
            clamp(
                player.x,
                normalizedRadiusX,
                1 - normalizedRadiusX
            );
    } else {
        player.x =
            0.5;
    }


    if (
        normalizedRadiusY <
        0.5
    ) {
        player.y =
            clamp(
                player.y,
                normalizedRadiusY,
                1 - normalizedRadiusY
            );
    } else {
        player.y =
            0.5;
    }
}


function limitVelocity(
    player,
    maximum = 0.42
) {
    const speed =
        Math.sqrt(
            player.vx *
            player.vx +
            player.vy *
            player.vy
        );


    if (
        speed <= maximum ||
        speed <= 0.0001
    ) {
        return;
    }


    const multiplier =
        maximum /
        speed;


    player.vx *=
        multiplier;


    player.vy *=
        multiplier;
}


function applyPressureImpulse(
    target,
    attacker,
    settings,
    now
) {
    const arena =
        getArenaSize(
            settings
        );


    const angleSeed =
        (
            number(
                target.pressureHitCount,
                0
            ) * 2.399963229728653
        ) +
        (
            number(
                now,
                0
            ) * 0.001
        );


    const directionX =
        Math.cos(
            angleSeed
        );


    const directionY =
        Math.sin(
            angleSeed
        );


    const pressure =
        0.13;


    target.vx =
        target.vx * 0.55 +
        directionX * pressure;


    target.vy =
        target.vy * 0.55 +
        directionY * pressure;


    target.pressureHitCount =
        number(
            target.pressureHitCount,
            0
        ) +
        1;


    limitVelocity(
        target
    );


    const radius =
        getRadius(
            target
        );


    const normalizedRadiusX =
        radius /
        arena.width;


    const normalizedRadiusY =
        radius /
        arena.height;


    if (
        normalizedRadiusX <
        0.5
    ) {
        target.x =
            clamp(
                target.x,
                normalizedRadiusX,
                1 - normalizedRadiusX
            );
    }


    if (
        normalizedRadiusY <
        0.5
    ) {
        target.y =
            clamp(
                target.y,
                normalizedRadiusY,
                1 - normalizedRadiusY
            );
    }


    attacker.vx =
        attacker.vx * 0.96;


    attacker.vy =
        attacker.vy * 0.96;

}


function separatePlayers(
    first,
    second,
    settings
) {
    const normal =
        getNormal(
            first,
            second,
            settings
        );

    const firstRadius =
        getRadius(first);

    const secondRadius =
        getRadius(second);

    const totalRadius =
        firstRadius + secondRadius;

    const overlap =
        totalRadius - normal.distance;

    if (overlap <= 0) {
        return {
            normalX: normal.x,
            normalY: normal.y,
            trapped: false
        };
    }

    const arena =
        getArenaSize(settings);

    // Reparto de desplazamiento proporcional a la masa (radio)
    const mass1 = Math.max(1, firstRadius);
    const mass2 = Math.max(1, secondRadius);
    const totalMass = mass1 + mass2;

    const ratio1 = mass2 / totalMass;
    const ratio2 = mass1 / totalMass;

    // Verificar si alguna bola está bloqueada en algún eje por superar la mitad de la arena
    const normX1 = firstRadius / arena.width;
    const normY1 = firstRadius / arena.height;
    const canMoveX1 = normX1 < 0.5;
    const canMoveY1 = normY1 < 0.5;

    const normX2 = secondRadius / arena.width;
    const normY2 = secondRadius / arena.height;
    const canMoveX2 = normX2 < 0.5;
    const canMoveY2 = normY2 < 0.5;

    const factorX1 = canMoveX1 ? (canMoveX2 ? ratio1 : 1) : 0;
    const factorY1 = canMoveY1 ? (canMoveY2 ? ratio1 : 1) : 0;

    const factorX2 = canMoveX2 ? (canMoveX1 ? ratio2 : 1) : 0;
    const factorY2 = canMoveY2 ? (canMoveY1 ? ratio2 : 1) : 0;

    const correction = overlap + 0.5;

    first.x -= (normal.x * correction * factorX1) / arena.width;
    first.y -= (normal.y * correction * factorY1) / arena.height;

    second.x += (normal.x * correction * factorX2) / arena.width;
    second.y += (normal.y * correction * factorY2) / arena.height;

    // Asegurar SIEMPRE que ninguna bola sea empujada fuera de los límites de la arena
    keepPlayerInsideArena(first, settings);
    keepPlayerInsideArena(second, settings);

    // Comprobar si la bola menor quedó atrapada contra los límites sin más arena para moverse
    const newDistance = getDistance(first, second, settings);
    const maxRadius = Math.max(firstRadius, secondRadius);
    const trapped = newDistance < maxRadius;

    return {
        normalX: normal.x,
        normalY: normal.y,
        trapped
    };
}


function bounce(
    first,
    second,
    settings,
    now
) {
    const collision =
        separatePlayers(
            first,
            second,
            settings
        );

    // Solo si no hay más arena libre para moverse (atrapada contra la pared)
    if (collision.trapped) {
        const target =
            getRadius(first) <= getRadius(second)
                ? first
                : second;

        const attacker =
            target.id === first.id
                ? second
                : first;

        applyPressureImpulse(
            target,
            attacker,
            settings,
            now
        );

        return;
    }

    const relativeVelocity =
        (second.vx - first.vx) * collision.normalX +
        (second.vy - first.vy) * collision.normalY;

    if (relativeVelocity >= 0) {
        return;
    }

    const firstRadius = getRadius(first);
    const secondRadius = getRadius(second);
    const mass1 = Math.max(1, firstRadius);
    const mass2 = Math.max(1, secondRadius);

    const restitution = 1.05;
    const impulse =
        -(1 + restitution) *
        relativeVelocity /
        ((1 / mass1) + (1 / mass2));

    first.vx -= (impulse / mass1) * collision.normalX;
    first.vy -= (impulse / mass1) * collision.normalY;

    second.vx += (impulse / mass2) * collision.normalX;
    second.vy += (impulse / mass2) * collision.normalY;

    limitVelocity(first);
    limitVelocity(second);
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
            getRadius(
                target
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

    /*
     * Cooldown por par de bolitas, no global.
     * Cada par único tiene su propio timer.
     */
    const pairKey =
        [first.id, second.id]
            .sort()
            .join('-');

    const pairCooldowns =
        first.pairCooldowns || {};

    const pairLastHit =
        pairCooldowns[pairKey] || 0;

    const cooldown =
        400;

    if (
        now - pairLastHit <
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
        settings,
        now
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

    const attackerPoints =
        number(
            attacker.points,
            0
        );

    const targetPoints =
        number(
            target.points,
            0
        );

    const scaledDamageEnabled =
        Boolean(
            settings.battleScaledDamage
        );

    const damageMultiplier =
        Math.max(
            0.1,
            number(
                settings.battleDamageMultiplier,
                1,
                0.1,
                100
            )
        );

    let finalDamage =
        damage;

    if (
        scaledDamageEnabled &&
        attackerPoints >
        targetPoints &&
        attackerPoints > 0
    ) {
        const ventajaRelativa =
            (
                attackerPoints -
                targetPoints
            ) /
            attackerPoints;

        const porcentaje =
            0.01 +
            (
                0.11 *
                ventajaRelativa
            );

        const damageProporcional =
            Math.ceil(
                targetPoints *
                porcentaje *
                damageMultiplier
            );

        finalDamage =
            Math.max(
                damage,
                damageProporcional
            );
    }

    const maxDamagePorGolpe =
        Math.floor(
            targetPoints * 0.8
        );

    if (
        finalDamage > maxDamagePorGolpe &&
        targetPoints > damage
    ) {
        finalDamage =
            Math.max(
                damage,
                maxDamagePorGolpe
            );
    }

    target.points =
        Math.max(
            0,
            targetPoints -
            finalDamage
        );


    target.radius =
        calculateRadius(
            target.points,
            settings
        );


    target.damagePopup = {
        amount:
            finalDamage,

        createdAt:
            now
    };


    target.lastEventType =
        'battle-hit';


    target.lastEventAt =
        now;


    target.message =
        `-${finalDamage}`;


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

    /*
     * Guarda el timestamp del último golpe para este par.
     */
    if (!first.pairCooldowns) {
        first.pairCooldowns = {};
    }

    if (!second.pairCooldowns) {
        second.pairCooldowns = {};
    }

    first.pairCooldowns[pairKey] = now;
    second.pairCooldowns[pairKey] = now;

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
                finalDamage,

            damageReceived:
                finalDamage,

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