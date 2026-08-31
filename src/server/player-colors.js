const fs = require('fs');
const path = require('path');


const dataDirectory = path.join(process.cwd(), 'data');
const colorsFile = path.join(dataDirectory, 'player-colors.json');


const colorNames = {
    rojo: '#ff0000',
    red: '#ff0000',
    azul: '#0000ff',
    blue: '#0000ff',
    verde: '#00ff00',
    green: '#00ff00',
    amarillo: '#ffff00',
    yellow: '#ffff00',
    naranja: '#ff8c00',
    orange: '#ff8c00',
    magenta: '#ff00ff',
    pink: '#ff1493',
    rosa: '#ff1493',
    cyan: '#00ffff',
    blanco: '#ffffff',
    white: '#ffffff',
    negro: '#000000',
    black: '#000000',
    morado: '#800080',
    purple: '#800080',
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
    return colorNames[normalized] || null;
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