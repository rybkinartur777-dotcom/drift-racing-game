// ===== FIREBASE CONFIG =====
const firebaseConfig = {
    apiKey: "AIzaSyBdTyoYQsXI82Qcgk6jy0TR7FaUDg7y-_4",
    authDomain: "nitroway-racing.firebaseapp.com",
    databaseURL: "https://nitroway-racing-default-rtdb.firebaseio.com",
    projectId: "nitroway-racing",
    storageBucket: "nitroway-racing.firebasestorage.app",
    messagingSenderId: "946780173646",
    appId: "1:946780173646:web:d21642376aee18bc151a1f",
    measurementId: "G-PJLELNYQRE"
};

// Initialize Firebase
let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
} catch (e) {
    console.error("Firebase init error:", e);
}

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
let leaderboard = [];

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

// ===== FIREBASE FUNCTIONS =====
function saveScoreToFirebase() {
    if (!db || !tg?.initDataUnsafe?.user) return;

    const user = tg.initDataUnsafe.user;
    const userId = user.id;
    const userData = {
        name: user.username ? `@${user.username}` : user.first_name,
        score: gameState.bestScore,
        car: cars[gameState.selectedCar].icon,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    // Save only if it's a better score
    const userRef = db.ref('leaderboard/' + userId);
    userRef.transaction((currentData) => {
        if (currentData === null || userData.score > currentData.score) {
            return userData;
        } else {
            return; // Abort
        }
    }, (error, committed, snapshot) => {
        if (error) {
            console.error('Save failed', error);
            // alert('Ошибка сохранения: ' + error.message); // Uncomment for debugging
        } else if (committed) {
            console.log('Score saved!');
        }
    });
}

function loadLeaderboardFromFirebase() {
    if (!db) return;

    const list = document.getElementById('leaderboardList');
    list.innerHTML = '<div class="loading">Загрузка...</div>';

    db.ref('leaderboard').orderByChild('score').limitToLast(10).once('value', (snapshot) => {
        const data = [];
        snapshot.forEach((childSnapshot) => {
            data.push(childSnapshot.val());
        });

        // Firebase returns ascending order, so reverse it
        leaderboard = data.reverse();
        updateLeaderboardUI();
    });
}

// ===== SCREEN NAVIGATION =====
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');

    if (screenId === 'leaderboardScreen') {
        loadLeaderboardFromFirebase();
    }

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

// ===== LEADERBOARD UI =====
function updateLeaderboardUI() {
    const list = document.getElementById('leaderboardList');
    const user = tg?.initDataUnsafe?.user;
    const currentUserName = user ? (user.username ? '@' + user.username : user.first_name) : 'Ты';

    if (leaderboard.length === 0) {
        list.innerHTML = '<div class="no-scores">Пока нет рекордов. Будь первым!</div>';
        return;
    }

    list.innerHTML = leaderboard.map((p, i) => `
        <div class="leaderboard-item ${i < 3 ? 'top-3' : ''} ${p.name === currentUserName ? 'current-user' : ''}">
            <span class="rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</span>
            <div class="player-info">
                <div class="player-name">${p.name}</div>
            </div>
            <span class="player-score">${p.score}</span>
        </div>
    `).join('');
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    playSound('click');
    // For now we only have all-time global leaderboard
    loadLeaderboardFromFirebase();
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
    const moveSpeed = 8 * car.handling * (1 + gameState.upgrades.handling * 0.1);
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

    // Road boundaries (4 lanes)
    const roadLeft = canvas.width * 0.05; // Wider road
    const roadRight = canvas.width * 0.95;
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

    // Spawn obstacles
    if (Math.random() < diff.spawnRate) {
        const obstacleTypes = ['car', 'truck', 'barrier'];
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        // 4 lanes logic
        const laneWidth = (roadRight - roadLeft) / 4;
        const laneIndex = Math.floor(Math.random() * 4); // 0 to 3
        const laneCenter = roadLeft + laneIndex * laneWidth + laneWidth / 2;

        obstacles.push({
            x: laneCenter - (type === 'truck' ? 30 : 25), // Center obstacle in lane
            y: -100,
            width: type === 'truck' ? 60 : 50,
            height: type === 'truck' ? 120 : 80,
            type: type,
            color: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3'][Math.floor(Math.random() * 4)]
        });
    }

    // Spawn coins
    if (Math.random() < 0.02) {
        const laneWidth = (roadRight - roadLeft) / 4;
        const laneIndex = Math.floor(Math.random() * 4);
        const laneCenter = roadLeft + laneIndex * laneWidth + laneWidth / 2;

        roadCoins.push({
            x: laneCenter,
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

    const roadLeft = canvas.width * 0.05;
    const roadRight = canvas.width * 0.95;
    const roadWidth = roadRight - roadLeft;

    // Road
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(roadLeft, 0, roadWidth, canvas.height);

    // Road edges
    ctx.fillStyle = '#ff4d4d';
    ctx.fillRect(roadLeft - 5, 0, 5, canvas.height);
    ctx.fillRect(roadRight, 0, 5, canvas.height);

    // Animated road lines (3 separators for 4 lanes)
    const lineOffset = (roadOffset % 60);
    ctx.fillStyle = '#ffffff33';

    // Draw 3 dividers
    for (let i = 1; i < 4; i++) {
        const x = roadLeft + (roadWidth * i / 4);
        for (let y = -60 + lineOffset; y < canvas.height + 60; y += 60) {
            ctx.fillRect(x - 3, y, 6, 30);
        }
    }

    // Coins
    roadCoins.forEach(coin => {
        if (coin.collected) return;
        ctx.save();
        ctx.translate(coin.x, coin.y);

        // Gold Coin
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();
        ctx.strokeStyle = '#daa520';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner detail
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff8dc';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#b8860b';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 1);
        ctx.restore();
    });

    // Obstacles
    obstacles.forEach(obs => {
        ctx.save();
        ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
        // Draw Enemy Car
        drawCarSprite(ctx, 0, 0, obs.width, obs.height, obs.color, obs.type === 'truck');
        ctx.restore();
    });

    // Player car
    const car = cars[gameState.selectedCar];
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Draw Player Car (more detailed)
    drawCarSprite(ctx, 0, 0, player.width, player.height, car.color, false, true);

    // Nitro flames
    if (nitroActive) {
        ctx.save();
        ctx.translate(0, player.height / 2);
        for (let i = 0; i < 2; i++) {
            const offset = i === 0 ? -10 : 10;
            ctx.fillStyle = Math.random() > 0.5 ? '#00ffff' : '#ffffff';
            ctx.beginPath();
            ctx.moveTo(offset - 2, 0);
            ctx.lineTo(offset, 20 + Math.random() * 15);
            ctx.lineTo(offset + 2, 0);
            ctx.fill();

            ctx.fillStyle = '#ff4400';
            ctx.beginPath();
            ctx.moveTo(offset - 4, 0);
            ctx.lineTo(offset, 10 + Math.random() * 10);
            ctx.lineTo(offset + 4, 0);
            ctx.fill();
        }
        ctx.restore();
    }

    ctx.restore();

    // Speed lines
    if (currentSpeed > 150 || nitroActive) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const x = roadLeft + Math.random() * roadWidth;
            const y = Math.random() * canvas.height;
            const len = 50 + Math.random() * 100;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + len);
            ctx.stroke();
        }
    }
}

