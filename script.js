const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

const TILE = 24;
const MAP_TOP = 72;
const MAP_ROWS = 18;
const MAP_COLS = 19;
const SPEED = 2.1;
const GHOST_SPEED = 1.8;
const FRIGHTENED_SPEED = 1.3;
const FRIGHTENED_DURATION = 680;

const states = {
  splash: 0,
  playing: 1,
  win: 2,
  gameOver: 3,
};

const rawMap = [
  '###################',
  '#........#........#',
  '#.###.###.#.###.###',
  '#o###.###.#.###.###',
  '#.................#',
  '#.###.#.#####.#.###',
  '#.....#...#...#....#',
  '#####.#.###.#.#####',
  '    #.#.....#.#    ',
  '#####.#.###.#.#####',
  '#........#........#',
  '#.###.###.#.###.###',
  '#o..#.....P.....#o.#',
  '###.#.#.###.#.#.###',
  '#.....#...#...#....#',
  '#.#########.####.###',
  '#........#........#',
  '###################',
];

const directions = {
  ArrowUp: {dx: 0, dy: -1},
  ArrowDown: {dx: 0, dy: 1},
  ArrowLeft: {dx: -1, dy: 0},
  ArrowRight: {dx: 1, dy: 0},
};

let grid;
let score = 0;
let bestScore = 0;
let state = states.splash;
let frame = 0;
let player;
let ghosts;
let frightenedTimer = 0;
let pelletsRemaining = 0;

function initializeGrid() {
  grid = rawMap.map(row => row.split(''));
  pelletsRemaining = 0;
  for (let row = 0; row < MAP_ROWS; row += 1) {
    for (let col = 0; col < MAP_COLS; col += 1) {
      const cell = grid[row][col];
      if (cell === '.' || cell === 'o') {
        pelletsRemaining += 1;
      }
      if (cell === 'P') {
        player.row = row;
        player.col = col;
        grid[row][col] = ' ';
      }
    }
  }
}

function toPixel(col) {
  return col * TILE + TILE / 2;
}

function toRowCenter(row) {
  return MAP_TOP + row * TILE + TILE / 2;
}

function isWall(row, col) {
  if (row < 0 || row >= MAP_ROWS) return true;
  if (col < 0 || col >= MAP_COLS) {
    if (row === 8) return false;
    return true;
  }
  return grid[row][col] === '#';
}

function wrappedCol(col, row) {
  if (row === 8) {
    if (col < 0) return MAP_COLS - 1;
    if (col >= MAP_COLS) return 0;
  }
  return col;
}

function canMove(row, col, dir) {
  if (!dir) return false;
  const nextRow = row + dir.dy;
  const nextCol = wrappedCol(col + dir.dx, row);
  return !isWall(nextRow, nextCol);
}

function getMapCell(row, col) {
  if (row < 0 || row >= MAP_ROWS) return '#';
  const wrapped = wrappedCol(col, row);
  return grid[row][wrapped] || '#';
}

function resetGame() {
  player = {
    row: 12,
    col: 9,
    x: 0,
    y: 0,
    dir: {dx: 0, dy: 0},
    nextDir: {dx: 0, dy: 0},
    speed: SPEED,
  };

  ghosts = [
    {row: 9, col: 8, x: 0, y: 0, dir: {dx: 0, dy: -1}, color: '#ff6a6a', frightened: false, home: {row: 9, col: 8}},
    {row: 9, col: 10, x: 0, y: 0, dir: {dx: 0, dy: -1}, color: '#ffb347', frightened: false, home: {row: 9, col: 10}},
    {row: 10, col: 8, x: 0, y: 0, dir: {dx: 0, dy: -1}, color: '#6fdfff', frightened: false, home: {row: 10, col: 8}},
    {row: 10, col: 10, x: 0, y: 0, dir: {dx: 0, dy: -1}, color: '#ff8cff', frightened: false, home: {row: 10, col: 10}},
  ];

  initializeGrid();
  player.x = toPixel(player.col);
  player.y = toRowCenter(player.row);
  ghosts.forEach(ghost => {
    ghost.x = toPixel(ghost.col);
    ghost.y = toRowCenter(ghost.row);
    ghost.frightened = false;
  });

  score = 0;
  frightenedTimer = 0;
  state = states.splash;
  frame = 0;
}

