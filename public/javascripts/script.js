// Canvas
const canvas = document.createElement("canvas");
const context = canvas.getContext("2d");
const socket = io("/pong");
let isReferee = false;
let paddleIndex = 0;
let room = null;

const width = 500;
const height = 700;

// Kładka
const paddleHeight = 10;
const paddleWidth = 50;
const paddleDiff = 25;
const paddleBounceOffset = 20;
const paddleX = [225, 225];
const trajectoryX = [0, 0];
let playerMoved = false;

// Piłka
let ballX = 250;
let ballY = 350;
const ballRadius = 5;
let ballDirection = 1;
let speedY = 2;
let speedX = 0;

// Punkty obu graczy
const score = [0, 0];

// Utworzenie Canvas 
function createCanvas() {
  canvas.id = "canvas";
  canvas.width = width;
  canvas.height = height;
  document.body.appendChild(canvas);
  renderCanvas();
}

// Oczekiwanie na przeciwnika
function renderIntro() {
  // Canvas tło
  context.fillStyle = "black";
  context.fillRect(0, 0, width, height);

  // Tekst początkowy
  context.fillStyle = "white";
  context.font = "32px Courier New";
  context.fillText("Waiting for opponent...", 20, canvas.height / 2 - 30);
}

// Renderowanie elementów gry
function renderCanvas() {
  // Canvas tło
  context.fillStyle = "black";
  context.fillRect(0, 0, width, height);

  // Kolor kładek
  context.fillStyle = "white";

  // Renderowanie kładek
  context.fillRect(paddleX[0], height - 20, paddleWidth, paddleHeight);
  context.fillRect(paddleX[1], 10, paddleWidth, paddleHeight);

  // Środek boiska
  context.beginPath();
  context.setLineDash([4]);
  context.moveTo(0, 350);
  context.lineTo(500, 350);
  context.strokeStyle = "grey";
  context.stroke();

  // Piłka
  context.beginPath();
  context.arc(ballX, ballY, ballRadius, 2 * Math.PI, false);
  context.fillStyle = "white";
  context.fill();

  // Punkty
  context.font = "32px Courier New";
  context.fillText(score[0], 20, canvas.height / 2 + 50);
  context.fillText(score[1], 20, canvas.height / 2 - 30);
}

// Reset piłki do środka
function ballReset() {
  ballX = width / 2;
  ballY = height / 2;
  speedY = 3;
  socket.emit("ballMove", {
    ballX,
    ballY,
    score,
  });
}

// Ruch piłki
function ballMove() {
  ballY += speedY * ballDirection;

  if (playerMoved) {
    ballX += speedX;
  }

  socket.emit("ballMove", {
    ballX,
    ballY,
    score,
  });
}

// Zachowanie piłki przy odbiciach
function ballBoundaries() {
  // Odbicie od lewej ściany
  if (ballX < 0 && speedX < 0) {
    speedX = -speedX;
  }
  // Odbicie od prawej ściany
  if (ballX > width && speedX > 0) {
    speedX = -speedX;
  }

  // Odbicie od dolnej kładki
  if (ballY > height - paddleBounceOffset) {
    if (ballX >= paddleX[0] && ballX <= paddleX[0] + paddleWidth) {
      if (playerMoved) {
        speedY += 1;

        if (speedY > 5) {
          speedY = 5;
        }
      }
      ballDirection = -ballDirection;
      trajectoryX[0] = ballX - (paddleX[0] + paddleDiff);
      speedX = trajectoryX[0] * 0.3;
    } else {
      // Reset piłki i punkt dla gracza 1
      ballReset();
      score[1]++;
    }
  }

  // Odbicie od górnej kładki
  if (ballY < paddleBounceOffset) {
    if (ballX >= paddleX[1] && ballX <= paddleX[1] + paddleWidth) {
      if (playerMoved) {
        speedY += 1;

        if (speedY > 5) {
          speedY = 5;
        }
      }
      ballDirection = -ballDirection;
      trajectoryX[1] = ballX - (paddleX[1] + paddleDiff);
      speedX = trajectoryX[1] * 0.3;
    } else {
      ballReset();
      score[0]++;
    }
  }
}

// Zachowane animacji
function animate() {
  // Synchronizacja ruchu piłki
  if (isReferee) {
    ballMove();
    ballBoundaries();
  }
  renderCanvas();
  window.requestAnimationFrame(animate);
}

function loadGame() {
  createCanvas();
  renderIntro();
  socket.emit("ready");
}

function startGame() {
  paddleIndex = isReferee ? 0 : 1;
  playerMoved = false;
  window.requestAnimationFrame(animate);
  canvas.addEventListener("mousemove", (e) => {
    playerMoved = true;
    paddleX[paddleIndex] = e.offsetX;
    if (paddleX[paddleIndex] < 0) {
      paddleX[paddleIndex] = 0;
    }
    if (paddleX[paddleIndex] > width - paddleWidth) {
      paddleX[paddleIndex] = width - paddleWidth;
    }
    socket.emit("paddleMove", {
      xPosition: paddleX[paddleIndex],
    });
    canvas.style.cursor = "none";
  });
}

loadGame();

socket.on("connect", () => {
  console.log("Connected as...", socket.id);
});

socket.on("startGame", (refereeId, roomId) => {
  console.log("Referee is ", refereeId);

  room = roomId;
  isReferee = socket.id === refereeId;
  startGame();
});

socket.on("paddleMove", (paddleData) => {
  const opponentPaddleIndex = 1 - paddleIndex;
  paddleX[opponentPaddleIndex] = paddleData.xPosition;
});

socket.on("ballMove", (ballData) => {
  ({ ballX, ballY, score } = ballData);
});
