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

const auth =
    require('./auth');

const database =
    require('./database');

const { createRuntime } =
    require('./runtime');

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

const { MarblesRoundManager, GAME_STATES } = require('./game/marbles-round-manager');
const marblesManager = new MarblesRoundManager();

const server =
    http.createServer(app);

const allowedOrigin =
    'http://overlay.cholate.online';

const allowedOrigins = new Set([
    allowedOrigin,
    'http://localhost:3000',
    'http://127.0.0.1:3000'
]);

const io =
    new Server(server, {
        cors: {
            origin: (origin, callback) => {

                if (
                    !origin ||
                    allowedOrigins.has(origin)
                ) {
                    return callback(null, true);
                }

                console.warn(
                    `[CORS] Origen invalido: ${origin}`
                );

                callback(
                    new Error('Origen CORS invalido')
                );
            }
        }
    });

io.use(
    (socket, next) => {
        const session = auth.getSessionFromRequest({
            headers: socket.handshake.headers
        });

        const overlayToken =
            socket.handshake.auth?.token ||
            socket.handshake.query?.token;
        const overlayWorkspace =
            database.getWorkspaceByOverlayToken(overlayToken);

        socket.data.workspaceId =
            session?.workspaceId ||
            overlayWorkspace?.workspaceId ||
            'legacy';

        if (socket.data.workspaceId !== 'legacy') {
            getRuntimeForRequest({
                auth: {
                    workspaceId: socket.data.workspaceId
                }
            });
        }

        next();
    }
);

const realtime =
    createSocketApi(
        io,
        gameState,
        marblesManager,
        'legacy'
    );

const runtimes = new Map();

function getRuntimeForRequest(req, requestedWorkspaceId = null) {
    const sessionWorkspaceId = req.auth?.workspaceId || 'legacy';
    const canSelectWorkspace = ['owner', 'admin'].includes(req.auth?.role);
    const workspaceId =
        requestedWorkspaceId && canSelectWorkspace
            ? requestedWorkspaceId
            : sessionWorkspaceId;

    if (
        requestedWorkspaceId &&
        workspaceId !== requestedWorkspaceId
    ) {
        throw new Error('No puedes enviar pruebas a ese workspace');
    }

    if (workspaceId !== 'legacy' && !database.getWorkspaceById(workspaceId)) {
        throw new Error('Workspace no encontrado');
    }

    if (workspaceId === 'legacy') {
        return {
            settings: settingsStore,
            gameState,
            marblesManager,
            realtime,
            tiktok,
            points
        };
    }

    if (!runtimes.has(workspaceId)) {
        runtimes.set(
            workspaceId,
            createRuntime(io, workspaceId)
        );
    }

    return runtimes.get(workspaceId);
}

marblesManager.startLoop(
    (roundData) => {
        io.to('legacy').emit('marbles:round-tick', roundData);
    },
    () => {
        if (typeof realtime.finishMarblesRound === 'function') {
            realtime.finishMarblesRound();
        }
    }
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
    cors({
        origin: (origin, callback) => {

            if (
                !origin ||
                allowedOrigins.has(origin)
            ) {
                return callback(null, true);
            }

            console.warn(
                `[CORS] Origen invalido: ${origin}`
            );

            callback(
                new Error('Origen CORS invalido')
            );
        }
    })
);

app.use(
    express.json()
);

app.get(
    '/favicon.ico',
    (_req, res) => res.status(204).end()
);

app.post(
    '/api/auth/register',
    (req, res) => {
        try {
            const result = auth.register({
                username: req.body?.username,
                password: req.body?.password,
                displayName: req.body?.displayName,
                workspaceName: req.body?.workspaceName
            });

            auth.setSessionCookie(res, result.session);
            res.status(201).json({
                ok: true,
                user: {
                    username: result.user.username,
                    displayName: result.user.displayName
                },
                workspace: result.workspace
            });
        } catch (error) {
            res.status(400).json({
                ok: false,
                error: error.message
            });
        }
    }
);

app.post(
    '/api/auth/login',
    (req, res) => {
        try {
            const result = auth.login(
                req.body?.username,
                req.body?.password
            );

            auth.setSessionCookie(res, result.session);
            res.json({
                ok: true,
                user: {
                    username: result.user.username,
                    displayName: result.user.display_name
                },
                workspace: result.workspace
            });
        } catch (error) {
            res.status(401).json({
                ok: false,
                error: error.message
            });
        }
    }
);

app.post(
    '/api/auth/logout',
    (req, res) => {
        auth.clearSession(req, res);
        res.json({ ok: true });
    }
);

