'use strict';


const database =
    require('./database');


const DEFAULT_STATS = {
    roundsPlayed: 0,
    wins: 0,
    losses: 0,

    hitsGiven: 0,
    hitsReceived: 0,

    ballsEaten: 0,
    timesEaten: 0,

    damageDealt: 0,
    damageReceived: 0,

    pointsEarned: 0,
    bestPoints: 0,

    biggestRadius: 0,
    longestSurvivalSeconds: 0
};


function normalizeMode(mode) {
    if (mode === 'battle') return 'battle';
    if (mode === 'marbles') return 'marbles'; // <-- NUEVO
    return 'classic';
}


function ensureDataDirectory() {
}


function getFile(mode) {
    return normalizeMode(mode);
}


function read(mode, workspaceId = null) {
    try {
        const data = database.getWorkspacePodium(
            workspaceId || 'legacy',
            getFile(mode)
        );
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error(
            `No se pudo leer el podio ${mode}:`,
            error.message
        );


        return [];
    }
}


function write(mode, entries, workspaceId = null) {
    if (workspaceId) {
        database.setWorkspacePodium(workspaceId, getFile(mode), entries);
        return;
    }

    database.setWorkspacePodium('legacy', getFile(mode), entries);
}


function toNumber(value) {
    const numberValue =
        Number(value);


    return Number.isFinite(
        numberValue
    )
        ? numberValue
        : 0;
}


function normalizeEntry(entry) {
    const normalized = {
        ...DEFAULT_STATS,
        ...entry
    };


    for (
        const key of Object.keys(
            DEFAULT_STATS
        )
    ) {
        normalized[key] =
            toNumber(
                normalized[key]
            );
    }


    normalized.id =
        String(
            normalized.id || ''
        );


    normalized.userId =
        String(
            normalized.userId || ''
        );


    normalized.username =
        normalized.username || '';


    normalized.nickname =
        normalized.nickname ||
        normalized.username ||
        '';


    normalized.avatar =
        normalized.avatar || '';


    return normalized;
}


function get(
    mode,
    limit = 10,
    workspaceId = null
) {
    const { getPlayerColor } = require('./player-colors');

    return read(mode, workspaceId)
        .map(
            normalizeEntry
        )
        .sort(
            (
                first,
                second
            ) => {
                if (
                    second.wins !==
                    first.wins
                ) {
                    return (
                        second.wins -
                        first.wins
                    );
                }

                if (
                    second.ballsEaten !==
                    first.ballsEaten
                ) {
                    return (
                        second.ballsEaten -
                        first.ballsEaten
                    );
                }

                if (
                    second.damageDealt !==
                    first.damageDealt
                ) {
                    return (
                        second.damageDealt -
                        first.damageDealt
                    );
                }

                return (
                    second.pointsEarned -
                    first.pointsEarned
                );
            }
        )
        .slice(
            0,
            Math.max(
                1,
                toNumber(limit) || 10
            )
        )
        .map(player => {
            const colorConfig = getPlayerColor(player.userId, workspaceId);
            return {
                ...player,
                customColor: colorConfig?.nameColor || null
            };
        });
}


function findPlayer(
    entries,
    playerId
) {
    return entries.find(
        (entry) =>
            String(
                entry.id
            ) ===
            String(
                playerId
            )
    );
}


function updateIdentity(
    entry,
    player
) {
    if (
        player.userId
    ) {
        entry.userId =
            String(
                player.userId
            );
    }



    if (
        player.username
    ) {
        entry.username =
            player.username;
    }



    if (
        player.nickname
    ) {
        entry.nickname =
            player.nickname;
    }



    if (
        player.avatar
    ) {
        entry.avatar =
            player.avatar;
    }
}

function getOrCreatePlayer(
    entries,
    player
) {
    const playerId =
        String(
            player.id
        );



    let entry =
        findPlayer(
            entries,
            playerId
        );



    if (
        !entry
    ) {
        entry = {
            id:
                playerId,


            userId:
                String(
                    player.userId || ''
                ),


            username:
                player.username || '',


            nickname:
                player.nickname ||
                player.username ||
                '',


            avatar:
                player.avatar || '',




            ...DEFAULT_STATS
        };



        entries.push(
            entry
        );
    }



    updateIdentity(
        entry,
        player
    );




    return normalizeEntry(
        entry
    );
}


function addStats(
    entry,
    stats
) {
    for (
        const key of Object.keys(
            DEFAULT_STATS
        )
    ) {
        if (
            stats[key] === undefined
        ) {
            continue;
        }


        entry[key] +=
            toNumber(
                stats[key]
            );
    }
}


function updateRecords(
    entry,
    stats
) {
    if (
        stats.bestPoints !==
        undefined
    ) {
        entry.bestPoints =
            Math.max(
                entry.bestPoints,
                toNumber(
                    stats.bestPoints
                )
            );
    }


    if (
        stats.totalPoints !==
        undefined
    ) {
        entry.bestPoints =
            Math.max(
                entry.bestPoints,
                toNumber(
                    stats.totalPoints
                )
            );
    }


    if (
        stats.radius !==
        undefined
    ) {
        entry.biggestRadius =
            Math.max(
                entry.biggestRadius,
                toNumber(
                    stats.radius
                )
            );
    }


    if (
        stats.survivalSeconds !==
        undefined
    ) {
        entry.longestSurvivalSeconds =
            Math.max(
                entry.longestSurvivalSeconds,
                toNumber(
                    stats.survivalSeconds
                )
            );
    }
}


function record(
    mode,
    player,
    stats = {},
    workspaceId = null
) {
    const normalizedMode =
        normalizeMode(
            mode
        );


    const entries =
        read(
            normalizedMode,
            workspaceId
        );


    const entry =
        getOrCreatePlayer(
            entries,
            player
        );


    addStats(
        entry,
        stats
    );


    updateRecords(
        entry,
        stats
    );


    const index =
        entries.findIndex(
            (item) =>
                String(
                    item.id
                ) ===
                String(
                    entry.id
                )
        );


    entries[index] =
        entry;


    write(
        normalizedMode,
        entries,
        workspaceId
    );


    return {
        ...entry
    };
}


function registerWinner(
    mode,
    player,
    workspaceId = null
) {
    return record(
        mode,
        player,
        {
            wins:
                1,

            bestPoints:
                player.points,

            radius:
                player.radius
        },
        workspaceId
    );
}


function recordParticipant(
    mode,
    player,
    workspaceId = null
) {
    return record(
        mode,
        player,
        {
            roundsPlayed:
                1,

            bestPoints:
                player.points,

            radius:
                player.radius
        },
        workspaceId
    );
}


function reset(mode, workspaceId = null) {
    write(
        normalizeMode(
            mode
        ),
        [],
        workspaceId
    );
}


module.exports = {
    get,
    record,
    registerWinner,
    recordParticipant,
    reset,
    DEFAULT_STATS,
    forWorkspace(workspaceId) {
        return {
            get: (mode, limit) => get(mode, limit, workspaceId),
            record: (mode, player, stats) => record(mode, player, stats, workspaceId),
            registerWinner: (mode, player) => registerWinner(mode, player, workspaceId),
            recordParticipant: (mode, player) => recordParticipant(mode, player, workspaceId),
            reset: mode => reset(mode, workspaceId),
            DEFAULT_STATS
        };
    }
};