const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

const GROUND_Y = 410;
const PLAYER_WIDTH = 34;
const PLAYER_HEIGHT = 46;
const JUMP_FORCE = -8.2;
const GRAVITY = 0.3;
const MOVE_SPEED = 4.8;
const BOOST_SPEED = 6.8;
const keys = {};

let state = 'start';
let frame = 0;
let score = 0;
let bestScore = 0;
let lastTime = 0;
let distance = 0;
let spawnTimer = 0;
let ringTimer = 0;
let enemyTimer = 0;

const player = {
  x: 120,
  y: GROUND_Y - PLAYER_HEIGHT,
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  vx: 0,
  vy: 0,
  onGround: true,
  direction: 1,
  boosting: false,
  health: 100,
  maxHealth: 100,
  extraJumpsRemaining: 1,
};

const clouds = Array.from({length: 5}, (_, index) => ({
  x: Math.random() * width,
  y: 70 + index * 45,
  speed: 0.25 + Math.random() * 0.3,
  size: 40 + Math.random() * 30,
}));

const obstacles = [];
const rings = [];
const enemies = [];

function resetGame() {
  state = 'playing';
  frame = 0;
  distance = 0;
  score = 0;
  spawnTimer = 45;
  ringTimer = 120;
  enemyTimer = 90;
  player.x = 120;
  player.y = GROUND_Y - PLAYER_HEIGHT;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.direction = 1;
  player.boosting = false;
  player.health = 100;
  player.extraJumpsRemaining = 1;
  obstacles.length = 0;
  rings.length = 0;
  enemies.length = 0;
  bestScore = Math.max(bestScore, Number(localStorage.getItem('velocity-rush-best') || 0));
}

function startGame() {
  if (state === 'start') {
    resetGame();
  }
}

function spawnObstacle() {
  const type = Math.random() < 0.55 ? 'crate' : 'spike';
  obstacles.push({
    x: width + 30,
    y: type === 'crate' ? GROUND_Y - 34 : GROUND_Y - 24,
    width: type === 'crate' ? 34 : 28,
    height: type === 'crate' ? 34 : 24,
    type,
  });
}

function spawnRing() {
  rings.push({
    x: width + 30,
    y: GROUND_Y - 90 - Math.random() * 60,
    radius: 10,
  });
}

function spawnEnemy() {
  enemies.push({
    x: width + 30,
    y: GROUND_Y - 70 - Math.random() * 80,
    width: 30,
    height: 30,
    speed: 3.8 + Math.random() * 2.2,
    phase: Math.random() * Math.PI * 2,
  });
}

function handleInput() {
  const left = keys['ArrowLeft'] || keys['KeyA'];
  const right = keys['ArrowRight'] || keys['KeyD'];
  const jumpPressed = keys['ArrowUp'] || keys['Space'] || keys['KeyW'];
  const boostPressed = keys['ShiftLeft'] || keys['ShiftRight'] || keys['KeyX'];

  player.boosting = boostPressed;

  if (left && !right) {
    player.vx = -MOVE_SPEED - (player.boosting ? 1.8 : 0);
    player.direction = -1;
  } else if (right && !left) {
    player.vx = MOVE_SPEED + (player.boosting ? 1.8 : 0);
    player.direction = 1;
  } else {
    player.vx = 0;
  }

  if (jumpPressed && (player.onGround || player.extraJumpsRemaining > 0)) {
    if (player.onGround) {
      player.vy = JUMP_FORCE;
      player.onGround = false;
      player.extraJumpsRemaining = 1;
    } else if (player.extraJumpsRemaining > 0) {
      player.vy = JUMP_FORCE;
      player.extraJumpsRemaining -= 1;
      player.onGround = false;
    }
    keys['ArrowUp'] = false;
    keys['Space'] = false;
    keys['KeyW'] = false;
  }
}

function updatePlayer(dt) {
  handleInput();

  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.vy += GRAVITY * dt;

  if (player.y >= GROUND_Y - player.height) {
    player.y = GROUND_Y - player.height;
    player.vy = 0;
    player.onGround = true;
    player.extraJumpsRemaining = 1;
  }

  if (player.x < 20) {
    player.x = 20;
  }

  if (player.x > width - 70) {
    player.x = width - 70;
  }
}

