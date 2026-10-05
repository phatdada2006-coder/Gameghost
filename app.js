// 🔊 ສຽງປະກອບ
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
        if (screen.orientation && screen.orientation.lock) {
             screen.orientation.lock('landscape').catch(err => console.log(err));
        }
    }
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'coin') {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'shoot') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'shield') {
        // ສຽງໂລ່ປ້ອງກັນ (ສຽງຕ່ຳຂຶ້ນຫາສຽງສູງ)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start(); osc.stop(audioCtx.currentTime + 0.25);
    } else if (type === 'speed') {
        // ສຽງ Speed ຄວາມໄວ (ສຽງແຫຼມ)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    }
}
// ✨ ຂໍ້ຄວາມລອຍ +10
function showFloatingText(x, y, text, color = '#f1c40f') {
    const el = document.createElement('div');
    el.innerText = text;
    el.style.position = 'absolute';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = color;
    el.style.fontWeight = 'bold';
    el.style.fontSize = '20px';
    el.style.zIndex = '999';
    el.style.transition = 'all 0.8s ease-out';
    el.style.pointerEvents = 'none';
    document.body.appendChild(el);

    setTimeout(() => {
        el.style.top = (y - 35) + 'px';
        el.style.opacity = '0';
    }, 50);
    setTimeout(() => el.remove(), 850);
}

const player = document.getElementById('player');
const ghost = document.getElementById('ghost');
const hpBar = document.getElementById('hp-bar');
const scoreText = document.getElementById('score');

const platformsContainer = document.getElementById('platforms');
const hazardsContainer = document.getElementById('hazards');
const coinsContainer = document.getElementById('coins');
const shieldsContainer = document.createElement('div'); 
const ghostHpText = document.getElementById('ghost-hp');
const bulletsContainer = document.getElementById('bullets');

let ghostHp = 100;
let isGhostDead = false;
let bullets = [];
shieldsContainer.id = 'shields';
document.body.appendChild(shieldsContainer);

let maxX = window.innerWidth - 50; 
let maxY = window.innerHeight - 50;

let playerX = window.innerWidth / 2;
let playerY = window.innerHeight / 2;
let playerSpeed = 4;
let playerAngle = 0; 

let ghostX = 20;
let ghostY = 20;
let ghostSpeed = 2.0; 

let playerHp = 100;
let lives = 3; 
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let currentLevel = 1; // ເລີ່ມຕົ້ນດ່ານທີ1
let timeLeft = 120; // ກຳນົດເວລາ120
let timerInterval = null; // ເກັບສະຖານະການນັບເວລາ
let gameStarted = false;
let gameOver = false;
let winGame = false;
let dashCooldown = false;

// 🛡️ ລະບົບໂລ່ປ້ອງກັນ
let hasShield = false;
let shieldTimer = null;
let shields = [];
let shieldElements = [];

// ⚡ ລະບົບຄວາມໄວ(Speed Boost)
let hasSpeedBoost = false;
let speedTimer = null;
let speeds = [];
let speedElements = [];

// ລະບົບກະໂດດ
let isJumping = false;
let jumpFrame = 0;
const totalJumpFrames = 25; 
let jumpAngle = 0;

function startJump(e) {
    if (e) e.preventDefault();
    if (gameOver || isJumping) return;
    isJumping = true;
    jumpFrame = 0;
    jumpAngle = playerAngle;
}
function shoot() {
    playSound('shoot');
    if (gameOver || !gameStarted || isJumping) return;
    
    let angle = playerAngle; 

    //  🎯 ຖເາຜີຍັງບໍ່ຕາຍໃຫ້ຄຳນວນເລ່ງຍິງໄປຫາຜີອັດຕະໂນມັດ
    if (!isGhostDead) {
        let dx = ghostX - playerX;
        let dy = ghostY - playerY;
        angle = Math.atan2(dy, dx) * (180 / Math.PI);
    }

    const rad = angle * (Math.PI / 180);
    bullets.push({
        x: playerX + 20,
        y: playerY + 20,
        vx: Math.cos(rad) * 10,
        vy: Math.sin(rad) * 10,
        angle: angle
    });
}
//  ກົດປຸ່ມ F ຫຼື J ເພື່ອຍິງ
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyF' || e.code === 'KeyJ') shoot();
});

