
/* =========================================
   RIFTBOUND - COMPLETE GAME ENGINE
========================================= */

let currentRun = null;
let selectedTower = "archer";
let gameRunning = false;
let animationFrame = null;
let lastFrameTime = 0;
let spawnTimer = 0;

const canvas = document.getElementById("battlefield");
const ctx = canvas.getContext("2d");

const pathPoints = [
    { x: 75, y: 270 },
    { x: 230, y: 270 },
    { x: 230, y: 130 },
    { x: 440, y: 130 },
    { x: 440, y: 405 },
    { x: 690, y: 405 },
    { x: 690, y: 270 },
    { x: 850, y: 270 }
];

const towerTypes = {
    archer: {
        name: "Archer",
        cost: 50,
        damage: 10,
        range: 120,
        fireRate: 1,
        color: "#B99AE8",
        projectileSpeed: 330
    },
    arcane: {
        name: "Arcane",
        cost: 100,
        damage: 25,
        range: 105,
        fireRate: 0.7,
        color: "#75B8E8",
        projectileSpeed: 280
    },
    cannon: {
        name: "Cannon",
        cost: 125,
        damage: 35,
        range: 95,
        fireRate: 0.4,
        color: "#D9A56C",
        projectileSpeed: 230
    }
};

const enemyTypes = {
    riftling: {
        name: "Riftling",
        health: 40,
        speed: 45,
        reward: 8,
        damage: 8,
        color: "#B68AE8",
        size: 12
    },
    brute: {
        name: "Iron Brute",
        health: 150,
        speed: 22,
        reward: 18,
        damage: 18,
        color: "#A17B78",
        size: 17
    },
    riftwing: {
        name: "Riftwing",
        health: 65,
        speed: 75,
        reward: 12,
        damage: 10,
        color: "#78B9D1",
        size: 11
    },
    treant: {
        name: "Ancient Treant",
        health: 2000,
        speed: 15,
        reward: 150,
        damage: 35,
        color: "#83A66C",
        size: 27
    }
};


/* =========================================
   RUN CREATION
========================================= */

function createNewRun() {
    return {
        gold: 100,
        castleHealth: 100,
        maxCastleHealth: 100,
        currentWave: 0,
        totalWaves: 15,
        towers: [
            {
                type: "archer",
                x: 330,
                y: 75,
                cooldown: 0,
                level: 1
            }
        ],
        enemies: [],
        projectiles: [],
        spawnQueue: [],
        waveActive: false,
        gameOver: false,
        towerDamageBonus: 0
    };
}

function startNewRun() {
    stopGameLoop();

    currentRun = createNewRun();
    selectedTower = "archer";

    document.querySelectorAll(".tower-button").forEach(button => {
        button.classList.toggle(
            "selected",
            button.dataset.tower === "archer"
        );
    });

    updateGameDisplay();
}


/* =========================================
   BATTLEFIELD INITIALIZATION
========================================= */

function initBattlefield() {
    if (!currentRun) {
        startNewRun();
    }

    // Reset the frame clock and render immediately so the battlefield
    // is visible before the first animation frame.
    stopGameLoop();
    updateGameDisplay();
    drawBattlefield();
    setWaveStatus("PREPARE YOUR DEFENSE");
    showBattleMessage("SELECT A TOWER AND CLICK AN OPEN AREA TO BUILD");
    startGameLoop();
}

/* =========================================
   HUD
========================================= */

function updateGameDisplay() {
    if (!currentRun) return;

    document.getElementById("gold-display").textContent =
        currentRun.gold;

    document.getElementById("health-display").textContent =
        currentRun.castleHealth + " / " + currentRun.maxCastleHealth;

    document.getElementById("wave-display").textContent =
        currentRun.currentWave + " / " + currentRun.totalWaves;

    document.getElementById("start-wave").disabled =
        currentRun.waveActive || currentRun.gameOver;

    updateTowerButtons();
}

function updateTowerButtons() {
    document.querySelectorAll(".tower-button").forEach(button => {
        const type = button.dataset.tower;

        button.disabled =
            !currentRun ||
            currentRun.gold < towerTypes[type].cost ||
            currentRun.gameOver;
    });
}

