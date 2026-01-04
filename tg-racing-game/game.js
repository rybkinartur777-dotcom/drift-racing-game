// ===== TELEGRAM WEB APP =====
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
}

// ===== GAME STATE =====
const gameState = {
    coins: 0,
    bestScore: 0,
    selectedCar: 0,
    upgrades: { speed: 1, handling: 1, nitro: 1, coins: 1 },
    settings: { sound: true, music: true, vibration: true, difficulty: 'normal' },
    unlockedCars: [true, false, false, false, false, false]
};

// ===== CARS DATA =====
const cars = [
    { name: 'Starter', icon: '🚗', color: '#ff4d4d', price: 0, speed: 1, handling: 1 },
    { name: 'Racer', icon: '🏎️', color: '#00d4ff', price: 500, speed: 1.2, handling: 1.1 },
    { name: 'Muscle', icon: '🚙', color: '#ffd700', price: 1000, speed: 1.4, handling: 0.9 },
    { name: 'Sport', icon: '🏁', color: '#7b2ff7', price: 2000, speed: 1.5, handling: 1.3 },
    { name: 'Super', icon: '⚡', color: '#ff8800', price: 5000, speed: 1.8, handling: 1.5 },
    { name: 'Legend', icon: '👑', color: '#ff00ff', price: 10000, speed: 2.0, handling: 1.8 }
];

// ===== LEADERBOARD DATA =====
let leaderboard = [
    { name: 'Pro Racer', score: 15000, car: '👑' },
    { name: 'Speed King', score: 12500, car: '⚡' },
    { name: 'Drifter', score: 10000, car: '🏎️' },
    { name: 'Fast Boy', score: 7500, car: '🏁' },
    { name: 'Rookie', score: 5000, car: '🚗' }
];

// ===== LOAD/SAVE =====
function loadGame() {
    const saved = localStorage.getItem('driftRacing');
    if (saved) {
        const data = JSON.parse(saved);
        Object.assign(gameState, data);
    }
    updateAllUI();
}

function saveGame() {
    localStorage.setItem('driftRacing', JSON.stringify(gameState));
}

// ===== SCREEN NAVIGATION =====
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    updateAllUI();
    playSound('click');
}

// ===== UPDATE ALL UI =====
function updateAllUI() {
    // Menu stats
    document.getElementById('menuCoins').textContent = gameState.coins;
    document.getElementById('menuBestScore').textContent = gameState.bestScore;

    // Garage
    document.getElementById('garageCoins').textContent = gameState.coins;
    updateGarage();

    // Upgrades
    document.getElementById('upgradesCoins').textContent = gameState.coins;
    updateUpgrades();

    // Leaderboard
    document.getElementById('leaderCoins').textContent = gameState.coins;
    updateLeaderboard();

    // Settings
    document.getElementById('soundToggle').checked = gameState.settings.sound;
    document.getElementById('musicToggle').checked = gameState.settings.music;
    document.getElementById('vibrationToggle').checked = gameState.settings.vibration;
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.diff === gameState.settings.difficulty);
    });
}

// ===== GARAGE =====
function updateGarage() {
    const car = cars[gameState.selectedCar];
    const preview = document.getElementById('previewCar');
    preview.style.background = `linear-gradient(135deg, ${car.color}, ${car.color}88)`;
    document.getElementById('carName').textContent = car.name;
    document.getElementById('carStats').innerHTML = `🚀 ${car.speed.toFixed(1)}x | 🎯 ${car.handling.toFixed(1)}x`;

    const grid = document.getElementById('carsList');
    grid.innerHTML = cars.map((c, i) => `
        <div class="car-card ${gameState.selectedCar === i ? 'selected' : ''} ${!gameState.unlockedCars[i] ? 'locked' : ''}" 
             onclick="selectCar(${i})">
            <span class="car-icon">${c.icon}</span>
            <span class="car-price">${gameState.unlockedCars[i] ? '✓' : c.price + ' 🪙'}</span>
        </div>
    `).join('');
}