// ກົດປຸ່ມຍິງເທິງຫໜ້າຈໍມືຖື
const fireBtn = document.getElementById('fire');
if (fireBtn) {
    fireBtn.addEventListener('click', shoot);
    fireBtn.addEventListener('touchstart', (e) => { e.preventDefault(); shoot(); });
}
const jumpBtn = document.getElementById('jump');
if(jumpBtn) {
    jumpBtn.addEventListener('mousedown', startJump);
    jumpBtn.addEventListener('touchstart', startJump);
}
window.addEventListener('keydown', (e) => { if (e.code === 'Space') startJump(e); });

// ສ້າງສາກ ແລະ ຫຼຽນ 15 ອັນ
let platforms = [
    { x: 100, y: 150, w: 200, h: 25 },
    { x: window.innerWidth - 300, y: 220, w: 180, h: 25 },
    { x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 50, w: 200, h: 25 },
    { x: 150, y: window.innerHeight - 200, w: 220, h: 25 },
    { x: window.innerWidth - 350, y: window.innerHeight - 150, w: 200, h: 25 }
];
// 🗺️ ເພີ່ມຜັງຊັ້ນຫີນສຳຫຼັບດ່ານ2
const level2Platforms = [
    { x: 100, y: 180, w: 220, h: 25 },
    { x: 400, y: 280, w: 180, h: 25 },
    { x: 200, y: 420, w: 250, h: 25 },
    { x: window.innerWidth - 300, y: 200, w: 200, h: 25 }
];
const hazards = [
    { x: 200, y: 145 },
    { x: window.innerWidth / 2, y: window.innerHeight / 2 - 55 },
    { x: window.innerWidth - 250, y: 200 }
];

let coins = [];
for (let i = 0; i < 15; i++) {
    coins.push({
        x: Math.random() * (window.innerWidth - 100) + 50,
        y: Math.random() * (window.innerHeight - 150) + 50,
        collected: false
    });
}

// 🛡️ ສ້າງໄອເທັມໂລ່ປ້ອງກັນ3ອັນ
for (let i = 0; i < 3; i++) {
    shields.push({
        x: Math.random() * (window.innerWidth - 100) + 50,
        y: Math.random() * (window.innerHeight - 150) + 50,
        collected: false
    });
}

// ⚡ສ້າງໄອເທັມຄວາມໄວ3ອັນ
for (let i = 0; i < 3; i++) {
    speeds.push({
        x: Math.random() * (window.innerWidth - 100) + 50,
        y: Math.random() * (window.innerHeight - 150) + 50,
        collected: false
    });
}
function initShields() {
    shieldsContainer.innerHTML = '';
    shieldElements = [];
    shields.forEach((shieldData, i) => {
        const div = document.createElement('div');
        div.className = 'shield-item';
        div.id = 'shield-' + i;
        div.style.position = 'absolute';
        div.style.left = shieldData.x + 'px';
        div.style.top = shieldData.y + 'px';
        div.style.width = '26px';
        div.style.height = '26px';
        div.style.backgroundColor = '#3498db';
        div.style.borderRadius = '50%';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.style.color = '#fff';
        div.style.fontWeight = 'bold';
        div.style.fontSize = '14px';
        div.style.boxShadow = '0 0 10px rgba(52, 152, 219, 0.8)';
        div.innerText = 'S';
        shieldsContainer.appendChild(div);
        shieldElements.push(div);
    });
}

const speedsContainer = document.createElement('div');
speedsContainer.id = 'speeds';
document.body.appendChild(speedsContainer);