function showBattleMessage(message) {
    document.getElementById("battle-message").textContent = message;
}

function setWaveStatus(message) {
    document.getElementById("wave-status").textContent = message;
}


/* =========================================
   BATTLEFIELD DRAWING
========================================= */

function drawBattlefield() {
    ctx.fillStyle = "#263B2B";
    ctx.fillRect(0, 0, 960, 540);

    drawGroundTexture();
    drawPath();
    drawTrees();
    drawPortal();
    drawCastle();
    drawTowers();
    drawEnemies();
    drawProjectiles();
}

function drawGroundTexture() {
    for (let x = 0; x < 960; x += 32) {
        for (let y = 0; y < 540; y += 32) {
            const variation = (x * 7 + y * 13) % 5;

            if (variation === 0) {
                ctx.fillStyle = "#304632";
                ctx.fillRect(x, y, 16, 16);
            } else if (variation === 1) {
                ctx.fillStyle = "#203326";
                ctx.fillRect(x + 12, y + 8, 12, 12);
            }
        }
    }
}

function drawPath() {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();

    pathPoints.forEach((point, index) => {
        if (index === 0) {
            ctx.moveTo(point.x, point.y);
        } else {
            ctx.lineTo(point.x, point.y);
        }
    });

    ctx.strokeStyle = "#382C29";
    ctx.lineWidth = 68;
    ctx.stroke();

    ctx.strokeStyle = "#776047";
    ctx.lineWidth = 54;
    ctx.stroke();

    ctx.strokeStyle = "#9B8060";
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 15]);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawTrees() {
    const trees = [
        [70, 70], [145, 90], [90, 170],
        [330, 55], [390, 65], [520, 70],
        [610, 90], [780, 75], [900, 80],
        [100, 390], [150, 465], [320, 470],
        [540, 490], [800, 450], [900, 400],
        [560, 230], [820, 170], [350, 330],
        [110, 330], [760, 340], [920, 180]
    ];

    trees.forEach(([x, y]) => {
        ctx.fillStyle = "#17251B";
        ctx.fillRect(x - 15, y - 12, 38, 34);

        ctx.fillStyle = "#152C20";
        ctx.fillRect(x - 18, y - 25, 36, 35);

        ctx.fillStyle = "#315438";
        ctx.fillRect(x - 12, y - 30, 25, 25);

        ctx.fillStyle = "#426443";
        ctx.fillRect(x - 5, y - 25, 12, 12);

        ctx.fillStyle = "#64472F";
        ctx.fillRect(x - 5, y + 5, 10, 15);
    });
}

