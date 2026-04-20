const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const healthValue = document.getElementById("healthValue");
const healthBar = document.getElementById("healthBar");
const scoreValue = document.getElementById("scoreValue");
const waveValue = document.getElementById("waveValue");
const statusValue = document.getElementById("statusValue");
const baseBar = document.getElementById("baseBar");
const restartButton = document.getElementById("restartButton");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const TILE = 32;
const MAX_PLAYER_BULLETS = 10;
const MAX_ENEMY_BULLETS = 18;
const MAX_ENEMIES = 8;
const PLAYER_SPEED = 170;
const ENEMY_SPEED = 92;
const BULLET_SPEED = 360;
const BASE_SIZE = 46;
const PLAYER_MAX_HP = 3;
const BASE_MAX_HP = 3;

const keys = new Set();

const playerBullets = Array.from({ length: MAX_PLAYER_BULLETS }, createBullet);
const enemyBullets = Array.from({ length: MAX_ENEMY_BULLETS }, createBullet);
const enemies = Array.from({ length: MAX_ENEMIES }, () => createEnemy(false));

let obstacles = [];
let gameState = null;
let previousTime = 0;

document.addEventListener("keydown", (event) => {
  const code = event.code;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code)) {
    event.preventDefault();
  }
  keys.add(code);
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

function createPlayer() {
  return {
    x: WIDTH / 2,
    y: HEIGHT - 88,
    size: 28,
    dirX: 0,
    dirY: -1,
    hp: PLAYER_MAX_HP,
    shootCooldown: 0,
    invulnerable: 1.5
  };
}

function buildMap() {
  const blocks = [];
  const layout = [
    "..........................",
    "...bb.....sss.....bb......",
    "...bb..............bb.....",
    "........bbbbbb............",
    "..sss..............sss....",
    "...........bb.............",
    "......bb........bb........",
    "........ssssssss..........",
    "..........................",
    "......bb....bb....bb......",
    "..........................",
    "...........bbbb...........",
    "..........................",
    "...........bssb...........",
    "...........b..b...........",
    "...........bbbb..........."
  ];

  for (let row = 0; row < layout.length; row += 1) {
    for (let col = 0; col < layout[row].length; col += 1) {
      const tile = layout[row][col];
      if (tile === ".") {
        continue;
      }
      blocks.push({
        kind: tile === "b" ? "brick" : "steel",
        x: col * TILE,
        y: row * TILE,
        w: TILE,
        h: TILE,
        alive: true
      });
    }
  }

  return blocks;
}

function resetGame() {
  obstacles = buildMap();
  gameState = {
    mode: "running",
    score: 0,
    wave: 1,
    baseHp: BASE_MAX_HP,
    player: createPlayer(),
    enemiesRemaining: 0,
    waveClearTimer: 0
  };
  deactivatePool(playerBullets);
  deactivatePool(enemyBullets);
  for (const enemy of enemies) {
    enemy.active = false;
  }
  spawnWave();
  syncHud();
}

function deactivatePool(pool) {
  for (const item of pool) {
    item.active = false;
  }
}

function spawnWave() {
  const activeCount = Math.min(MAX_ENEMIES, 3 + gameState.wave);
  const lanes = [80, 240, 400, 560, 720];
  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    if (i < activeCount) {
      enemy.active = true;
      enemy.x = lanes[i % lanes.length];
      enemy.y = 70 + Math.floor(i / lanes.length) * 52;
      enemy.dirX = 0;
      enemy.dirY = 1;
      enemy.fireCooldown = 0.6 + i * 0.2;
      enemy.moveCooldown = 0.2 * i;
      enemy.hp = 1;
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
    statusValue.textContent = `剩余敌军 ${gameState.enemiesRemaining}`;
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

function clampEntity(entity) {
  entity.x = Math.max(entity.size / 2, Math.min(WIDTH - entity.size / 2, entity.x));
  entity.y = Math.max(entity.size / 2, Math.min(HEIGHT - entity.size / 2, entity.y));
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
    if (!overlapsObstacle(player, nextX, player.y)) {
      player.x = nextX;
    }
    if (!overlapsObstacle(player, player.x, nextY)) {
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
    player.shootCooldown = 0.28;
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
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        enemy.dirX = Math.sign(dx);
        enemy.dirY = 0;
      } else {
        enemy.dirX = 0;
        enemy.dirY = Math.sign(dy || 1);
      }
      enemy.moveCooldown = 0.45 + Math.random() * 0.5;
    }

    const nextX = enemy.x + enemy.dirX * ENEMY_SPEED * dt;
    const nextY = enemy.y + enemy.dirY * ENEMY_SPEED * dt;
    if (!overlapsObstacle(enemy, nextX, enemy.y)) {
      enemy.x = nextX;
    } else {
      enemy.dirX *= -1;
    }
    if (!overlapsObstacle(enemy, enemy.x, nextY)) {
      enemy.y = nextY;
    } else {
      enemy.dirY *= -1;
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
  const base = {
    x: WIDTH / 2,
    y: HEIGHT - 34,
    size: BASE_SIZE
  };

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
        bullet.x > WIDTH + bullet.radius ||
        bullet.y < -bullet.radius ||
        bullet.y > HEIGHT + bullet.radius
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
        bullet.x + bullet.radius > base.x - base.size / 2 &&
        bullet.x - bullet.radius < base.x + base.size / 2 &&
        bullet.y + bullet.radius > base.y - base.size / 2 &&
        bullet.y - bullet.radius < base.y + base.size / 2
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
    syncHud();
    return;
  }

  updatePlayer(dt);
  updateEnemies(dt);
  updateBullets(dt, playerBullets);
  updateBullets(dt, enemyBullets);
  updateWave(dt);
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
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(-entity.size / 2 + 4, -entity.size / 2 + 4, entity.size - 8, 8);
  ctx.restore();
}

function drawBase() {
  const x = WIDTH / 2;
  const y = HEIGHT - 34;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = gameState.baseHp > 1 ? "#f4d35e" : "#ff6f59";
  ctx.fillRect(-BASE_SIZE / 2, -BASE_SIZE / 2, BASE_SIZE, BASE_SIZE);
  ctx.fillStyle = "#4d2d12";
  ctx.fillRect(-10, -16, 20, 32);
  ctx.fillRect(-16, -10, 32, 20);
  ctx.restore();
}

function drawBattlefield() {
  ctx.fillStyle = "#1a4028";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let y = 0; y < HEIGHT; y += TILE) {
    for (let x = 0; x < WIDTH; x += TILE) {
      ctx.fillStyle = (x / TILE + y / TILE) % 2 === 0 ? "#234c2f" : "#1d432b";
      ctx.fillRect(x, y, TILE, TILE);
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

function drawOverlay() {
  if (gameState.mode === "running") {
    return;
  }

  ctx.fillStyle = "rgba(4, 10, 20, 0.72)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#fff5da";
  ctx.textAlign = "center";
  ctx.font = '24px "Press Start 2P"';
  ctx.fillText(gameState.mode === "lost" ? "GAME OVER" : "STAGE CLEAR", WIDTH / 2, HEIGHT / 2 - 10);
  ctx.font = '16px "Noto Sans SC"';
  ctx.fillText("点击右侧按钮重新开始", WIDTH / 2, HEIGHT / 2 + 34);
}

function render() {
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
  drawOverlay();
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
