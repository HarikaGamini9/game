const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    const wrapper = document.querySelector('.wrapper');
    const maxWidth = Math.min(wrapper.clientWidth * 0.95, 800);
    canvas.width = maxWidth;
    canvas.height = maxWidth * 0.75;
    console.log("resizeCanvas: Canvas Width:", canvas.width, "Canvas Height:", canvas.height);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const SCREEN_WIDTH = canvas.width;
const SCREEN_HEIGHT = canvas.height;

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
const scoreDisplay = document.getElementById("scoreDisplay");
const stressLevel = document.getElementById("stressLevel");
const faceDisplay = document.getElementById("faceDisplay");

let bubbles = [];
let score = 0;
let comboMultiplier = 1;
let lastPopTime = 0;
let regenerating = false;

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

function createBubbles() {
    bubbles = [];
    score = 0;
    comboMultiplier = 1;
    lastPopTime = 0;
    regenerating = false;
    updateScore();
    updateStressLevel();

    const gridWidth = GRID_COLS * (BUBBLE_RADIUS * 2 + BUBBLE_SPACING) - BUBBLE_SPACING;
    const gridHeight = GRID_ROWS * (BUBBLE_RADIUS * 2 + BUBBLE_SPACING) - BUBBLE_SPACING;
    const offsetX = (SCREEN_WIDTH - gridWidth) / 2;
    const offsetY = (SCREEN_HEIGHT - gridHeight) / 2 + BUBBLE_RADIUS; // Adjusted offsetY

    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            const x = offsetX + col * (BUBBLE_RADIUS * 2 + BUBBLE_SPACING) + BUBBLE_RADIUS;
            const y = offsetY + row * (BUBBLE_RADIUS * 2 + BUBBLE_SPACING); // No change here
            const color = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
            bubbles.push(new Bubble(x, y, color));
        }
    }
}

function updateScore() {
    scoreDisplay.textContent = `Score: ${score}`;
}

function updateStressLevel() {
    const popped = bubbles.filter(b => b.popped).length;
    const percentage = 100 - (popped / bubbles.length) * 100;
    stressLevel.style.width = `${percentage}%`;

    if (percentage <= 30) {
        faceDisplay.textContent = "😄";
    } else if (percentage <= 60) {
        faceDisplay.textContent = "😐";
    } else {
        faceDisplay.textContent = "😰";
    }
}

function handlePop(x, y) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
        if (bubbles[i].isClicked(x, y)) {
            const now = Date.now();
            if (now - lastPopTime < 400) {
                comboMultiplier++;
            } else {
                comboMultiplier = 1;
            }
            lastPopTime = now;

            bubbles[i].pop();
            score += 10 * comboMultiplier;
            updateScore();
            updateStressLevel();
            break;
        }
    }

    if (!regenerating && bubbles.every(b => b.popped)) {
        startRegeneration();
    }
}

function startRegeneration() {
    regenerating = true;
    let index = 0;
    const poppedBubbles = bubbles.filter(b => b.popped);

    function regenerateNext() {
        if (index < poppedBubbles.length) {
            const b = poppedBubbles[index];
            b.popped = false;
            b.color = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];

            // Glow effect
            const bubbleDiv = document.createElement("div");
            bubbleDiv.style.position = "absolute";
            bubbleDiv.style.left = `${b.x - BUBBLE_RADIUS}px`;
            bubbleDiv.style.top = `${b.y - BUBBLE_RADIUS}px`;
            bubbleDiv.style.width = `${BUBBLE_RADIUS * 2}px`;
            bubbleDiv.style.height = `${BUBBLE_RADIUS * 2}px`;
            bubbleDiv.style.borderRadius = "50%";
            bubbleDiv.style.zIndex = "2";
            bubbleDiv.className = "bubble-glow";

            document.body.appendChild(bubbleDiv);
            setTimeout(() => document.body.removeChild(bubbleDiv), 600);

            index++;
            updateStressLevel();
            setTimeout(regenerateNext, 100);
        } else {
            regenerating = false;
        }
    }

    regenerateNext();
        }

        // Multi-touch & click support
        canvas.addEventListener("pointerdown", (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (!regenerating) {
                handlePop(x, y);
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

    bubbles.forEach(b => {
        b.draw(ctx);
    });

    requestAnimationFrame(draw);
}

createBubbles();
draw();