function chooseGhostDirection(ghost) {
  const currentRow = Math.round((ghost.y - MAP_TOP - TILE / 2) / TILE);
  const currentCol = Math.round((ghost.x - TILE / 2) / TILE);
  const possible = [];
  const reverse = {dx: -ghost.dir.dx, dy: -ghost.dir.dy};

  for (const dir of Object.values(directions)) {
    if (dir.dx === reverse.dx && dir.dy === reverse.dy) continue;
    if (canMove(currentRow, currentCol, dir)) {
      possible.push(dir);
    }
  }

  if (possible.length === 0) {
    if (canMove(currentRow, currentCol, reverse)) {
      return reverse;
    }
    return {dx: 0, dy: 0};
  }

  if (ghost.frightened) {
    return possible[Math.floor(Math.random() * possible.length)];
  }

  const targetRow = player.row;
  const targetCol = player.col;
  possible.sort((a, b) => {
    const aRow = currentRow + a.dy;
    const aCol = wrappedCol(currentCol + a.dx, currentRow);
    const bRow = currentRow + b.dy;
    const bCol = wrappedCol(currentCol + b.dx, currentRow);
    const aDist = Math.abs(aRow - targetRow) + Math.abs(aCol - targetCol);
    const bDist = Math.abs(bRow - targetRow) + Math.abs(bCol - targetCol);
    return aDist - bDist;
  });

  if (Math.random() < 0.15 && possible.length > 1) {
    return possible[Math.floor(Math.random() * possible.length)];
  }

  return possible[0];
}

function updatePlayer() {
  const centerX = toPixel(player.col);
  const centerY = toRowCenter(player.row);
  const atCenter = Math.abs(player.x - centerX) < 0.6 && Math.abs(player.y - centerY) < 0.6;

  if (atCenter) {
    player.x = centerX;
    player.y = centerY;
    if (canMove(player.row, player.col, player.nextDir)) {
      player.dir = player.nextDir;
    }
    if (!canMove(player.row, player.col, player.dir)) {
      player.dir = {dx: 0, dy: 0};
    }
  }

  if (player.dir.dx !== 0 || player.dir.dy !== 0) {
    const nextRow = player.row + player.dir.dy;
    const nextCol = wrappedCol(player.col + player.dir.dx, player.row);
    if (!isWall(nextRow, nextCol)) {
      player.x += player.dir.dx * player.speed;
      player.y += player.dir.dy * player.speed;
      if (player.row === 8) {
        if (player.x < -TILE / 2) player.x = width + TILE / 2;
        if (player.x > width + TILE / 2) player.x = -TILE / 2;
      }
      player.row = Math.round((player.y - MAP_TOP - TILE / 2) / TILE);
      player.col = Math.round((player.x - TILE / 2) / TILE);
    } else {
      player.x = centerX;
      player.y = centerY;
      player.dir = {dx: 0, dy: 0};
    }
  }

  const cell = getMapCell(player.row, player.col);
  if (cell === '.' || cell === 'o') {
    grid[player.row][wrappedCol(player.col, player.row)] = ' ';
    pelletsRemaining -= 1;
    score += cell === 'o' ? 50 : 10;

    if (cell === 'o') {
      frightenedTimer = FRIGHTENED_DURATION;
      ghosts.forEach(ghost => {
        ghost.frightened = true;
      });
    }

    if (pelletsRemaining <= 0) {
      state = states.win;
    }
  }
}

function updateGhosts() {
  ghosts.forEach(ghost => {
    const atCenter = Math.abs(ghost.x - toPixel(ghost.col)) < 0.6 && Math.abs(ghost.y - toRowCenter(ghost.row)) < 0.6;
    if (atCenter) {
      ghost.x = toPixel(ghost.col);
      ghost.y = toRowCenter(ghost.row);
      ghost.dir = chooseGhostDirection(ghost);
    }

    const speed = ghost.frightened ? FRIGHTENED_SPEED : GHOST_SPEED;
    if (ghost.dir.dx !== 0 || ghost.dir.dy !== 0) {
      ghost.x += ghost.dir.dx * speed;
      ghost.y += ghost.dir.dy * speed;
      if (ghost.row === 8) {
        if (ghost.x < -TILE / 2) ghost.x = width + TILE / 2;
        if (ghost.x > width + TILE / 2) ghost.x = -TILE / 2;
      }
      ghost.row = Math.round((ghost.y - MAP_TOP - TILE / 2) / TILE);
      ghost.col = Math.round((ghost.x - TILE / 2) / TILE);
    }
  });
}

function checkCollisions() {
  ghosts.forEach(ghost => {
    const dx = ghost.x - player.x;
    const dy = ghost.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < TILE * 0.7) {
      if (ghost.frightened) {
        score += 200;
        ghost.row = ghost.home.row;
        ghost.col = ghost.home.col;
        ghost.x = toPixel(ghost.col);
        ghost.y = toRowCenter(ghost.row);
        ghost.dir = {dx: 0, dy: -1};
        ghost.frightened = false;
      } else {
        state = states.gameOver;
      }
    }
  });
}

function update(deltaTime) {
  if (state === states.splash) return;
  if (state !== states.playing) return;

  updatePlayer();
  updateGhosts();
  checkCollisions();

  if (frightenedTimer > 0) {
    frightenedTimer -= 1;
    if (frightenedTimer <= 0) {
      ghosts.forEach(ghost => {
        ghost.frightened = false;
      });
    }
  }
}

