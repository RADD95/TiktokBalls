const fs = require('fs');
const path = require('path');


const dataDirectory = path.join(process.cwd(), 'data');
const colorsFile = path.join(dataDirectory, 'player-colors.json');


const colorNames = {
    // Rojos
    rojo: '#ff0000',
    red: '#ff0000',
    carmesi: '#dc143c',
    carmesí: '#dc143c',
    burdeos: '#800020',
    vino: '#722f37',
    granate: '#800000',
    coral: '#ff7f50',
    salmon: '#fa8072',
    salmón: '#fa8072',
    tomate: '#ff6347',

    // Azules
    azul: '#0000ff',
    blue: '#0000ff',
    celeste: '#87ceeb',
    sky: '#87ceeb',
    navy: '#000080',
    marino: '#000080',
    turquesa: '#40e0d0',
    teal: '#008080',
    aguamarina: '#7fffd4',
    zafiro: '#0f52ba',
    cobalto: '#0047ab',
    indigo: '#4b0082',
    índigo: '#4b0082',
    acero: '#4682b4',
    steel: '#4682b4',

    // Verdes
    lima: '#00ff00',
    lime: '#00ff00',
    esmeralda: '#50c878',
    menta: '#98ff98',
    oliva: '#808000',
    olive: '#808000',
    forest: '#228b22',
    bosque: '#228b22',
    jade: '#00a86b',
    pistacho: '#93c572',

    // Amarillos
    amarillo: '#ffff00',
    yellow: '#ffff00',
    gold: '#ffd700',
    dorado: '#ffd700',
    oro: '#ffd700',
    crema: '#fffdd0',
    beige: '#f5f5dc',
    arena: '#f4a460',
    mostaza: '#ffdb58',

    // Naranjas
    naranja: '#ff8c00',
    orange: '#ff8c00',
    melon: '#ffb347',
    melón: '#ffb347',
    calabaza: '#ff7518',
    ambar: '#ffbf00',
    ámbar: '#ffbf00',

    // Rosas / Magentas
    magenta: '#ff00ff',
    pink: '#ff1493',
    rosa: '#ff1493',
    fucsia: '#ff00ff',
    fuchsia: '#ff00ff',
    hotpink: '#ff69b4',
    rosa_fuerte: '#ff69b4',
    orchid: '#da70d6',
    orquidea: '#da70d6',
    lavender: '#e6e6fa',
    lavanda: '#e6e6fa',

    // Cyans / Azules claros
    cyan: '#00ffff',
    aqua: '#00ffff',
    powder: '#b0e0e6',
    polvo_azul: '#b0e0e6',

    // Blancos / Grises
    blanco: '#ffffff',
    white: '#ffffff',
    gris: '#808080',
    gray: '#808080',
    plateado: '#c0c0c0',
    silver: '#c0c0c0',
    humo: '#708090',
    smoke: '#708090',
    perla: '#eae0c8',
    marfil: '#fffff0',
    ivory: '#fffff0',

    // Negros / Oscuros
    negro: '#000000',
    black: '#000000',
    charcoal: '#36454f',
    carbon: '#36454f',
    onyx: '#0f0f0f',

    // Morados / Púrpuras
    morado: '#800080',
    purple: '#800080',
    violeta: '#ee82ee',
    violet: '#ee82ee',
    lila: '#c8a2c8',
    lilac: '#c8a2c8',
    púrpura: '#9932cc',
    purpura: '#9932cc',
    plum: '#dda0dd',
    ciruela: '#dda0dd',

    // Especiales
    arcoiris: 'rainbow',
    rainbow: 'rainbow'
};


function ensureDirectory() {
    if (!fs.existsSync(dataDirectory)) {
        fs.mkdirSync(dataDirectory, { recursive: true });
    }
}


function readColors() {
    ensureDirectory();


    try {
        const content = fs.readFileSync(colorsFile, 'utf8');
        const parsed = JSON.parse(content);


        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }


        return {};
    } catch {
        return {};
    }
}


function writeColors(colors) {
    ensureDirectory();


    const tempFile = `${colorsFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(colors, null, 2), 'utf8');
    fs.renameSync(tempFile, colorsFile);
}


function parseColorName(name) {
    const normalized = name.toLowerCase().trim();

    if (colorNames[normalized]) {
        return colorNames[normalized];
    }

    if (/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(name)) {
        return name;
    }

    if (/^([0-9a-f]{6}|[0-9a-f]{8})$/i.test(normalized)) {
        return `#${normalized}`;
    }

    return null;
}

