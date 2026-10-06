// src/server/auth.js

'use strict';

const crypto = require('crypto');
const database = require('./database');

const SESSION_COOKIE = 'tiktok_balls_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

function normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    const [salt, expected] = String(storedHash || '').split(':');
    if (!salt || !expected) return false;

    const actual = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return crypto.timingSafeEqual(
        Buffer.from(actual, 'hex'),
        Buffer.from(expected, 'hex')
    );
}

function createId() {
    return crypto.randomUUID();
}

function slugify(value) {
    const slug = String(value || 'workspace')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);

    return slug || `workspace-${Date.now()}`;
}

function parseCookies(header) {
    return Object.fromEntries(
        String(header || '')
            .split(';')
            .map(part => part.trim().split('='))
            .filter(([key, value]) => key && value)
            .map(([key, value]) => [key, decodeURIComponent(value)])
    );
}

function serializeCookie(name, value, maxAge) {
    return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax`;
}

function createSession(user, workspaceId) {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + SESSION_DURATION_MS;

    database.createSession({
        tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
        userId: user.id,
        workspaceId,
        expiresAt,
        createdAt: now
    });

    return { token, expiresAt };
}

function getSessionFromRequest(req) {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[SESSION_COOKIE];
    if (!token) return null;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = database.getSession(tokenHash);
    if (!session || session.expiresAt <= Date.now()) {
        database.deleteSession(tokenHash);
        return null;
    }

    return { ...session, tokenHash };
}

function requireAuth(req, res, next) {
    const session = getSessionFromRequest(req);
    if (!session) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ ok: false, error: 'Debes iniciar sesión' });
        }

        return res.redirect('/login/');
    }

    req.auth = session;
    next();
}

function requireAdmin(req, res, next) {
    if (!req.auth || !['owner', 'admin'].includes(req.auth.role)) {
        return res.status(403).json({
            ok: false,
            error: 'Solo un administrador puede hacer eso'
        });
    }

    next();
}

function createAccount({ username, password, displayName, workspaceName, role, createSession: shouldCreateSession = true }) {
    const normalizedUsername = normalizeUsername(username);
    if (!/^[a-z0-9_.-]{3,32}$/.test(normalizedUsername)) {
        throw new Error('El nombre de usuario debe tener entre 3 y 32 caracteres');
    }
    if (String(password || '').length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres');
    }
    if (database.getUserByUsername(normalizedUsername)) {
        throw new Error('Ese nombre de usuario ya existe');
    }

    const now = Date.now();
    const firstWorkspace = database.getUserCount() === 0;
    const user = {
        id: createId(),
        username: normalizedUsername,
        email: `${normalizedUsername}@local.invalid`,
        passwordHash: hashPassword(password),
        displayName: String(displayName || normalizedUsername).trim().slice(0, 80),
        createdAt: now
    };
    const workspace = {
        id: firstWorkspace ? 'legacy' : createId(),
        name: String(workspaceName || 'Mi workspace').trim().slice(0, 80),
        slug: `${slugify(workspaceName || 'workspace')}-${user.id.slice(0, 8)}`,
        createdAt: now
    };

    database.createUser(user);
    database.createWorkspace(workspace);
    database.createMembership({
        userId: user.id,
        workspaceId: workspace.id,
        role: firstWorkspace ? 'owner' : (role || 'viewer'),
        createdAt: now
    });

    return {
        user,
        workspace,
        session: shouldCreateSession
            ? createSession(user, workspace.id)
            : null
    };
}

function register(values) {
    if (database.getUserCount() > 0) {
        throw new Error('La cuenta inicial ya existe; un admin debe crear las demás');
    }

    return createAccount(values);
}

function login(username, password) {
    const user = database.getUserByUsername(normalizeUsername(username));
    if (!user || !verifyPassword(password, user.password_hash)) {
        throw new Error('Usuario o contraseña incorrectos');
    }

    const workspace = database.getUserWorkspace(user.id);
    if (!workspace) throw new Error('No hay un workspace disponible');
    return { user, workspace, session: createSession(user, workspace.id) };
}

function updateAccount(userId, { username, password, displayName }) {
    const normalizedUsername = normalizeUsername(username);
    if (!/^[a-z0-9_.-]{3,32}$/.test(normalizedUsername)) {
        throw new Error('El nombre de usuario debe tener entre 3 y 32 caracteres');
    }

    const existing = database.getUserByUsername(normalizedUsername);
    if (existing && existing.id !== userId) {
        throw new Error('Ese nombre de usuario ya existe');
    }

    const current = database.getUserById(userId);
    const passwordHash = String(password || '').trim()
        ? hashPassword(password)
        : current.password_hash;

    database.updateUser(userId, {
        username: normalizedUsername,
        passwordHash,
        displayName: String(displayName || normalizedUsername).trim().slice(0, 80)
    });

    return database.getUserByUsername(normalizedUsername);
}

function deleteAccount(requestingUserId, userId) {
    if (requestingUserId === userId) {
        throw new Error('No puedes eliminar tu propia cuenta');
    }

    database.deleteUser(userId);
}

function setSessionCookie(res, session) {
    res.setHeader(
        'Set-Cookie',
        serializeCookie(SESSION_COOKIE, session.token, Math.floor(SESSION_DURATION_MS / 1000))
    );
}

function clearSession(req, res) {
    const session = getSessionFromRequest(req);
    if (session) database.deleteSession(session.tokenHash);
    res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE, '', 0));
}

module.exports = {
    requireAuth,
    getSessionFromRequest,
    register,
    createAccount,
    requireAdmin,
    login,
    updateAccount,
    deleteAccount,
    setSessionCookie,
    clearSession,
    listAccounts() {
        return database.listAccounts();
    },
    cleanup() {
        database.cleanupSessions(Date.now());
    }
};