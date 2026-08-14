require('dotenv').config();

const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');

const {
    Server
} = require('socket.io');

const defaults =
    require('../config/defaults');

const settingsStore =
    require('./settings');

const gameState =
    require('./game-state');

const points =
    require('./points');

const createSocketApi =
    require('../realtime/socket');

const tiktok =
    require('./tiktok');

const app =
    express();

const server =
    http.createServer(app);

const io =
    new Server(server, {
        cors: {
            origin: '*'
        }
    });

const realtime =
    createSocketApi(
        io,
        gameState
    );

const GAME_TICK_MS = 50;

let connectionState = {
    connected: false,
    connecting: false,
    username:
        settingsStore.get()
            .tiktokUsername || null,
    status: 'disconnected',
    error: null
};

app.use(
    cors()
);

app.use(
    express.json()
);

app.use(
    express.static(
        path.join(
            process.cwd(),
            'public'
        )
    )
);

function requireOverlayToken(
    req,
    res,
    next
) {
    const queryToken =
        req.query.token;

    const headerToken =
        req.headers[
        'x-overlay-token'
        ];

    const receivedToken =
        queryToken ||
        headerToken;

    if (
        receivedToken !==
        defaults.overlayToken
    ) {
        return res
            .status(401)
            .send(
                'Overlay token invalido'
            );
    }

    next();
}

function getAllowedSettings() {
    return [
        'tiktokUsername',

        'width',
        'height',

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
        'showPoints',
        'showLeaderboard',
        'showPodium',
        'showChat',
        'transparentBackground',

        'nameFontFamily',
        'nameFontSize',
        'nameFontWeight',
        'nameTextColor',
        'nameTextShadow',

        'chatFontFamily',
        'chatFontSize',
        'chatFontWeight',
        'chatTextColor',
        'chatTextShadow',

        'rankingLimit',
        'rankingFontFamily',
        'rankingFontSize',
        'rankingFontWeight',
        'rankingTextColor',
        'rankingTitleColor',
        'rankingPointsColor',
        'rankingTitleSize',

        'podiumLimit',
        'podiumFontFamily',
        'podiumFontSize',
        'podiumFontWeight',
        'podiumTextColor',
        'podiumTitleColor',
        'podiumWinsColor',
        'podiumTitleSize'
    ];
}

function getPublicState() {
    return gameState.snapshot();
}

function emitState() {
    const state =
        getPublicState();

    io.emit(
        'state:update',
        state
    );

    return state;
}

function emitGameTick() {
    /*
     * La física, las colisiones, las absorciones
     * y el ganador se procesan dentro de socket.js.
     */
    realtime.tick(
        GAME_TICK_MS / 1000
    );
}

app.get(
    '/',
    (_req, res) => {
        res.redirect(
            '/test/'
        );
    }
);

app.get(
    '/api/health',
    (_req, res) => {
        res.json({
            ok: true,
            service: 'tiktok-balls',
            connection:
                connectionState,
            players:
                gameState.list().length,
            uptime:
                process.uptime()
        });
    }
);

app.get(
    '/api/connection',
    (_req, res) => {
        res.json(
            connectionState
        );
    }
);

app.get(
    '/api/settings',
    (_req, res) => {
        res.json(
            settingsStore.get()
        );
    }
);

app.get(
    '/api/overlay-url',
    (req, res) => {
        const overlayUrl =
            `${req.protocol}://${req.get('host')}` +
            `/overlay/?token=` +
            encodeURIComponent(
                defaults.overlayToken
            );

        res.json({
            url: overlayUrl
        });
    }
);

app.put(
    '/api/settings',
    (req, res) => {
        const allowedKeys =
            getAllowedSettings();

        const receivedSettings =
            req.body || {};

        const settingsToUpdate =
            Object.fromEntries(
                Object.entries(
                    receivedSettings
                ).filter(
                    ([key]) =>
                        allowedKeys.includes(
                            key
                        )
                )
            );

        const previousSettings =
            settingsStore.get();

        const updatedSettings =
            settingsStore.update(
                settingsToUpdate
            );

        const sizeChanged =
            Number(previousSettings.width) !==
            Number(updatedSettings.width) ||
            Number(previousSettings.height) !==
            Number(updatedSettings.height);

        if (sizeChanged) {
            io.emit(
                'arena:resize',
                {
                    width:
                        updatedSettings.width,

                    height:
                        updatedSettings.height
                }
            );
        }

        realtime.state();

        res.json(
            updatedSettings
        );
    }
);

