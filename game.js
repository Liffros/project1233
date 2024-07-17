const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Установка высоты холста в соответствии с высотой окна
function resizeCanvas() {
    canvas.height = window.innerHeight;
}

// Изменение высоты холста при загрузке страницы и изменении размера окна
window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

const player = {
    x: canvas.width / 2 - 50,
    y: canvas.height - 110,
    width: 100,
    height: 100,
    speed: 5,
    dx: 0,
    image: new Image(),
    animation: null,
    frameWidth: 64,
    frameHeight: 64,
    frameSpeed: 50, 
    currentFrame: 0,
    frameCount: 8
};
player.image.src = 'images/player.png';

// Обновление начальной позиции игрока при изменении высоты окна
function updatePlayerPosition() {
    player.y = canvas.height - player.height - 10;
    if (leftPressed) {
        player.x -= player.speed;
    } else if (rightPressed) {
        player.x += player.speed;
    }

    // Ограничение игрока в пределах холста
    if (player.x < 0) {
        player.x = 0;
    } else if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }
}

// Обновление позиции игрока при изменении размеров окна
window.addEventListener('resize', updatePlayerPosition);
window.addEventListener('load', updatePlayerPosition);

// Игровые объекты
const bullets = [];
const enemies = [];

// Загрузка спрайт-листа пули с тремя кадрами (размеры 32x32)
const bulletSprite = new Image();
bulletSprite.src = 'images/bullet_sprites_3frames.png';

// Создание анимации для пули
const bulletAnimation = createAnimation(bulletSprite, 32, 32, 4, 3);

// Загрузка спрайт-листа врагов и анимации разрушения для каждого типа
const enemySprite1 = new Image();
enemySprite1.src = 'images/enemy.png';

const destructionSprite1 = new Image();
destructionSprite1.src = 'images/destruction.png';

const enemySprite2 = new Image();
enemySprite2.src = 'images/enemy2.png';

const destructionSprite2 = new Image();
destructionSprite2.src = 'images/destruction2.png';

const shadowSprite = new Image();
shadowSprite.src = 'images/shadows.png';


// Функция для создания анимации
function createAnimation(image, frameWidth, frameHeight, frameSpeed, endFrame) {
    let animation = {
        image: image,
        frameWidth: frameWidth,
        frameHeight: frameHeight,
        frameSpeed: frameSpeed,
        endFrame: endFrame,
        currentFrame: 0,
        counter: 0
    };

    return animation;
}

const shadowAnimation = createAnimation(shadowSprite, 640, 360, 4, 9);

// Функция для обновления анимации
function updateAnimation(animation) {
    animation.counter += 1;

    if (animation.counter >= animation.frameSpeed) {
        animation.counter = 0;
        animation.currentFrame = (animation.currentFrame + 1) % animation.endFrame;
    }
}

// Функция для отрисовки анимации
function drawAnimation(ctx, animation, x, y, width, height) {
    let frameX = animation.currentFrame * animation.frameWidth;
    ctx.drawImage(
        animation.image,
        frameX, 0, animation.frameWidth, animation.frameHeight,
        x, y, width, height
    );
}

// Функция для загрузки анимации двигателя корабля игрока
function loadPlayerAnimation() {
    player.animation = new Image();
    player.animation.src = 'images/player_engine_animation.png';
}

// Функция для обновления анимации игрока
function updatePlayerAnimation() {
    player.currentFrame = (player.currentFrame + 1) % player.frameCount;
}

// Функция для отрисовки анимации игрока
function drawPlayerAnimation() {
    ctx.drawImage(
        player.animation,
        player.currentFrame * player.frameWidth, 0, player.frameWidth, player.frameHeight,
        player.x, player.y + player.height / 3, player.width, player.height / 2
    );
}

const shootSound = new Audio('sounds/shoot.wav');
shootSound.volume = 0.2;

// Функция для создания пули
function createBullet() {
    bullets.push({
        x: player.x + player.width / 2 - 32,
        y: player.y - 64,
        width: 64,
        height: 64,
        dy: -5,
        animation: createAnimation(bulletSprite, 32, 32, 4, 3)
    });
    shootSound.currentTime = 0; // Сброс звука для повторного воспроизведения
    shootSound.play(); 
}

