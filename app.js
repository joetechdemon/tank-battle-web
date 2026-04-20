const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const minimapCanvas = document.getElementById("minimapCanvas");
const minimapCtx = minimapCanvas.getContext("2d");
const healthValue = document.getElementById("healthValue");
const healthBar = document.getElementById("healthBar");
const scoreValue = document.getElementById("scoreValue");
const waveValue = document.getElementById("waveValue");
const statusValue = document.getElementById("statusValue");
const baseBar = document.getElementById("baseBar");
const restartButton = document.getElementById("restartButton");

const VIEWPORT_WIDTH = canvas.width;
const VIEWPORT_HEIGHT = canvas.height;
const TILE = 32;
const WORLD_COLS = 40;
const WORLD_ROWS = 28;
const WORLD_WIDTH = WORLD_COLS * TILE;
const WORLD_HEIGHT = WORLD_ROWS * TILE;
const MAX_PLAYER_BULLETS = 12;
const MAX_ENEMY_BULLETS = 24;
const MAX_ENEMIES = 10;
const PLAYER_SPEED = 176;
const ENEMY_SPEED = 94;
const BULLET_SPEED = 360;
const BASE_SIZE = 46;
const PLAYER_MAX_HP = 3;
const BASE_MAX_HP = 3;
const BASE_POSITION = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT - 56 };
const PLAYER_SPAWN_PREFERENCE = { x: BASE_POSITION.x, y: BASE_POSITION.y - 112 };
const MAP_CLUSTERS = [
  { kind: "brick", col: 2, row: 1, width: 3, height: 2 },
  { kind: "steel", col: 8, row: 1, width: 4, height: 1 },
  { kind: "brick", col: 16, row: 1, width: 3, height: 2 },
  { kind: "steel", col: 24, row: 1, width: 4, height: 1 },
  { kind: "brick", col: 32, row: 1, width: 3, height: 2 },
  { kind: "brick", col: 5, row: 4, width: 2, height: 3 },
  { kind: "steel", col: 11, row: 4, width: 5, height: 1 },
  { kind: "brick", col: 20, row: 4, width: 3, height: 2 },
  { kind: "steel", col: 27, row: 4, width: 2, height: 3 },
  { kind: "brick", col: 33, row: 4, width: 4, height: 1 },
  { kind: "brick", col: 1, row: 8, width: 5, height: 1 },
  { kind: "steel", col: 8, row: 8, width: 3, height: 2 },
  { kind: "brick", col: 14, row: 8, width: 4, height: 1 },
  { kind: "steel", col: 22, row: 8, width: 4, height: 2 },
  { kind: "brick", col: 29, row: 8, width: 5, height: 1 },
  { kind: "steel", col: 36, row: 8, width: 2, height: 2 },
  { kind: "brick", col: 4, row: 12, width: 3, height: 2 },
  { kind: "steel", col: 10, row: 12, width: 2, height: 4 },
  { kind: "brick", col: 15, row: 13, width: 8, height: 1 },
  { kind: "brick", col: 26, row: 12, width: 3, height: 2 },
  { kind: "steel", col: 32, row: 12, width: 2, height: 4 },
  { kind: "brick", col: 6, row: 17, width: 4, height: 1 },
  { kind: "steel", col: 13, row: 17, width: 3, height: 2 },
  { kind: "brick", col: 20, row: 16, width: 2, height: 4 },
  { kind: "steel", col: 25, row: 17, width: 3, height: 2 },
  { kind: "brick", col: 31, row: 17, width: 4, height: 1 },
  { kind: "brick", col: 3, row: 21, width: 3, height: 2 },
  { kind: "steel", col: 8, row: 21, width: 2, height: 3 },
  { kind: "brick", col: 12, row: 22, width: 4, height: 1 },
  { kind: "steel", col: 24, row: 21, width: 2, height: 3 },
  { kind: "brick", col: 28, row: 22, width: 4, height: 1 },
  { kind: "brick", col: 34, row: 21, width: 3, height: 2 },
  { kind: "brick", col: 14, row: 24, width: 2, height: 2 },
  { kind: "steel", col: 24, row: 24, width: 2, height: 2 },
  { kind: "brick", col: 17, row: 25, width: 2, height: 1 },
  { kind: "brick", col: 21, row: 25, width: 2, height: 1 }
];

