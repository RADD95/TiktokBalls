require('dotenv').config();

const path = require('path');
const http = require('http');

const express = require('express');
const cors = require('cors');

const {
    Server
} = require('socket.io');

const defaults = require('../config/defaults');
const settingsStore = require('./settings');
const gameState = require('./game-state');
const points = require('./points');
const createSocketApi = require('../realtime/socket');
const tiktok = require('./tiktok');

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

const realtime = createSocketApi(
    io,
    gameState
);

app.use(cors());

app.use(express.json());

app.use(
    express.static(
        path.join(process.cwd(), 'public')
    )
);

function requireOverlayToken(req, res, next) {
    const queryToken = req.query.token;
    const headerToken = req.headers['x-overlay-token'];

    const receivedToken =
        queryToken ||
        headerToken;

    if (
        receivedToken !== defaults.overlayToken
    ) {
        return res
            .status(401)
            .send('Overlay token invalido');
    }

    next();
}

app.get('/', (_req, res) => {
    res.redirect('/test/');
});

app.get('/api/settings', (_req, res) => {
    res.json(
        settingsStore.get()
    );
});

app.get('/api/overlay-url', (req, res) => {
    const overlayUrl =
        `${req.protocol}://${req.get('host')}/overlay/?token=${encodeURIComponent(
            defaults.overlayToken
        )}`;

    res.json({
        url: overlayUrl
    });
});

app.put('/api/settings', (req, res) => {
    const allowedKeys = [
        'tiktokUsername',

        'commentPoints',
        'commentMultiplier',

        'likePoints',
        'likeMultiplier',

        'followPoints',
        'followMultiplier',

        'sharePoints',
        'shareMultiplier',

        'giftPoints',
        'giftMultiplier',

        'maxPointsPerMinute',

        'baseRadius',
        'pointsPerRadius',
        'maxRadius',
        'speed',

        'showNames',
        'showLeaderboard',
        'showPodium'
    ];

    const receivedSettings = req.body || {};

    const settingsToUpdate = Object.fromEntries(
        Object.entries(receivedSettings)
            .filter(([key]) => allowedKeys.includes(key))
    );

    const updatedSettings =
        settingsStore.update(settingsToUpdate);

    realtime.state();

    res.json(updatedSettings);
});

app.post('/api/connect', async (req, res) => {
    try {
        const username = String(
            req.body?.username || ''
        ).trim();

        if (!username) {
            return res.status(400).json({
                ok: false,
                error: 'Debes escribir un usuario de TikTok'
            });
        }

        settingsStore.update({
            tiktokUsername: username
        });

        const result =
            await tiktok.connect(username);

        res.json({
            ok: true,
            ...result
        });
    } catch (error) {
        res.status(400).json({
            ok: false,
            error: error?.message || String(error)
        });
    }
});

app.post('/api/reset', (_req, res) => {
    gameState.reset();

    realtime.reset();
    realtime.state();

    res.json({
        ok: true
    });
});

function processTestEvent(type, req, res) {
    const username =
        req.body?.username ||
        'Tester';

    const event = {
        type,

        userId: username,

        username,

        nickname: username,

        avatar: req.body?.avatar || '',

        likeCount:
            Number(req.body?.likeCount || 1),

        followCount:
            Number(req.body?.followCount || 1),

        shareCount:
            Number(req.body?.shareCount || 1),

        comment:
            req.body?.comment ||
            req.body?.message ||
            '',

        message:
            req.body?.message ||
            req.body?.comment ||
            '',

        giftName:
            req.body?.giftName ||
            'Gift',

        repeatCount:
            Number(req.body?.repeatCount || 1),

        diamondCount:
            Number(req.body?.diamondCount || 1)
    };

    const earnedPoints =
        points.points(event);

    if (earnedPoints) {
        gameState.add(
            event,
            earnedPoints
        );
    }

    realtime.event({
        ...event,
        points: earnedPoints
    });

    realtime.state();

    res.json({
        ok: true,
        points: earnedPoints
    });
}

app.post('/api/test/comment', (req, res) => {
    processTestEvent(
        'comment',
        req,
        res
    );
});

app.post('/api/test/gift', (req, res) => {
    processTestEvent(
        'gift',
        req,
        res
    );
});

app.get(
    '/overlay/',
    requireOverlayToken,
    (_req, res) => {
        res.sendFile(
            path.join(
                process.cwd(),
                'public/overlay/index.html'
            )
        );
    }
);

const port = defaults.port;

server.listen(
    port,
    () => {
        console.log(
            `Test http://localhost:${port}/test/`
        );

        console.log(
            `Settings http://localhost:${port}/settings/`
        );

        console.log(
            `Overlay http://localhost:${port}/overlay/`
        );

        console.log(
            '[TikTok] Conexión automática desactivada'
        );
    }
);

// Inicializa Socket.IO para TikTok,
// pero no conecta automáticamente al LIVE.
tiktok.init(realtime);