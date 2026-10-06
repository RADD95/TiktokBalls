// /game/marbles-mode.js

function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getArenaSize(settings) {
    return {
        width: Math.max(320, Math.min(1920, number(settings.width, 800))),
        height: Math.max(240, Math.min(1920, number(settings.height, 600)))
    };
}

function getPegs(settings) {
    const arena = getArenaSize(settings);
    const rows = Math.max(1, Math.min(20, number(settings.marbleRows, 8)));
    const cols = Math.max(3, Math.min(15, number(settings.marbleCols, 7)));

    const spacingX = arena.width / cols;
    const spacingY = Math.max(35, spacingX * 0.85); 
    
    // CORREGIDO: Bajamos el inicio de los obstáculos a 180px para dejar limpia la caja de salida
    const topMargin = 180; 
    
    const pegRadius = number(settings.marblePegRadius, 8);
    const pegs = [];

    for (let r = 0; r < rows; r++) {
        const isOdd = r % 2 !== 0;
        const countInRow = isOdd ? cols - 1 : cols;
        const offsetX = isOdd ? spacingX : spacingX / 2;
        const currentY = topMargin + r * spacingY;
        
        // No invadir las zonas de puntos del fondo (82% de la pantalla)
        if (currentY > arena.height * 0.82) break;

        for (let c = 0; c < countInRow; c++) {
            pegs.push({
                id: `peg-${r}-${c}`,
                x: (offsetX + c * spacingX) / arena.width,
                y: currentY / arena.height,
                radius: pegRadius
            });
        }
    }
    return pegs;
}

function getMultiplierZones(settings) {
    const multipliers = [50, 200, 500, 200, 50];
    const count = multipliers.length;
    const zones = [];

    for (let i = 0; i < count; i++) {
        zones.push({
            index: i,
            startX: i / count,
            endX: (i + 1) / count,
            score: multipliers[i]
        });
    }
    return zones;
}

function getDividerWalls(settings) {
    const zones = getMultiplierZones(settings);
    const wallsX = [];
    for (let i = 1; i < zones.length; i++) {
        wallsX.push(zones[i].startX);
    }
    return wallsX;
}