function selectCar(index) {
    if (gameState.unlockedCars[index]) {
        gameState.selectedCar = index;
        playSound('click');
    } else if (gameState.coins >= cars[index].price) {
        if (confirm(`Купить ${cars[index].name} за ${cars[index].price} 🪙?`)) {
            gameState.coins -= cars[index].price;
            gameState.unlockedCars[index] = true;
            gameState.selectedCar = index;
            playSound('purchase');
        }
    } else {
        alert('Недостаточно монет!');
    }
    saveGame();
    updateAllUI();
}

// ===== UPGRADES =====
function updateUpgrades() {
    ['speed', 'handling', 'nitro', 'coins'].forEach(type => {
        const level = gameState.upgrades[type];
        const cost = level * 150;
        document.getElementById(`${type}Level`).textContent = level;
        document.getElementById(`${type}Bar`).style.width = `${level * 10}%`;
        document.getElementById(`${type}Cost`).textContent = cost;
        const btn = document.querySelector(`[data-upgrade="${type}"] .upgrade-btn`);
        btn.disabled = level >= 10 || gameState.coins < cost;
    });
}

function buyUpgrade(type) {
    const level = gameState.upgrades[type];
    const cost = level * 150;
    if (level < 10 && gameState.coins >= cost) {
        gameState.coins -= cost;
        gameState.upgrades[type]++;
        playSound('upgrade');
        saveGame();
        updateAllUI();
    }
}

// ===== LEADERBOARD =====
function updateLeaderboard() {
    const list = document.getElementById('leaderboardList');
    const userName = tg?.initDataUnsafe?.user?.first_name || 'Ты';

    // Add current player to leaderboard
    let combined = [...leaderboard, { name: userName, score: gameState.bestScore, car: cars[gameState.selectedCar].icon, isPlayer: true }];
    combined.sort((a, b) => b.score - a.score);
    combined = combined.slice(0, 10);

    list.innerHTML = combined.map((p, i) => `
        <div class="leaderboard-item ${i < 3 ? 'top-3' : ''} ${p.isPlayer ? 'current-user' : ''}">
            <span class="rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</span>
            <div class="player-info">
                <div class="player-name">${p.car} ${p.name}</div>
            </div>
            <span class="player-score">${p.score}</span>
        </div>
    `).join('');
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    playSound('click');
}

// ===== SETTINGS =====
function toggleSound() { gameState.settings.sound = document.getElementById('soundToggle').checked; saveGame(); }
function toggleMusic() { gameState.settings.music = document.getElementById('musicToggle').checked; saveGame(); }
function toggleVibration() { gameState.settings.vibration = document.getElementById('vibrationToggle').checked; saveGame(); }

function setDifficulty(diff) {
    gameState.settings.difficulty = diff;
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.toggle('active', b.dataset.diff === diff));
    playSound('click');
    saveGame();
}

// ===== SOUND SYSTEM =====
function playSound(type) {
    if (!gameState.settings.sound) return;
    // Sound effects would be loaded here
}

function vibrate(duration = 50) {
    if (gameState.settings.vibration && navigator.vibrate) {
        navigator.vibrate(duration);
    }
}

// Initialize
loadGame();

// ===== GAME ENGINE =====
let canvas, ctx;
let gameRunning = false;
let gamePaused = false;
let score = 0;
let coinsEarned = 0;
let currentSpeed = 0;
let nitroAmount = 100;
let nitroActive = false;

// Player
let player = { x: 0, y: 0, width: 50, height: 80, angle: 0, velocityX: 0 };

// Road & obstacles
let roadOffset = 0;
let obstacles = [];
let roadCoins = [];
let trackMarkers = [];

// Difficulty settings
const difficultySettings = {
    easy: { obstacleSpeed: 3, spawnRate: 0.015, coinMultiplier: 1.5 },
    normal: { obstacleSpeed: 5, spawnRate: 0.025, coinMultiplier: 1 },
    hard: { obstacleSpeed: 7, spawnRate: 0.04, coinMultiplier: 2 }
};

// Controls
let leftPressed = false;
let rightPressed = false;
let nitroPressed = false;

function startGame() {
    showScreen('gameScreen');
    initGame();
    gameRunning = true;
    gamePaused = false;
    requestAnimationFrame(gameLoop);
}