function drawPortal() {
    const pulse = 1 + Math.sin(performance.now() / 300) * 0.12;

    ctx.fillStyle = "rgba(129,85,184,0.15)";
    ctx.beginPath();
    ctx.arc(75, 270, 48 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#62447F";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(75, 270, 24, 38, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#21102F";
    ctx.beginPath();
    ctx.ellipse(75, 270, 18, 31, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#B99AE8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(75, 270, 15, 27, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#B99AE8";
    ctx.fillRect(70, 250, 10, 40);
}

function drawCastle() {
    ctx.fillStyle = "#17251B";
    ctx.fillRect(855, 225, 85, 100);

    ctx.fillStyle = "#655A70";
    ctx.fillRect(860, 235, 70, 70);

    ctx.fillStyle = "#98899E";
    ctx.fillRect(870, 245, 50, 50);

    ctx.fillStyle = "#4A3B55";
    ctx.fillRect(852, 220, 22, 35);
    ctx.fillRect(916, 220, 22, 35);
    ctx.fillRect(852, 285, 22, 35);
    ctx.fillRect(916, 285, 22, 35);

    ctx.fillStyle = "#B99AE8";
    ctx.fillRect(852, 216, 22, 6);
    ctx.fillRect(916, 216, 22, 6);

    ctx.fillStyle = "#241932";
    ctx.fillRect(885, 275, 22, 30);
}


/* =========================================
   TOWER DRAWING
========================================= */

function drawTowers() {
    if (!currentRun) return;

    currentRun.towers.forEach(tower => {
        const type = towerTypes[tower.type];

        if (typeof settings !== "undefined" && settings.towerRanges) {
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, type.range, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(185,154,232,0.07)";
            ctx.fill();

            ctx.strokeStyle = "rgba(185,154,232,0.2)";
            ctx.stroke();
        }

        ctx.fillStyle = "#241932";
        ctx.fillRect(tower.x - 16, tower.y - 16, 32, 32);

        ctx.strokeStyle = type.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(tower.x - 16, tower.y - 16, 32, 32);

        ctx.fillStyle = type.color;
        ctx.fillRect(tower.x - 8, tower.y - 8, 16, 16);

        ctx.fillStyle = "#E5DDF0";
        ctx.fillRect(tower.x - 3, tower.y - 3, 6, 6);

        if (tower.level > 1) {
            ctx.fillStyle = "#F0D58A";
            ctx.font = "11px Georgia";
            ctx.fillText("+" + (tower.level - 1), tower.x + 12, tower.y - 12);
        }
    });
}


/* =========================================
   ENEMY DRAWING
========================================= */

function drawEnemies() {
    if (!currentRun) return;

    currentRun.enemies.forEach(enemy => {
        const type = enemyTypes[enemy.type];
        const size = type.size;

        // Enemy shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(enemy.x - size, enemy.y + size / 2, size * 2, 5);

        // Enemy body
        ctx.fillStyle = type.color;
        ctx.fillRect(
            enemy.x - size / 2,
            enemy.y - size / 2,
            size,
            size
        );

        // Eyes
        ctx.fillStyle = "#241932";
        ctx.fillRect(enemy.x - 4, enemy.y - 3, 3, 3);
        ctx.fillRect(enemy.x + 2, enemy.y - 3, 3, 3);

        // Health bar
        const barWidth = enemy.type === "treant" ? 60 : 34;
        const percent = Math.max(0, enemy.health / enemy.maxHealth);

        ctx.fillStyle = "#241932";
        ctx.fillRect(
            enemy.x - barWidth / 2,
            enemy.y - size - 11,
            barWidth,
            6
        );

        ctx.fillStyle = percent > 0.5 ? "#75C77A" : "#D66B75";
        ctx.fillRect(
            enemy.x - barWidth / 2,
            enemy.y - size - 11,
            barWidth * percent,
            6
        );

        if (enemy.type === "treant") {
            ctx.fillStyle = "#F0D58A";
            ctx.font = "12px Georgia";
            ctx.textAlign = "center";
            ctx.fillText("ANCIENT TREANT", enemy.x, enemy.y - size - 17);
            ctx.textAlign = "left";
        }
    });
}


/* =========================================
   PROJECTILE DRAWING
========================================= */

function drawProjectiles() {
    if (!currentRun) return;

    currentRun.projectiles.forEach(projectile => {
        ctx.fillStyle = projectile.color;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
}


/* =========================================
   PATH CALCULATIONS
========================================= */

function getTotalPathLength() {
    let total = 0;

    for (let i = 0; i < pathPoints.length - 1; i++) {
        total += Math.hypot(
            pathPoints[i + 1].x - pathPoints[i].x,
            pathPoints[i + 1].y - pathPoints[i].y
        );
    }

    return total;
}

const totalPathLength = getTotalPathLength();

function getPathPosition(progress) {
    let targetDistance = progress * totalPathLength;

    for (let i = 0; i < pathPoints.length - 1; i++) {
        const a = pathPoints[i];
        const b = pathPoints[i + 1];

        const length = Math.hypot(b.x - a.x, b.y - a.y);

        if (targetDistance <= length) {
            const t = targetDistance / length;

            return {
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t
            };
        }

        targetDistance -= length;
    }

    return pathPoints[pathPoints.length - 1];
}


/* =========================================
   WAVE COMPOSITIONS
========================================= */

function createWaveQueue(wave) {
    const queue = [];

    if (wave === 15) {
        return ["treant"];
    }

    const count = 5 + wave * 2;

    for (let i = 0; i < count; i++) {
        if (wave >= 9 && i % 3 === 0) {
            queue.push("brute");
        } else if (wave >= 6 && i % 3 === 1) {
            queue.push("riftwing");
        } else if (wave >= 3 && i % 4 === 0) {
            queue.push("brute");
        } else {
            queue.push("riftling");
        }
    }

    return queue;
}

function startWave() {
    if (!currentRun || currentRun.waveActive || currentRun.gameOver) return;
    if (currentRun.currentWave >= currentRun.totalWaves) return;

    currentRun.currentWave++;
    currentRun.waveActive = true;
    currentRun.spawnQueue = createWaveQueue(currentRun.currentWave);
    currentRun.enemies = [];
    currentRun.projectiles = [];

    spawnTimer = 0;

    document.getElementById("start-wave").disabled = true;

    if (currentRun.currentWave === 15) {
        setWaveStatus("BOSS WAVE");
        showBattleMessage("THE ANCIENT TREANT HAS AWAKENED!");
    } else {
        setWaveStatus("WAVE " + currentRun.currentWave + " IN PROGRESS");
        showBattleMessage("WAVE " + currentRun.currentWave + " HAS BEGUN");
    }

    updateGameDisplay();
}

function spawnEnemy(type) {
    const data = enemyTypes[type];
    const difficulty = (typeof settings !== "undefined" && settings.difficulty) || "normal";

    let multiplier = 1 + currentRun.currentWave * 0.055;

    if (difficulty === "easy") multiplier *= 0.8;
    if (difficulty === "hard") multiplier *= 1.25;

    const health = data.health * multiplier;

    currentRun.enemies.push({
        type,
        x: pathPoints[0].x,
        y: pathPoints[0].y,
        health,
        maxHealth: health,
        progress: 0,
        reward: data.reward,
        damage: data.damage
    });
}


/* =========================================
   ENEMY MOVEMENT
========================================= */

function updateEnemies(deltaTime) {
    if (!currentRun) return;

    if (currentRun.waveActive && currentRun.spawnQueue.length > 0) {
        spawnTimer -= deltaTime;

        if (spawnTimer <= 0) {
            spawnEnemy(currentRun.spawnQueue.shift());
            spawnTimer = currentRun.currentWave === 15 ? 0 : 0.9;
        }
    }

    currentRun.enemies.forEach(enemy => {
        const type = enemyTypes[enemy.type];

        enemy.progress += type.speed * deltaTime / totalPathLength;

        const position = getPathPosition(enemy.progress);
        enemy.x = position.x;
        enemy.y = position.y;
    });

    currentRun.enemies = currentRun.enemies.filter(enemy => {
        if (enemy.progress >= 1) {
            currentRun.castleHealth = Math.max(
                0,
                currentRun.castleHealth - enemy.damage
            );

            updateGameDisplay();

            if (currentRun.castleHealth <= 0) {
                endGame();
            }

            return false;
        }

        return enemy.health > 0;
    });
}


/* =========================================
   TOWER TARGETING AND ATTACKS
========================================= */

function updateTowers(deltaTime) {
    if (!currentRun) return;

    currentRun.towers.forEach(tower => {
        const type = towerTypes[tower.type];

        tower.cooldown -= deltaTime;

        if (tower.cooldown > 0) return;

        let target = null;
        let highestProgress = -1;

        currentRun.enemies.forEach(enemy => {
            const distance = Math.hypot(
                enemy.x - tower.x,
                enemy.y - tower.y
            );

            if (
                distance <= type.range &&
                enemy.progress > highestProgress
            ) {
                highestProgress = enemy.progress;
                target = enemy;
            }
        });

        if (!target) return;

        currentRun.projectiles.push({
            x: tower.x,
            y: tower.y,
            target,
            damage: type.damage + currentRun.towerDamageBonus,
            color: type.color,
            speed: type.projectileSpeed,
            towerType: tower.type
        });

        tower.cooldown = 1 / type.fireRate;
    });
}


/* =========================================
   PROJECTILE COLLISION
========================================= */

function damageEnemy(enemy, damage) {
    enemy.health -= damage;

    if (enemy.health <= 0 && !enemy.rewarded) {
        enemy.rewarded = true;
        currentRun.gold += enemy.reward;

        updateGameDisplay();
    }
}

function updateProjectiles(deltaTime) {
    if (!currentRun) return;

    currentRun.projectiles = currentRun.projectiles.filter(projectile => {
        const target = projectile.target;

        if (!currentRun.enemies.includes(target) || target.health <= 0) {
            return false;
        }

        const dx = target.x - projectile.x;
        const dy = target.y - projectile.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 9) {
            damageEnemy(target, projectile.damage);

            // Cannon splash damage
            if (projectile.towerType === "cannon") {
                currentRun.enemies.forEach(enemy => {
                    if (enemy !== target) {
                        const splashDistance = Math.hypot(
                            enemy.x - target.x,
                            enemy.y - target.y
                        );

                        if (splashDistance < 48) {
                            damageEnemy(enemy, projectile.damage * 0.5);
                        }
                    }
                });
            }

            return false;
        }

        const movement = projectile.speed * deltaTime;

        projectile.x += dx / distance * movement;
        projectile.y += dy / distance * movement;

        return true;
    });

    currentRun.enemies = currentRun.enemies.filter(enemy => {
        return enemy.health > 0;
    });
}


/* =========================================
   WAVE COMPLETION
========================================= */

function checkWaveCompletion() {
    if (!currentRun || !currentRun.waveActive) return;

    if (
        currentRun.spawnQueue.length === 0 &&
        currentRun.enemies.length === 0
    ) {
        currentRun.waveActive = false;
        currentRun.projectiles = [];

        updateGameDisplay();

        if (currentRun.currentWave === 15) {
            finishRegion();
            return;
        }

        document.getElementById("start-wave").disabled = false;

        setWaveStatus("WAVE COMPLETE");
        showBattleMessage(
            "WAVE " + currentRun.currentWave + " COMPLETE - PREPARE FOR THE NEXT WAVE"
        );
    }
}


/* =========================================
   GAME RESULTS
========================================= */

function endGame() {
    if (currentRun.gameOver) return;

    currentRun.gameOver = true;
    currentRun.waveActive = false;

    stopGameLoop();

    setWaveStatus("DEFEAT");
    showBattleMessage("THE CASTLE HAS FALLEN");

    document.getElementById("result-eyebrow").textContent =
        "THE FORTRESS HAS FALLEN";

    document.getElementById("result-title").textContent = "DEFEAT";

    document.getElementById("result-description").textContent =
        "You reached wave " + currentRun.currentWave + ". Your defense has ended.";

    document.getElementById("result-continue").textContent = "RETURN TO MENU";
    document.getElementById("result-continue").dataset.action = "menu";

    document.getElementById("result-overlay").hidden = false;
}

function finishRegion() {
    currentRun.gameOver = true;
    currentRun.waveActive = false;

    stopGameLoop();

    setWaveStatus("REGION COMPLETE");
    showBattleMessage("THE ANCIENT TREANT HAS BEEN DEFEATED!");

    document.getElementById("result-eyebrow").textContent =
        "THE RIFT HAS BEEN SEALED";

    document.getElementById("result-title").textContent = "VICTORY";

    document.getElementById("result-description").textContent =
        "You survived all 15 waves and defeated the Ancient Treant.";

    document.getElementById("result-continue").textContent =
        "VISIT RESTING SITE";

    document.getElementById("result-continue").dataset.action = "rest";

    document.getElementById("result-overlay").hidden = false;
}


/* =========================================
   GAME LOOP
========================================= */

function gameLoop(timestamp) {
    if (!gameRunning || !currentRun) return;

    const deltaTime = Math.min(
        Math.max((timestamp - lastFrameTime) / 1000, 0),
        0.033
    );

    lastFrameTime = timestamp;

    if (currentRun.waveActive) {
        updateEnemies(deltaTime);
        updateTowers(deltaTime);
        updateProjectiles(deltaTime);
        checkWaveCompletion();
    }

    drawBattlefield();

    if (gameRunning) {
        animationFrame = requestAnimationFrame(gameLoop);
    }
}

function startGameLoop() {
    stopGameLoop();

    gameRunning = true;
    lastFrameTime = performance.now();

    animationFrame = requestAnimationFrame(gameLoop);
}

function stopGameLoop() {
    gameRunning = false;

    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    }
}


/* =========================================
   BUILDING VALIDATION
========================================= */

function isOnPath(x, y) {
    for (let i = 0; i < pathPoints.length - 1; i++) {
        const a = pathPoints[i];
        const b = pathPoints[i + 1];

        const dx = b.x - a.x;
        const dy = b.y - a.y;

        const lengthSquared = dx * dx + dy * dy;

        let t = ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));

        const nearestX = a.x + t * dx;
        const nearestY = a.y + t * dy;

        if (Math.hypot(x - nearestX, y - nearestY) < 43) {
            return true;
        }
    }

    return false;
}

