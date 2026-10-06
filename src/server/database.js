// src/server/database.js

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const dataDirectory = path.join(process.cwd(), 'data');
const databaseFile = path.join(dataDirectory, 'database.sqlite');

fs.mkdirSync(dataDirectory, { recursive: true });

const database = new Database(databaseFile);

database.pragma('journal_mode = WAL');
database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_colors (
        player_id TEXT PRIMARY KEY,
        data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS podium_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mode TEXT NOT NULL,
        data TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS podium_entries_mode_idx
        ON podium_entries (mode, id);

    CREATE TABLE IF NOT EXISTS migrations (
        name TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        username TEXT,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memberships (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'viewer')),
        created_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, workspace_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS overlay_tokens (
        workspace_id TEXT PRIMARY KEY,
        token_value TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_data (
        workspace_id TEXT PRIMARY KEY,
        initialized_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_settings (
        workspace_id TEXT NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT NOT NULL,
        PRIMARY KEY (workspace_id, setting_key)
    );

    CREATE TABLE IF NOT EXISTS workspace_player_colors (
        workspace_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        user_id TEXT NOT NULL DEFAULT '',
        username TEXT NOT NULL DEFAULT '',
        nickname TEXT NOT NULL DEFAULT '',
        name_color TEXT,
        ball_color TEXT,
        updated_at INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (workspace_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS workspace_podium_entries (
        workspace_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        player_id TEXT NOT NULL,
        user_id TEXT NOT NULL DEFAULT '',
        username TEXT NOT NULL DEFAULT '',
        nickname TEXT NOT NULL DEFAULT '',
        avatar TEXT NOT NULL DEFAULT '',
        rounds_played REAL NOT NULL DEFAULT 0,
        wins REAL NOT NULL DEFAULT 0,
        losses REAL NOT NULL DEFAULT 0,
        hits_given REAL NOT NULL DEFAULT 0,
        hits_received REAL NOT NULL DEFAULT 0,
        balls_eaten REAL NOT NULL DEFAULT 0,
        times_eaten REAL NOT NULL DEFAULT 0,
        damage_dealt REAL NOT NULL DEFAULT 0,
        damage_received REAL NOT NULL DEFAULT 0,
        points_earned REAL NOT NULL DEFAULT 0,
        best_points REAL NOT NULL DEFAULT 0,
        biggest_radius REAL NOT NULL DEFAULT 0,
        longest_survival_seconds REAL NOT NULL DEFAULT 0,
        PRIMARY KEY (workspace_id, mode, player_id)
    );
`);

function ensureUserSchema() {
    const columns = database.prepare('PRAGMA table_info(users)').all();

    if (!columns.some(column => column.name === 'username')) {
        database.exec('ALTER TABLE users ADD COLUMN username TEXT');
    }

    database.exec(`
        UPDATE users
        SET username = CASE
            WHEN instr(email, '@') > 1 THEN substr(email, 1, instr(email, '@') - 1)
            ELSE email
        END
        WHERE username IS NULL OR username = '';

        CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique
            ON users (username);
    `);
}

ensureUserSchema();

function readJsonFile(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
}

function runTransaction(callback) {
    const transaction = database.transaction(callback);
    transaction();
}

function migrateJsonData() {
    const hasMigration = database
        .prepare('SELECT 1 FROM migrations WHERE name = ?')
        .get('json-to-sqlite');

    if (hasMigration) {
        return;
    }

    const settings = readJsonFile(path.join(dataDirectory, 'settings.json'));
    const colors = readJsonFile(path.join(dataDirectory, 'player-colors.json'));
    const podiumByMode = {
        classic: readJsonFile(path.join(dataDirectory, 'podium-classic.json')),
        battle: readJsonFile(path.join(dataDirectory, 'podium-battle.json')),
        marbles: readJsonFile(path.join(dataDirectory, 'podium-marbles.json'))
    };

    runTransaction(() => {
        if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
            database.prepare(
                'INSERT OR IGNORE INTO settings (id, data) VALUES (1, ?)'
            ).run(JSON.stringify(settings));
        }

        if (colors && typeof colors === 'object' && !Array.isArray(colors)) {
            const insertColor = database.prepare(
                'INSERT OR IGNORE INTO player_colors (player_id, data) VALUES (?, ?)'
            );

            for (const [playerId, value] of Object.entries(colors)) {
                insertColor.run(playerId, JSON.stringify(value));
            }
        }

        const insertPodium = database.prepare(
            'INSERT INTO podium_entries (mode, data) VALUES (?, ?)'
        );

        for (const [mode, entries] of Object.entries(podiumByMode)) {
            if (!Array.isArray(entries)) {
                continue;
            }

            for (const entry of entries) {
                insertPodium.run(mode, JSON.stringify(entry));
            }
        }

        database.prepare(
            'INSERT INTO migrations (name) VALUES (?)'
        ).run('json-to-sqlite');
    });
}

migrateJsonData();

function getSettings() {
    const row = database.prepare(
        'SELECT data FROM settings WHERE id = 1'
    ).get();

    return row ? JSON.parse(row.data) : null;
}

function setSettings(settings) {
    database.prepare(`
        INSERT INTO settings (id, data) VALUES (1, ?)
        ON CONFLICT(id) DO UPDATE SET data = excluded.data
    `).run(JSON.stringify(settings));
}

function getColors() {
    const rows = database.prepare(
        'SELECT player_id, data FROM player_colors'
    ).all();

    return Object.fromEntries(
        rows.map(row => [row.player_id, JSON.parse(row.data)])
    );
}

function setColors(colors) {
    runTransaction(() => {
        database.prepare('DELETE FROM player_colors').run();
        const insert = database.prepare(
            'INSERT INTO player_colors (player_id, data) VALUES (?, ?)'
        );

        for (const [playerId, value] of Object.entries(colors)) {
            insert.run(playerId, JSON.stringify(value));
        }
    });
}

function getPodium(mode) {
    return database.prepare(
        'SELECT data FROM podium_entries WHERE mode = ? ORDER BY id'
    ).all(mode).map(row => JSON.parse(row.data));
}

function setPodium(mode, entries) {
    runTransaction(() => {
        database.prepare('DELETE FROM podium_entries WHERE mode = ?').run(mode);
        const insert = database.prepare(
            'INSERT INTO podium_entries (mode, data) VALUES (?, ?)'
        );

        for (const entry of entries) {
            insert.run(mode, JSON.stringify(entry));
        }
    });
}

function getUserByEmail(email) {
    return database.prepare(
        'SELECT id, email, password_hash, display_name FROM users WHERE email = ?'
    ).get(email);
}

function getUserByUsername(username) {
    return database.prepare(
        'SELECT id, username, password_hash, display_name FROM users WHERE username = ?'
    ).get(username);
}

function getUserById(userId) {
    return database.prepare(
        'SELECT id, username, password_hash, display_name FROM users WHERE id = ?'
    ).get(userId);
}

function updateUser(userId, changes) {
    database.prepare(`
        UPDATE users
        SET username = ?, password_hash = ?, display_name = ?
        WHERE id = ?
    `).run(
        changes.username,
        changes.passwordHash,
        changes.displayName,
        userId
    );
}

function deleteUser(userId) {
    runTransaction(() => {
        const workspaces = database.prepare(
            'SELECT workspace_id FROM memberships WHERE user_id = ?'
        ).all(userId);

        database.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
        database.prepare('DELETE FROM memberships WHERE user_id = ?').run(userId);
        database.prepare('DELETE FROM users WHERE id = ?').run(userId);

        for (const workspace of workspaces) {
            database.prepare('DELETE FROM workspace_settings WHERE workspace_id = ?').run(workspace.workspace_id);
            database.prepare('DELETE FROM workspace_player_colors WHERE workspace_id = ?').run(workspace.workspace_id);
            database.prepare('DELETE FROM workspace_podium_entries WHERE workspace_id = ?').run(workspace.workspace_id);
            database.prepare('DELETE FROM workspace_data WHERE workspace_id = ?').run(workspace.workspace_id);
            database.prepare('DELETE FROM workspaces WHERE id = ? AND id <> ?').run(workspace.workspace_id, 'legacy');
        }
    });
}

function getUserCount() {
    return database.prepare(
        'SELECT COUNT(*) AS count FROM users'
    ).get().count;
}

function listAccounts() {
    return database.prepare(`
        SELECT users.id, users.username, users.display_name AS displayName,
               memberships.role, workspaces.id AS workspaceId,
               workspaces.name AS workspaceName
        FROM users
        INNER JOIN memberships ON memberships.user_id = users.id
        INNER JOIN workspaces ON workspaces.id = memberships.workspace_id
        ORDER BY users.created_at
    `).all();
}

function getWorkspaceById(workspaceId) {
    return database.prepare(
        'SELECT id, name, slug FROM workspaces WHERE id = ?'
    ).get(workspaceId);
}

function createUser(user) {
    database.prepare(`
        INSERT INTO users (id, email, username, password_hash, display_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        user.id,
        user.email,
        user.username,
        user.passwordHash,
        user.displayName,
        user.createdAt
    );
}

function createWorkspace(workspace) {
    database.prepare(`
        INSERT OR IGNORE INTO workspaces (id, name, slug, created_at)
        VALUES (?, ?, ?, ?)
    `).run(
        workspace.id,
        workspace.name,
        workspace.slug,
        workspace.createdAt
    );
}

function createMembership(membership) {
    database.prepare(`
        INSERT INTO memberships (user_id, workspace_id, role, created_at)
        VALUES (?, ?, ?, ?)
    `).run(
        membership.userId,
        membership.workspaceId,
        membership.role,
        membership.createdAt
    );
}

function createSession(session) {
    database.prepare(`
        INSERT INTO sessions (token_hash, user_id, workspace_id, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(
        session.tokenHash,
        session.userId,
        session.workspaceId,
        session.expiresAt,
        session.createdAt
    );
}

function getSession(tokenHash) {
    return database.prepare(`
        SELECT
            sessions.user_id AS userId,
            sessions.workspace_id AS workspaceId,
            sessions.expires_at AS expiresAt,
            users.username,
            users.display_name AS displayName,
            memberships.role
        FROM sessions
        INNER JOIN users ON users.id = sessions.user_id
        INNER JOIN memberships
            ON memberships.user_id = sessions.user_id
            AND memberships.workspace_id = sessions.workspace_id
        WHERE sessions.token_hash = ?
    `).get(tokenHash);
}

function deleteSession(tokenHash) {
    database.prepare(
        'DELETE FROM sessions WHERE token_hash = ?'
    ).run(tokenHash);
}

function getOrCreateOverlayToken(workspaceId) {
    const existing = database.prepare(
        'SELECT token_value FROM overlay_tokens WHERE workspace_id = ?'
    ).get(workspaceId);
    if (existing) return existing.token_value;

    const token = crypto.randomBytes(32).toString('hex');
    database.prepare(`
        INSERT INTO overlay_tokens (workspace_id, token_value, created_at)
        VALUES (?, ?, ?)
    `).run(workspaceId, token, Date.now());
    return token;
}

function getWorkspaceByOverlayToken(token) {
    if (!token) return null;

    return database.prepare(
        'SELECT workspace_id AS workspaceId FROM overlay_tokens WHERE token_value = ?'
    ).get(token);
}

function cleanupSessions(now) {
    database.prepare(
        'DELETE FROM sessions WHERE expires_at <= ?'
    ).run(now);
}

function getFirstWorkspace() {
    return database.prepare(
        'SELECT id, name, slug FROM workspaces ORDER BY created_at LIMIT 1'
    ).get();
}

function getUserWorkspace(userId) {
    return database.prepare(`
        SELECT workspaces.id, workspaces.name, workspaces.slug, memberships.role
        FROM workspaces
        INNER JOIN memberships ON memberships.workspace_id = workspaces.id
        WHERE memberships.user_id = ?
        ORDER BY workspaces.created_at
        LIMIT 1
    `).get(userId);
}

const podiumColumns = [
    'roundsPlayed', 'wins', 'losses', 'hitsGiven', 'hitsReceived',
    'ballsEaten', 'timesEaten', 'damageDealt', 'damageReceived',
    'pointsEarned', 'bestPoints', 'biggestRadius', 'longestSurvivalSeconds'
];

function ensureWorkspaceData(workspaceId) {
    const existing = database.prepare(
        'SELECT 1 FROM workspace_data WHERE workspace_id = ?'
    ).get(workspaceId);

    if (existing) return;

    runTransaction(() => {
        const settings = workspaceId === 'legacy'
            ? database.prepare('SELECT data FROM settings WHERE id = 1').get()
            : database.prepare(
                `SELECT GROUP_CONCAT(setting_key || char(31) || setting_value, char(30)) AS data
                 FROM workspace_settings WHERE workspace_id = 'legacy'`
            ).get();
        if (settings) {
            const insert = database.prepare(`
                INSERT INTO workspace_settings (workspace_id, setting_key, setting_value)
                VALUES (?, ?, ?)
            `);
            if (workspaceId === 'legacy') {
                for (const [key, value] of Object.entries(JSON.parse(settings.data))) {
                    insert.run(workspaceId, key, JSON.stringify(value));
                }
            } else if (settings.data) {
                for (const item of settings.data.split(String.fromCharCode(30))) {
                    const separator = item.indexOf(String.fromCharCode(31));
                    if (separator > 0) {
                        insert.run(
                            workspaceId,
                            item.slice(0, separator),
                            item.slice(separator + 1)
                        );
                    }
                }
            }
        }

        if (workspaceId === 'legacy') {
            const colors = database.prepare(
                'SELECT player_id, data FROM player_colors'
            ).all();
            const insertColor = database.prepare(`
                INSERT INTO workspace_player_colors
                    (workspace_id, player_id, user_id, username, nickname, name_color, ball_color, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            for (const row of colors) {
                const color = JSON.parse(row.data);
                insertColor.run(
                    workspaceId,
                    row.player_id,
                    String(color.userId || ''),
                    String(color.username || ''),
                    String(color.nickname || ''),
                    color.nameColor ? JSON.stringify(color.nameColor) : null,
                    color.ballColor ? JSON.stringify(color.ballColor) : null,
                    Number(color.updatedAt) || 0
                );
            }

            const podium = database.prepare(
                'SELECT mode, data FROM podium_entries ORDER BY id'
            ).all();
            const insertEntry = database.prepare(`
                INSERT INTO workspace_podium_entries
                    (workspace_id, mode, player_id, user_id, username, nickname, avatar,
                     rounds_played, wins, losses, hits_given, hits_received, balls_eaten,
                     times_eaten, damage_dealt, damage_received, points_earned, best_points,
                     biggest_radius, longest_survival_seconds)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            for (const row of podium) {
                const entry = JSON.parse(row.data);
                insertEntry.run(
                    workspaceId,
                    row.mode,
                    String(entry.id || entry.userId || ''),
                    String(entry.userId || ''),
                    String(entry.username || ''),
                    String(entry.nickname || ''),
                    String(entry.avatar || ''),
                    ...podiumColumns.map(column => Number(entry[column]) || 0)
                );
            }
        }

        database.prepare(
            'INSERT INTO workspace_data (workspace_id, initialized_at) VALUES (?, ?)'
        ).run(workspaceId, Date.now());
    });
}

function getWorkspaceSettings(workspaceId) {
    ensureWorkspaceData(workspaceId);
    const rows = database.prepare(
        'SELECT setting_key, setting_value FROM workspace_settings WHERE workspace_id = ?'
    ).all(workspaceId);
    return Object.fromEntries(
        rows.map(row => [row.setting_key, JSON.parse(row.setting_value)])
    );
}

function setWorkspaceSettings(workspaceId, settings) {
    ensureWorkspaceData(workspaceId);
    runTransaction(() => {
        database.prepare('DELETE FROM workspace_settings WHERE workspace_id = ?').run(workspaceId);
        const insert = database.prepare(`
            INSERT INTO workspace_settings (workspace_id, setting_key, setting_value)
            VALUES (?, ?, ?)
        `);
        for (const [key, value] of Object.entries(settings)) {
            insert.run(workspaceId, key, JSON.stringify(value));
        }
    });
}

function getWorkspaceColors(workspaceId) {
    ensureWorkspaceData(workspaceId);
    const rows = database.prepare(`
        SELECT player_id, user_id, username, nickname, name_color, ball_color, updated_at
        FROM workspace_player_colors WHERE workspace_id = ?
    `).all(workspaceId);
    return Object.fromEntries(rows.map(row => [row.player_id, {
        id: row.player_id,
        userId: row.user_id,
        username: row.username,
        nickname: row.nickname,
        nameColor: row.name_color ? JSON.parse(row.name_color) : undefined,
        ballColor: row.ball_color ? JSON.parse(row.ball_color) : undefined,
        updatedAt: row.updated_at
    }]));
}

function setWorkspaceColors(workspaceId, colors) {
    ensureWorkspaceData(workspaceId);
    runTransaction(() => {
        database.prepare('DELETE FROM workspace_player_colors WHERE workspace_id = ?').run(workspaceId);
        const insert = database.prepare(`
            INSERT INTO workspace_player_colors
                (workspace_id, player_id, user_id, username, nickname, name_color, ball_color, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const [playerId, color] of Object.entries(colors)) {
            insert.run(
                workspaceId,
                playerId,
                String(color.userId || ''),
                String(color.username || ''),
                String(color.nickname || ''),
                color.nameColor ? JSON.stringify(color.nameColor) : null,
                color.ballColor ? JSON.stringify(color.ballColor) : null,
                Number(color.updatedAt) || 0
            );
        }
    });
}

function getWorkspacePodium(workspaceId, mode) {
    ensureWorkspaceData(workspaceId);
    return database.prepare(`
        SELECT * FROM workspace_podium_entries
        WHERE workspace_id = ? AND mode = ?
        ORDER BY rowid
    `).all(workspaceId, mode).map(row => ({
        id: row.player_id,
        userId: row.user_id,
        username: row.username,
        nickname: row.nickname,
        avatar: row.avatar,
        roundsPlayed: row.rounds_played,
        wins: row.wins,
        losses: row.losses,
        hitsGiven: row.hits_given,
        hitsReceived: row.hits_received,
        ballsEaten: row.balls_eaten,
        timesEaten: row.times_eaten,
        damageDealt: row.damage_dealt,
        damageReceived: row.damage_received,
        pointsEarned: row.points_earned,
        bestPoints: row.best_points,
        biggestRadius: row.biggest_radius,
        longestSurvivalSeconds: row.longest_survival_seconds
    }));
}

function setWorkspacePodium(workspaceId, mode, entries) {
    ensureWorkspaceData(workspaceId);
    runTransaction(() => {
        database.prepare(
            'DELETE FROM workspace_podium_entries WHERE workspace_id = ? AND mode = ?'
        ).run(workspaceId, mode);
        const insert = database.prepare(`
            INSERT INTO workspace_podium_entries
                (workspace_id, mode, player_id, user_id, username, nickname, avatar,
                 rounds_played, wins, losses, hits_given, hits_received, balls_eaten,
                 times_eaten, damage_dealt, damage_received, points_earned, best_points,
                 biggest_radius, longest_survival_seconds)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const entry of entries) {
            insert.run(
                workspaceId,
                mode,
                String(entry.id || entry.userId || ''),
                String(entry.userId || ''),
                String(entry.username || ''),
                String(entry.nickname || ''),
                String(entry.avatar || ''),
                ...podiumColumns.map(column => Number(entry[column]) || 0)
            );
        }
    });
}

ensureWorkspaceData('legacy');
database.exec(`
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS player_colors;
    DROP TABLE IF EXISTS podium_entries;
`);

function ensureInitialAdmin() {
    const bootstrapped = database.prepare(
        'SELECT 1 FROM migrations WHERE name = ?'
    ).get('admin-bootstrap-v1');

    if (bootstrapped) {
        return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto
        .scryptSync('admin123', salt, 64)
        .toString('hex');
    const now = Date.now();

    if (getUserCount() === 0) {
        const userId = crypto.randomUUID();
        createUser({
            id: userId,
            email: 'admin@local.invalid',
            username: 'admin',
            passwordHash: `${salt}:${passwordHash}`,
            displayName: 'Administrador',
            createdAt: now
        });
        createWorkspace({
            id: 'legacy',
            name: 'Arena principal',
            slug: 'arena-principal',
            createdAt: now
        });
        createMembership({
            userId,
            workspaceId: 'legacy',
            role: 'owner',
            createdAt: now
        });
    } else if (!getUserByUsername('admin') && getUserCount() === 1) {
        const existing = database.prepare(
            'SELECT id FROM users LIMIT 1'
        ).get();
        database.prepare(`
            UPDATE users
            SET username = ?, email = ?, password_hash = ?, display_name = ?
            WHERE id = ?
        `).run(
            'admin',
            'admin@local.invalid',
            `${salt}:${passwordHash}`,
            'Administrador',
            existing.id
        );
    }

    database.prepare(
        'INSERT INTO migrations (name) VALUES (?)'
    ).run('admin-bootstrap-v1');
}

ensureInitialAdmin();

module.exports = {
    getSettings,
    setSettings,
    getColors,
    setColors,
    getPodium,
    setPodium,
    getUserByEmail,
    getUserByUsername,
    getUserById,
    updateUser,
    deleteUser,
    getUserCount,
    listAccounts,
    getWorkspaceById,
    createUser,
    createWorkspace,
    createMembership,
    createSession,
    getSession,
    deleteSession,
    getOrCreateOverlayToken,
    getWorkspaceByOverlayToken,
    cleanupSessions,
    getFirstWorkspace,
    getUserWorkspace,
    ensureWorkspaceData,
    getWorkspaceSettings,
    setWorkspaceSettings,
    getWorkspaceColors,
    setWorkspaceColors,
    getWorkspacePodium,
    setWorkspacePodium
};