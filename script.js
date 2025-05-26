// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const darkModeToggle = document.getElementById('darkModeToggle');
const snakeStyleSelect = document.getElementById('snakeStyle');
const foodStyleSelect = document.getElementById('foodStyle');
const gameModeSelect = document.getElementById('gameMode');
const timerContainer = document.getElementById('timerContainer');
const timerElement = document.getElementById('timer');

const gridSize = 20;
const gameSpeed = 100;

let snake = [];
let food = {};
let obstacles = [];
let direction = 'right';
let nextDirection = 'right';
let gameRunning = false;
let gameLoop;
let timeAttackTimer;
let timeLeft = 60;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let isDarkMode = localStorage.getItem('snakeDarkMode') === 'true';
let snakeStyle = localStorage.getItem('snakeStyle') || 'gradient';
let foodStyle = localStorage.getItem('foodStyle') || 'apple';
let gameMode = localStorage.getItem('gameMode') || 'classic';
let specialFood = null;
let specialFoodTimer = null;

// Initial setup
function init() {
    // Set high score from local storage
    highScoreElement.textContent = highScore;
    
    // Set theme from local storage
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }
    
    // Set selected styles from local storage
    snakeStyleSelect.value = snakeStyle;
    foodStyleSelect.value = foodStyle;
    gameModeSelect.value = gameMode;
    
    // Update UI based on game mode
    updateGameModeUI();
    
    // Add event listeners
    document.addEventListener('keydown', handleKeyPress);
    startBtn.addEventListener('click', startGame);
    resetBtn.addEventListener('click', resetGame);
    darkModeToggle.addEventListener('change', toggleDarkMode);
    snakeStyleSelect.addEventListener('change', updateSnakeStyle);
    foodStyleSelect.addEventListener('change', updateFoodStyle);
    gameModeSelect.addEventListener('change', updateGameMode);
    
    // Draw initial state
    drawGame();
}

// Toggle dark mode
function toggleDarkMode() {
    isDarkMode = darkModeToggle.checked;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('snakeDarkMode', isDarkMode);
}

// Update snake style
function updateSnakeStyle() {
    // Jika game sedang berjalan, jangan izinkan perubahan
    if (gameRunning) {
        // Kembalikan ke nilai sebelumnya
        snakeStyleSelect.value = snakeStyle;
        return;
    }
    
    snakeStyle = snakeStyleSelect.value;
    localStorage.setItem('snakeStyle', snakeStyle);
    drawGame(); // Langsung gambar ulang agar perubahan terlihat
}

// Update food style
function updateFoodStyle() {
    // Jika game sedang berjalan, jangan izinkan perubahan
    if (gameRunning) {
        // Kembalikan ke nilai sebelumnya
        foodStyleSelect.value = foodStyle;
        return;
    }
    
    foodStyle = foodStyleSelect.value;
    localStorage.setItem('foodStyle', foodStyle);
    drawGame(); // Langsung gambar ulang agar perubahan terlihat
}

// Update game mode
function updateGameMode() {
    // Jika game sedang berjalan, jangan izinkan perubahan
    if (gameRunning) {
        // Kembalikan ke nilai sebelumnya
        gameModeSelect.value = gameMode;
        return;
    }
    
    gameMode = gameModeSelect.value;
    localStorage.setItem('gameMode', gameMode);
    
    // Update UI for different game modes
    updateGameModeUI();
    
    // Reset game state for the new mode
    resetGame(); // Use resetGame to ensure complete reset, including score
    drawGame();
}

