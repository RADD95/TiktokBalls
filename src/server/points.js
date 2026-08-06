const {
    get
} = require('./settings');

const usage = new Map();

function key(event) {
    return String(
        event.userId ||
        event.uniqueId ||
        event.username ||
        'anonymous'
    );
}

function getNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}

function getEventConfig(event, settings) {
    switch (event.type) {
        case 'comment':
            return {
                base: getNumber(settings.commentPoints, 1),
                multiplier: getNumber(
                    settings.commentMultiplier,
                    1
                ),
                quantity: 1
            };

        case 'like':
            return {
                base: getNumber(settings.likePoints, 1),
                multiplier: getNumber(
                    settings.likeMultiplier,
                    1
                ),
                quantity: Math.max(
                    1,
                    getNumber(
                        event.likeCount ||
                        event.likecount,
                        1
                    )
                )
            };

        case 'follow':
            return {
                base: getNumber(settings.followPoints, 1),
                multiplier: getNumber(
                    settings.followMultiplier,
                    1
                ),
                quantity: 1
            };

        case 'share':
            return {
                base: getNumber(settings.sharePoints, 1),
                multiplier: getNumber(
                    settings.shareMultiplier,
                    1
                ),
                quantity: 1
            };

        case 'gift': {
            const diamonds = Math.max(
                1,
                getNumber(
                    event.diamondCount,
                    1
                )
            );

            const repeatCount = Math.max(
                1,
                getNumber(
                    event.repeatCount ||
                    event.repeatcount,
                    1
                )
            );

            return {
                base: getNumber(settings.giftPoints, 1),
                multiplier: getNumber(
                    settings.giftMultiplier,
                    1
                ),
                quantity: diamonds * repeatCount
            };
        }

        default:
            return {
                base: 0,
                multiplier: 0,
                quantity: 0
            };
    }
}

function points(event) {
    const settings = get();
    const playerKey = key(event);
    const now = Date.now();

    const limit = Math.max(
        0,
        getNumber(settings.maxPointsPerMinute, 0)
    );

    let record = usage.get(playerKey);

    if (!record) {
        record = {
            startedAt: now,
            points: 0
        };

        usage.set(playerKey, record);
    }

    if (now - record.startedAt >= 60000) {
        record.startedAt = now;
        record.points = 0;
    }

    const config = getEventConfig(
        event,
        settings
    );

    const requestedPoints =
        config.base *
        config.quantity *
        config.multiplier;

    if (requestedPoints <= 0) {
        return 0;
    }

    if (limit <= 0) {
        record.points += requestedPoints;
        return requestedPoints;
    }

    const remaining =
        Math.max(
            0,
            limit - record.points
        );

    const acceptedPoints =
        Math.min(
            requestedPoints,
            remaining
        );

    record.points += acceptedPoints;

    return acceptedPoints;
}

function resetUsage() {
    usage.clear();
}

module.exports = {
    key,
    points,
    resetUsage
};