function drawMaze() {
  for (let row = 0; row < MAP_ROWS; row += 1) {
    for (let col = 0; col < MAP_COLS; col += 1) {
      const cell = grid[row][col];
      const x = col * TILE;
      const y = MAP_TOP + row * TILE;

      if (cell === '#') {
        ctx.fillStyle = '#1d4f91';
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      }
      if (cell === '.') {
        ctx.fillStyle = '#f8f7e7';
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (cell === 'o') {
        ctx.fillStyle = '#ffec6d';
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawPacMan() {
  const mouth = 0.18 + Math.abs(Math.sin(frame * 0.16)) * 0.18;
  let start = 0.25 * Math.PI;
  let end = 1.75 * Math.PI;

  if (player.dir.dx === -1) {
    start = 1.25 * Math.PI;
    end = 0.75 * Math.PI;
  } else if (player.dir.dy === -1) {
    start = 1.75 * Math.PI;
    end = 1.25 * Math.PI;
  } else if (player.dir.dy === 1) {
    start = 0.75 * Math.PI;
    end = 0.25 * Math.PI;
  }

  ctx.fillStyle = '#fddb4d';
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.arc(player.x, player.y, 10, start + mouth, end - mouth, false);
  ctx.closePath();
  ctx.fill();
}

function drawGhost(ghost) {
  ctx.save();
  const x = ghost.x;
  const y = ghost.y;
  const bodyColor = ghost.frightened ? '#5f8cce' : ghost.color;
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(x, y - 3, 10, Math.PI, 0, false);
  ctx.lineTo(x + 10, y + 9);
  ctx.lineTo(x + 6, y + 5);
  ctx.lineTo(x + 2, y + 9);
  ctx.lineTo(x - 2, y + 5);
  ctx.lineTo(x - 6, y + 9);
  ctx.lineTo(x - 10, y + 9);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - 5, y - 2, 3.6, 0, Math.PI * 2);
  ctx.arc(x + 5, y - 2, 3.6, 0, Math.PI * 2);
  ctx.fill();

  const pupilOffset = ghost.dir.dx * 2;
  const pupilY = ghost.dir.dy * 2;
  ctx.fillStyle = '#0b1b2f';
  ctx.beginPath();
  ctx.arc(x - 5 + pupilOffset, y - 2 + pupilY, 1.8, 0, Math.PI * 2);
  ctx.arc(x + 5 + pupilOffset, y - 2 + pupilY, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = '#070f26';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#071b43';
  ctx.fillRect(0, 0, width, MAP_TOP);
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${score}`, 18, 32);
  ctx.fillText(`Best: ${bestScore}`, 18, 56);
  ctx.textAlign = 'right';
  ctx.fillText(state === states.splash ? 'Ready?' : state === states.win ? 'You win!' : state === states.gameOver ? 'Game Over' : '', width - 18, 36);

  drawMaze();
  ghosts.forEach(drawGhost);
  drawPacMan();

  if (state === states.splash) {
    ctx.fillStyle = 'rgba(7, 11, 27, 0.86)';
    ctx.fillRect(36, 120, width - 72, 120);
    ctx.fillStyle = '#f8f7e7';
    ctx.textAlign = 'center';
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText('Press any arrow key to start', width / 2, 170);
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText('Eat all pellets while avoiding ghosts.', width / 2, 202);
    ctx.fillText('Power pellets turn ghosts blue for a short time.', width / 2, 228);
  }

  if (state === states.win || state === states.gameOver) {
    const message = state === states.win ? 'You Win!' : 'Game Over';
    ctx.fillStyle = 'rgba(7, 11, 27, 0.9)';
    ctx.fillRect(36, 180, width - 72, 120);
    ctx.fillStyle = '#f8f7e7';
    ctx.textAlign = 'center';
    ctx.font = '28px Inter, sans-serif';
    ctx.fillText(message, width / 2, 220);
    ctx.font = '18px Inter, sans-serif';
    ctx.fillText(`Final score: ${score}`, width / 2, 255);
    ctx.fillText('Press any arrow key to play again.', width / 2, 290);
  }
}

function handleInput(dir) {
  if (state === states.splash) {
    state = states.playing;
  }
  if (state === states.win || state === states.gameOver) {
    resetGame();
    return;
  }
  player.nextDir = dir;
}

window.addEventListener('keydown', event => {
  const dir = directions[event.key];
  if (!dir) return;
  event.preventDefault();
  handleInput(dir);
});

canvas.addEventListener('mousedown', () => {
  if (state === states.splash) {
    state = states.playing;
    return;
  }
  if (state === states.win || state === states.gameOver) {
    resetGame();
  }
});

canvas.addEventListener('touchstart', event => {
  event.preventDefault();
  if (state === states.splash) {
    state = states.playing;
    return;
  }
  if (state === states.win || state === states.gameOver) {
    resetGame();
  }
});

function loop(timestamp) {
  update(timestamp);
  draw();
  requestAnimationFrame(loop);
}

resetGame();
loop();