function applyPhysics(player, settings, roundState = 'PLAYING', deltaSeconds = 0.05) {
    const arena = getArenaSize(settings);
    const radius = number(player.radius, 12);
    const normRadiusX = radius / arena.width;

    // 1. Si está en pausa tras anotar puntos (+500 pts)
    if (player.isScoring && Date.now() < player.scoringUntil) {
        player.vx = 0;
        player.vy = 0;
        return;
    }

    // CORREGIDO: Al terminar la pausa de puntos, respawnea ARRIBA DEL TODO (y = 0.03)
    if (player.isScoring && Date.now() >= player.scoringUntil) {
        player.isScoring = false;
        player.x = 0.15 + Math.random() * 0.7;
        player.y = 0.03; // Nace en la parte más alta de la caja
        player.vx = (Math.random() - 0.5) * 0.1;
        player.vy = 0;
    }

    // 2. FÍSICA EN LOBBY O COUNTDOWN: Retener bolas dentro de la caja superior
    if (roundState === 'LOBBY' || roundState === 'COUNTDOWN') {
        player.vy = number(player.vy, 0) + 0.3 * deltaSeconds;
        player.vx = number(player.vx, (Math.random() - 0.5) * 0.1);

        player.x += player.vx * deltaSeconds;
        player.y += player.vy * deltaSeconds;

        // CORREGIDO: Colisión lateral estricta dentro de la caja para que no se salgan a los lados
        if (player.x - normRadiusX < 0.05) {
            player.x = 0.05 + normRadiusX;
            player.vx = Math.abs(player.vx) * 0.5;
        } else if (player.x + normRadiusX > 0.95) {
            player.x = 0.95 - normRadiusX;
            player.vx = -Math.abs(player.vx) * 0.5;
        }

        // CORREGIDO: Compuerta inferior de la caja en y = 0.10 (antes de los obstáculos que empiezan en ~0.14)
        if (player.y > 0.10) {
            player.y = 0.10;
            player.vy = -Math.abs(player.vy) * 0.3;
            player.vx += (Math.random() - 0.5) * 0.1;
        }
        return;
    }

    // 3. FÍSICA NORMAL DE CARRERA
    let rawGravity = number(settings.marbleGravity, 0.45);

    // Duplicar masa/gravedad si el evento otorgó un impulso de alto puntaje
    if (player.heavyBoostUntil && Date.now() < player.heavyBoostUntil) {
        rawGravity *= 2.0;
    }

    const gravity = rawGravity * 1.5;

    player.vx = number(player.vx, (Math.random() - 0.5) * 0.2);
    player.vy = number(player.vy, 0);

    player.vy += gravity * deltaSeconds;
    player.vy = Math.min(player.vy, 12.0);

    player.x += player.vx * deltaSeconds;
    player.y += player.vy * deltaSeconds;

    // Paredes laterales de la arena
    if (player.x - normRadiusX < 0) {
        player.x = normRadiusX;
        player.vx = Math.abs(player.vx) * 0.5;
    } else if (player.x + normRadiusX > 1) {
        player.x = 1 - normRadiusX;
        player.vx = -Math.abs(player.vx) * 0.5;
    }

    // Techo físico para evitar que salgan volando por arriba
    const normRadiusY = radius / arena.height;
    if (player.y - normRadiusY < 0.01) {
        player.y = 0.01 + normRadiusY;
        player.vy = Math.abs(player.vy) * 0.2; // Rebota suavemente hacia abajo
    }

    // Barreras divisorias inferiores
    if (player.y >= 0.82) {
        const dividerWalls = getDividerWalls(settings);
        const wallThicknessNorm = 4 / arena.width;

        for (const wallX of dividerWalls) {
            const distToWall = Math.abs(player.x - wallX);
            if (distToWall < normRadiusX + wallThicknessNorm) {
                if (player.x < wallX) {
                    player.x = wallX - (normRadiusX + wallThicknessNorm);
                    player.vx = -Math.abs(player.vx) * 0.5;
                } else {
                    player.x = wallX + (normRadiusX + wallThicknessNorm);
                    player.vx = Math.abs(player.vx) * 0.5;
                }
            }
        }
    }

    // Colisión con obstáculos (Pegs)
    const pegs = getPegs(settings);
    for (const peg of pegs) {
        const dx = (player.x - peg.x) * arena.width;
        const dy = (player.y - peg.y) * arena.height;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = radius + peg.radius;

        if (distance < minDistance) {
            if (distance === 0) {
                player.vx += (Math.random() - 0.5) * 0.2;
                player.vy += 0.1;
                continue;
            }

            const nx = dx / distance;
            const ny = dy / distance;

            const overlap = minDistance - distance;
            player.x += (nx * overlap) / arena.width;
            player.y += (ny * overlap) / arena.height;

            const dot = player.vx * nx + player.vy * ny;
            if (dot < 0) {
                const restitution = 0.45;
                player.vx = (player.vx - (1 + restitution) * dot * nx);
                player.vy = (player.vy - (1 + restitution) * dot * ny);
                player.vx += (Math.random() - 0.5) * 0.05;
            }
        }
    }
}

function checkZones({ activePlayers, settings, snapshot }) {
    const zones = getMultiplierZones(settings);
    const scoredEvents = [];

    for (const player of activePlayers) {
        if (player.y >= 0.94 && !player.isScoring) {
            const zone = zones.find(z => player.x >= z.startX && player.x < z.endX);
            const pointsGained = zone ? zone.score : 50;

            player.points = number(player.points, 0) + pointsGained;
            
            player.isScoring = true;
            player.scoringUntil = Date.now() + 2500;
            player.message = `+${pointsGained} pts!`;
            player.messageUpdatedAt = Date.now();

            scoredEvents.push({
                playerId: player.id,
                pointsGained,
                totalPoints: player.points
            });
        }
    }

    return {
        ok: true,
        type: 'marbles-tick',
        scoredEvents,
        state: snapshot()
    };
}

module.exports = {
    getPegs,
    getMultiplierZones,
    getDividerWalls,
    applyPhysics,
    checkZones
};