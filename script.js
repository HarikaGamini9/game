const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const SCREEN_WIDTH = canvas.width;
const SCREEN_HEIGHT = canvas.height;
const FPS = 60;

const BUBBLE_RADIUS = 30;
const BUBBLE_SPACING = 15;
const GRID_ROWS = 7;
const GRID_COLS = 10;

const BACKGROUND_COLOR = "#c8dcff";
const POPPED_COLOR = "rgba(100, 100, 100, 0.6)";
const BUBBLE_COLORS = [
  "rgb(255,105,180)", "rgb(0,191,255)", "rgb(50,205,50)",
  "rgb(255,215,0)", "rgb(147,112,219)", "rgb(255,69,0)", "rgb(0,255,255)"
];

const popSound = document.getElementById("popSound");

class Bubble {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.popped = false;
  }

  draw(ctx) {
    if (this.popped) {
      ctx.fillStyle = POPPED_COLOR;
      ctx.beginPath();
      ctx.arc(this.x, this.y, BUBBLE_RADIUS / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, BUBBLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath();
      ctx.arc(this.x - 10, this.y - 10, BUBBLE_RADIUS * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  isClicked(mouseX, mouseY) {
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= BUBBLE_RADIUS && !this.popped;
  }

  pop() {
    this.popped = true;
    popSound.currentTime = 0;
    popSound.play();
  }
}

let bubbles = [];
let score = 0;
let allPopped = false;

function createBubbles() {
  bubbles = [];
  score = 0;
  allPopped = false;

  const gridWidth = GRID_COLS * (BUBBLE_RADIUS * 2 + BUBBLE_SPACING) - BUBBLE_SPACING;
  const gridHeight = GRID_ROWS * (BUBBLE_RADIUS * 2 + BUBBLE_SPACING) - BUBBLE_SPACING;
  const offsetX = (SCREEN_WIDTH - gridWidth) / 2;
  const offsetY = Math.max((SCREEN_HEIGHT - gridHeight) / 2, 80);

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const x = offsetX + col * (BUBBLE_RADIUS * 2 + BUBBLE_SPACING) + BUBBLE_RADIUS;
      const y = offsetY + row * (BUBBLE_RADIUS * 2 + BUBBLE_SPACING) + BUBBLE_RADIUS;
      const color = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
      bubbles.push(new Bubble(x, y, color));
    }
  }
}

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (allPopped) {
    createBubbles();
  } else {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      if (bubbles[i].isClicked(mouseX, mouseY)) {
        bubbles[i].pop();
        score += 1;
        break;
      }
    }
    if (bubbles.every(b => b.popped)) {
      allPopped = true;
    }
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") {
    createBubbles();
  }
});

function draw() {
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

  bubbles.forEach(b => b.draw(ctx));

  ctx.fillStyle = "black";
  ctx.font = "24px Arial";
  ctx.fillText("Score: " + score, 20, 40);

  if (allPopped) {
    ctx.fillStyle = "black";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("All Popped! Click or press 'R' to play again", SCREEN_WIDTH / 2, 60);
    ctx.textAlign = "start";
  }

  requestAnimationFrame(draw);
}

createBubbles();
draw();