app.get(
    '/api/auth/me',
    (req, res) => {
        const session = auth.getSessionFromRequest(req);
        if (!session) {
            return res.status(401).json({ ok: false });
        }

        res.json({
            ok: true,
            user: {
                username: session.username,
                displayName: session.displayName
            },
            workspaceId: session.workspaceId,
            role: session.role
        });
    }
);

app.put(
    '/api/account',
    auth.requireAuth,
    (req, res) => {
        try {
            const user = auth.updateAccount(req.auth.userId, {
                username: req.body?.username,
                password: req.body?.password,
                displayName: req.body?.displayName
            });

            res.json({
                ok: true,
                user: {
                    username: user.username,
                    displayName: user.display_name
                }
            });
        } catch (error) {
            res.status(400).json({ ok: false, error: error.message });
        }
    }
);

app.get(
    '/api/admin/accounts',
    auth.requireAuth,
    auth.requireAdmin,
    (_req, res) => {
        res.json({ ok: true, accounts: auth.listAccounts() });
    }
);

app.post(
    '/api/admin/accounts',
    auth.requireAuth,
    auth.requireAdmin,
    (req, res) => {
        try {
            const result = auth.createAccount({
                username: req.body?.username,
                password: req.body?.password,
                displayName: req.body?.displayName,
                workspaceName: req.body?.workspaceName,
                role: 'viewer',
                createSession: false
            });

            res.status(201).json({
                ok: true,
                account: {
                    username: result.user.username,
                    displayName: result.user.displayName,
                    workspace: result.workspace
                }
            });
        } catch (error) {
            res.status(400).json({ ok: false, error: error.message });
        }
    }
);

app.patch(
    '/api/admin/accounts/:userId',
    auth.requireAuth,
    auth.requireAdmin,
    (req, res) => {
        try {
            const user = auth.updateAccount(req.params.userId, {
                username: req.body?.username,
                password: req.body?.password,
                displayName: req.body?.displayName
            });

            res.json({ ok: true, account: user });
        } catch (error) {
            res.status(400).json({ ok: false, error: error.message });
        }
    }
);

app.delete(
    '/api/admin/accounts/:userId',
    auth.requireAuth,
    auth.requireAdmin,
    (req, res) => {
        try {
            auth.deleteAccount(req.auth.userId, req.params.userId);
            res.json({ ok: true });
        } catch (error) {
            res.status(400).json({ ok: false, error: error.message });
        }
    }
);

app.use(
    (req, res, next) => {
        const isPublicApi =
            req.path === '/api/health' ||
            req.path.startsWith('/api/auth/');

        const needsPanelAuth =
            req.path === '/' ||
            req.path.startsWith('/test') ||
            (req.path.startsWith('/api/') && !isPublicApi);

        if (!needsPanelAuth) {
            return next();
        }

        return auth.requireAuth(req, res, next);
    }
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

    const workspace =
        database.getWorkspaceByOverlayToken(receivedToken);

    if (!workspace && receivedToken !== defaults.overlayToken) {
        return res
            .status(401)
            .send(
                'Overlay token invalido'
            );
    }

    req.overlayWorkspaceId = workspace?.workspaceId || 'legacy';

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
        'gameMode',
        'marbleGravity',
        'marblePegRadius',
        'marbleRows',
        'marbleCols',
        'marblesRoundDuration',
        'marblesCountdownDuration',
        'battleDamage',
        'battleRespawn',
        'battleScaledDamage',
        'battleDamageMultiplier',
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
    const currentSettings = settingsStore.get();
    
    // Si estamos en modo canicas, evaluar el inicio de ronda de forma global
    if (currentSettings.gameMode === 'marbles') {
        const activeCount = gameState.list().length;
        if (marblesManager.state === 'LOBBY' && activeCount >= 2) {
            marblesManager.triggerStart();
        }
    }

    realtime.tick(
        GAME_TICK_MS / 1000
    );
}

function emitWorkspaceGameTicks() {
    for (const runtime of runtimes.values()) {
        const currentSettings = runtime.settings.get();

        if (currentSettings.gameMode === 'marbles') {
            const activeCount = runtime.gameState.list().length;
            if (
                runtime.marblesManager.state === GAME_STATES.LOBBY &&
                activeCount >= 2
            ) {
                runtime.marblesManager.triggerStart();
            }
        }

        runtime.realtime.tick(
            GAME_TICK_MS / 1000
        );
    }
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
    (req, res) => {
        const runtime = getRuntimeForRequest(req);
        res.json(
            runtime.tiktok.status()
        );
    }
);