// Update UI based on selected game mode
function updateGameModeUI() {
    // Show/hide timer based on game mode
    timerContainer.style.display = (gameMode === 'timeAttack') ? 'block' : 'none';
    
    // Update instructions based on game mode
    const instructionsElement = document.querySelector('.instructions');
    let instructionsHTML = '<h3>How to Play</h3>';
    
    switch(gameMode) {
        case 'classic':
            instructionsHTML += `
                <p>Use the arrow keys or WASD to move the snake.</p>
                <p>Eat the food to grow and earn points.</p>
                <p>Avoid hitting the walls or yourself!</p>
            `;
            break;
        
        case 'noWalls':
            instructionsHTML += `
                <p>Use the arrow keys or WASD to move the snake.</p>
                <p>Eat the food to grow and earn points.</p>
                <p>You can pass through walls and appear on the opposite side!</p>
                <p>Avoid hitting yourself!</p>
            `;
            break;
            
        case 'obstacles':
            instructionsHTML += `
                <p>Use the arrow keys or WASD to move the snake.</p>
                <p>Eat the food to grow and earn points.</p>
                <p>Watch out for obstacles that appear!</p>
                <p>Avoid hitting the walls, obstacles, or yourself!</p>
            `;
            break;
            
        case 'timeAttack':
            instructionsHTML += `
                <p>Use the arrow keys or WASD to move the snake.</p>
                <p>Eat the food to grow and earn points.</p>
                <p>You have 60 seconds to score as high as possible!</p>
                <p>Eating food adds 5 seconds to your time.</p>
                <p>Avoid hitting the walls or yourself!</p>
            `;
            break;
            
        case 'growShrink':
            instructionsHTML += `
                <p>Use the arrow keys or WASD to move the snake.</p>
                <p>Red apples make you grow, blue orbs make you shrink!</p>
                <p>Special golden foods appear occasionally for bonus points!</p>
                <p>Avoid hitting the walls or yourself!</p>
            `;
            break;
    }
    
    instructionsElement.innerHTML = instructionsHTML;
}

// Start the game
function startGame() {
    if (gameRunning) {
        // If game is running, pause it
        pauseGame();
        return;
    }
    
    // If game is not running (either paused or fresh start)
    if (!gameRunning) {
        // If score is 0, it's a fresh start - reset the game state
        if (score === 0) {
            resetGameState();
            createFood(); // Ensure food is created for new game
        }
        // Otherwise, it's resuming from pause - don't recreate food or reset snake
        
        gameRunning = true;
        startBtn.textContent = 'Pause';
        
        // Start game loop
        gameLoop = setInterval(updateGame, gameSpeed);
        
        // Special handling for time attack mode
        if (gameMode === 'timeAttack') {
            // Only reset timer if game is a fresh start
            if (score === 0) {
                timeLeft = 60;
            }
            timerElement.textContent = timeLeft;
            timeAttackTimer = setInterval(() => {
                timeLeft--;
                timerElement.textContent = timeLeft;
                
                if (timeLeft <= 0) {
                    gameOver('Time\'s up!');
                }
            }, 1000);
        }
        
        // For grow & shrink mode, manage special food timer
        if (gameMode === 'growShrink') {
            if (score === 0 || !specialFoodTimer) {
                scheduleSpecialFood();
            }
        }
    }
}

// Pause the game
function pauseGame() {
    if (!gameRunning) return;
    
    // Save game state by clearing intervals but not changing anything else
    clearInterval(gameLoop);
    
    if (timeAttackTimer) {
        clearInterval(timeAttackTimer);
    }
    
    if (specialFoodTimer) {
        clearTimeout(specialFoodTimer);
    }
    
    gameRunning = false;
    startBtn.textContent = 'Resume';
    
    // Redraw the current game state
    drawGame();
}

// Reset game to initial state
function resetGame() {
    clearInterval(gameLoop);
    if (timeAttackTimer) {
        clearInterval(timeAttackTimer);
        timeAttackTimer = null;
    }
    if (specialFoodTimer) {
        clearTimeout(specialFoodTimer);
        specialFoodTimer = null;
    }
    
    resetGameState();
    drawGame();
    startBtn.textContent = 'Start Game';
    gameRunning = false;
    score = 0;
    scoreElement.textContent = score;
}