function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();

    score = 0;
    coinsEarned = 0;
    currentSpeed = 0;
    nitroAmount = 100;
    obstacles = [];
    roadCoins = [];
    trackMarkers = [];

    player.x = canvas.width / 2;
    player.y = canvas.height - 150;
    player.velocityX = 0;
    player.angle = 0;

    // Generate initial track markers
    for (let i = 0; i < 20; i++) {
        trackMarkers.push({ y: i * 60, left: true });
        trackMarkers.push({ y: i * 60 + 30, left: false });
    }

    setupControls();
    updateGameUI();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function setupControls() {
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const nitroBtn = document.getElementById('nitroBtn');

    // Touch controls
    leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); leftPressed = true; });
    leftBtn.addEventListener('touchend', () => leftPressed = false);
    rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); rightPressed = true; });
    rightBtn.addEventListener('touchend', () => rightPressed = false);
    nitroBtn.addEventListener('touchstart', (e) => { e.preventDefault(); nitroPressed = true; });
    nitroBtn.addEventListener('touchend', () => nitroPressed = false);

    // Mouse controls
    leftBtn.addEventListener('mousedown', () => leftPressed = true);
    leftBtn.addEventListener('mouseup', () => leftPressed = false);
    rightBtn.addEventListener('mousedown', () => rightPressed = true);
    rightBtn.addEventListener('mouseup', () => rightPressed = false);
    nitroBtn.addEventListener('mousedown', () => nitroPressed = true);
    nitroBtn.addEventListener('mouseup', () => nitroPressed = false);

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a') leftPressed = true;
        if (e.key === 'ArrowRight' || e.key === 'd') rightPressed = true;
        if (e.key === ' ' || e.key === 'Shift') nitroPressed = true;
        if (e.key === 'Escape') togglePause();
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a') leftPressed = false;
        if (e.key === 'ArrowRight' || e.key === 'd') rightPressed = false;
        if (e.key === ' ' || e.key === 'Shift') nitroPressed = false;
    });
}

function gameLoop() {
    if (!gameRunning) return;
    if (gamePaused) {
        requestAnimationFrame(gameLoop);
        return;
    }

    update();
    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    const car = cars[gameState.selectedCar];
    const diff = difficultySettings[gameState.settings.difficulty];
    const speedMod = car.speed * (1 + gameState.upgrades.speed * 0.1);
    const handlingMod = car.handling * (1 + gameState.upgrades.handling * 0.1);

    // Speed calculation
    let targetSpeed = 100 + score / 50;
    if (nitroPressed && nitroAmount > 0) {
        nitroActive = true;
        nitroAmount -= 0.5;
        targetSpeed *= 1.5;
    } else {
        nitroActive = false;
        if (nitroAmount < 100) nitroAmount += 0.1 * (1 + gameState.upgrades.nitro * 0.1);
    }
    currentSpeed += (targetSpeed - currentSpeed) * 0.05;

    // Player movement
    const moveSpeed = 8 * handlingMod;
    if (leftPressed) {
        player.velocityX -= moveSpeed * 0.3;
        player.angle = Math.max(player.angle - 0.05, -0.3);
    } else if (rightPressed) {
        player.velocityX += moveSpeed * 0.3;
        player.angle = Math.min(player.angle + 0.05, 0.3);
    } else {
        player.velocityX *= 0.9;
        player.angle *= 0.9;
    }

    player.velocityX = Math.max(-15, Math.min(15, player.velocityX));
    player.x += player.velocityX;

    // Road boundaries
    const roadLeft = canvas.width * 0.15;
    const roadRight = canvas.width * 0.85;
    if (player.x - player.width / 2 < roadLeft) {
        player.x = roadLeft + player.width / 2;
        player.velocityX = 0;
    }
    if (player.x + player.width / 2 > roadRight) {
        player.x = roadRight - player.width / 2;
        player.velocityX = 0;
    }

    // Road offset for scrolling effect
    roadOffset += currentSpeed * 0.1 * speedMod;

    // Update track markers
    trackMarkers.forEach(m => {
        m.y += currentSpeed * 0.1 * speedMod;
        if (m.y > canvas.height + 50) m.y -= canvas.height + 100;
    });

    // Spawn obstacles
    if (Math.random() < diff.spawnRate) {
        const obstacleTypes = ['car', 'truck', 'barrier'];
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        obstacles.push({
            x: roadLeft + Math.random() * (roadRight - roadLeft - 60),
            y: -100,
            width: type === 'truck' ? 60 : 50,
            height: type === 'truck' ? 120 : 80,
            type: type,
            color: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3'][Math.floor(Math.random() * 4)]
        });
    }

    // Spawn coins
    if (Math.random() < 0.02) {
        roadCoins.push({
            x: roadLeft + 30 + Math.random() * (roadRight - roadLeft - 60),
            y: -30,
            collected: false
        });
    }

    // Update obstacles
    const obstacleSpeed = diff.obstacleSpeed * speedMod;
    obstacles.forEach((obs, i) => {
        obs.y += obstacleSpeed + currentSpeed * 0.05;

        // Collision detection
        if (checkCollision(player, obs)) {
            gameOver();
        }
    });
    obstacles = obstacles.filter(o => o.y < canvas.height + 150);

    // Update coins
    roadCoins.forEach(coin => {
        coin.y += obstacleSpeed + currentSpeed * 0.05;

        if (!coin.collected && checkCoinCollision(player, coin)) {
            coin.collected = true;
            const coinBonus = Math.floor(10 * diff.coinMultiplier * (1 + gameState.upgrades.coins * 0.2));
            coinsEarned += coinBonus;
            vibrate(30);
        }
    });
    roadCoins = roadCoins.filter(c => c.y < canvas.height + 50 && !c.collected);

    // Update score
    score += Math.floor(currentSpeed * 0.01 * speedMod);

    updateGameUI();
}