const keys = new Set();
const camera = { x: 0, y: Math.max(0, WORLD_HEIGHT - VIEWPORT_HEIGHT) };

const playerBullets = Array.from({ length: MAX_PLAYER_BULLETS }, createBullet);
const enemyBullets = Array.from({ length: MAX_ENEMY_BULLETS }, createBullet);
const enemies = Array.from({ length: MAX_ENEMIES }, () => createEnemy(false));

let obstacles = [];
let gameState = null;
let previousTime = 0;

window.__tankBattle = {
  VIEWPORT_WIDTH,
  VIEWPORT_HEIGHT,
  WORLD_WIDTH,
  WORLD_HEIGHT
};

document.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  keys.add(event.code);
});

document.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

restartButton.addEventListener("click", () => {
  resetGame();
});

function createBullet() {
  return {
    active: false,
    owner: "player",
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 4
  };
}

function createEnemy(active) {
  return {
    active,
    x: 0,
    y: 0,
    size: 28,
    dirX: 0,
    dirY: 1,
    fireCooldown: 0,
    moveCooldown: 0,
    hp: 1
  };
}

function createPlayer(spawnPoint) {
  return {
    x: spawnPoint.x,
    y: spawnPoint.y,
    size: 28,
    dirX: 0,
    dirY: -1,
    hp: PLAYER_MAX_HP,
    shootCooldown: 0,
    invulnerable: 1.5
  };
}

function addCluster(blocks, cluster) {
  for (let row = cluster.row; row < cluster.row + cluster.height; row += 1) {
    for (let col = cluster.col; col < cluster.col + cluster.width; col += 1) {
      blocks.push({
        kind: cluster.kind,
        x: col * TILE,
        y: row * TILE,
        w: TILE,
        h: TILE,
        alive: true
      });
    }
  }
}

function buildMap() {
  const blocks = [];
  for (const cluster of MAP_CLUSTERS) {
    addCluster(blocks, cluster);
  }
  return blocks;
}

function overlapsObstacle(entity, nextX, nextY) {
  const left = nextX - entity.size / 2;
  const right = nextX + entity.size / 2;
  const top = nextY - entity.size / 2;
  const bottom = nextY + entity.size / 2;

  for (const block of obstacles) {
    if (!block.alive) {
      continue;
    }
    if (
      right > block.x &&
      left < block.x + block.w &&
      bottom > block.y &&
      top < block.y + block.h
    ) {
      return true;
    }
  }
  return false;
}

function overlapsAt(size, nextX, nextY) {
  return overlapsObstacle({ size }, nextX, nextY);
}

function overlapsBaseAt(size, nextX, nextY) {
  const half = size / 2;
  const baseHalf = BASE_SIZE / 2;
  const left = nextX - half;
  const right = nextX + half;
  const top = nextY - half;
  const bottom = nextY + half;
  const baseLeft = BASE_POSITION.x - baseHalf;
  const baseRight = BASE_POSITION.x + baseHalf;
  const baseTop = BASE_POSITION.y - baseHalf;
  const baseBottom = BASE_POSITION.y + baseHalf;

  return right > baseLeft && left < baseRight && bottom > baseTop && top < baseBottom;
}