// Reset the game state without starting
function resetGameState() {
    // Create initial snake
    snake = [
        {x: 5 * gridSize, y: 10 * gridSize},
        {x: 4 * gridSize, y: 10 * gridSize},
        {x: 3 * gridSize, y: 10 * gridSize}
    ];
    
    // Reset food completely to ensure new creation
    food = {};
    
    // Create initial food
    createFood();
    
    // Clear special food
    specialFood = null;
    
    // Clear obstacles for obstacle mode
    obstacles = [];
    
    // Create obstacles if in obstacle mode
    if (gameMode === 'obstacles') {
        createObstacles();
    }
    
    // Reset direction and score
    direction = 'right';
    nextDirection = 'right';
    
    // Reset timer for time attack mode
    if (gameMode === 'timeAttack') {
        timeLeft = 60;
        timerElement.textContent = timeLeft;
    }
}

// Create obstacles for obstacle mode
function createObstacles() {
    const numObstacles = 8 + Math.floor(Math.random() * 5); // 8-12 obstacles
    
    for (let i = 0; i < numObstacles; i++) {
        let obstaclePosition;
        let positionIsValid = false;
        
        // Find a valid position for the obstacle
        while (!positionIsValid) {
            obstaclePosition = {
                x: Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize,
                y: Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize
            };
            
            // Check if position is not too close to the snake's starting position
            const distanceFromSnakeHead = Math.abs(obstaclePosition.x - snake[0].x) + 
                                        Math.abs(obstaclePosition.y - snake[0].y);
            
            if (distanceFromSnakeHead < 5 * gridSize) {
                continue; // Too close to snake, try again
            }
            
            // Check if position doesn't overlap with snake
            positionIsValid = true;
            for (let segment of snake) {
                if (segment.x === obstaclePosition.x && segment.y === obstaclePosition.y) {
                    positionIsValid = false;
                    break;
                }
            }
            
            // Check if position doesn't overlap with food
            if (food.x === obstaclePosition.x && food.y === obstaclePosition.y) {
                positionIsValid = false;
            }
            
            // Check if position doesn't overlap with other obstacles
            for (let obstacle of obstacles) {
                if (obstacle.x === obstaclePosition.x && obstacle.y === obstaclePosition.y) {
                    positionIsValid = false;
                    break;
                }
            }
        }
        
        obstacles.push(obstaclePosition);
    }
}

// Schedule the appearance of a special food (for grow & shrink mode)
function scheduleSpecialFood() {
    // Clear any existing timer
    if (specialFoodTimer) {
        clearTimeout(specialFoodTimer);
    }
    
    // Set a random time for the special food to appear (10-20 seconds)
    const randomTime = 10000 + Math.random() * 10000;
    
    specialFoodTimer = setTimeout(() => {
        // Create special food if game is still running
        if (gameRunning) {
            createSpecialFood();
            
            // Schedule its disappearance after 5 seconds
            specialFoodTimer = setTimeout(() => {
                specialFood = null;
                // Schedule next special food
                if (gameRunning) {
                    scheduleSpecialFood();
                }
            }, 5000);
        }
    }, randomTime);
}

// Create special food for grow & shrink mode
function createSpecialFood() {
    let specialFoodPosition;
    let positionIsValid = false;
    
    while (!positionIsValid) {
        specialFoodPosition = {
            x: Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize,
            y: Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize
        };
        
        positionIsValid = true;
        
        // Check if position overlaps with snake
        for (let segment of snake) {
            if (segment.x === specialFoodPosition.x && segment.y === specialFoodPosition.y) {
                positionIsValid = false;
                break;
            }
        }
        
        // Check if position overlaps with regular food
        if (food.x === specialFoodPosition.x && food.y === specialFoodPosition.y) {
            positionIsValid = false;
        }
        
        // Check if position overlaps with obstacles
        for (let obstacle of obstacles) {
            if (obstacle.x === specialFoodPosition.x && obstacle.y === specialFoodPosition.y) {
                positionIsValid = false;
                break;
            }
        }
    }
    
    specialFood = specialFoodPosition;
}