function updateWorld(dt) {
  frame += 1;
  distance += 1.2 * dt;
  score = Math.floor(distance) + rings.length * 10;

  clouds.forEach(cloud => {
    cloud.x -= cloud.speed * dt;
    if (cloud.x + cloud.size < -20) {
      cloud.x = width + 20;
      cloud.y = 50 + Math.random() * 120;
      cloud.size = 34 + Math.random() * 30;
    }
  });

  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = 48 - Math.min(20, Math.floor(distance / 180));
  } else {
    spawnTimer -= dt;
  }

  if (ringTimer <= 0) {
    spawnRing();
    ringTimer = 95 + Math.random() * 60;
  } else {
    ringTimer -= dt;
  }

  if (enemyTimer <= 0) {
    spawnEnemy();
    enemyTimer = 110 + Math.random() * 70;
  } else {
    enemyTimer -= dt;
  }

  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = obstacles[i];
    obstacle.x -= (4.8 + Math.min(distance / 320, 3.4)) * dt;
    if (obstacle.x + obstacle.width < -20) {
      obstacles.splice(i, 1);
    }
  }

  for (let i = rings.length - 1; i >= 0; i -= 1) {
    const ring = rings[i];
    ring.x -= (5 + Math.min(distance / 300, 3)) * dt;
    if (ring.x + ring.radius < -16) {
      rings.splice(i, 1);
    }
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.x -= (enemy.speed + Math.min(distance / 520, 2.4)) * dt;
    enemy.y += Math.sin(frame * 0.09 + enemy.phase) * 0.45 * dt;
    if (enemy.x + enemy.width < -20) {
      enemies.splice(i, 1);
    }
  }
}

function checkCollisions() {
  for (let i = obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = obstacles[i];
    const overlapX = player.x + player.width > obstacle.x && player.x < obstacle.x + obstacle.width;
    const overlapY = player.y + player.height > obstacle.y && player.y < obstacle.y + obstacle.height;

    if (overlapX && overlapY) {
      if (player.boosting) {
        obstacles.splice(i, 1);
        score += 80;
      } else {
        player.health -= 25;
        if (player.health <= 0) {
          state = 'gameover';
          bestScore = Math.max(bestScore, score);
          localStorage.setItem('velocity-rush-best', String(bestScore));
        }
      }
    }
  }

  for (let i = rings.length - 1; i >= 0; i -= 1) {
    const ring = rings[i];
    const dx = player.x + player.width / 2 - ring.x;
    const dy = player.y + player.height / 2 - ring.y;
    if (Math.hypot(dx, dy) < 24) {
      rings.splice(i, 1);
      score += 120;
      bestScore = Math.max(bestScore, score);
      localStorage.setItem('velocity-rush-best', String(bestScore));
    }
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    const overlapX = player.x + player.width > enemy.x && player.x < enemy.x + enemy.width;
    const overlapY = player.y + player.height > enemy.y && player.y < enemy.y + enemy.height;
    if (overlapX && overlapY) {
      if (player.boosting) {
        enemies.splice(i, 1);
        score += 100;
      } else {
        player.health -= 25;
        if (player.health <= 0) {
          state = 'gameover';
          bestScore = Math.max(bestScore, score);
          localStorage.setItem('velocity-rush-best', String(bestScore));
        }
      }
    }
  }
}