function findSafeSpawnPoint(preferredX, preferredY, size, searchRows) {
  if (!overlapsAt(size, preferredX, preferredY) && !overlapsBaseAt(size, preferredX, preferredY)) {
    return { x: preferredX, y: preferredY };
  }

  for (const offsetY of searchRows) {
    for (let offsetX = 0; offsetX <= TILE * 6; offsetX += TILE / 2) {
      const candidates = offsetX === 0 ? [0] : [-offsetX, offsetX];
      for (const offset of candidates) {
        const x = preferredX + offset;
        const y = preferredY + offsetY;
        const clampedX = Math.max(size / 2, Math.min(WORLD_WIDTH - size / 2, x));
        const clampedY = Math.max(size / 2, Math.min(WORLD_HEIGHT - size / 2, y));
        if (!overlapsAt(size, clampedX, clampedY) && !overlapsBaseAt(size, clampedX, clampedY)) {
          return { x: clampedX, y: clampedY };
        }
      }
    }
  }

  return { x: preferredX, y: preferredY };
}

function findEnemySpawnPoints(count) {
  const points = [];
  const scanRows = [48, 96, 144, 192];
  const minDistance = TILE * 3;

  for (const y of scanRows) {
    for (let x = TILE * 1.5; x <= WORLD_WIDTH - TILE * 1.5; x += TILE) {
      if (overlapsAt(28, x, y) || overlapsBaseAt(28, x, y)) {
        continue;
      }
      if (points.some((point) => Math.hypot(point.x - x, point.y - y) < minDistance)) {
        continue;
      }
      points.push({ x, y });
      if (points.length === count) {
        return points;
      }
    }
  }

  return points;
}

function clampEntity(entity) {
  entity.x = Math.max(entity.size / 2, Math.min(WORLD_WIDTH - entity.size / 2, entity.x));
  entity.y = Math.max(entity.size / 2, Math.min(WORLD_HEIGHT - entity.size / 2, entity.y));
}

function deactivatePool(pool) {
  for (const item of pool) {
    item.active = false;
  }
}

function resetGame() {
  obstacles = buildMap();
  const playerSpawn = findSafeSpawnPoint(
    PLAYER_SPAWN_PREFERENCE.x,
    PLAYER_SPAWN_PREFERENCE.y,
    28,
    [0, -TILE, -TILE / 2, TILE / 2, TILE, -(TILE * 1.5), TILE * 1.5]
  );
  const enemySpawnPoints = findEnemySpawnPoints(MAX_ENEMIES);

  gameState = {
    mode: "running",
    score: 0,
    wave: 1,
    baseHp: BASE_MAX_HP,
    player: createPlayer(playerSpawn),
    enemiesRemaining: 0,
    waveClearTimer: 0,
    enemySpawnPoints
  };

  deactivatePool(playerBullets);
  deactivatePool(enemyBullets);
  for (const enemy of enemies) {
    enemy.active = false;
  }

  spawnWave();
  updateCamera();
  syncHud();
}

function spawnWave() {
  const activeCount = Math.min(MAX_ENEMIES, 4 + gameState.wave);
  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    if (i < activeCount) {
      const spawnPoint = gameState.enemySpawnPoints[i % gameState.enemySpawnPoints.length];
      enemy.active = true;
      enemy.x = spawnPoint.x;
      enemy.y = spawnPoint.y;
      enemy.dirX = 0;
      enemy.dirY = 1;
      enemy.fireCooldown = 0.55 + i * 0.18;
      enemy.moveCooldown = 0.12 * i;
      enemy.hp = 1;
      retargetEnemy(enemy, gameState.player);
    } else {
      enemy.active = false;
    }
  }
  gameState.enemiesRemaining = activeCount;
  gameState.waveClearTimer = 0;
  statusValue.textContent = `第 ${gameState.wave} 波进攻中`;
}

function syncHud() {
  const playerHp = Math.max(0, gameState.player.hp);
  const baseHp = Math.max(0, gameState.baseHp);

  healthValue.textContent = `${playerHp} / ${PLAYER_MAX_HP}`;
  healthBar.style.width = `${(playerHp / PLAYER_MAX_HP) * 100}%`;
  scoreValue.textContent = String(gameState.score);
  waveValue.textContent = String(gameState.wave);
  baseBar.style.width = `${(baseHp / BASE_MAX_HP) * 100}%`;

  if (gameState.mode === "running" && gameState.enemiesRemaining > 0) {
    statusValue.textContent = `大地图追击中，剩余敌军 ${gameState.enemiesRemaining}`;
  }
}