function initSpeeds() {
    speedsContainer.innerHTML = '';
    speedElements = [];
    speeds.forEach((speedData, i) => {
        const div = document.createElement('div');
        div.className = 'speed-item';
        div.id = 'speed-' + i;
        div.style.position = 'absolute';
        div.style.left = speedData.x + 'px';
        div.style.top = speedData.y + 'px';
        div.style.width = '26px';
        div.style.height = '26px';
        div.style.backgroundColor = '#f1c40f'; // สีเหลืองทอง
        div.style.borderRadius = '50%';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.style.color = '#000';
        div.style.fontWeight = 'bold';
        div.style.fontSize = '14px';
        div.style.boxShadow = '0 0 10px rgba(241, 196, 15, 0.8)';
        div.innerText = '⚡'; // ไอคอนสายฟ้า
        speedsContainer.appendChild(div);
        speedElements.push(div);
    });
}


function initMap() {
    platformsContainer.innerHTML = '';
    platforms.forEach(p => {
        const div = document.createElement('div');
        div.className = 'platform';
        div.style.left = p.x + 'px'; div.style.top = p.y + 'px';
        div.style.width = p.w + 'px'; div.style.height = p.h + 'px';
        platformsContainer.appendChild(div);
    });

    hazardsContainer.innerHTML = '';
    hazards.forEach(h => {
        const div = document.createElement('div');
        div.className = 'hazard';
        div.style.left = h.x + 'px'; div.style.top = h.y + 'px';
        hazardsContainer.appendChild(div);
    });

    coinsContainer.innerHTML = '';
    coins.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'coin';
        div.id = 'coin-' + i;
        div.style.left = c.x + 'px'; div.style.top = c.y + 'px';
        coinsContainer.appendChild(div);
    });

    initShields(); // 🛡️ 
    initSpeeds();  // ⚡ 
}

// ຟັງຊັ່ນອັບເດດຫົວໃຈ
function updateLivesDisplay() {
    const heartsDisplay = document.getElementById('hearts-display');
    if (heartsDisplay) {
        heartsDisplay.innerHTML = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
    }
}

function startTimer() {
    const timerText = document.getElementById('timer');
    timerInterval = setInterval(() => {
        if (!gameStarted || gameOver || winGame) return;

        timeLeft--;
        if (timerText) timerText.innerText = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            gameOver = true;
            menuScreen.style.display = 'flex';
            menuScreen.innerHTML = `
                <h1 style="font-size:36px; color:#e74c3c; margin-bottom:10px;">⏰ TIME'S UP!</h1>
                <p style="margin-bottom:15px; font-size:20px;">Score: ${score}</p>
                <button onclick="location.reload()" style="padding:14px 35px; font-size:20px; background:#e74c3c; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">[ TRY AGAIN ]</button>
            `;
        }
    }, 1000);
}
initMap();

// ໜ້າຈໍ Start / Game Over / Victory
const uiOverlay = document.createElement('div');
uiOverlay.innerHTML = `
    <div id="menu-screen" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.9); z-index:99; display:flex; flex-direction:column; justify-content:center; align-items:center; color:white; font-family:Arial; text-align:center;">
        <h1 style="font-size:36px; color:#f1c40f; margin-bottom:10px;">🎮Ghost Dash: Coin Quest</h1>
        <p style="margin-bottom:25px; font-size:18px; color:#ccc;">Collect all the coins and survive!</p>
        <button id="action-btn" style="padding:14px 35px; font-size:20px; background:#2ecc71; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold; box-shadow: 0 4px 15px rgba(46,204,113,0.4);">[ START GAME ]</button>
    </div>
`;
document.body.appendChild(uiOverlay);

const menuScreen = document.getElementById('menu-screen');
const actionBtn = document.getElementById('action-btn');

actionBtn.addEventListener('click', () => {
    if (!gameStarted && !gameOver && !winGame) {
        gameStarted = true;
        menuScreen.style.display = 'none';
        coins.forEach(c => {
            c.x = Math.random() * (window.innerWidth - 100) + 50;
            c.y = Math.random() * (window.innerHeight - 150) + 50;
        });
        shields.forEach(s => {
            s.x = Math.random() * (window.innerWidth - 100) + 50;
            s.y = Math.random() * (window.innerHeight - 150) + 50;
        });
        speeds.forEach(sp => {
            sp.x = Math.random() * (window.innerWidth - 100) + 50;
            sp.y = Math.random() * (window.innerHeight - 150) + 50;
        });
        initMap();
        startTimer();
        requestAnimationFrame(gameLoop);
    } else {
        location.reload();
    }
});