// Create new food at random position
function createFood() {
    // Generate random position that's not occupied by the snake
    let foodPosition;
    let positionIsValid = false;
    
    while (!positionIsValid) {
        foodPosition = {
            x: Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize,
            y: Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize
        };
        
        positionIsValid = true;
        
        // Check if position overlaps with snake
        for (let segment of snake) {
            if (segment.x === foodPosition.x && segment.y === foodPosition.y) {
                positionIsValid = false;
                break;
            }
        }
        
        // Check if position overlaps with obstacles
        for (let obstacle of obstacles) {
            if (obstacle.x === foodPosition.x && obstacle.y === foodPosition.y) {
                positionIsValid = false;
                break;
            }
        }
        
        // Check if position overlaps with special food
        if (specialFood && specialFood.x === foodPosition.x && specialFood.y === foodPosition.y) {
            positionIsValid = false;
        }
    }
    
    // For Grow & Shrink mode, randomly assign a shrink food
    if (gameMode === 'growShrink') {
        foodPosition.type = Math.random() < 0.3 ? 'shrink' : 'grow';
    } else {
        foodPosition.type = 'regular';
    }
    
    food = foodPosition;
}

// Handle keyboard input
function handleKeyPress(event) {
    const key = event.key.toLowerCase();
    
    switch (key) {
        case 'arrowup':
        case 'w':
            if (direction !== 'down') nextDirection = 'up';
            break;
        case 'arrowdown':
        case 's':
            if (direction !== 'up') nextDirection = 'down';
            break;
        case 'arrowleft':
        case 'a':
            if (direction !== 'right') nextDirection = 'left';
            break;
        case 'arrowright':
        case 'd':
            if (direction !== 'left') nextDirection = 'right';
            break;        case ' ':
            // Space bar to start/pause
            if (gameRunning) {
                pauseGame();
            } else {
                startGame();
            }
            break;
    }
}

// Update game state
function updateGame() {
    // Update direction
    direction = nextDirection;
    
    // Calculate new head position
    const head = {x: snake[0].x, y: snake[0].y};
    
    switch (direction) {
        case 'up':
            head.y -= gridSize;
            break;
        case 'down':
            head.y += gridSize;
            break;
        case 'left':
            head.x -= gridSize;
            break;
        case 'right':
            head.x += gridSize;
            break;
    }
    
    // Handle "No Walls" mode - wrap around edges
    if (gameMode === 'noWalls') {
        if (head.x < 0) head.x = canvas.width - gridSize;
        if (head.y < 0) head.y = canvas.height - gridSize;
        if (head.x >= canvas.width) head.x = 0;
        if (head.y >= canvas.height) head.y = 0;
    }
    // Check for collision with walls in other modes
    else if (
        head.x < 0 || 
        head.y < 0 || 
        head.x >= canvas.width || 
        head.y >= canvas.height
    ) {
        gameOver();
        return;
    }
    
    // Check for collision with self
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }
    
    // Check for collision with obstacles in obstacle mode
    if (gameMode === 'obstacles') {
        for (let obstacle of obstacles) {
            if (head.x === obstacle.x && head.y === obstacle.y) {
                gameOver();
                return;
            }
        }
    }
    
    // Add new head
    snake.unshift(head);
    
    // Check if snake eats special food (in grow & shrink mode)
    let ateSpecialFood = false;
    if (gameMode === 'growShrink' && specialFood && head.x === specialFood.x && head.y === specialFood.y) {
        // Special food gives extra points
        score += 30;
        scoreElement.textContent = score;
        
        // Update high score if needed
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore);
            highScoreElement.textContent = highScore;
        }
        
        // Add extra length (3 segments)
        for (let i = 0; i < 3; i++) {
            snake.push({...snake[snake.length - 1]});
        }
        
        specialFood = null;
        scheduleSpecialFood();
        
        ateSpecialFood = true;
    }
    
    // Check if snake eats regular food
    if (!ateSpecialFood && head.x === food.x && head.y === food.y) {
        // Handle specific food behavior for Grow & Shrink mode
        if (gameMode === 'growShrink') {
            if (food.type === 'grow') {
                // Grow food adds length
                score += 10;
            } else if (food.type === 'shrink') {
                // Shrink food reduces length but gives more points
                score += 20;
                
                // Remove extra segments (but never below minimum length of 3)
                const segmentsToRemove = Math.min(2, snake.length - 3);
                if (segmentsToRemove > 0) {
                    snake = snake.slice(0, snake.length - segmentsToRemove);
                }
            }
        } else {
            // Default behavior for other modes
            score += 10;
        }
        
        scoreElement.textContent = score;
        
        // Update high score if needed
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore);
            highScoreElement.textContent = highScore;
        }
        
        // Add time in Time Attack mode
        if (gameMode === 'timeAttack') {
            timeLeft += 5; // Add 5 seconds per food
            timerElement.textContent = timeLeft;
        }
        
        // Create new food
        createFood();
        
        // Add a new obstacle in obstacles mode (occasionally)
        if (gameMode === 'obstacles' && score > 0 && score % 30 === 0) {
            addNewObstacle();
        }
        
        // Speed up the game slightly after each food
        clearInterval(gameLoop);
        const newSpeed = Math.max(gameSpeed - Math.floor(score / 50) * 5, 50);
        gameLoop = setInterval(updateGame, newSpeed);
    } else if (!ateSpecialFood) {
        // Remove tail if no food was eaten
        snake.pop();
    }
    
    // Draw updated game
    drawGame();
}

