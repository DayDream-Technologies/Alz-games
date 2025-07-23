class MemoryGame {
    constructor(container, gameManager) {
        this.container = container;
        this.gameManager = gameManager;
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.mistakes = 0;
        this.startTime = Date.now();
        this.gameStarted = false;
        this.gameCompleted = false;
        
        this.init();
    }

    init() {
        this.createGame();
        this.startTimer();
    }

    createGame() {
        const symbols = ['🎴', '🎲', '🎯', '🎪', '🎨', '🎭', '🎪', '🎨'];
        const gameCards = [...symbols, ...symbols]; // Duplicate for pairs
        this.shuffleArray(gameCards);

        const grid = document.createElement('div');
        grid.className = 'memory-grid';

        gameCards.forEach((symbol, index) => {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.dataset.index = index;
            card.dataset.symbol = symbol;
            card.textContent = '?';
            
            card.addEventListener('click', () => this.flipCard(card));
            grid.appendChild(card);
            this.cards.push(card);
        });

        this.container.appendChild(grid);
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    flipCard(card) {
        if (this.gameCompleted || card.classList.contains('flipped') || 
            card.classList.contains('matched') || this.flippedCards.length >= 2) {
            return;
        }

        if (!this.gameStarted) {
            this.gameStarted = true;
        }

        card.classList.add('flipped');
        card.textContent = card.dataset.symbol;
        this.flippedCards.push(card);

        if (this.flippedCards.length === 2) {
            this.moves++;
            this.updateStats();
            this.checkMatch();
        }
    }

    checkMatch() {
        const [card1, card2] = this.flippedCards;
        
        if (card1.dataset.symbol === card2.dataset.symbol) {
            // Match found
            setTimeout(() => {
                card1.classList.add('matched');
                card2.classList.add('matched');
                this.matchedPairs++;
                this.flippedCards = [];
                
                if (this.matchedPairs === 8) {
                    this.completeGame();
                }
            }, 500);
        } else {
            // No match
            this.mistakes++;
            this.updateStats();
            setTimeout(() => {
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
                card1.textContent = '?';
                card2.textContent = '?';
                this.flippedCards = [];
            }, 1000);
        }
    }

    startTimer() {
        this.timer = setInterval(() => {
            if (this.gameStarted && !this.gameCompleted) {
                const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                document.getElementById('current-time').textContent = this.gameManager.formatTime(elapsed);
            }
        }, 1000);
    }

    updateStats() {
        document.getElementById('current-moves').textContent = this.moves;
        document.getElementById('current-mistakes').textContent = this.mistakes;
    }

    completeGame() {
        this.gameCompleted = true;
        clearInterval(this.timer);
        
        const totalTime = Math.floor((Date.now() - this.startTime) / 1000);
        
        // Update game manager stats
        this.gameManager.updateStats('memory', totalTime, this.moves, this.mistakes);
        
        // Show completion message
        const message = document.createElement('div');
        message.className = 'message success';
        message.innerHTML = `
            <h3>🎉 Congratulations! 🎉</h3>
            <p>You completed the Memory Game!</p>
            <p>Time: ${this.gameManager.formatTime(totalTime)} | Moves: ${this.moves} | Mistakes: ${this.mistakes}</p>
        `;
        
        this.container.appendChild(message);
    }
} 