app.get(
    '/api/settings',
    (req, res) => {
        const runtime = getRuntimeForRequest(req);
        res.json(
            runtime.settings.get()
        );
    }
);

app.get(
    '/api/overlay-url',
    (req, res) => {
        const workspaceId = req.auth?.workspaceId || 'legacy';
        const token = database.getOrCreateOverlayToken(workspaceId);
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const tokenQuery = `token=${encodeURIComponent(token)}`;

        res.json({
            url: `${baseUrl}/overlay/?${tokenQuery}`,
            rankingUrl: `${baseUrl}/overlay/ranking?${tokenQuery}`,
            podiumUrl: `${baseUrl}/overlay/podium?${tokenQuery}`,
            podiumDetailedUrl: `${baseUrl}/overlay/podium?detailed=true&${tokenQuery}`
        });
    }
);

app.put(
    '/api/settings',
    (req, res) => {
        const runtime = getRuntimeForRequest(req);
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
            runtime.settings.get();

        const updatedSettings =
            runtime.settings.update(
                settingsToUpdate
            );

        const sizeChanged =
            Number(previousSettings.width) !==
            Number(updatedSettings.width) ||
            Number(previousSettings.height) !==
            Number(updatedSettings.height);

        if (sizeChanged) {
            io.to(req.auth?.workspaceId || 'legacy').emit(
                'arena:resize',
                {
                    width:
                        updatedSettings.width,

                    height:
                        updatedSettings.height
                }
            );
        }

        runtime.realtime.state();

        res.json(
            updatedSettings
        );
    }
);

app.post(
    '/api/connect',
    async (req, res) => {
        const runtime = getRuntimeForRequest(req);
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

            io.to(req.auth?.workspaceId || 'legacy').emit(
                'connection',
                connectionState
            );

            runtime.settings.update({
                tiktokUsername:
                    username
            });

            const result =
                await runtime.tiktok.connect(
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

            io.to(req.auth?.workspaceId || 'legacy').emit(
                'connection',
                connectionState
            );

            runtime.realtime.state();

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

            io.to(req.auth?.workspaceId || 'legacy').emit(
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
    async (req, res) => {
        const runtime = getRuntimeForRequest(req);
        try {
            if (
                typeof runtime.tiktok.disconnect ===
                'function'
            ) {
                await runtime.tiktok.disconnect();
            }

            connectionState = {
                connected: false,
                connecting: false,
                username: null,
                status: 'disconnected',
                error: null
            };

            io.to(req.auth?.workspaceId || 'legacy').emit(
                'connection',
                connectionState
            );

            runtime.realtime.state();

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
    (req, res) => {
        const runtime = getRuntimeForRequest(req);
        runtime.gameState.reset();

        runtime.realtime.reset();
        runtime.realtime.state();

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
    let runtime;
    try {
        runtime = getRuntimeForRequest(req, req.body?.workspaceId || null);
    } catch (error) {
        return res.status(403).json({ ok: false, error: error.message });
    }
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
        runtime.points.points(
            event
        );

    let player = null;

    if (earnedPoints) {
        player =
                runtime.gameState.add(
                event,
                earnedPoints
            );
    }

            runtime.realtime.event({
        ...event,
        points:
            earnedPoints || 0
    });

const currentSettings = runtime.settings.get();
    if (currentSettings.gameMode === 'marbles') {
        if (runtime.marblesManager.state === GAME_STATES.PLAYING) {
            runtime.marblesManager.addQueuedPlayer(event.userId);
        } else if (runtime.marblesManager.state === GAME_STATES.LOBBY && runtime.gameState.list().length >= 2) {
            runtime.marblesManager.triggerStart();
        }
    }

    runtime.realtime.state();

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

app.get(
    '/overlay/ranking',
    requireOverlayToken,
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
    requireOverlayToken,
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

app.use(
    (error, _req, res, next) => {
        console.error('[HTTP]', error);

        if (res.headersSent) {
            return next(error);
        }

        res.status(500).json({
            ok: false,
            error: 'Error interno del servidor'
        });
    }
);

io.on(
    'connection',
    (socket) => {
        if (socket.data.workspaceId !== 'legacy') {
            return;
        }

        socket.join('legacy');
        socket.emit(
            'state:init',
            getPublicState()
        );

        socket.emit(
            'connection',
            connectionState
        );

        socket.emit(
            'marbles:round-tick',
            marblesManager.getStateSnapshot()
        );
    }
);

setInterval(
    () => {
        emitGameTick();
        emitWorkspaceGameTicks();
    },
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