const keys = { up: false, down: false, left: false, right: false };

window.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.up = true;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.down = true;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.up = false;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.down = false;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = false;
});

function setupBtn(id, key) {
    const btn = document.getElementById(id);
    if(!btn) return;
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); keys[key] = true; });
    btn.addEventListener('mouseup', (e) => { e.preventDefault(); keys[key] = false; });
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
}
setupBtn('up', 'up'); setupBtn('down', 'down');
setupBtn('left', 'left'); setupBtn('right', 'right');

// ຟັງຊັ່ນການກວດການຕຳPlatform (Collision Detection)
function checkPlatformCollision(newX, newY, width = 45, height = 45) {
    return platforms.some(p => {
        return newX < p.x + p.w &&
               newX + width > p.x &&
               newY < p.y + p.h &&
               newY + height > p.y;
    });
}

// ພັງຊັ່ນລູບເກມ
function gameLoop() {
    if (!gameStarted || gameOver || winGame) return;
    maxX = window.innerWidth - 50;
    maxY = window.innerHeight - 50;
    if (isJumping) {
        jumpFrame++;
        let progress = jumpFrame / totalJumpFrames;
        let jumpHeight = Math.sin(progress * Math.PI) * 45; 
        let jumpScale = 1 + Math.sin(progress * Math.PI) * 0.4; 

        playerX += Math.cos(jumpAngle * Math.PI / 180) * 5.5;
        playerY += Math.sin(jumpAngle * Math.PI / 180) * 5.5;

        if (playerX < 0) playerX = 0;
        if (playerX > maxX) playerX = maxX;
        if (playerY < 0) playerY = 0;
        if (playerY > maxY) playerY = maxY;

        player.style.left = playerX + 'px';
        player.style.top = (playerY - jumpHeight) + 'px';
        player.style.transform = `rotate(${jumpAngle}deg) scale(${jumpScale})`;

        if (jumpFrame >= totalJumpFrames) isJumping = false;
    } else {
        let currentSpeed = playerSpeed;
        if (hasSpeedBoost) {
            currentSpeed *= 2; 
        }
        hazards.forEach(h => {
            let dist = Math.sqrt((playerX - h.x)**2 + (playerY - h.y)**2);
            if (dist < 35) {
                currentSpeed = 1.5;
                playerHp -= 0.4;
            }
        });

        let moveX = 0;
        let moveY = 0;
        let nextX = playerX;
        let nextY = playerY;

        if (keys.up && playerY > 0) { nextY -= currentSpeed; moveY = -1; }
        if (keys.down && playerY < maxY) { nextY += currentSpeed; moveY = 1; }
        if (keys.left && playerX > 0) { nextX -= currentSpeed; moveX = -1; }
        if (keys.right && playerX < maxX) { nextX += currentSpeed; moveX = 1; }

// ການຕຳ
if (!checkPlatformCollision(nextX, playerY)) playerX = nextX;
if (!checkPlatformCollision(playerX, nextY)) playerY = nextY;
        
        if (moveX !== 0 || moveY !== 0) {
            playerAngle = Math.atan2(moveY, moveX) * (180 / Math.PI);
        }

        player.style.left = playerX + 'px';
        player.style.top = playerY + 'px';
        player.style.transform = `rotate(${playerAngle}deg)`;
    }

    // AI ຊອມບີ້

    let dx = playerX - ghostX;
    let dy = playerY - ghostY;
    let distance = Math.sqrt(dx * dx + dy * dy);
    
    if (!isGhostDead && distance > 5) {
        ghostX += (dx / distance) * ghostSpeed;
        ghostY += (dy / distance) * ghostSpeed;
        let ghostAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        ghost.style.transform = `rotate(${ghostAngle}deg)`;
    }
    ghost.style.left = ghostX + 'px';
    ghost.style.top = ghostY + 'px';

   // 🛡️ ໂລ່ປົກປ້ອງ (Shield)
    shields.forEach((shield, i) => {
        if (!shield.collected && Math.sqrt((playerX - shield.x)**2 + (playerY - shield.y)**2) < 35) {
            shield.collected = true;
            hasShield = true;
            playSound('shield');
            const shieldEl = document.getElementById('shield-' + i);
            if (shieldEl) shieldEl.style.display = 'none';

            // ตั้งเวลาให้โล่หมดอายุใน 5 วินาที
            clearTimeout(shieldTimer);
            shieldTimer = setTimeout(() => {
                hasShield = false;
            }, 5000);
        }
    });

    // ⚡ ຄວາມໄວ
    speeds.forEach((speed, i) => {
        if (!speed.collected && Math.sqrt((playerX - speed.x)**2 + (playerY - speed.y)**2) < 35) {
            speed.collected = true;
            hasSpeedBoost = true;
            playSound('speed');
            const speedEl = document.getElementById('speed-' + i);
            if (speedEl) speedEl.style.display = 'none';

            // ຕັ້ງເວລາໃຫ້ຄວາມໄວໝົດອາຍຸພາຍໃນ5ວິນາທີ
            clearTimeout(speedTimer);
            speedTimer = setTimeout(() => {
            hasSpeedBoost = false;    
            }, 5000);
        }
    });
  

    // ເກັບຫຼຽນ ແລະ ລະບົບຊະນະ
    coins.forEach((c, i) => {
        if (!c.collected && Math.sqrt((playerX - c.x)**2 + (playerY - c.y)**2) < 35) {
            c.collected = true;
            score += 10;
            playSound('coin');
            showFloatingText(c.x, c.y, '+10');
            if (score > highScore) { highScore = score; localStorage.setItem('highScore', highScore); }
            scoreText.innerText = score;
            const coinEl = document.getElementById('coin-' + i);
            if(coinEl) coinEl.style.display = 'none';

            if (score % 30 === 0) {
                ghostSpeed += 0.4;
            }

            if (score >= 150) {
                if (currentLevel === 1) {
                    currentLevel = 2;
                    score = 0;
                    
                    gameStarted = false; 
                    
                    menuScreen.style.display = 'flex';
                    menuScreen.innerHTML = `
                        <h1 style="font-size:36px; color:#f1c40f; margin-bottom:10px;">🌟 LEVEL CLEAR!</h1>
                        <p style="margin-bottom:15px; font-size:18px; color:#fff;">Congratulations on advancing to Stage2</p>
                        <button id="next-level-btn" style="padding:14px 35px; font-size:20px; background:#2ecc71; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold; box-shadow: 0 4px 15px rgba(46,204,113,0.4);">[ Let's move on to Stage 2 ]</button>
                    `;
                    
                    document.getElementById('next-level-btn').addEventListener('click', () => {
                        menuScreen.style.display = 'none';
                        
                        timeLeft = 120;
                        const timerText = document.getElementById('timer');
                        if (timerText) timerText.innerText = timeLeft;

                        lives = 3;
                        playerHp = 100;
                        updateLivesDisplay(); 

                        ghostSpeed = 2.8; 
                        ghostX = window.innerWidth - 100; 
                        ghostY = window.innerHeight - 100; 

                        hazards.push({ x: window.innerWidth / 3, y: window.innerHeight / 3 });
                        hazards.push({ x: window.innerWidth - 200, y: window.innerHeight - 250 });
                        
                        coins = [];
                        for (let i = 0; i < 15; i++) {
                            coins.push({
                                x: Math.random() * (window.innerWidth - 100) + 50,
                                y: Math.random() * (window.innerHeight - 150) + 50,
                                collected: false
                            });
                        }

                        // 🛡️ ເກີດໂລ່ໃໝ່ໃນດ່ານ2
                        shields = [];
                        for (let i = 0; i < 3; i++) {
                            shields.push({
                                x: Math.random() * (window.innerWidth - 100) + 50,
                                y: Math.random() * (window.innerHeight - 150) + 50,
                                collected: false
                            });
                        }
                        // ⚡  item speed 2
                        speeds = [];
                        for (let i = 0; i < 3; i++) {
                            speeds.push({
                                x: Math.random() * (window.innerWidth - 100) + 50,
                                y: Math.random() * (window.innerHeight - 150) + 50,
                                collected: false
                            });
                        }
                        platforms = level2Platforms;
                        gameStarted = true;
                        initMap(); 
                        requestAnimationFrame(gameLoop); 
                    });
                } else {
                    winGame = true;
                    menuScreen.style.display = 'flex';
                    menuScreen.innerHTML = `
                        <h1 style="font-size:36px; color:#2ecc71; margin-bottom:10px;">🏆 YOU WIN!</h1>
                        <p style="margin-bottom:15px; font-size:20px;">Cleared All Levels!</p>
                        <button onclick="location.reload()" style="padding:14px 35px; font-size:20px; background:#f1c40f; color:#000; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">[ PLAY AGAIN ]</button>
                    `;
                    return;
                }
            }
        }
    });

    // ລະບົບພະລັງຊີວິດ ຫົວໃຈ ລະບົບປ້ອງກັນຜີ
    if (!isGhostDead && distance < 35) {
        if (hasShield) {
            // 🛡️ ຖ້າມີໂລ່ຜີຊົນບໍ່ເປັນຫຍັງ
            ghostX += (playerX - ghostX) * 0.1;
            ghostY += (playerY - ghostY) * 0.1;
        } else {
            playerHp -= 0.8; 
            
            if (playerHp <= 0 && lives > 0) {
                lives--;            
                updateLivesDisplay(); 
                
                if (lives > 0) {
                    playerHp = 100;   
                    playerX = window.innerWidth / 2; 
                    playerY = window.innerHeight / 2;
                    ghostX = 20; 
                    ghostY = 20;     
                } else {
                    playerHp = 0;
                    gameOver = true;
                    menuScreen.style.display = 'flex';
                    menuScreen.innerHTML = `
                        <h1 style="font-size:36px; color:#e74c3c; margin-bottom:10px;">💀 GAME OVER</h1>
                        <p style="margin-bottom:15px; font-size:20px;">Score: ${score}</p>
                        <button onclick="location.reload()" style="padding:14px 35px; font-size:20px; background:#e74c3c; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">[ TRY AGAIN ]</button>
                    `;
                    return;
                }
            }
        }
    }
    // ການເຄື່ອນທີ່ຂອງລູກປືນ🔫
    if (bulletsContainer) bulletsContainer.innerHTML = '';
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        // ລູກປືນຍິງ Ghost
        if (!isGhostDead && Math.sqrt((b.x - ghostX)**2 + (b.y - ghostY)**2) < 30) {
            ghostHp -= 25; // ยิง 4 นัดผีตาย (-25 HP)
            playSound('hit');
            if (ghostHpText) ghostHpText.innerText = Math.max(0, ghostHp);
            bullets.splice(i, 1);

            if (ghostHp <= 0) {
                isGhostDead = true;
                ghost.style.display = 'none';
                ghostX = -500; 
                ghostY = -500;
                setTimeout(() => {
                    isGhostDead = false;
                    ghostHp = 100;
                    if (ghostHpText) ghostHpText.innerText = ghostHp;
                    ghostX = 20;
                    ghostY = 20;
                    ghost.style.display = 'block';
                }, 5000); // ເກີດໃໝ່ໃນ 5 ວິນາທີ
            }
            continue;
        }

        // กระสุนหลุดนอกจอ
        if (b.x < 0 || b.x > window.innerWidth || b.y < 0 || b.y > window.innerHeight) {
            bullets.splice(i, 1);
            continue;
        }

        const bDiv = document.createElement('div');
        bDiv.className = 'bullet';
        bDiv.style.left = b.x + 'px';
        bDiv.style.top = b.y + 'px';
        bDiv.style.transform = `rotate(${b.angle}deg)`;
        if (bulletsContainer) bulletsContainer.appendChild(bDiv);
    }
    hpBar.style.width = playerHp + '%';
    requestAnimationFrame(gameLoop);
}