function handleBattlefieldClick(event) {
    if (!currentRun || currentRun.gameOver) return;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);

    const type = towerTypes[selectedTower];
    if (!type) return;

    if (currentRun.gold < type.cost) {
        showBattleMessage("NOT ENOUGH GOLD");
        return;
    }

    if (isOnPath(x, y)) {
        showBattleMessage("YOU CANNOT BUILD ON THE PATH");
        return;
    }

    if (
        Math.hypot(x - 75, y - 270) < 65 ||
        (x > 830 && y > 200 && y < 340) ||
        x < 25 || x > 935 || y < 25 || y > 515
    ) {
        showBattleMessage("THAT AREA IS BLOCKED");
        return;
    }

    const tooClose = currentRun.towers.some(tower => {
        return Math.hypot(x - tower.x, y - tower.y) < 48;
    });

    if (tooClose) {
        showBattleMessage("TOO CLOSE TO ANOTHER TOWER");
        return;
    }

    currentRun.gold -= type.cost;

    currentRun.towers.push({
        type: selectedTower,
        x,
        y,
        cooldown: 0,
        level: 1
    });

    updateGameDisplay();
    drawBattlefield();

    showBattleMessage(type.name.toUpperCase() + " TOWER BUILT");
}


/* =========================================
   TOWER SELECTION
========================================= */