// Функция для отрисовки пуль
function drawBullets() {
    bullets.forEach(bullet => {
        drawAnimation(ctx, bullet.animation, bullet.x, bullet.y, bullet.width, bullet.height);
        updateAnimation(bullet.animation);
    });
}

const hitSound = new Audio('sounds/hit.wav');

// Функция для обновления позиции пуль с проверкой столкновений
function updateBullets() {
    bullets.forEach((bullet, bulletIndex) => {
        bullet.y += bullet.dy;

        if (bullet.y + bullet.height < 0) {
            bullets.splice(bulletIndex, 1);
            return;
        }

        // Проверка столкновений с врагами
        enemies.forEach((enemy, enemyIndex) => {
            if (isCollision(bullet, enemy)) {
                bullets.splice(bulletIndex, 1);
                enemy.hits += 1;
                enemy.shake = true;
                enemy.shakeDuration = 20; // Длительность тряски
                enemy.shakeOffset = 5; // Сила тряски
                hitSound.currentTime = 0; // Сброс звука для повторного воспроизведения
                hitSound.play().catch(e => console.error('Error playing hit sound', e));

                // Запуск анимации разрушения после достижения максимального количества попаданий
                if (enemy.hits >= enemy.maxHits && !enemy.destroyed) {
                    score += 10; 
                    enemy.destroyed = true;
                    enemy.destructionAnimation.currentFrame = 0; // Сброс анимации к началу
                }
                return;
            }
        });
    });
}

let enemySpeed = 2; // Начальная скорость врагов
let enemySpawnInterval = 2000; // Интервал появления врагов по умолчанию (в миллисекундах)
let currentDifficultyLevel = 1; // Текущий уровень сложности

function increaseDifficulty() {
    // Увеличение скорости врагов
    enemySpeed += 0.5;

    // Увеличение частоты появления врагов
    if (enemySpawnInterval > 500) { 
        enemySpawnInterval -= 200; 
    }

    // Увеличение текущего уровня сложности
    currentDifficultyLevel++;
}

// Увеличение сложности при достижении определенного счета
function updateGameDifficulty() {
    if (score >= currentDifficultyLevel * 100) {
        increaseDifficulty();
    }
}

// Функция для создания врага
function createEnemy() {
    const isType2 = Math.random() < 0.6; // 60% вероятность появления врага второго типа
    const enemyWidth = isType2 ? 64 : 80; // Хитбокс врагов второго типа
    const enemyHeight = isType2 ? 64 : 80; // Хитбокс врагов второго типа
    const renderWidth = isType2 ? 100 : 150; // Размеры спрайтов для отрисовки
    const renderHeight = isType2 ? 100 : 150; // Размеры спрайтов для отрисовки
    const enemyX = Math.random() * (canvas.width - renderWidth);
    const enemyY = -renderHeight;
    const enemySpeed = isType2 ? 3 : 2; // Скорость врагов в зависимости от типа

    const enemy = {
        x: enemyX,
        y: enemyY,
        width: enemyWidth, 
        height: enemyHeight,
        renderWidth: renderWidth,
        renderHeight: renderHeight, 
        dy: enemySpeed,
        image: isType2 ? enemySprite2 : enemySprite1, 
        shake: false,
        shakeDuration: 0,
        shakeOffset: 0,
        hits: 0, // Счетчик попаданий
        destroyed: false, // Флаг для проверки, разрушен ли враг
        destructionAnimation: createAnimation(
            isType2 ? destructionSprite2 : destructionSprite1,
            isType2 ? 64 : 128, isType2 ? 64 : 128, 4, isType2 ? 16 : 18 // Анимация разрушения в зависимости от типа
        ),
        maxHits: isType2 ? 4 : 8 // Враг второго типа исчезает после двух попаданий, первого - после четырех
    };
    enemies.push(enemy);
}

// Генерация врагов через определенные интервалы времени
setInterval(createEnemy, enemySpawnInterval);

// Обработчики событий клавиатуры
let spacePressed = false;
let leftPressed = false;
let rightPressed = false;

const pressedKeys = new Set();

// Обработчики событий для нажатия и отпускания клавиш
document.addEventListener('keydown', function(event) {
    switch(event.code) {
        case 'ArrowLeft':
        case 'KeyA':
            leftPressed = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            rightPressed = true;
            break;
        case 'Space':
            if (!spacePressed) {
                spacePressed = true;
                createBullet();
            }
            break;
    }

    updatePlayerDirection();
});

