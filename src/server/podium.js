'use strict';


const fs =
    require('fs');


const path =
    require('path');


const DATA_DIRECTORY =
    path.join(
        __dirname,
        '../../data'
    );


const FILES = {
    classic:
        path.join(
            DATA_DIRECTORY,
            'podium-classic.json'
        ),

    battle:
        path.join(
            DATA_DIRECTORY,
            'podium-battle.json'
        )
};


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
    return mode === 'battle'
        ? 'battle'
        : 'classic';
}


function ensureDataDirectory() {
    fs.mkdirSync(
        DATA_DIRECTORY,
        {
            recursive: true
        }
    );
}


function getFile(mode) {
    const normalizedMode =
        normalizeMode(mode);


    ensureDataDirectory();


    const file =
        FILES[normalizedMode];


    if (
        !fs.existsSync(file)
    ) {
        fs.writeFileSync(
            file,
            '[]\n',
            'utf8'
        );
    }


    return file;
}


function read(mode) {
    const file =
        getFile(mode);


    try {
        const content =
            fs.readFileSync(
                file,
                'utf8'
            );


        if (
            !content.trim()
        ) {
            return [];
        }


        const data =
            JSON.parse(
                content
            );


        return Array.isArray(data)
            ? data
            : [];
    } catch (error) {
        console.error(
            `No se pudo leer el podio ${mode}:`,
            error.message
        );


        return [];
    }
}


function write(mode, entries) {
    const file =
        getFile(mode);


    const temporaryFile =
        `${file}.tmp`;


    fs.writeFileSync(
        temporaryFile,
        `${JSON.stringify(entries, null, 2)}\n`,
        'utf8'
    );


    fs.renameSync(
        temporaryFile,
        file
    );
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
    limit = 10
) {
    return read(mode)
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
        );
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
    stats = {}
) {
    const normalizedMode =
        normalizeMode(
            mode
        );


    const entries =
        read(
            normalizedMode
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
        entries
    );


    return {
        ...entry
    };
}


function registerWinner(
    mode,
    player
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
        }
    );
}


function recordParticipant(
    mode,
    player
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
        }
    );
}


function reset(mode) {
    write(
        normalizeMode(
            mode
        ),
        []
    );
}


module.exports = {
    get,
    record,
    registerWinner,
    recordParticipant,
    reset,
    DEFAULT_STATS
};