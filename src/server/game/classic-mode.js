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


function canEat(
    eater,
    target,
    distanceBetween
) {
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


function consume({
    eater,
    target,
    distanceBetween,
    players,
    eliminatedPlayers,
    roundParticipants,
    registerWinner,
    snapshot
}) {
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


    if (
        eater.id === target.id
    ) {
        return {
            ok: false,
            reason:
                'same_player'
        };
    }


    if (
        !canEat(
            eater,
            target,
            distanceBetween
        )
    ) {
        return {
            ok: false,
            reason:
                'collision_not_valid'
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
        getDisplayName(
            target
        );


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


    let winner =
        null;


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

        type:
            'eat',

        eater: {
            ...eater
        },

        eaten: {
            id:
                target.id,

            userId:
                target.userId,

            username:
                target.username,

            nickname:
                target.nickname,

            avatar:
                target.avatar || '',

            points:
                target.points
        },

        stats: {
            eaterId:
                eater.id,

            targetId:
                target.id,

            ballsEaten:
                1,

            timesEaten:
                1,

            pointsEarned:
                targetPoints,

            pointsFromEating:
                targetPoints,

            eaterPoints:
                eater.points,

            eaterRadius:
                eater.radius,

            targetPoints:
                target.points
        },

        winner,

        state:
            snapshot()
    };
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
                canEat(
                    first,
                    second,
                    distanceBetween
                )
            ) {
                collisions.push({
                    eaterId:
                        first.id,

                    targetId:
                        second.id
                });


                continue;
            }


            if (
                canEat(
                    second,
                    first,
                    distanceBetween
                )
            ) {
                collisions.push({
                    eaterId:
                        second.id,

                    targetId:
                        first.id
                });
            }
        }
    }


    return collisions;
}


module.exports = {
    canEat,
    consume,
    findCollisions
};