function checkCollision(p, o) {
    const px = p.x - p.width / 2;
    const py = p.y - p.height / 2;
    return px < o.x + o.width && px + p.width > o.x && py < o.y + o.height && py + p.height > o.y;
}

function checkCoinCollision(p, c) {
    const dist = Math.sqrt((p.x - c.x) ** 2 + (p.y - c.y) ** 2);
    return dist < 40;
}

function render() {
    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const roadLeft = canvas.width * 0.15;
    const roadRight = canvas.width * 0.85;
    const roadWidth = roadRight - roadLeft;

    // Road
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(roadLeft, 0, roadWidth, canvas.height);

    // Road edges
    ctx.fillStyle = '#ff4d4d';
    ctx.fillRect(roadLeft - 5, 0, 5, canvas.height);
    ctx.fillRect(roadRight, 0, 5, canvas.height);

    // Track markers (dashed lines)
    ctx.strokeStyle = '#ffffff44';
    ctx.lineWidth = 3;
    ctx.setLineDash([30, 20]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Animated road lines
    const lineOffset = (roadOffset % 60);
    ctx.fillStyle = '#ffffff33';
    for (let y = -60 + lineOffset; y < canvas.height + 60; y += 60) {
        ctx.fillRect(roadLeft + roadWidth * 0.25 - 3, y, 6, 30);
        ctx.fillRect(roadLeft + roadWidth * 0.75 - 3, y, 6, 30);
    }

    // Coins
    roadCoins.forEach(coin => {
        if (coin.collected) return;
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('$', coin.x, coin.y + 5);
    });

    // Obstacles
    obstacles.forEach(obs => {
        ctx.save();
        ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);

        // Car body
        ctx.fillStyle = obs.color;
        ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);

        // Windshield
        ctx.fillStyle = '#00000066';
        ctx.fillRect(-obs.width / 2 + 5, -obs.height / 2 + 10, obs.width - 10, obs.height * 0.25);

        // Wheels
        ctx.fillStyle = '#333';
        ctx.fillRect(-obs.width / 2 - 5, -obs.height / 2 + 10, 8, 20);
        ctx.fillRect(obs.width / 2 - 3, -obs.height / 2 + 10, 8, 20);
        ctx.fillRect(-obs.width / 2 - 5, obs.height / 2 - 30, 8, 20);
        ctx.fillRect(obs.width / 2 - 3, obs.height / 2 - 30, 8, 20);

        ctx.restore();
    });

    // Player car
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    const car = cars[gameState.selectedCar];

    // Car shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-player.width / 2 + 5, -player.height / 2 + 10, player.width, player.height);

    // Car body
    const gradient = ctx.createLinearGradient(-player.width / 2, 0, player.width / 2, 0);
    gradient.addColorStop(0, car.color);
    gradient.addColorStop(0.5, car.color);
    gradient.addColorStop(1, car.color + '88');
    ctx.fillStyle = gradient;
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

    // Windshield
    ctx.fillStyle = '#00d4ff44';
    ctx.fillRect(-player.width / 2 + 8, -player.height / 2 + 15, player.width - 16, 25);

    // Headlights
    ctx.fillStyle = '#ffffcc';
    ctx.fillRect(-player.width / 2 + 5, -player.height / 2, 10, 8);
    ctx.fillRect(player.width / 2 - 15, -player.height / 2, 10, 8);

    // Wheels
    ctx.fillStyle = '#222';
    ctx.fillRect(-player.width / 2 - 5, -player.height / 2 + 15, 8, 25);
    ctx.fillRect(player.width / 2 - 3, -player.height / 2 + 15, 8, 25);
    ctx.fillRect(-player.width / 2 - 5, player.height / 2 - 40, 8, 25);
    ctx.fillRect(player.width / 2 - 3, player.height / 2 - 40, 8, 25);

    // Nitro flames
    if (nitroActive) {
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.moveTo(-10, player.height / 2);
        ctx.lineTo(0, player.height / 2 + 30 + Math.random() * 20);
        ctx.lineTo(10, player.height / 2);
        ctx.fill();

        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.moveTo(-5, player.height / 2);
        ctx.lineTo(0, player.height / 2 + 15 + Math.random() * 10);
        ctx.lineTo(5, player.height / 2);
        ctx.fill();
    }

    ctx.restore();

    // Speed lines when fast
    if (currentSpeed > 150 || nitroActive) {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + 30 + Math.random() * 50);
            ctx.stroke();
        }
    }
}