function spawnBullet(pool, x, y, dirX, dirY, owner) {
  const bullet = pool.find((item) => !item.active);
  if (!bullet) {
    return;
  }
  bullet.active = true;
  bullet.owner = owner;
  bullet.x = x;
  bullet.y = y;
  bullet.vx = dirX * BULLET_SPEED;
  bullet.vy = dirY * BULLET_SPEED;
}

function canTravel(entity, dirX, dirY, distance = TILE * 0.75) {
  return !overlapsObstacle(entity, entity.x + dirX * distance, entity.y + dirY * distance);
}

function buildEnemyDirectionCandidates(enemy, player) {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const horizontal = [Math.sign(dx || 1), 0];
  const vertical = [0, Math.sign(dy || 1)];
  const fallback = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];
  const preferred =
    Math.abs(dx) > Math.abs(dy) ? [horizontal, vertical] : [vertical, horizontal];
  const seen = new Set();
  const candidates = [];

  for (const [dirX, dirY] of [...preferred, ...fallback]) {
    const key = `${dirX},${dirY}`;
    if (seen.has(key) || (dirX === 0 && dirY === 0)) {
      continue;
    }
    seen.add(key);
    candidates.push([dirX, dirY]);
  }

  return candidates;
}

function retargetEnemy(enemy, player) {
  for (const [dirX, dirY] of buildEnemyDirectionCandidates(enemy, player)) {
    if (canTravel(enemy, dirX, dirY)) {
      enemy.dirX = dirX;
      enemy.dirY = dirY;
      return;
    }
  }
  enemy.dirX = 0;
  enemy.dirY = 1;
}

function updateCamera() {
  const player = gameState.player;
  camera.x = Math.max(
    0,
    Math.min(WORLD_WIDTH - VIEWPORT_WIDTH, player.x - VIEWPORT_WIDTH / 2)
  );
  camera.y = Math.max(
    0,
    Math.min(WORLD_HEIGHT - VIEWPORT_HEIGHT, player.y - VIEWPORT_HEIGHT / 2)
  );
}

function updatePlayer(dt) {
  const player = gameState.player;
  let moveX = 0;
  let moveY = 0;

  if (keys.has("KeyW") || keys.has("ArrowUp")) {
    moveY -= 1;
  }
  if (keys.has("KeyS") || keys.has("ArrowDown")) {
    moveY += 1;
  }
  if (keys.has("KeyA") || keys.has("ArrowLeft")) {
    moveX -= 1;
  }
  if (keys.has("KeyD") || keys.has("ArrowRight")) {
    moveX += 1;
  }

  if (moveX !== 0 || moveY !== 0) {
    const length = Math.hypot(moveX, moveY);
    moveX /= length;
    moveY /= length;
    player.dirX = moveX;
    player.dirY = moveY;

    const nextX = player.x + moveX * PLAYER_SPEED * dt;
    const nextY = player.y + moveY * PLAYER_SPEED * dt;

    if (!overlapsObstacle(player, nextX, player.y) && !overlapsBaseAt(player.size, nextX, player.y)) {
      player.x = nextX;
    }
    if (!overlapsObstacle(player, player.x, nextY) && !overlapsBaseAt(player.size, player.x, nextY)) {
      player.y = nextY;
    }
    clampEntity(player);
  }

  player.shootCooldown = Math.max(0, player.shootCooldown - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);

  if ((keys.has("Space") || keys.has("KeyJ")) && player.shootCooldown === 0) {
    spawnBullet(
      playerBullets,
      player.x + player.dirX * 18,
      player.y + player.dirY * 18,
      player.dirX,
      player.dirY,
      "player"
    );
    player.shootCooldown = 0.25;
  }
}