// Add a new obstacle (for obstacles mode)
function addNewObstacle() {
    let obstaclePosition;
    let positionIsValid = false;
    
    while (!positionIsValid) {
        obstaclePosition = {
            x: Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize,
            y: Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize
        };
        
        positionIsValid = true;
        
        // Make sure it's not too close to the snake head
        const distanceFromSnakeHead = Math.abs(obstaclePosition.x - snake[0].x) + 
                                    Math.abs(obstaclePosition.y - snake[0].y);
        if (distanceFromSnakeHead < 5 * gridSize) {
            positionIsValid = false;
            continue;
        }
        
        // Check if position overlaps with snake
        for (let segment of snake) {
            if (segment.x === obstaclePosition.x && segment.y === obstaclePosition.y) {
                positionIsValid = false;
                break;
            }
        }
        
        // Check if position overlaps with food
        if (food.x === obstaclePosition.x && food.y === obstaclePosition.y) {
            positionIsValid = false;
        }
        
        // Check if position overlaps with other obstacles
        for (let obstacle of obstacles) {
            if (obstacle.x === obstaclePosition.x && obstacle.y === obstaclePosition.y) {
                positionIsValid = false;
                break;
            }
        }
    }
    
    obstacles.push(obstaclePosition);
}

// Draw the game
function drawGame() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw obstacles for obstacle mode
    if (gameMode === 'obstacles') {
        drawObstacles();
    }
    
    // Draw snake
    snake.forEach((segment, index) => {
        // Apply different snake styles
        switch(snakeStyle) {
            case 'gradient':
                // Calculate gradient color based on position in snake
                const hue = (120 + index * 5) % 360; // Cycle through colors
                
                // Head has different color
                if (index === 0) {
                    ctx.fillStyle = `hsl(${hue}, 100%, 40%)`;
                } else {
                    ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
                }
                break;
                
            case 'rainbow':
                // Rainbow pattern (changes over time)
                const rainbowHue = (Date.now() / 50 + index * 30) % 360;
                ctx.fillStyle = `hsl(${rainbowHue}, 100%, 50%)`;
                break;
                
            case 'classic':
                // Classic green snake with darker head
                if (index === 0) {
                    ctx.fillStyle = '#006400'; // Dark green head
                } else {
                    ctx.fillStyle = '#00FF00'; // Lime green body
                }
                break;
                
            case 'neon':
                // Neon effect with glowing colors
                if (index === 0) {
                    ctx.fillStyle = '#FF00FF'; // Magenta head
                } else if (index % 2 === 0) {
                    ctx.fillStyle = '#00FFFF'; // Cyan body segments
                } else {
                    ctx.fillStyle = '#FFFF00'; // Yellow body segments
                }
                
                // Add glow effect
                ctx.shadowBlur = 10;
                ctx.shadowColor = ctx.fillStyle;
                break;
        }
        
        // Draw segment with rounded corners for smoother look
        ctx.beginPath();
        ctx.roundRect(
            segment.x, 
            segment.y, 
            gridSize, 
            gridSize, 
            [5]
        );
        ctx.fill();
        
        // Reset shadow for non-neon styles
        if (snakeStyle === 'neon') {
            ctx.shadowBlur = 0;
        }
        
        // Add eyes to the head
        if (index === 0) {
            ctx.fillStyle = 'white';
            
            // Position eyes based on direction
            const eyeSize = gridSize / 5;
            let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
            
            switch (direction) {
                case 'up':
                    leftEyeX = segment.x + gridSize / 4;
                    leftEyeY = segment.y + gridSize / 4;
                    rightEyeX = segment.x + gridSize * 3/4;
                    rightEyeY = segment.y + gridSize / 4;
                    break;
                case 'down':
                    leftEyeX = segment.x + gridSize / 4;
                    leftEyeY = segment.y + gridSize * 3/4;
                    rightEyeX = segment.x + gridSize * 3/4;
                    rightEyeY = segment.y + gridSize * 3/4;
                    break;
                case 'left':
                    leftEyeX = segment.x + gridSize / 4;
                    leftEyeY = segment.y + gridSize / 4;
                    rightEyeX = segment.x + gridSize / 4;
                    rightEyeY = segment.y + gridSize * 3/4;
                    break;
                case 'right':
                    leftEyeX = segment.x + gridSize * 3/4;
                    leftEyeY = segment.y + gridSize / 4;
                    rightEyeX = segment.x + gridSize * 3/4;
                    rightEyeY = segment.y + gridSize * 3/4;
                    break;
            }
            
            ctx.beginPath();
            ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
            ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Add pupils
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(leftEyeX, leftEyeY, eyeSize / 2, 0, Math.PI * 2);
            ctx.arc(rightEyeX, rightEyeY, eyeSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // Draw food with different styles
    drawFood();
    
    // Draw special food for grow & shrink mode
    if (gameMode === 'growShrink' && specialFood) {
        drawSpecialFood();
    }
    
    // Draw grid (subtle)
    ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 0.5;
    
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Draw obstacles
function drawObstacles() {
    for (let obstacle of obstacles) {
        // Add glow effect for neon style
        if (snakeStyle === 'neon') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FF0000';
        }
        
        // Draw obstacle
        ctx.fillStyle = '#333333';
        ctx.fillRect(obstacle.x, obstacle.y, gridSize, gridSize);
        
        // Add hazard pattern
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.moveTo(obstacle.x, obstacle.y);
        ctx.lineTo(obstacle.x + gridSize, obstacle.y + gridSize);
        ctx.moveTo(obstacle.x + gridSize, obstacle.y);
        ctx.lineTo(obstacle.x, obstacle.y + gridSize);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FF0000';
        ctx.stroke();
        
        // Reset shadow
        if (snakeStyle === 'neon') {
            ctx.shadowBlur = 0;
        }
    }
}

// Draw special food for grow & shrink mode
function drawSpecialFood() {
    const centerX = specialFood.x + gridSize / 2;
    const centerY = specialFood.y + gridSize / 2;
    const pulseSize = Math.sin(Date.now() / 100) * 3;
    
    // Golden special food with glow
    if (snakeStyle === 'neon') {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FFD700';
    }
    
    // Draw shining effect
    ctx.fillStyle = '#FFD700';
    
    // Draw star shape for special food
    const outerRadius = gridSize / 2 + pulseSize;
    const innerRadius = gridSize / 4 + pulseSize / 2;
    
    ctx.beginPath();
    
    for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / 5) * i;
        const x = centerX + radius * Math.sin(angle);
        const y = centerY - radius * Math.cos(angle);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.closePath();
    ctx.fill();
    
    // Add shine effect
    const shinePulse = Math.sin(Date.now() / 150) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${shinePulse})`;
    ctx.beginPath();
    ctx.arc(
        centerX - gridSize / 6, 
        centerY - gridSize / 6, 
        gridSize / 10, 
        0, Math.PI * 2
    );
    ctx.fill();
    
    // Reset shadow
    if (snakeStyle === 'neon') {
        ctx.shadowBlur = 0;
    }
}

// Draw food with current style
function drawFood() {
    const centerX = food.x + gridSize / 2;
    const centerY = food.y + gridSize / 2;
    const pulseSize = Math.sin(Date.now() / 200) * 2;
    
    // For Grow & Shrink mode, use special styling
    if (gameMode === 'growShrink') {
        if (food.type === 'grow') {
            // Red apple (grow food)
            drawGrowFood(centerX, centerY, pulseSize);
        } else {
            // Blue orb (shrink food)
            drawShrinkFood(centerX, centerY, pulseSize);
        }
        return;
    }
    
    // Standard food styles for other modes
    switch(foodStyle) {
        case 'apple':
            // Create a glowing effect
            const gradient = ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, gridSize
            );
            gradient.addColorStop(0, 'rgba(255, 0, 0, 1)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(
                centerX, centerY,
                gridSize / 2 + pulseSize, 
                0, Math.PI * 2
            );
            ctx.fill();
            
            // Draw apple-like food
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(
                centerX, centerY,
                gridSize / 2, 
                0, Math.PI * 2
            );
            ctx.fill();
            
            // Add stem
            ctx.fillStyle = 'green';
            ctx.fillRect(
                centerX - 1, 
                centerY - gridSize / 4 - 3, 
                2, 5
            );
            
            // Add leaf
            ctx.beginPath();
            ctx.ellipse(
                centerX + 3, 
                centerY - gridSize / 4 - 1, 
                4, 2, 
                Math.PI / 4, 
                0, Math.PI * 2
            );
            ctx.fill();
            break;
            
        case 'circle':
            // Pulsating circle
            // Glow effect
            if (snakeStyle === 'neon') {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#FF00FF';
            }
            
            ctx.fillStyle = '#FF00FF';
            ctx.beginPath();
            ctx.arc(
                centerX, centerY,
                gridSize / 2 + pulseSize, 
                0, Math.PI * 2
            );
            ctx.fill();
            
            // Reset shadow
            ctx.shadowBlur = 0;
            break;
            
        case 'diamond':
            // Diamond shape
            if (snakeStyle === 'neon') {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00FFFF';
            }
            
            ctx.fillStyle = '#00FFFF';
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - gridSize / 2);
            ctx.lineTo(centerX + gridSize / 2, centerY);
            ctx.lineTo(centerX, centerY + gridSize / 2);
            ctx.lineTo(centerX - gridSize / 2, centerY);
            ctx.closePath();
            ctx.fill();
            
            // Reset shadow
            ctx.shadowBlur = 0;
            break;
            
        case 'star':
            // Star shape
            if (snakeStyle === 'neon') {
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#FFFF00';
            }
            
            const outerRadius = gridSize / 2;
            const innerRadius = gridSize / 4;
            
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            
            for (let i = 0; i < 10; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (Math.PI / 5) * i;
                const x = centerX + radius * Math.sin(angle);
                const y = centerY - radius * Math.cos(angle);
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.closePath();
            ctx.fill();
            
            // Reset shadow
            ctx.shadowBlur = 0;
            break;
    }
}

// Draw grow food (red apple) for Grow & Shrink mode
function drawGrowFood(centerX, centerY, pulseSize) {
    // Create a glowing effect
    const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, gridSize
    );
    gradient.addColorStop(0, 'rgba(255, 0, 0, 1)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(
        centerX, centerY,
        gridSize / 2 + pulseSize, 
        0, Math.PI * 2
    );
    ctx.fill();
    
    // Draw apple-like food
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(
        centerX, centerY,
        gridSize / 2, 
        0, Math.PI * 2
    );
    ctx.fill();
    
    // Add stem
    ctx.fillStyle = 'green';
    ctx.fillRect(
        centerX - 1, 
        centerY - gridSize / 4 - 3, 
        2, 5
    );
    
    // Add leaf
    ctx.beginPath();
    ctx.ellipse(
        centerX + 3, 
        centerY - gridSize / 4 - 1, 
        4, 2, 
        Math.PI / 4, 
        0, Math.PI * 2
    );
    ctx.fill();
    
    // Add plus sign to indicate growth
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(centerX - 3, centerY);
    ctx.lineTo(centerX + 3, centerY);
    ctx.moveTo(centerX, centerY - 3);
    ctx.lineTo(centerX, centerY + 3);
    ctx.stroke();
}

// Draw shrink food (blue orb) for Grow & Shrink mode
function drawShrinkFood(centerX, centerY, pulseSize) {
    // Create a glowing effect
    const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, gridSize
    );
    gradient.addColorStop(0, 'rgba(0, 100, 255, 1)');
    gradient.addColorStop(1, 'rgba(0, 100, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(
        centerX, centerY,
        gridSize / 2 + pulseSize, 
        0, Math.PI * 2
    );
    ctx.fill();
    
    // Draw blue orb
    ctx.fillStyle = '#0064FF';
    ctx.beginPath();
    ctx.arc(
        centerX, centerY,
        gridSize / 2, 
        0, Math.PI * 2
    );
    ctx.fill();
    
    // Add shine effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(
        centerX - gridSize / 6, 
        centerY - gridSize / 6, 
        gridSize / 10, 
        0, Math.PI * 2
    );
    ctx.fill();
    
    // Add minus sign to indicate shrinking
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(centerX - 3, centerY);
    ctx.lineTo(centerX + 3, centerY);
    ctx.stroke();
}

// Game over
function gameOver(customMessage) {
    clearInterval(gameLoop);
    gameRunning = false;
    startBtn.textContent = 'Start Game';
    
    // Clear timers
    if (timeAttackTimer) {
        clearInterval(timeAttackTimer);
        timeAttackTimer = null;
    }
    
    if (specialFoodTimer) {
        clearTimeout(specialFoodTimer);
        specialFoodTimer = null;
    }
    
    // Draw game over text
    const overlayColor = isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.7)';
    ctx.fillStyle = overlayColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = '30px Poppins';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(customMessage || 'Game Over!', canvas.width / 2, canvas.height / 2 - 30);
    
    ctx.font = '20px Poppins';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
    
    // Force score to zero to ensure a fresh game will start next time
    score = 0;
    scoreElement.textContent = score;
    
    // Display special message for high score
    if (score >= highScore && score > 0) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText('New High Score!', canvas.width / 2, canvas.height / 2 + 40);
    }
    
    // Display mode-specific message
    ctx.fillStyle = 'white';
    let modeMessage = '';
    
    switch(gameMode) {
        case 'timeAttack':
            modeMessage = `Time Left: ${timeLeft}s`;
            break;
        case 'obstacles':
            modeMessage = `Obstacles Avoided: ${obstacles.length}`;
            break;
        case 'growShrink':
            modeMessage = `Final Snake Length: ${snake.length}`;
            break;
    }
    
    if (modeMessage) {
        ctx.fillText(modeMessage, canvas.width / 2, canvas.height / 2 + 70);
    }
}

// Fix for possible undefined roundRect method in some browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        if (typeof radius === 'number') {
            radius = {tl: radius, tr: radius, br: radius, bl: radius};
        } else {
            radius = {tl: 5, tr: 5, br: 5, bl: 5};
        }
        
        this.beginPath();
        this.moveTo(x + radius.tl, y);
        this.lineTo(x + width - radius.tr, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        this.lineTo(x + width, y + height - radius.br);
        this.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        this.lineTo(x + radius.bl, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        this.lineTo(x, y + radius.tl);
        this.quadraticCurveTo(x, y, x + radius.tl, y);
        this.closePath();
        return this;
    };
}

// Initialize the game when window loads
window.onload = init;
