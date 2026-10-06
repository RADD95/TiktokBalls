const database = require('./database');


const colorNames = {
    // =========================
    // ROJOS
    // =========================
    rojo: '#ff0000',
    red: '#ff0000',
    rojito: '#ff0000',
    rojito: '#ff0000',
    rojo_claro: '#ff6666',
    rojoclaro: '#ff6666',
    rojo_oscuro: '#8b0000',
    rojooscuro: '#8b0000',
    carmesi: '#dc143c',
    carmesí: '#dc143c',
    carmesito: '#dc143c',
    burdeos: '#800020',
    burdeo: '#800020',
    vino: '#722f37',
    vinotinto: '#722f37',
    granate: '#800000',
    granate_oscuro: '#5c0000',
    coral: '#ff7f50',
    coralito: '#ff7f50',
    salmon: '#fa8072',
    salmón: '#fa8072',
    salmon_claro: '#ffa07a',
    salmonclaro: '#ffa07a',
    tomate: '#ff6347',
    ladrillo: '#b22222',
    rojo_ladrillo: '#b22222',
    rojoladrillo: '#b22222',
    rubi: '#e0115f',
    rubí: '#e0115f',
    escarlata: '#ff2400',
    bermellon: '#e34234',
    bermellón: '#e34234',

    // =========================
    // ROSAS / MAGENTAS
    // =========================
    rosa: '#ff1493',
    rosado: '#ff1493',
    rosita: '#ff1493',
    rosita_claro: '#ffb6c1',
    rositaclaro: '#ffb6c1',
    rosa_claro: '#ffb6c1',
    rosaclaro: '#ffb6c1',
    rosa_palo: '#db7093',
    rosapalo: '#db7093',
    rosa_fuerte: '#ff69b4',
    rosafuerte: '#ff69b4',
    rosado_fuerte: '#ff69b4',
    rosadofuerte: '#ff69b4',
    rosa_chicle: '#ff69b4',
    rosachicle: '#ff69b4',
    chicle: '#ff69b4',
    rosa_pastel: '#ffd1dc',
    rosapastel: '#ffd1dc',
    pink: '#ff1493',
    pink_claro: '#ffb6c1',
    pinkclaro: '#ffb6c1',
    hotpink: '#ff69b4',
    hot_pink: '#ff69b4',
    magenta: '#ff00ff',
    magenta_claro: '#ff66ff',
    magentaclaro: '#ff66ff',
    fucsia: '#ff00ff',
    fuchsia: '#ff00ff',
    fucsia_claro: '#ff66ff',
    fuchia: '#ff00ff',
    orchid: '#da70d6',
    orquidea: '#da70d6',
    orquídea: '#da70d6',
    lavanda: '#e6e6fa',
    lavender: '#e6e6fa',
    malva: '#e0b0ff',

    // =========================
    // AZULES
    // =========================
    azul: '#0000ff',
    blue: '#0000ff',
    azulito: '#0000ff',
    azul_claro: '#6495ed',
    azulclaro: '#6495ed',
    azulito_claro: '#87ceeb',
    azulito_claro2: '#add8e6',
    celeste: '#87ceeb',
    celestito: '#87ceeb',
    celeste_claro: '#b0e0e6',
    celesteclaro: '#b0e0e6',
    cielo: '#87ceeb',
    sky: '#87ceeb',
    skyblue: '#87ceeb',
    azul_cielo: '#87ceeb',
    azulcielo: '#87ceeb',
    azul_oscuro: '#00008b',
    azuloscuro: '#00008b',
    azul_marino: '#000080',
    azulmarino: '#000080',
    marino: '#000080',
    navy: '#000080',
    turquesa: '#40e0d0',
    turquesita: '#40e0d0',
    teal: '#008080',
    aguamarina: '#7fffd4',
    aguamarina_clara: '#7fffd4',
    zafiro: '#0f52ba',
    zafiro_claro: '#2f6fca',
    cobalto: '#0047ab',
    indigo: '#4b0082',
    índigo: '#4b0082',
    añil: '#4b0082',
    anil: '#4b0082',
    acero: '#4682b4',
    steel: '#4682b4',
    azul_electrico: '#7df9ff',
    azulelectrico: '#7df9ff',
    azul_petroleo: '#003b46',
    azulpetroleo: '#003b46',
    azul_real: '#4169e1',
    azulreal: '#4169e1',
    royalblue: '#4169e1',
    azul_prusia: '#003153',
    azulprusia: '#003153',

    // =========================
    // VERDES
    // =========================
    verde: '#00ff00',
    green: '#00ff00',
    verdecito: '#00ff00',
    verde_claro: '#90ee90',
    verdeclaro: '#90ee90',
    verdecito_claro: '#98fb98',
    verdecitoclaro: '#98fb98',
    verde_pastel: '#77dd77',
    verdepastel: '#77dd77',
    verde_menta: '#98ff98',
    verdementa: '#98ff98',
    menta: '#98ff98',
    mentita: '#98ff98',
    verde_lima: '#32cd32',
    verdelima: '#32cd32',
    lima: '#00ff00',
    lime: '#00ff00',
    verde_oscuro: '#006400',
    verdeoscuro: '#006400',
    verde_bosque: '#228b22',
    verdebosque: '#228b22',
    bosque: '#228b22',
    forest: '#228b22',
    verde_esmeralda: '#50c878',
    verdeesmeralda: '#50c878',
    esmeralda: '#50c878',
    esmeraldita: '#50c878',
    verde_jade: '#00a86b',
    verdejade: '#00a86b',
    jade: '#00a86b',
    verde_oliva: '#808000',
    verdeoliva: '#808000',
    oliva: '#808000',
    olive: '#808000',
    verde_pistacho: '#93c572',
    verdepistacho: '#93c572',
    pistacho: '#93c572',
    verde_manzana: '#8db600',
    verdemanzana: '#8db600',
    manzana: '#8db600',
    verde_neon: '#39ff14',
    verdeneon: '#39ff14',
    verde_neón: '#39ff14',
    verde_musgo: '#8a9a5b',
    verdemusgo: '#8a9a5b',
    musgo: '#8a9a5b',
    verde_militar: '#4b5320',
    verdemilitar: '#4b5320',
    verde_salvia: '#9dc183',
    verdesalvia: '#9dc183',
    salvia: '#9dc183',
    verde_agua: '#2e8b57',
    verdeagua: '#2e8b57',
    verde_turquesa: '#00a86b',
    verdeturquesa: '#00a86b',
    chartreuse: '#7fff00',

    // =========================
    // AMARILLOS
    // =========================
    amarillo: '#ffff00',
    yellow: '#ffff00',
    amarillito: '#ffff00',
    amarillo_claro: '#ffff99',
    amarilloclaro: '#ffff99',
    amarillo_pastel: '#fff59d',
    amarillopastel: '#fff59d',
    amarillo_oscuro: '#cc9900',
    amarillooscuro: '#cc9900',
    dorado: '#ffd700',
    gold: '#ffd700',
    oro: '#ffd700',
    doradito: '#ffd700',
    amarillo_oro: '#ffd700',
    amarillooro: '#ffd700',
    limon: '#fff700',
    limón: '#fff700',
    limoncito: '#fff700',
    crema: '#fffdd0',
    cremoso: '#fffdd0',
    beige: '#f5f5dc',
    arena: '#f4a460',
    arenita: '#f4a460',
    mostaza: '#ffdb58',
    mostaza_oscura: '#c9a227',
    mostazaoscura: '#c9a227',
    vainilla: '#f3e5ab',
    canario: '#ffef00',

    // =========================
    // NARANJAS
    // =========================
    naranja: '#ff8c00',
    orange: '#ff8c00',
    naranjita: '#ff8c00',
    naranja_claro: '#ffb347',
    naranja_claro: '#ffb347',
    naranjaclaro: '#ffb347',
    naranja_oscuro: '#cc5500',
    naranjaoscuro: '#cc5500',
    naranja_pastel: '#ffcc99',
    naranjapastel: '#ffcc99',
    melon: '#ffb347',
    melón: '#ffb347',
    meloncito: '#ffb347',
    calabaza: '#ff7518',
    calabacita: '#ff7518',
    ambar: '#ffbf00',
    ámbar: '#ffbf00',
    ambarino: '#ffbf00',
    mandarina: '#ff9500',
    mandarinita: '#ff9500',
    durazno: '#ffcba4',
    duraznito: '#ffcba4',
    melocoton: '#ffcba4',
    melocotón: '#ffcba4',
    terracota: '#e2725b',
    cobre: '#b87333',
    copper: '#b87333',

    // =========================
    // MORADOS / PÚRPURAS
    // =========================
    morado: '#800080',
    moradito: '#800080',
    purple: '#800080',
    morado_claro: '#b19cd9',
    moradoclaro: '#b19cd9',
    moradito_claro: '#c8a2c8',
    moraditoclaro: '#c8a2c8',
    morado_oscuro: '#4b0082',
    moradooscuro: '#4b0082',
    violeta: '#ee82ee',
    violet: '#ee82ee',
    violetita: '#ee82ee',
    lila: '#c8a2c8',
    lilac: '#c8a2c8',
    lilita: '#c8a2c8',
    purpura: '#9932cc',
    púrpura: '#9932cc',
    purpurita: '#9932cc',
    plum: '#dda0dd',
    ciruela: '#dda0dd',
    berenjena: '#614051',
    uva: '#6f2da8',
    uvita: '#6f2da8',
    amatista: '#9966cc',
    amethyst: '#9966cc',

    // =========================
    // CYANS
    // =========================
    cyan: '#00ffff',
    cian: '#00ffff',
    cianito: '#00ffff',
    aqua: '#00ffff',
    aquita: '#00ffff',
    aguamarina: '#7fffd4',
    turquesa: '#40e0d0',
    turquesita: '#40e0d0',
    turquesa_claro: '#7fe5d6',
    turquesaclaro: '#7fe5d6',
    cyan_claro: '#80ffff',
    cyanclaro: '#80ffff',
    aqua_claro: '#80ffff',
    aquaclaro: '#80ffff',
    menta_azulada: '#aaf0d1',
    mentaazulada: '#aaf0d1',

    // =========================
    // BLANCOS
    // =========================
    blanco: '#ffffff',
    white: '#ffffff',
    blanquito: '#ffffff',
    blanco_claro: '#ffffff',
    blancoclaro: '#ffffff',
    blanco_hueso: '#f5f5dc',
    blancohueso: '#f5f5dc',
    hueso: '#f5f5dc',
    marfil: '#fffff0',
    ivory: '#fffff0',
    perlado: '#eae0c8',
    perla: '#eae0c8',
    nieve: '#fffafa',
    snow: '#fffafa',
    leche: '#fffaf0',

    // =========================
    // GRISES / PLATEADOS
    // =========================
    gris: '#808080',
    gray: '#808080',
    grisito: '#808080',
    gris_claro: '#d3d3d3',
    grisclaro: '#d3d3d3',
    grisito_claro: '#d3d3d3',
    grisitoclaro: '#d3d3d3',
    gris_oscuro: '#404040',
    grisoscuro: '#404040',
    plata: '#c0c0c0',
    plateado: '#c0c0c0',
    plateadito: '#c0c0c0',
    silver: '#c0c0c0',
    humo: '#708090',
    smoke: '#708090',
    grafito: '#383838',
    graphite: '#383838',
    ceniza: '#b2beb5',
    cenizaoscura: '#6e6e6e',
    titanio: '#878681',

    // =========================
    // NEGROS / OSCUROS
    // =========================
    negro: '#000000',
    black: '#000000',
    negrito: '#000000',
    negro_claro: '#222222',
    negroclaro: '#222222',
    negro_oscuro: '#050505',
    negrooscuro: '#050505',
    carbon: '#36454f',
    carbón: '#36454f',
    charcoal: '#36454f',
    carboncito: '#36454f',
    onyx: '#0f0f0f',
    ónix: '#0f0f0f',
    onix: '#0f0f0f',
    obsidiana: '#0b0b0b',
    obsidiana_clara: '#1a1a1a',
    obsidianaclara: '#1a1a1a',

    // =========================
    // CAFÉS / MARRONES
    // =========================
    cafe: '#8b4513',
    café: '#8b4513',
    cafecito: '#8b4513',
    marron: '#8b4513',
    marrón: '#8b4513',
    marroncito: '#8b4513',
    brown: '#8b4513',
    cafe_claro: '#a0522d',
    café_claro: '#a0522d',
    cafeclaro: '#a0522d',
    caféclaro: '#a0522d',
    marron_claro: '#a0522d',
    marronclaro: '#a0522d',
    cafe_oscuro: '#5c3317',
    café_oscuro: '#5c3317',
    cafeoscuro: '#5c3317',
    caféoscuro: '#5c3317',
    marron_oscuro: '#5c3317',
    marronoscuro: '#5c3317',
    chocolate: '#7b3f00',
    chocolatito: '#7b3f00',
    canela: '#d2691e',
    canelita: '#d2691e',
    moka: '#967969',
    moca: '#967969',
    caramelo: '#af6e4d',
    caramelito: '#af6e4d',
    avellana: '#b5651d',
    nuez: '#773f1a',
    tierra: '#a0522d',
    tierra_oscura: '#654321',
    tierraoscura: '#654321',

    // =========================
    // COLORES ESPECIALES
    // =========================
    arcoiris: 'rainbow',
    arco_iris: 'rainbow',
    rainbow: 'rainbow',
    prismacolor: 'rainbow'
};