app.post(
    '/api/connect',
    async (req, res) => {
        const username =
            String(
                req.body?.username || ''
            )
                .trim()
                .replace(/^@/, '');

        if (!username) {
            return res.status(400).json({
                ok: false,
                error:
                    'Debes escribir un usuario de TikTok'
            });
        }

        try {
            connectionState = {
                connected: false,
                connecting: true,
                username,
                status: 'connecting',
                error: null
            };

            io.emit(
                'connection',
                connectionState
            );

            settingsStore.update({
                tiktokUsername:
                    username
            });

            const result =
                await tiktok.connect(
                    username
                );

            connectionState = {
                connected: true,
                connecting: false,
                username:
                    result.username ||
                    username,
                status: 'connected',
                error: null
            };

            io.emit(
                'connection',
                connectionState
            );

            realtime.state();

            res.json({
                ok: true,
                ...result
            });
        } catch (error) {
            connectionState = {
                connected: false,
                connecting: false,
                username,
                status: 'error',
                error:
                    error?.message ||
                    String(error)
            };

            io.emit(
                'connection',
                connectionState
            );

            res.status(400).json({
                ok: false,
                error:
                    error?.message ||
                    String(error)
            });
        }
    }
);

app.post(
    '/api/disconnect',
    async (_req, res) => {
        try {
            if (
                typeof tiktok.disconnect ===
                'function'
            ) {
                await tiktok.disconnect();
            }

            connectionState = {
                connected: false,
                connecting: false,
                username: null,
                status: 'disconnected',
                error: null
            };

            io.emit(
                'connection',
                connectionState
            );

            realtime.state();

            res.json({
                ok: true
            });
        } catch (error) {
            res.status(400).json({
                ok: false,
                error:
                    error?.message ||
                    String(error)
            });
        }
    }
);

app.post(
    '/api/reset',
    (_req, res) => {
        gameState.reset();

        realtime.reset();
        realtime.state();

        res.json({
            ok: true
        });
    }
);

function processTestEvent(
    type,
    req,
    res
) {
    const username =
        req.body?.username ||
        'Tester';

    const event = {
        type,

        userId:
            String(
                req.body?.userId ||
                username
            ),

        uniqueId:
            username,

        username,

        nickname:
            username,

        avatar:
            req.body?.avatar || '',

        likeCount:
            Number(
                req.body?.likeCount || 1
            ),

        followCount:
            Number(
                req.body?.followCount || 1
            ),

        shareCount:
            Number(
                req.body?.shareCount || 1
            ),

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
            Number(
                req.body?.repeatCount || 1
            ),

        diamondCount:
            Number(
                req.body?.diamondCount || 1
            )
    };

    const earnedPoints =
        points.points(
            event
        );

    let player = null;

    if (earnedPoints) {
        player =
            gameState.add(
                event,
                earnedPoints
            );
    }

    realtime.event({
        ...event,
        points:
            earnedPoints || 0
    });

    realtime.state();

    res.json({
        ok: true,
        points:
            earnedPoints || 0,
        player
    });
}

app.post(
    '/api/test/comment',
    (req, res) => {
        processTestEvent(
            'comment',
            req,
            res
        );
    }
);

app.post(
    '/api/test/like',
    (req, res) => {
        processTestEvent(
            'like',
            req,
            res
        );
    }
);

app.post(
    '/api/test/follow',
    (req, res) => {
        processTestEvent(
            'follow',
            req,
            res
        );
    }
);

app.post(
    '/api/test/share',
    (req, res) => {
        processTestEvent(
            'share',
            req,
            res
        );
    }
);

app.post(
    '/api/test/gift',
    (req, res) => {
        processTestEvent(
            'gift',
            req,
            res
        );
    }
);

app.get(
    '/overlay/',
    //requireOverlayToken,
    (_req, res) => {
        res.sendFile(
            path.join(
                process.cwd(),
                'public',
                'overlay',
                'index.html'
            )
        );
    }
);

app.get(
    '/overlay/ranking',
    //requireOverlayToken,
    (_req, res) => {
        res.sendFile(
            path.join(
                process.cwd(),
                'public',
                'overlay',
                'ranking.html'
            )
        );
    }
);


app.get(
    '/overlay/podium',
    //requireOverlayToken,
    (_req, res) => {
        res.sendFile(
            path.join(
                process.cwd(),
                'public',
                'overlay',
                'podium.html'
            )
        );
    }
);

app.get(
    '/overlay',
    requireOverlayToken,
    (_req, res) => {
        res.sendFile(
            path.join(
                process.cwd(),
                'public',
                'overlay',
                'index.html'
            )
        );
    }
);

io.on(
    'connection',
    (socket) => {
        socket.emit(
            'state:init',
            getPublicState()
        );

        socket.emit(
            'connection',
            connectionState
        );
    }
);

setInterval(
    emitGameTick,
    GAME_TICK_MS
);

const port =
    defaults.port;

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

tiktok.init(
    realtime
);