document.addEventListener('keyup', function(event) {
    switch(event.code) {
        case 'ArrowLeft':
        case 'KeyA':
            leftPressed = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            rightPressed = false;
            break;
        case 'Space':
            spacePressed = false;
            break;
    }

    updatePlayerDirection();
});

document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);

function keyDownHandler(event) {
    if (event.key === 'ArrowLeft' || event.key === 'Left') {
        leftPressed = true;
    } else if (event.key === 'ArrowRight' || event.key === 'Right') {
        rightPressed = true;
    } else if (event.key === ' ') {
        spacePressed = true;
        createBullet();
    }

    updatePlayerDirection();
}

function keyUpHandler(event) {
    if (event.key === 'ArrowLeft' || event.key === 'Left') {
        leftPressed = false;
    } else if (event.key === 'ArrowRight' || event.key === 'Right') {
        rightPressed = false;
    } else if (event.key === ' ') {
        spacePressed = false;
    }

    updatePlayerDirection();
}

function updatePlayerDirection() {
    if (leftPressed) {
        player.dx = -player.speed;
    } else if (rightPressed) {
        player.dx = player.speed;
    } else {
        player.dx = 0;
    }
}

// Обработчики событий для нажатия и отпускания клавиш
document.addEventListener('keydown', (event) => {
    switch(event.code) {
        case 'ArrowLeft':
        case 'KeyA':
            player.dx = -player.speed;
            break;
        case 'ArrowRight':
        case 'KeyD':
            player.dx = player.speed;
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch(event.code) {
        case 'ArrowLeft':
        case 'KeyA':
            if (player.dx === -player.speed) player.dx = 0;
            break;
        case 'ArrowRight':
        case 'KeyD':
            if (player.dx === player.speed) player.dx = 0;
            break;
    }
});


// Функция для отрисовки игрока
function drawPlayer() {
    ctx.drawImage(player.image, player.x, player.y, player.width, player.height);
}

// Функция для отрисовки врагов
function drawEnemies() {
    enemies.forEach((enemy, enemyIndex) => {
        if (enemy.shake) {
            // Применение тряски
            enemy.x += (Math.random() - 0.5) * enemy.shakeOffset;
            enemy.y += (Math.random() - 0.5) * enemy.shakeOffset;
            enemy.shakeDuration--;

            if (enemy.shakeDuration <= 0) {
                enemy.shake = false;
            }
        }

        if (enemy.destroyed) {
            // Отображение анимации разрушения
            drawAnimation(ctx, enemy.destructionAnimation, enemy.x, enemy.y, enemy.renderWidth, enemy.renderHeight);
            updateAnimation(enemy.destructionAnimation);

            // Удаление врага после завершения анимации разрушения
            if (enemy.destructionAnimation.currentFrame === enemy.destructionAnimation.endFrame - 1) {
                enemies.splice(enemyIndex, 1);
            }
        } else {
            // Отображение врага
            ctx.drawImage(enemy.image, enemy.x, enemy.y, enemy.renderWidth, enemy.renderHeight);
        }
    });
}



// Функция для обновления позиции врагов
function updateEnemies() {
    enemies.forEach((enemy, enemyIndex) => {
        enemy.y += enemy.dy;
        // Если враг выходит за нижний край экрана, игрок теряет жизнь
        if (enemy.y > canvas.height) {
            player.lives--;
            enemies.splice(enemyIndex, 1);
        }
    });
}

// Функция для проверки столкновения двух объектов
function isCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

const backgroundAnimation = new Image();
backgroundAnimation.src = 'images/background_animation.png';

const starSprite = new Image();
starSprite.src = 'images/stars.png';

const starAnimation = createAnimation(starSprite, 640, 360, 10, 9);

function drawBackground() {
    ctx.drawImage(backgroundAnimation, 0, 0, canvas.width, canvas.height);
    drawAnimation(ctx, shadowAnimation, 0, 0, canvas.width, canvas.height);
    const frameWidth = starAnimation.frameWidth;
    const frameHeight = starAnimation.frameHeight;
    const canvasRatio = canvas.width / canvas.height;
    const frameRatio = frameWidth / frameHeight;

    let scaledWidth, scaledHeight;
    if (canvasRatio > frameRatio) {
        scaledWidth = canvas.width;
        scaledHeight = canvas.width / frameRatio;
    } else {
        scaledHeight = canvas.height;
        scaledWidth = canvas.height * frameRatio;
    }

    const offsetX = (canvas.width - scaledWidth) / 2;
    const offsetY = (canvas.height - scaledHeight) / 2;

    drawAnimation(ctx, starAnimation, offsetX-200, offsetY, scaledWidth, scaledHeight);
    updateAnimation(shadowAnimation);
    updateAnimation(starAnimation);
}

let score = 0;
let gameOver = false;
let gameStarted = false;

function drawScore() {
    ctx.font = '30px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText('Score: ' + score, 10, 30);
}

const startMessage = document.querySelector('.start-message');

        // Обработчик нажатия клавиши Enter
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !gameStarted) { // Проверяем, что игра ещё не запущена
                gameStarted = true; // Устанавливаем флаг, что игра началась
                startMessage.style.display = 'none'; // Скрываем сообщение
                startGame();
            }
        });