function ensureDirectory() {
}


function readColors(workspaceId = null) {
    try {
        return database.getWorkspaceColors(workspaceId || 'legacy');
    } catch {
        return {};
    }
}


function writeColors(colors, workspaceId = null) {
    if (workspaceId) {
        database.setWorkspaceColors(workspaceId, colors);
        return;
    }

    database.setWorkspaceColors('legacy', colors);
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

    // Detectar rainbow explícito
    if (args.length === 1 && args[0].toLowerCase() === 'rainbow') {
        return {
            type: 'rainbow',
            colors: null
        };
    }

    // Parsear todos los colores (máximo 7)
    const colors = [];
    for (let i = 0; i < Math.min(args.length, 7); i += 1) {
        const color = parseColorName(args[i]);
        if (color && color !== 'rainbow') {
            colors.push(color);
        }
    }

    if (colors.length === 0) {
        return null;
    }

    // Un color = sólido
    if (colors.length === 1) {
        return {
            type: 'solid',
            colors
        };
    }

    // 2 a 7 colores = gradiente
    return {
        type: 'gradient',
        colors
    };
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


function getPlayerColor(userId, workspaceId = null) {
    const colors = readColors(workspaceId);
    return colors[userId] || null;
}


function setPlayerColor(event, colorConfig, mode = 'name', workspaceId = null) {
    const colors = readColors(workspaceId);
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
    writeColors(colors, workspaceId);

    return colors[userId];
}

function processColorCommand(event, workspaceId = null) {
    if (event.type !== 'comment') {
        return null;
    }

    const message = event.message || event.comment || '';
    const parsed = parseColorCommand(message);

    // Detectar !!animate directamente
    const animateMatch = message.match(/^!!\s*(animate|animar)$/i);
    if (animateMatch) {
        const userId = String(event.userId || event.uniqueId || event.username || 'anonymous');
        const colors = readColors(workspaceId);
        const existing = colors[userId];
        const existingConfig = existing?.nameColor;

        let newConfig = existingConfig || null;

        // Si ya es animated → vuelve a gradient (desactiva)
        if (existingConfig?.type === 'animated') {
            newConfig = {
                type: 'gradient',
                colors: existingConfig.colors
            };
        }
        // Si es gradient con 2+ colores → lo convierte a animated (activa)
        else if (existingConfig?.type === 'gradient' && Array.isArray(existingConfig.colors) && existingConfig.colors.length >= 2) {
            newConfig = {
                type: 'animated',
                colors: existingConfig.colors
            };
        }
        // Si no tiene gradiente válido → no hace nada
        else {
            return null;
        }

        const saved = setPlayerColor(event, newConfig, 'name', workspaceId);

        return {
            userId: saved.userId,
            mode: 'name',
            ...saved
        };
    }

    if (!parsed) {
        return null;
    }

    const saved = setPlayerColor(event, parsed.config, parsed.mode, workspaceId);

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
    processColorCommand,
    forWorkspace(workspaceId) {
        return {
            getPlayerColor: userId => getPlayerColor(userId, workspaceId),
            setPlayerColor: (event, config, mode) => setPlayerColor(event, config, mode, workspaceId),
            processColorCommand: event => processColorCommand(event, workspaceId)
        };
    }
};