function selectTower(type) {
    if (!towerTypes[type]) return;

    selectedTower = type;

    document.querySelectorAll(".tower-button").forEach(button => {
        button.classList.toggle(
            "selected",
            button.dataset.tower === type
        );
    });

    showBattleMessage(towerTypes[type].name.toUpperCase() + " SELECTED");
}


/* =========================================
   BATTLEFIELD INPUT
========================================= */

// Pointer events work with both a mouse and a touchscreen.
// The canvas coordinates are converted from its displayed size to
// the fixed 960x540 game-world coordinate system.
canvas.addEventListener("pointerdown", event => {
    if (!currentRun || currentRun.gameOver || gameScreenIsHidden()) return;

    event.preventDefault();
    handleBattlefieldClick(event);
});

function gameScreenIsHidden() {
    const screen = document.getElementById("game-screen");
    return !screen || screen.hidden;
}

/* =========================================
   RESTING SITE
========================================= */

function updateRestScreen() {
    document.getElementById("rest-gold").textContent =
        currentRun.gold;

    document.getElementById("rest-health").textContent =
        currentRun.castleHealth + " / " + currentRun.maxCastleHealth;

    document.getElementById("rest-towers").textContent =
        currentRun.towers.length;

    document.getElementById("rest-heal").disabled =
        currentRun.gold < 40 ||
        currentRun.castleHealth >= currentRun.maxCastleHealth;

    document.getElementById("rest-upgrade").disabled =
        currentRun.gold < 75;
}

function healAtRestSite() {
    if (currentRun.gold < 40) return;

    if (currentRun.castleHealth >= currentRun.maxCastleHealth) {
        return;
    }

    currentRun.gold -= 40;
    currentRun.castleHealth = Math.min(
        currentRun.maxCastleHealth,
        currentRun.castleHealth + 30
    );

    updateRestScreen();
}

function upgradeAtRestSite() {
    if (currentRun.gold < 75) return;

    currentRun.gold -= 75;
    currentRun.towerDamageBonus += 5;

    updateRestScreen();
}