// Helper to draw a detailed car
function drawCarSprite(ctx, x, y, w, h, color, isTruck = false, isPlayer = false) {
    const halfW = w / 2;
    const halfH = h / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-halfW + 5, -halfH + 5, w, h);

    // Tires
    ctx.fillStyle = '#111';
    const tireW = w * 0.2;
    const tireH = h * 0.2;
    const tireInsetX = halfW + 2;
    const tireInsetY = halfH * 0.6;

    // FL, FR, RL, RR
    ctx.fillRect(-tireInsetX, -tireInsetY, tireW, tireH);
    ctx.fillRect(tireInsetX - tireW, -tireInsetY, tireW, tireH);
    ctx.fillRect(-tireInsetX, tireInsetY - tireH, tireW, tireH);
    ctx.fillRect(tireInsetX - tireW, tireInsetY - tireH, tireW, tireH);

    // Main Body
    // Gradient for 3D effect
    // We assume context is translated to center
    // but gradients work better with absolute coords or simple relative fill
    ctx.fillStyle = color;

    // Base shape
    if (isTruck) {
        // Truck body
        ctx.fillRect(-halfW, -halfH, w, h);
        // Truck Bed (darker)
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(-halfW + 4, 0, w - 8, halfH - 4);
    } else {
        // Sport shape (rounded)
        ctx.beginPath();
        ctx.roundRect(-halfW, -halfH, w, h, 8);
        ctx.fill();

        // Side skirts / details
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(-halfW, -halfH * 0.6, 4, h * 0.6);
        ctx.fillRect(halfW - 4, -halfH * 0.6, 4, h * 0.6);
    }

    // Cabin / Roof
    ctx.fillStyle = color; // Reset color
    const roofW = w * (isTruck ? 0.9 : 0.8);
    const roofH = h * (isTruck ? 0.35 : 0.45);
    const roofY = isTruck ? -halfH + 10 : -5;

    // Windshield Area
    ctx.fillStyle = '#111'; // Window seal/glass base
    ctx.fillRect(-roofW / 2 - 1, roofY - 1, roofW + 2, roofH + 2);

    // Glass
    ctx.fillStyle = isPlayer ? '#22aadd' : '#445566'; // Blue tint for player
    ctx.fillRect(-roofW / 2, roofY, roofW, roofH);

    // Shine on glass
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(-roofW / 2, roofY);
    ctx.lineTo(-roofW / 2 + 10, roofY);
    ctx.lineTo(-roofW / 2, roofY + 15);
    ctx.fill();

    // Roof Top (Body color painted)
    if (!isTruck) { // Sedans have painted roof
        ctx.fillStyle = color;
        ctx.fillRect(-roofW / 2 + 2, roofY + 5, roofW - 4, roofH - 12);
    }

    // Lights
    // Headlights
    ctx.fillStyle = isPlayer ? '#ccffff' : '#ffffaa';
    ctx.beginPath();
    if (isTruck) {
        ctx.rect(-halfW + 2, -halfH + 1, 10, 5);
        ctx.rect(halfW - 12, -halfH + 1, 10, 5);
    } else {
        // Angled lights for sport car
        ctx.moveTo(-halfW + 4, -halfH);
        ctx.lineTo(-halfW + 12, -halfH);
        ctx.lineTo(-halfW + 10, -halfH + 8);
        ctx.lineTo(-halfW + 2, -halfH + 6);

        ctx.moveTo(halfW - 4, -halfH);
        ctx.lineTo(halfW - 12, -halfH);
        ctx.lineTo(halfW - 10, -halfH + 8);
        ctx.lineTo(halfW - 2, -halfH + 6);
    }
    ctx.fill();

    // Headlight glow
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(-halfW + 8, -halfH, 15, 0, Math.PI * 2);
    ctx.arc(halfW - 8, -halfH, 15, 0, Math.PI * 2);
    ctx.fill();

    // Taillights
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(-halfW + 4, halfH - 4, 12, 4);
    ctx.fillRect(halfW - 16, halfH - 4, 12, 4);

    // Spoiler (if player or expensive car)
    if (isPlayer) {
        ctx.fillStyle = color; // Wing color
        // Wing supports
        ctx.fillRect(-halfW + 10, halfH - 8, 4, 8);
        ctx.fillRect(halfW - 14, halfH - 8, 4, 8);
        // Wing blade (darker)
        ctx.fillStyle = '#000000'; // Carbon fiber look
        ctx.fillRect(-halfW, halfH - 10, w, 4);
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
        // Save to Firebase on new record
        saveScoreToFirebase();
    }

    saveGame();

    // Send score to Telegram bot (backup)
    if (tg && score > 0) {
        try {
            tg.sendData(JSON.stringify({
                score: score,
                coins: coinsEarned,
                car: cars[gameState.selectedCar].name
            }));
        } catch (e) {
            console.log('Could not send data to bot:', e);
        }
    }

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

// Prevent context menu
document.addEventListener('contextmenu', e => e.preventDefault());