function updateGameUI() {
    document.getElementById('gameScore').textContent = score;
    document.getElementById('gameCoins').textContent = coinsEarned;
    document.getElementById('currentSpeed').textContent = Math.floor(currentSpeed);
    document.getElementById('nitroFill').style.width = `${nitroAmount}%`;
}

function togglePause() {
    if (!gameRunning) return;
    gamePaused = !gamePaused;
    document.getElementById('pauseScreen').classList.toggle('active', gamePaused);
}

function resumeGame() {
    gamePaused = false;
    document.getElementById('pauseScreen').classList.remove('active');
}

function restartGame() {
    document.getElementById('pauseScreen').classList.remove('active');
    document.getElementById('gameOverScreen').classList.remove('active');
    initGame();
    gameRunning = true;
    gamePaused = false;
    requestAnimationFrame(gameLoop);
}

function exitToMenu() {
    gameRunning = false;
    gamePaused = false;
    document.getElementById('pauseScreen').classList.remove('active');
    document.getElementById('gameOverScreen').classList.remove('active');
    showScreen('mainMenu');
}

function gameOver() {
    gameRunning = false;
    vibrate(200);

    // Add earned coins
    gameState.coins += coinsEarned;

    // Check for new record
    const isNewRecord = score > gameState.bestScore;
    if (isNewRecord) {
        gameState.bestScore = score;
    }

    saveGame();

    // Show game over screen
    document.getElementById('finalScore').textContent = score;
    document.getElementById('bestScoreResult').textContent = gameState.bestScore;
    document.getElementById('earnedCoins').textContent = `+${coinsEarned} 🪙`;
    document.getElementById('newRecord').classList.toggle('hidden', !isNewRecord);
    document.getElementById('gameOverScreen').classList.add('active');
}

// Window resize
window.addEventListener('resize', () => {
    if (canvas) resizeCanvas();
});

// Prevent context menu on long press
document.addEventListener('contextmenu', e => e.preventDefault());
