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
    db.ref('leaderboard/' + userId).transaction((currentData) => {
        if (currentData === null || userData.score > currentData.score) {
            return userData;
        } else {
            return; // Abort if existing score is higher
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

    // Obstacles ... (simplified rendering logic for clarity)
    obstacles.forEach(obs => {
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    });

    // Player car
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Simple car rendering
    const car = cars[gameState.selectedCar];
    ctx.fillStyle = car.color;
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

    // Nitro flames
    if (nitroActive) {
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.moveTo(-10, player.height / 2);
        ctx.lineTo(0, player.height / 2 + 20);
        ctx.lineTo(10, player.height / 2);
        ctx.fill();
    }

    ctx.restore();
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
