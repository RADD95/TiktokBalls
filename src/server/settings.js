const fs =
    require('fs');

const path =
    require('path');

const defaults =
    require('../config/defaults');

const dataDirectory =
    path.join(
        process.cwd(),
        'data'
    );

const settingsFile =
    path.join(
        dataDirectory,
        'settings.json'
    );

const temporaryFile =
    `${settingsFile}.tmp`;

const allowedFonts = [
    'Arial',
    'Verdana',
    'Tahoma',
    'Trebuchet MS',
    'Georgia',
    'Courier New',
    'Impact',
    'Times New Roman',
    'Segoe UI',
    'sans-serif',
    'serif',
    'monospace'
];

const allowedWeights = [
    '400',
    '500',
    '600',
    '700',
    '800',
    '900',
    'normal',
    'bold'
];

function ensureStorage() {
    if (
        !fs.existsSync(
            dataDirectory
        )
    ) {
        fs.mkdirSync(
            dataDirectory,
            {
                recursive: true
            }
        );
    }

    if (
        !fs.existsSync(
            settingsFile
        )
    ) {
        writeSettings(
            defaults.settings
        );
    }
}

function readSettingsFile() {
    ensureStorage();

    try {
        const content =
            fs.readFileSync(
                settingsFile,
                'utf8'
            );

        const parsed =
            JSON.parse(content);

        if (
            !parsed ||
            typeof parsed !== 'object' ||
            Array.isArray(parsed)
        ) {
            return {};
        }

        return parsed;
    } catch (error) {
        console.warn(
            '[Settings] Archivo inválido:',
            error.message
        );

        return {};
    }
}

function writeSettings(settings) {
    ensureDirectory();

    fs.writeFileSync(
        temporaryFile,
        JSON.stringify(
            settings,
            null,
            2
        ),
        'utf8'
    );

    fs.renameSync(
        temporaryFile,
        settingsFile
    );
}

function ensureDirectory() {
    if (
        !fs.existsSync(
            dataDirectory
        )
    ) {
        fs.mkdirSync(
            dataDirectory,
            {
                recursive: true
            }
        );
    }
}

function numberValue(
    value,
    fallback,
    minimum,
    maximum
) {
    const parsed =
        Number(value);

    if (
        !Number.isFinite(parsed)
    ) {
        return fallback;
    }

    return Math.max(
        minimum,
        Math.min(
            maximum,
            parsed
        )
    );
}

function booleanValue(
    value,
    fallback
) {
    if (
        typeof value === 'boolean'
    ) {
        return value;
    }

    if (
        value === 'true' ||
        value === '1' ||
        value === 1
    ) {
        return true;
    }

    if (
        value === 'false' ||
        value === '0' ||
        value === 0
    ) {
        return false;
    }

    return fallback;
}

function stringValue(
    value,
    fallback,
    maximumLength
) {
    if (
        value === undefined ||
        value === null
    ) {
        return fallback;
    }

    return String(value)
        .trim()
        .slice(0, maximumLength);
}

function fontValue(
    value,
    fallback
) {
    const font =
        stringValue(
            value,
            fallback,
            40
        );

    return allowedFonts.includes(
        font
    )
        ? font
        : fallback;
}

function weightValue(
    value,
    fallback
) {
    const weight =
        String(
            value || fallback
        );

    return allowedWeights.includes(
        weight
    )
        ? weight
        : fallback;
}

function colorValue(
    value,
    fallback
) {
    const color =
        String(
            value || ''
        ).trim();

    if (
        /^#[0-9a-fA-F]{3,8}$/
            .test(color)
    ) {
        return color;
    }

    if (
        /^rgba?\(\s*[\d\s,.%]+\)$/
            .test(color)
    ) {
        return color;
    }

    return fallback;
}

function normalizeUsername(value) {
    return stringValue(
        value,
        '',
        64
    ).replace(
        /^@/,
        ''
    );
}