function startGame() {
    score = 0;
    player.lives = 3; 
    gameOver = false;
    enemies.length = 0;
    bullets.length = 0;
    player.x = canvas.width / 2 - player.width / 2;
    currentDifficultyLevel = 1; // Сброс уровня сложности
    enemySpeed = 2; // Сброс скорости врагов
    enemySpawnInterval = 2000; // Сброс интервала появления врагов
    playMusic(); // Начало воспроизведения музыки
    gameLoop(); 
}

function endGame() {
    gameOver = true;
    gameStarted = false;
    stopMusic();
    ctx.font = '60px Arial';
    ctx.fillStyle = 'red';
    ctx.fillText('Игра окончена', canvas.width / 2 - 150, canvas.height / 2);
    ctx.font = '30px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText('Итоговый счёт: ' + score, canvas.width / 2 - 100, canvas.height / 2 + 50);
    ctx.fillText('Нажмите Enter для новой игры', canvas.width / 2 - 150, canvas.height / 2 + 100);
}

// Функция для отрисовки жизней игрока
function drawLives() {
    ctx.font = '30px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText('Lives: ' + player.lives, canvas.width - 150, 30);
}

// Функция для проверки столкновения игрока с врагами
function checkPlayerCollision() {
    enemies.forEach((enemy, enemyIndex) => {
        if (isCollision(player, enemy)) {
            player.lives--; 
            enemies.splice(enemyIndex, 1);
        }
    });

    // Проверка, если у игрока закончились жизни
    if (player.lives <= 0) {
        gameOver = true;
    }
}

// Функция для обновления игры
function updateGame() {
    if (!gameOver) {
        updateBullets();
        updateEnemies();
        updatePlayerPosition();
        checkPlayerCollision(); 
    }
}

function drawGame() {
    drawBackground();
    drawBullets();
    drawEnemies();
    drawPlayer();
    drawPlayerAnimation();
    drawScore();
    drawLives(); 
}

function gameLoop() {
    if (!gameOver) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateGame();
        updateGameDifficulty();
        drawGame();
        requestAnimationFrame(gameLoop);
    } else {
        endGame();
    }
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !gameStarted) {
        gameStarted = true;
        startMessage.style.display = 'none'; 
        startGame(); 
    }
});

// Обработчик нажатия клавиши Enter для рестарта игры после завершения
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && gameOver) {
        startGame();
    }
});

// Запуск игры при загрузке страницы
window.addEventListener('load', () => {

});

const backgroundMusic = document.getElementById('backgroundMusic');
backgroundMusic.volume = 0.25;

function playMusic() {
    backgroundMusic.play();
}

// Функция для остановки воспроизведения музыки
function stopMusic() {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0; 
}

// Функция для переключения музыки
function toggleMusic() {
    if (backgroundMusic.paused) {
        playMusic();
    } else {
        stopMusic();
    }
}

// Начало воспроизведения музыки при старте игры
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !gameStarted) {
        gameStarted = true;
        startMessage.style.display = 'none';
        playMusic(); 
        startGame();
    }
});

// Загрузка анимации двигателя корабля игрока
loadPlayerAnimation();