function updateEnemies(dt) {
  const player = gameState.player;

  for (const enemy of enemies) {
    if (!enemy.active) {
      continue;
    }

    enemy.moveCooldown -= dt;
    enemy.fireCooldown -= dt;

    if (enemy.moveCooldown <= 0) {
      retargetEnemy(enemy, player);
      enemy.moveCooldown = 0.4 + Math.random() * 0.45;
    }

    const nextX = enemy.x + enemy.dirX * ENEMY_SPEED * dt;
    const nextY = enemy.y + enemy.dirY * ENEMY_SPEED * dt;

    if (!overlapsObstacle(enemy, nextX, enemy.y) && !overlapsBaseAt(enemy.size, nextX, enemy.y)) {
      enemy.x = nextX;
    } else {
      retargetEnemy(enemy, player);
      enemy.moveCooldown = 0.08;
    }

    if (!overlapsObstacle(enemy, enemy.x, nextY) && !overlapsBaseAt(enemy.size, enemy.x, nextY)) {
      enemy.y = nextY;
    } else {
      retargetEnemy(enemy, player);
      enemy.moveCooldown = 0.08;
    }

    clampEntity(enemy);

    if (enemy.fireCooldown <= 0) {
      spawnBullet(
        enemyBullets,
        enemy.x + enemy.dirX * 16,
        enemy.y + enemy.dirY * 16,
        enemy.dirX,
        enemy.dirY,
        "enemy"
      );
      enemy.fireCooldown = 0.9 + Math.random() * 0.8;
    }
  }
}

function bulletHitsBlock(bullet) {
  for (const block of obstacles) {
    if (!block.alive) {
      continue;
    }
    if (
      bullet.x + bullet.radius > block.x &&
      bullet.x - bullet.radius < block.x + block.w &&
      bullet.y + bullet.radius > block.y &&
      bullet.y - bullet.radius < block.y + block.h
    ) {
      if (block.kind === "brick") {
        block.alive = false;
      }
      bullet.active = false;
      return true;
    }
  }
  return false;
}

function updateBullets(dt, pool) {
  const player = gameState.player;

  for (const bullet of pool) {
    if (!bullet.active) {
      continue;
    }

    const travel = Math.max(Math.abs(bullet.vx * dt), Math.abs(bullet.vy * dt));
    const steps = Math.max(1, Math.ceil(travel / (bullet.radius * 1.5)));
    const stepX = (bullet.vx * dt) / steps;
    const stepY = (bullet.vy * dt) / steps;

    for (let step = 0; step < steps; step += 1) {
      bullet.x += stepX;
      bullet.y += stepY;

      if (
        bullet.x < -bullet.radius ||
        bullet.x > WORLD_WIDTH + bullet.radius ||
        bullet.y < -bullet.radius ||
        bullet.y > WORLD_HEIGHT + bullet.radius
      ) {
        bullet.active = false;
        break;
      }

      if (bulletHitsBlock(bullet)) {
        break;
      }

      if (
        bullet.owner === "enemy" &&
        player.invulnerable === 0 &&
        circleRectCollision(bullet, player)
      ) {
        bullet.active = false;
        player.hp -= 1;
        player.invulnerable = 1.2;
        statusValue.textContent = `玩家受击，剩余生命 ${Math.max(0, player.hp)}`;
        if (player.hp <= 0) {
          gameState.mode = "lost";
          statusValue.textContent = "你的坦克已被击毁";
        }
        break;
      }

      if (
        bullet.owner === "enemy" &&
        bullet.x + bullet.radius > BASE_POSITION.x - BASE_SIZE / 2 &&
        bullet.x - bullet.radius < BASE_POSITION.x + BASE_SIZE / 2 &&
        bullet.y + bullet.radius > BASE_POSITION.y - BASE_SIZE / 2 &&
        bullet.y - bullet.radius < BASE_POSITION.y + BASE_SIZE / 2
      ) {
        bullet.active = false;
        gameState.baseHp -= 1;
        if (gameState.baseHp <= 0) {
          gameState.mode = "lost";
          statusValue.textContent = "基地被摧毁";
        }
        break;
      }

      if (bullet.owner === "player") {
        let hitEnemy = false;
        for (const enemy of enemies) {
          if (!enemy.active || !circleRectCollision(bullet, enemy)) {
            continue;
          }
          bullet.active = false;
          enemy.hp -= 1;
          if (enemy.hp <= 0) {
            enemy.active = false;
            gameState.score += 100;
            gameState.enemiesRemaining -= 1;
            if (gameState.enemiesRemaining === 0) {
              gameState.waveClearTimer = 1.1;
              statusValue.textContent = "本波清空，准备下一波";
            }
          }
          hitEnemy = true;
          break;
        }
        if (hitEnemy) {
          break;
        }
      }
    }
  }
}