function normalizeSettings(input) {
    const source = {
        ...defaults.settings,
        ...(input || {})
    };

    return {
        ...defaults.settings,
        ...source,

        tiktokUsername:
            normalizeUsername(
                source.tiktokUsername
            ),

        width:
            numberValue(
                source.width,
                800,
                320,
                1600
            ),

        height:
            numberValue(
                source.height,
                600,
                240,
                1200
            ),

        commentPoints:
            numberValue(
                source.commentPoints,
                1,
                0,
                1000000
            ),

        commentMultiplier:
            numberValue(
                source.commentMultiplier,
                1,
                0,
                1000
            ),

        likePoints:
            numberValue(
                source.likePoints,
                1,
                0,
                1000000
            ),

        likeMultiplier:
            numberValue(
                source.likeMultiplier,
                1,
                0,
                1000
            ),

        followPoints:
            numberValue(
                source.followPoints,
                1,
                0,
                1000000
            ),

        followMultiplier:
            numberValue(
                source.followMultiplier,
                1,
                0,
                1000
            ),

        sharePoints:
            numberValue(
                source.sharePoints,
                1,
                0,
                1000000
            ),

        shareMultiplier:
            numberValue(
                source.shareMultiplier,
                2,
                0,
                1000
            ),

        giftPoints:
            numberValue(
                source.giftPoints,
                1,
                0,
                1000000
            ),

        giftMultiplier:
            numberValue(
                source.giftMultiplier,
                1,
                0,
                1000
            ),

        maxPointsPerMinute:
            numberValue(
                source.maxPointsPerMinute,
                300,
                0,
                100000000
            ),

        baseRadius:
            numberValue(
                source.baseRadius,
                24,
                5,
                500
            ),

        pointsPerRadius:
            numberValue(
                source.pointsPerRadius,
                4,
                0.01,
                1000
            ),

        maxRadius:
            numberValue(
                source.maxRadius,
                180,
                10,
                1000
            ),

        speed:
            numberValue(
                source.speed,
                1,
                0,
                20
            ),

        showNames:
            booleanValue(
                source.showNames,
                true
            ),

        showPoints:
            booleanValue(
                source.showPoints,
                true
            ),

        showLeaderboard:
            booleanValue(
                source.showLeaderboard,
                true
            ),

        showPodium:
            booleanValue(
                source.showPodium,
                true
            ),

        showChat:
            booleanValue(
                source.showChat,
                true
            ),

        transparentBackground:
            booleanValue(
                source.transparentBackground,
                true
            ),

        chatFontFamily:
            fontValue(
                source.chatFontFamily,
                'Arial'
            ),

        chatFontSize:
            numberValue(
                source.chatFontSize,
                16,
                8,
                72
            ),

        chatFontWeight:
            weightValue(
                source.chatFontWeight,
                '400'
            ),

        chatTextColor:
            colorValue(
                source.chatTextColor,
                '#ffffff'
            ),

        chatTextShadow:
            booleanValue(
                source.chatTextShadow,
                true
            ),

        nameFontFamily:
            fontValue(
                source.nameFontFamily,
                'Arial'
            ),

        nameFontSize:
            numberValue(
                source.nameFontSize,
                14,
                8,
                72
            ),

        nameFontWeight:
            weightValue(
                source.nameFontWeight,
                '700'
            ),

        nameTextColor:
            colorValue(
                source.nameTextColor,
                '#ffffff'
            ),

        nameTextShadow:
            booleanValue(
                source.nameTextShadow,
                true
            )
    };
}

function init() {
    ensureStorage();

    const current =
        readSettingsFile();

    const normalized =
        normalizeSettings(
            current
        );

    writeSettings(
        normalized
    );

    return normalized;
}

function get() {
    ensureStorage();

    const saved =
        readSettingsFile();

    return normalizeSettings(
        saved
    );
}

function update(partial) {
    const current =
        get();

    const next =
        normalizeSettings({
            ...current,
            ...(partial || {})
        });

    writeSettings(
        next
    );

    return next;
}

module.exports = {
    init,
    get,
    update
};