function buildColorConfig(args) {
    if (args.length === 0) {
        return null;
    }


    if (args.length === 1) {
        const color = parseColorName(args[0]);
        if (color) {
            return {
                type: color === 'rainbow' ? 'rainbow' : 'solid',
                color1: color === 'rainbow' ? null : color,
                color2: null
            };
        }
        return null;
    }


    if (args.length >= 2) {
        const color1 = parseColorName(args[0]);
        const color2 = parseColorName(args[1]);


        if (color1 && color2 && color1 !== 'rainbow' && color2 !== 'rainbow') {
            return {
                type: 'gradient',
                color1,
                color2
            };
        }


        if (color1 && !color2) {
            return {
                type: 'solid',
                color1,
                color2: null
            };
        }


        if (!color1 && color2) {
            return {
                type: 'solid',
                color1: color2,
                color2: null
            };
        }
    }


    return null;
}


function parseColorCommand(message) {
    if (!message || typeof message !== 'string') {
        return null;
    }


    // !!nombre / !!name
    const nameMatch = message.match(/^!!\s*(nombre|name)\s+(.+)$/i);
    if (nameMatch) {
        const args = nameMatch[2].trim().split(/\s+/);
        const config = buildColorConfig(args);
        if (config) {
            return {
                mode: 'name',
                config
            };
        }
        return null;
    }


    // !!bolita / !!ball
    const ballMatch = message.match(/^!!\s*(bolita|ball)\s+(.+)$/i);
    if (ballMatch) {
        const args = ballMatch[2].trim().split(/\s+/);
        const config = buildColorConfig(args);
        if (config) {
            return {
                mode: 'ball',
                config
            };
        }
        return null;
    }


    return null;
}


function getPlayerColor(userId) {
    const colors = readColors();
    return colors[userId] || null;
}


function setPlayerColor(event, colorConfig, mode = 'name') {
    const colors = readColors();
    const userId = String(event.userId || event.uniqueId || event.username || 'anonymous');

    const existing = colors[userId] || {};

    let result;

    if (mode === 'name') {
        result = {
            ...existing,
            id: userId,
            userId: userId,
            username: event.username || existing.username || '',
            nickname: event.nickname || existing.nickname || '',
            nameColor: colorConfig,
            updatedAt: Date.now()
        };
    } else if (mode === 'ball') {
        result = {
            ...existing,
            id: userId,
            userId: userId,
            username: event.username || existing.username || '',
            nickname: event.nickname || existing.nickname || '',
            ballColor: colorConfig,
            updatedAt: Date.now()
        };
    } else {
        result = {
            ...existing,
            updatedAt: Date.now()
        };
    }

    colors[userId] = result;
    writeColors(colors);

    return colors[userId];
}

function processColorCommand(event) {
    if (event.type !== 'comment') {
        return null;
    }

    const message = event.message || event.comment || '';
    const parsed = parseColorCommand(message);

    // Detectar !!animate directamente
const animateMatch = message.match(/^!!\s*(animate|animar)$/i);
if (animateMatch) {
    const userId = String(event.userId || event.uniqueId || event.username || 'anonymous');
    const colors = readColors();
    const existing = colors[userId];
    const existingConfig = existing?.nameColor;

    let newConfig = existingConfig || null;

    // Si ya es animated → vuelve a gradient (desactiva)
    if (existingConfig?.type === 'animated') {
        newConfig = {
            type: 'gradient',
            color1: existingConfig.color1,
            color2: existingConfig.color2
        };
    }
    // Si es gradient → lo convierte a animated (activa)
    else if (existingConfig?.type === 'gradient' && existingConfig.color1 && existingConfig.color2) {
        newConfig = {
            type: 'animated',
            color1: existingConfig.color1,
            color2: existingConfig.color2
        };
    }
    // Si no tiene gradiente → no hace nada
    else {
        return null;
    }

    const saved = setPlayerColor(event, newConfig, 'name');

    return {
        userId: saved.userId,
        mode: 'name',
        ...saved
    };
}


    if (!parsed) {
        return null;
    }

    const saved = setPlayerColor(event, parsed.config, parsed.mode);

    return {
        userId: saved.userId,
        mode: parsed.mode,
        ...saved
    };
}


module.exports = {
    parseColorCommand,
    getPlayerColor,
    setPlayerColor,
    processColorCommand
};