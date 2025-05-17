const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Grid configuration
const GRID_ROWS = 7;
const GRID_COLS = 10;
const SPACING_TO_RADIUS_RATIO = 0.4; // Spacing relative to bubble radius

// Dynamically calculated
let BUBBLE_RADIUS;
let BUBBLE_SPACING;
let SCREEN_WIDTH;
let SCREEN_HEIGHT;

const BACKGROUND_COLOR = "#c8dcff";
const POPPED_COLOR = "rgba(100, 100, 100, 0.6)";
const BUBBLE_COLORS = [ // Ensure these are in "rgb(r,g,b)" format for gradient parsing
    "rgb(255,105,180)", "rgb(0,191,255)", "rgb(50,205,50)",
    "rgb(255,215,0)", "rgb(147,112,219)", "rgb(255,69,0)", "rgb(0,255,255)"
];

const popSound = document.getElementById("popSound");
const scoreDisplay = document.getElementById("scoreDisplay");
const stressLevelEl = document.getElementById("stressLevel");
const faceDisplay = document.getElementById("faceDisplay");

let bubbles = [];
let score = 0;
let comboMultiplier = 1;
let lastPopTime = 0;
let regenerating = false;

class Bubble {
    constructor(x, y, color, radius) {
        this.x = x;
        this.y = y;
        this.initialRadius = radius;
        this.radius = radius;
        this.color = color;
        this.popped = false;

        // For wobble/breathing animation
        this.angle = Math.random() * Math.PI * 2;
        this.angleSpeed = 0.02 + Math.random() * 0.03;
        this.radiusFluctuation = this.initialRadius * (0.03 + Math.random() * 0.04);
    }

    update() {
        if (!this.popped) {
            this.angle += this.angleSpeed;
            this.radius = this.initialRadius + Math.sin(this.angle) * this.radiusFluctuation;
        }
    }

