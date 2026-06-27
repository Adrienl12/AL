const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

const BIRD_SIZE = 24;
const GRAVITY = 0.55;
const JUMP = -10.5;
const PIPE_WIDTH = 80;
const PIPE_GAP = 180;
const PIPE_INTERVAL = 1500;
const FLOOR_HEIGHT = 80;

let bird;
let pipes;
let lastPipeTime;
let score;
let bestScore;
let state;
let frame;

const states = {
  splash: 0,
  playing: 1,
  gameOver: 2,
};

function resetGame() {
  bird = {
    x: width * 0.25,
    y: height * 0.45,
    vy: 0,
    radius: BIRD_SIZE / 2,
  };

  pipes = [];
  lastPipeTime = performance.now();
  score = 0;
  frame = 0;
  state = states.splash;
}

function spawnPipe() {
  const minY = 120;
  const maxY = height - FLOOR_HEIGHT - PIPE_GAP - 120;
  const top = Math.random() * (maxY - minY) + minY;

  pipes.push({
    x: width,
    top,
    passed: false,
  });
}

function update(deltaTime) {
  if (state === states.splash) {
    bird.vy = bird.vy * 0.95;
    bird.y += bird.vy;
    bird.y = Math.min(Math.max(bird.y, 60), height - FLOOR_HEIGHT - bird.radius - 20);
    return;
  }

  bird.vy += GRAVITY;
  bird.y += bird.vy;

  if (bird.y + bird.radius >= height - FLOOR_HEIGHT) {
    bird.y = height - FLOOR_HEIGHT - bird.radius;
    state = states.gameOver;
  }

  if (bird.y - bird.radius <= 0) {
    bird.y = bird.radius;
    bird.vy = 0;
  }

  const now = performance.now();
  if (now - lastPipeTime > PIPE_INTERVAL) {
    spawnPipe();
    lastPipeTime = now;
  }

  pipes.forEach(pipe => {
    pipe.x -= 2.8;

    const hitX = bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + PIPE_WIDTH;
    const hitY = bird.y - bird.radius < pipe.top || bird.y + bird.radius > pipe.top + PIPE_GAP;

    if (hitX && hitY) {
      state = states.gameOver;
    }

    if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
      pipe.passed = true;
      score += 1;
      bestScore = Math.max(bestScore, score);
    }
  });

  pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > -50);
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = '#8ee2f8';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#70c1b3';
  ctx.fillRect(0, height - FLOOR_HEIGHT, width, FLOOR_HEIGHT);

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, height - FLOOR_HEIGHT, width, 20);

  ctx.fillStyle = '#ffd259';
  ctx.beginPath();
  ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffa353';
  ctx.beginPath();
  ctx.arc(bird.x + 5, bird.y - 4, 4, 0, Math.PI * 2);
  ctx.fill();

  pipes.forEach(pipe => {
    ctx.fillStyle = '#3ca55c';
    drawRoundedRect(pipe.x, 0, PIPE_WIDTH, pipe.top, 12);
    drawRoundedRect(pipe.x, pipe.top + PIPE_GAP, PIPE_WIDTH, height - FLOOR_HEIGHT - (pipe.top + PIPE_GAP), 12);
  });

  ctx.fillStyle = '#1b2a3b';
  ctx.font = '32px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(score, width / 2, 64);

  if (state === states.splash) {
    ctx.fillStyle = 'rgba(27, 42, 59, 0.9)';
    ctx.font = '24px Inter, sans-serif';
    ctx.fillText('Click or Space to start', width / 2, height * 0.55);
  }

  if (state === states.gameOver) {
    ctx.fillStyle = 'rgba(27, 42, 59, 0.92)';
    ctx.fillRect(width * 0.5 - 170, height * 0.5 - 90, 340, 180);

    ctx.fillStyle = '#fff';
    ctx.font = '28px Inter, sans-serif';
    ctx.fillText('Game Over', width / 2, height * 0.5 - 20);
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText(`Score: ${score}`, width / 2, height * 0.5 + 20);
    ctx.fillText(`Best: ${bestScore}`, width / 2, height * 0.5 + 52);
    ctx.fillText('Click or Space to retry', width / 2, height * 0.5 + 90);
  }
}

function loop() {
  update();
  draw();
  frame += 1;
  requestAnimationFrame(loop);
}

function flap() {
  if (state === states.gameOver) {
    resetGame();
    return;
  }

  bird.vy = JUMP;
  if (state === states.splash) {
    state = states.playing;
    lastPipeTime = performance.now();
  }
}

window.addEventListener('keydown', event => {
  if (event.code === 'Space') {
    event.preventDefault();
    flap();
  }
});

canvas.addEventListener('mousedown', flap);
canvas.addEventListener('touchstart', event => {
  event.preventDefault();
  flap();
});

bestScore = 0;
resetGame();
loop();