function update(dt) {
  if (state === 'playing') {
    updatePlayer(dt);
    updateWorld(dt);
    checkCollisions();
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#071726');
  sky.addColorStop(0.5, '#1f3d71');
  sky.addColorStop(1, '#3d146b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffd788';
  ctx.beginPath();
  ctx.arc(760, 95, 42, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0a1730';
  ctx.beginPath();
  ctx.moveTo(0, 320);
  ctx.lineTo(170, 280);
  ctx.lineTo(320, 315);
  ctx.lineTo(480, 260);
  ctx.lineTo(650, 295);
  ctx.lineTo(900, 240);
  ctx.lineTo(900, 500);
  ctx.lineTo(0, 500);
  ctx.closePath();
  ctx.fill();

  clouds.forEach(cloud => {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.size * 0.32, 0, Math.PI * 2);
    ctx.arc(cloud.x + cloud.size * 0.25, cloud.y - 8, cloud.size * 0.28, 0, Math.PI * 2);
    ctx.arc(cloud.x + cloud.size * 0.55, cloud.y, cloud.size * 0.34, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#0f1d37';
  ctx.fillRect(0, GROUND_Y, width, height - GROUND_Y);

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  for (let i = 0; i < width; i += 38) {
    ctx.beginPath();
    ctx.moveTo(i, GROUND_Y + 6);
    ctx.lineTo(i + 16, GROUND_Y + 6);
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.scale(player.direction, 1);

  ctx.fillStyle = '#47e0ff';
  ctx.beginPath();
  ctx.roundRect(0, 0, player.width, player.height, 12);
  ctx.fill();

  ctx.fillStyle = '#0b1c2d';
  ctx.beginPath();
  ctx.arc(10, 18, 3.6, 0, Math.PI * 2);
  ctx.arc(24, 18, 3.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffe167';
  ctx.beginPath();
  ctx.moveTo(8, 8);
  ctx.lineTo(18, -4);
  ctx.lineTo(28, 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(8, 26, 18, 6);
  ctx.restore();
}

function drawObstacles() {
  obstacles.forEach(obstacle => {
    if (obstacle.type === 'crate') {
      ctx.fillStyle = '#9b4b24';
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      ctx.strokeStyle = '#3f1c0b';
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    } else {
      ctx.fillStyle = '#ff5d6c';
      ctx.beginPath();
      ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
      ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
      ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
      ctx.closePath();
      ctx.fill();
    }
  });
}

function drawEnemies() {
  enemies.forEach(enemy => {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = '#ff4b7f';
    ctx.fillRect(0, 0, enemy.width, enemy.height);
    ctx.fillStyle = '#220516';
    ctx.fillRect(6, 8, 8, 8);
    ctx.fillRect(16, 8, 8, 8);
    ctx.fillRect(8, 18, 14, 6);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(6, 2, 18, 4);
    ctx.restore();
  });
}

function drawRings() {
  rings.forEach(ring => {
    ctx.save();
    ctx.translate(ring.x, ring.y);
    ctx.strokeStyle = '#ffd967';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff4b8';
    ctx.beginPath();
    ctx.arc(0, 0, ring.radius - 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawHud() {
  ctx.fillStyle = 'rgba(2, 8, 20, 0.8)';
  ctx.fillRect(18, 18, 300, 112);
  ctx.fillStyle = '#fef6ff';
  ctx.font = 'bold 24px Inter, sans-serif';
  ctx.fillText(`Score ${score}`, 34, 48);
  ctx.font = '16px Inter, sans-serif';
  ctx.fillText(`Best ${bestScore}`, 34, 76);

  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 14px Inter, sans-serif';
  ctx.fillText('Health', 34, 104);
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(90, 92, 170, 12);
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(90, 92, (player.health / player.maxHealth) * 170, 12);

  ctx.fillStyle = '#84d5ff';
  ctx.font = 'bold 14px Inter, sans-serif';
  ctx.fillText(state === 'playing' ? 'BOOST READY' : state === 'gameover' ? 'CRASHED' : 'READY TO RUN', 34, 126);
}

function drawOverlay() {
  if (state === 'start') {
    ctx.fillStyle = 'rgba(3, 8, 23, 0.72)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#fef6ff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px Inter, sans-serif';
    ctx.fillText('Velocity Rush', width / 2, 184);
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText('Press Enter or Space to blast into the neon zone.', width / 2, 222);
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText('Jump over hazards, collect rings, and hold Shift to smash through obstacles.', width / 2, 258);
    ctx.fillText('Tap jump twice for a double jump and watch your health bar.', width / 2, 286);
    ctx.textAlign = 'left';
  }

  if (state === 'gameover') {
    ctx.fillStyle = 'rgba(3, 8, 23, 0.78)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ffefaf';
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px Inter, sans-serif';
    ctx.fillText('Crash! Try again.', width / 2, 190);
    ctx.font = '18px Inter, sans-serif';
    ctx.fillText(`Final Score: ${score}`, width / 2, 230);
    ctx.fillText('Press Enter or R to restart.', width / 2, 262);
    ctx.textAlign = 'left';
  }
}

function draw() {
  drawBackground();
  drawRings();
  drawObstacles();
  drawEnemies();
  drawPlayer();
  drawHud();
  drawOverlay();
}

function loop(timestamp) {
  if (!lastTime) {
    lastTime = timestamp;
  }
  const dt = Math.min((timestamp - lastTime) / 16.67, 2);
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', event => {
  keys[event.code] = true;
  if (event.code === 'Enter' || event.code === 'Space') {
    event.preventDefault();
    if (state === 'start') {
      resetGame();
    } else if (state === 'gameover') {
      resetGame();
    }
  }
  if (event.code === 'KeyR' && state === 'gameover') {
    resetGame();
  }
});

window.addEventListener('keyup', event => {
  keys[event.code] = false;
});

canvas.addEventListener('pointerdown', () => {
  if (state === 'start' || state === 'gameover') {
    resetGame();
  }
});

bestScore = Number(localStorage.getItem('velocity-rush-best') || 0);
loop(0);