    draw(ctx) {
        const currentX = this.x;
        const currentY = this.y;
        const currentRadius = this.radius;

        if (this.popped) {
            ctx.fillStyle = POPPED_COLOR;
            ctx.beginPath();
            ctx.arc(currentX, currentY, this.initialRadius / 1.8, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 1. Main Bubble Body
            const bodyGradient = ctx.createRadialGradient(
                currentX - currentRadius * 0.1, currentY - currentRadius * 0.1, currentRadius * 0.1,
                currentX, currentY, currentRadius
            );

            let r = 200, g = 200, b = 200;
            const match = this.color.match(/rgb\((\d+),(\d+),(\d+)\)/);
            if (match) {
                r = parseInt(match[1]);
                g = parseInt(match[2]);
                b = parseInt(match[3]);
            }

            const lighterColor = `rgba(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)}, 1)`;
            const darkerEdgeColor = `rgba(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)}, 0.9)`;

            bodyGradient.addColorStop(0, lighterColor);
            bodyGradient.addColorStop(0.8, this.color);
            bodyGradient.addColorStop(1, darkerEdgeColor);

            ctx.fillStyle = bodyGradient;
            ctx.beginPath();
            ctx.arc(currentX, currentY, currentRadius, 0, Math.PI * 2);
            ctx.fill();

            // 2. Specular Highlight
            const highlightX = currentX - currentRadius * 0.35;
            const highlightY = currentY - currentRadius * 0.45;
            const highlightRadius = currentRadius * 0.25;

            const specularGradient = ctx.createRadialGradient(
                highlightX, highlightY, highlightRadius * 0.1,
                highlightX, highlightY, highlightRadius
            );

            specularGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            specularGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
            specularGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = specularGradient;
            ctx.beginPath();
            ctx.ellipse(highlightX + currentRadius * 0.05, highlightY + currentRadius * 0.05, highlightRadius, highlightRadius * 0.8, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();

            // 3. Optional: Rim Light
            const rimLightX = currentX + currentRadius * 0.3;
            const rimLightY = currentY + currentRadius * 0.3;
            const rimLightRadius = currentRadius * 0.15;

            const rimGradient = ctx.createRadialGradient(
                rimLightX, rimLightY, rimLightRadius * 0.1,
                rimLightX, rimLightY, rimLightRadius
            );
            rimGradient.addColorStop(0, 'rgba(220, 220, 255, 0.25)'); // Faint bluish white
            rimGradient.addColorStop(1, 'rgba(220, 220, 255, 0)');

            ctx.fillStyle = rimGradient;
            ctx.beginPath();
            ctx.arc(rimLightX, rimLightY, rimLightRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    isClicked(mouseX, mouseY) {
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.initialRadius && !this.popped;
    }

    pop() {
        this.popped = true;
        this.radius = this.initialRadius; // Reset radius visually
        if (popSound.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) { // More robust check
             popSound.currentTime = 0;
             popSound.play().catch(e => console.warn("Pop sound play failed:", e));
        }
    }
}

function resizeCanvas() {
    const wrapper = document.querySelector('.wrapper');
    const uiHeight = document.getElementById('ui').offsetHeight;
    
    let targetCanvasWidth = Math.min(wrapper.clientWidth * 0.98, 800);
    let availableHeight = window.innerHeight - uiHeight - 40; // 20px top, 20px bottom of canvas padding
    let targetCanvasHeight = targetCanvasWidth * (6 / 8); // Aspect ratio 8:6 (or 4:3)

    if (targetCanvasHeight > availableHeight) {
        targetCanvasHeight = availableHeight;
        targetCanvasWidth = targetCanvasHeight * (8 / 6);
    }
    targetCanvasWidth = Math.min(targetCanvasWidth, wrapper.clientWidth * 0.98);

    canvas.width = Math.max(150, Math.floor(targetCanvasWidth)); // Use Math.floor for pixel perfection
    canvas.height = Math.max(112, Math.floor(targetCanvasHeight));

    SCREEN_WIDTH = canvas.width;
    SCREEN_HEIGHT = canvas.height;

    const gridAreaWidth = SCREEN_WIDTH * 0.95;
    const gridAreaHeight = SCREEN_HEIGHT * 0.90;

    // Calculate max diameter that fits based on rows and cols
    // Total space for N items and N-1 spacings: N*D + (N-1)*S
    // S = D/2 * SPACING_TO_RADIUS_RATIO  => S = D * (SPACING_TO_RADIUS_RATIO / 2)
    // Width: COLS*D + (COLS-1)*D*RATIO/2 = D * (COLS + (COLS-1)*RATIO/2)
    let diameterBasedOnWidth = gridAreaWidth / (GRID_COLS + Math.max(0, GRID_COLS - 1) * (SPACING_TO_RADIUS_RATIO / 2));
    let diameterBasedOnHeight = gridAreaHeight / (GRID_ROWS + Math.max(0, GRID_ROWS - 1) * (SPACING_TO_RADIUS_RATIO / 2));
    
    let diameter = Math.min(diameterBasedOnWidth, diameterBasedOnHeight);

    BUBBLE_RADIUS = diameter / 2;
    BUBBLE_SPACING = BUBBLE_RADIUS * SPACING_TO_RADIUS_RATIO;

    BUBBLE_RADIUS = Math.max(8, Math.min(BUBBLE_RADIUS, 35));
    BUBBLE_SPACING = BUBBLE_RADIUS * SPACING_TO_RADIUS_RATIO;

    console.log(`Resized: Canvas W:${SCREEN_WIDTH}, H:${SCREEN_HEIGHT}, Bubble R:${BUBBLE_RADIUS.toFixed(1)}, Spacing:${BUBBLE_SPACING.toFixed(1)}`);
    createBubbles();
}


function createBubbles() {
    bubbles = [];
    score = 0;
    comboMultiplier = 1;
    lastPopTime = 0;
    regenerating = false;
    updateScore();

    if (!BUBBLE_RADIUS || !SCREEN_WIDTH) {
        console.warn("Bubble params not set. Deferring bubble creation until resize.");
        return;
    }
    
    const actualGridWidth = GRID_COLS * (BUBBLE_RADIUS * 2) + Math.max(0, GRID_COLS - 1) * BUBBLE_SPACING;
    const actualGridHeight = GRID_ROWS * (BUBBLE_RADIUS * 2) + Math.max(0, GRID_ROWS - 1) * BUBBLE_SPACING;

    const firstBubbleCenterX = (SCREEN_WIDTH - actualGridWidth) / 2 + BUBBLE_RADIUS;
    const firstBubbleCenterY = (SCREEN_HEIGHT - actualGridHeight) / 2 + BUBBLE_RADIUS;

    for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
            const x = firstBubbleCenterX + col * (BUBBLE_RADIUS * 2 + BUBBLE_SPACING);
            const y = firstBubbleCenterY + row * (BUBBLE_RADIUS * 2 + BUBBLE_SPACING);
            const color = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
            bubbles.push(new Bubble(x, y, color, BUBBLE_RADIUS));
        }
    }
    updateStressLevel();
}

function updateScore() {
    scoreDisplay.textContent = `Score: ${score}`;
}

function updateStressLevel() {
    if (bubbles.length === 0) {
        stressLevelEl.style.width = `100%`;
        faceDisplay.textContent = "😰";
        stressLevelEl.style.backgroundColor = "#f33";
        return;
    }
    const poppedCount = bubbles.filter(b => b.popped).length;
    const percentageRemaining = 100 - (poppedCount / bubbles.length) * 100;
    stressLevelEl.style.width = `${percentageRemaining}%`;

    if (percentageRemaining <= 30) {
        faceDisplay.textContent = "😄";
        stressLevelEl.style.backgroundColor = "#6dec78";
    } else if (percentageRemaining <= 60) {
        faceDisplay.textContent = "😐";
        stressLevelEl.style.backgroundColor = "#ffc107";
    } else {
        faceDisplay.textContent = "😰";
        stressLevelEl.style.backgroundColor = "#f33";
    }
}

function handlePop(canvasX, canvasY) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
        if (bubbles[i].isClicked(canvasX, canvasY)) {
            const now = Date.now();
            if (now - lastPopTime < 500) { // Combo window 500ms
                comboMultiplier = Math.min(comboMultiplier + 1, 5);
            } else {
                comboMultiplier = 1;
            }
            lastPopTime = now;

            bubbles[i].pop();
            score += 10 * comboMultiplier;
            updateScore();
            updateStressLevel();
            // Add combo text effect
            showComboText(comboMultiplier, bubbles[i].x, bubbles[i].y);
            break; 
        }
    }

    if (!regenerating && bubbles.length > 0 && bubbles.every(b => b.popped)) {
        startRegeneration();
    }
}

function showComboText(multiplier, x, y) {
    if (multiplier <= 1) return;

    const comboText = document.createElement('div');
    comboText.textContent = `x${multiplier}!`;
    comboText.style.position = 'absolute';
    const canvasRect = canvas.getBoundingClientRect();
    comboText.style.left = `${canvasRect.left + window.scrollX + x}px`;
    comboText.style.top = `${canvasRect.top + window.scrollY + y - 20}px`; // Position above bubble
    comboText.style.transform = 'translateX(-50%)'; // Center horizontally
    comboText.style.color = 'white';
    comboText.style.fontSize = 'clamp(16px, 3vw, 22px)';
    comboText.style.fontWeight = 'bold';
    comboText.style.textShadow = '1px 1px 2px black';
    comboText.style.pointerEvents = 'none';
    comboText.style.zIndex = '100';
    comboText.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
    comboText.style.opacity = '1';
    
    document.body.appendChild(comboText);

    setTimeout(() => {
        comboText.style.opacity = '0';
        comboText.style.transform = 'translateX(-50%) translateY(-20px)'; // Move up and fade
    }, 100); // Start fade quickly

    setTimeout(() => {
        if (comboText.parentElement) {
            document.body.removeChild(comboText);
        }
    }, 600); // Remove after animation
}


function startRegeneration() {
    regenerating = true;
    let index = 0;
    const poppedBubblesCopy = [...bubbles];

    function regenerateNext() {
        if (index < poppedBubblesCopy.length) {
            const b = poppedBubblesCopy[index];
            if (b.popped) {
                b.popped = false;
                b.color = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
                b.radius = b.initialRadius; // Reset radius on regeneration
                b.angle = Math.random() * Math.PI * 2; // Reset animation phase

                const bubbleDiv = document.createElement("div");
                const canvasRect = canvas.getBoundingClientRect();
                bubbleDiv.style.position = "absolute";
                bubbleDiv.style.left = `${canvasRect.left + window.scrollX + b.x - b.initialRadius}px`;
                bubbleDiv.style.top = `${canvasRect.top + window.scrollY + b.y - b.initialRadius}px`;
                bubbleDiv.style.width = `${b.initialRadius * 2}px`;
                bubbleDiv.style.height = `${b.initialRadius * 2}px`;
                bubbleDiv.style.borderRadius = "50%";
                bubbleDiv.style.zIndex = "5";
                bubbleDiv.className = "bubble-glow";

                document.body.appendChild(bubbleDiv);
                setTimeout(() => {
                    if (bubbleDiv.parentElement) {
                        document.body.removeChild(bubbleDiv);
                    }
                }, 600);
            }
            index++;
            updateStressLevel();
            setTimeout(regenerateNext, 60); // Slightly faster regeneration
        } else {
            regenerating = false;
            updateStressLevel();
        }
    }
    regenerateNext();
}

canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault(); // Important to prevent page scroll/zoom on touch devices
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!regenerating) {
        handlePop(x, y);
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "r") {
        if (!regenerating) {
             console.log("R pressed - recreating bubbles.");
             resizeCanvas();
        }
    }
});

function gameLoop() { // Renamed from draw to gameLoop for clarity
    // Clear canvas
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Update and draw bubbles
    for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        if (b) { // Basic check
            if (typeof b.update === 'function') {
                b.update();
            }
            if (typeof b.draw === 'function') {
                b.draw(ctx);
            }
        }
    }
    requestAnimationFrame(gameLoop);
}

// Initial setup
window.addEventListener('resize', resizeCanvas);
// Call resizeCanvas initially to set everything up.
// It will call createBubbles which populates the bubbles array.
resizeCanvas();
gameLoop(); // Start the animation loop