function circleRectCollision(circle, rect) {
  const half = rect.size / 2;
  const closestX = Math.max(rect.x - half, Math.min(circle.x, rect.x + half));
  const closestY = Math.max(rect.y - half, Math.min(circle.y, rect.y + half));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function updateWave(dt) {
  if (gameState.mode !== "running") {
    return;
  }

  if (gameState.enemiesRemaining === 0) {
    gameState.waveClearTimer -= dt;
    if (gameState.waveClearTimer <= 0) {
      gameState.wave += 1;
      gameState.baseHp = Math.min(BASE_MAX_HP, gameState.baseHp + 1);
      spawnWave();
    }
  }
}

function update(dt) {
  if (gameState.mode !== "running") {
    updateCamera();
    syncHud();
    return;
  }

  updatePlayer(dt);
  updateEnemies(dt);
  updateBullets(dt, playerBullets);
  updateBullets(dt, enemyBullets);
  updateWave(dt);
  updateCamera();
  syncHud();
}

function drawTank(entity, color, turretColor) {
  ctx.save();
  ctx.translate(entity.x, entity.y);
  const angle = Math.atan2(entity.dirY, entity.dirX) + Math.PI / 2;
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.fillRect(-entity.size / 2, -entity.size / 2, entity.size, entity.size);
  ctx.fillStyle = turretColor;
  ctx.fillRect(-5, -entity.size / 2 - 10, 10, 18);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(-entity.size / 2 + 4, -entity.size / 2 + 4, entity.size - 8, 8);
  ctx.restore();
}

function drawBase() {
  ctx.save();
  ctx.translate(BASE_POSITION.x, BASE_POSITION.y);
  ctx.fillStyle = gameState.baseHp > 1 ? "#f4d35e" : "#ff6f59";
  ctx.fillRect(-BASE_SIZE / 2, -BASE_SIZE / 2, BASE_SIZE, BASE_SIZE);
  ctx.fillStyle = "#4d2d12";
  ctx.fillRect(-10, -16, 20, 32);
  ctx.fillRect(-16, -10, 32, 20);
  ctx.restore();
}

function drawBattlefield() {
  ctx.fillStyle = "#1a4028";
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  const startCol = Math.max(0, Math.floor(camera.x / TILE) - 1);
  const endCol = Math.min(WORLD_COLS, Math.ceil((camera.x + VIEWPORT_WIDTH) / TILE) + 1);
  const startRow = Math.max(0, Math.floor(camera.y / TILE) - 1);
  const endRow = Math.min(WORLD_ROWS, Math.ceil((camera.y + VIEWPORT_HEIGHT) / TILE) + 1);

  for (let row = startRow; row < endRow; row += 1) {
    for (let col = startCol; col < endCol; col += 1) {
      ctx.fillStyle = (col + row) % 2 === 0 ? "#234c2f" : "#1d432b";
      ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
    }
  }

  for (const block of obstacles) {
    if (!block.alive) {
      continue;
    }
    ctx.fillStyle = block.kind === "brick" ? "#9d4b28" : "#708090";
    ctx.fillRect(block.x + 2, block.y + 2, block.w - 4, block.h - 4);
  }
}

function drawBullets(pool, color) {
  ctx.fillStyle = color;
  for (const bullet of pool) {
    if (!bullet.active) {
      continue;
    }
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWorld() {
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  drawBattlefield();
  drawBase();
  const player = gameState.player;
  const playerColor = player.invulnerable > 0 ? "#8de2ff" : "#54f0a9";
  drawTank(player, playerColor, "#113f67");
  for (const enemy of enemies) {
    if (enemy.active) {
      drawTank(enemy, "#f25f5c", "#601313");
    }
  }
  drawBullets(playerBullets, "#ffe066");
  drawBullets(enemyBullets, "#ffd6d6");
  ctx.restore();
}

function drawViewportChrome() {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, VIEWPORT_WIDTH - 4, VIEWPORT_HEIGHT - 4);

  ctx.fillStyle = "rgba(4, 16, 28, 0.68)";
  ctx.fillRect(18, 18, 190, 40);
  ctx.fillStyle = "#f4f8ff";
  ctx.font = '12px "Press Start 2P"';
  ctx.fillText("MEGA MAP", 30, 44);
}

function drawOverlay() {
  if (gameState.mode === "running") {
    return;
  }

  ctx.fillStyle = "rgba(4, 10, 20, 0.72)";
  ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
  ctx.fillStyle = "#fff5da";
  ctx.textAlign = "center";
  ctx.font = '24px "Press Start 2P"';
  ctx.fillText(
    gameState.mode === "lost" ? "GAME OVER" : "STAGE CLEAR",
    VIEWPORT_WIDTH / 2,
    VIEWPORT_HEIGHT / 2 - 10
  );
  ctx.font = '16px "Noto Sans SC"';
  ctx.fillText("点击右侧按钮重新开始", VIEWPORT_WIDTH / 2, VIEWPORT_HEIGHT / 2 + 34);
  ctx.textAlign = "left";
}

function renderMinimap() {
  const width = minimapCanvas.width;
  const height = minimapCanvas.height;
  const scaleX = width / WORLD_WIDTH;
  const scaleY = height / WORLD_HEIGHT;

  minimapCtx.clearRect(0, 0, width, height);
  minimapCtx.fillStyle = "#10263d";
  minimapCtx.fillRect(0, 0, width, height);

  minimapCtx.fillStyle = "#244b32";
  minimapCtx.fillRect(4, 4, width - 8, height - 8);

  for (const block of obstacles) {
    if (!block.alive) {
      continue;
    }
    minimapCtx.fillStyle = block.kind === "brick" ? "#ad6a3a" : "#8d9aa9";
    minimapCtx.fillRect(block.x * scaleX, block.y * scaleY, block.w * scaleX, block.h * scaleY);
  }

  minimapCtx.fillStyle = "#ffd166";
  minimapCtx.fillRect(
    (BASE_POSITION.x - BASE_SIZE / 2) * scaleX,
    (BASE_POSITION.y - BASE_SIZE / 2) * scaleY,
    BASE_SIZE * scaleX,
    BASE_SIZE * scaleY
  );

  minimapCtx.fillStyle = "#ff6b6b";
  for (const enemy of enemies) {
    if (!enemy.active) {
      continue;
    }
    minimapCtx.fillRect((enemy.x - 4) * scaleX, (enemy.y - 4) * scaleY, 8 * scaleX, 8 * scaleY);
  }

  const player = gameState.player;
  minimapCtx.fillStyle = "#59f2b1";
  minimapCtx.fillRect((player.x - 5) * scaleX, (player.y - 5) * scaleY, 10 * scaleX, 10 * scaleY);

  minimapCtx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  minimapCtx.lineWidth = 1.5;
  minimapCtx.strokeRect(
    camera.x * scaleX,
    camera.y * scaleY,
    VIEWPORT_WIDTH * scaleX,
    VIEWPORT_HEIGHT * scaleY
  );
}

function render() {
  ctx.clearRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
  drawWorld();
  drawViewportChrome();
  drawOverlay();
  renderMinimap();
}

function frame(timestamp) {
  const dt = Math.min(0.032, (timestamp - previousTime) / 1000 || 0);
  previousTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

resetGame();
requestAnimationFrame(frame);
