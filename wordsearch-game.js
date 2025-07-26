// Word lists are now loaded from wordlists.js as global variables

// Helper to shuffle and avoid repeats
function getRandomWords(wordList, count, usedSet) {
    const available = wordList.filter(w => !usedSet.has(w));
    if (available.length < count) {
        usedSet.clear();
        available.push(...wordList);
    }
    const shuffled = available.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    selected.forEach(w => usedSet.add(w));
    return selected;
}

class WordSearchGame {
    constructor(container, gameManager) {
        this.container = container;
        this.gameManager = gameManager;
        this.usedWords = { easy: new Set(), medium: new Set(), hard: new Set() };
        this.difficulty = 'medium';
        this.init();
    }

    init() {
        this.createDifficultyUI();
        this.createGame();
        this.startTimer();
    }

    createDifficultyUI() {
        const ui = document.createElement('div');
        ui.className = 'wordsearch-difficulty';
        ui.innerHTML = `
            <label for="wordsearch-diff-select">Difficulty:</label>
            <select id="wordsearch-diff-select">
                <option value="easy">Easy</option>
                <option value="medium" selected>Medium</option>
                <option value="hard">Hard</option>
            </select>
            <button id="wordsearch-new-puzzle">New Puzzle</button>
        `;
        this.container.prepend(ui);
        const select = ui.querySelector('#wordsearch-diff-select');
        select.value = this.difficulty;
        select.addEventListener('change', () => {
            this.difficulty = select.value;
        });
        ui.querySelector('#wordsearch-new-puzzle').addEventListener('click', () => {
            this.resetGame();
        });
    }

    getWordListAndSettings() {
        if (this.difficulty === 'easy') {
            return { words: WORDS_4, count: 6, size: 8 };
        } else if (this.difficulty === 'medium') {
            return { words: WORDS_5, count: 8, size: 12 };
        } else {
            return { words: WORDS_6, count: 10, size: 15 };
        }
    }

    resetGame() {
        this.container.querySelector('.wordsearch-container')?.remove();
        this.container.querySelector('.wordsearch-words')?.remove();
        this.container.querySelector('.message')?.remove();
        this.createGame();
        this.startTimer();
    }

    createGame() {
        const { words, count, size } = this.getWordListAndSettings();
        this.words = getRandomWords(words, count, this.usedWords[this.difficulty]);
        this.gridSize = size;
        this.foundWords = [];
        this.selectedCells = [];
        this.moves = 0;
        this.mistakes = 0;
        this.startTime = Date.now();
        this.gameStarted = false;
        this.gameCompleted = false;
        this.generatePuzzle();
        this.createGrid();
        this.createWordList();
    }

    generatePuzzle() {
        // Use the word lists from wordlists.js based on difficulty
        const { words, count, size } = this.getWordListAndSettings();
        this.words = getRandomWords(words, count, this.usedWords[this.difficulty]).map(word => word.toUpperCase());
        this.foundWords = [];
        
        // Clear the grid before placing words
        this.grid = Array(size).fill().map(() => Array(size).fill(''));
        
        // Place words in the grid
        this.placeWords();
        // Fill remaining spaces with random letters
        this.fillRemainingSpaces();
    }

    placeWords() {
        // Only allow cardinal directions (no diagonals)
        const directions = [
            [-1, 0], // up
            [1, 0],  // down
            [0, -1], // left
            [0, 1]   // right
        ];

        this.words.forEach(word => {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 200) { // Increase attempts for robustness
                const row = Math.floor(Math.random() * this.gridSize);
                const col = Math.floor(Math.random() * this.gridSize);
                const direction = directions[Math.floor(Math.random() * directions.length)];
                if (this.canPlaceWord(word, row, col, direction)) {
                    this.placeWord(word, row, col, direction);
                    placed = true;
                    // Debug: log placement
                    // console.log(`Placed ${word} at (${row},${col}) direction [${direction}]`);
                }
                attempts++;
            }
            if (!placed) {
                // Debug: log skipped word
                // console.warn(`Could not place word: ${word}`);
            }
        });
    }

    canPlaceWord(word, startRow, startCol, direction) {
        const [dRow, dCol] = direction;
        
        for (let i = 0; i < word.length; i++) {
            const row = startRow + i * dRow;
            const col = startCol + i * dCol;
            
            if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
                return false;
            }
            
            if (this.grid[row][col] !== '' && this.grid[row][col] !== word[i]) {
                return false;
            }
        }
        
        return true;
    }

    placeWord(word, startRow, startCol, direction) {
        const [dRow, dCol] = direction;
        
        for (let i = 0; i < word.length; i++) {
            const row = startRow + i * dRow;
            const col = startCol + i * dCol;
            this.grid[row][col] = word[i];
        }
    }

    fillRemainingSpaces() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                if (this.grid[row][col] === '') {
                    this.grid[row][col] = letters[Math.floor(Math.random() * letters.length)];
                }
            }
        }
    }

    createGrid() {
        const container = document.createElement('div');
        container.className = 'wordsearch-container';
        
        const grid = document.createElement('div');
        grid.className = 'wordsearch-grid';
        grid.style.userSelect = 'none';
        grid.style.webkitUserSelect = 'none';
        grid.style.msUserSelect = 'none';
        grid.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
        
        // Track selection start
        this.selectionStart = null;
        this.selectionDirection = null;
        this.isSelecting = false;

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'wordsearch-cell';
                cell.textContent = this.grid[row][col];
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.style.userSelect = 'none';
                cell.style.webkitUserSelect = 'none';
                cell.style.msUserSelect = 'none';

                cell.addEventListener('mousedown', (e) => this.startSelection(e, cell));
                cell.addEventListener('mouseenter', (e) => this.continueSelection(e, cell));
                grid.appendChild(cell);
            }
        }
        // Listen for mouseup on the whole document
        document.addEventListener('mouseup', () => this.endSelection());
        container.appendChild(grid);
        this.container.appendChild(container);
    }

    createWordList() {
        const wordList = document.createElement('div');
        wordList.className = 'wordsearch-words';
        
        this.words.forEach(word => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-item';
            wordItem.textContent = word.toUpperCase();
            wordItem.dataset.word = word.toUpperCase();
            wordList.appendChild(wordItem);
        });
        
        this.container.appendChild(wordList);
    }

    startSelection(e, cell) {
        if (this.gameCompleted) return;
        if (!this.gameStarted) this.gameStarted = true;
        this.isSelecting = true;
        this.selectedCells = [cell];
        cell.classList.add('selected');
        this.selectionStart = [parseInt(cell.dataset.row), parseInt(cell.dataset.col)];
        this.selectionDirection = null;
    }

    continueSelection(e, cell) {
        if (!this.isSelecting || this.gameCompleted) return;
        const start = this.selectionStart;
        const end = [parseInt(cell.dataset.row), parseInt(cell.dataset.col)];
        const dRow = end[0] - start[0];
        const dCol = end[1] - start[1];
        // If still on the start cell, do nothing
        if (dRow === 0 && dCol === 0) return;
        // Set direction only after moving to a second cell
        if (!this.selectionDirection) {
            // Only allow cardinal directions (no diagonals)
            if (dRow === 0 || dCol === 0) {
                this.selectionDirection = [Math.sign(dRow), Math.sign(dCol)];
            } else {
                // Diagonal selection is disabled
                // if (Math.abs(dRow) === Math.abs(dCol)) {
                //     this.selectionDirection = [Math.sign(dRow), Math.sign(dCol)];
                // }
                return; // Not a valid direction
            }
        }
        // Now, only allow highlighting cells in the set direction
        const dir = this.selectionDirection;
        // Check if the hovered cell is in the correct direction and on the line
        let steps = null;
        // Diagonal selection is disabled
        // if (dir[0] !== 0 && dir[1] !== 0) { // diagonal
        //     if (Math.abs(dRow) !== Math.abs(dCol)) return;
        //     steps = Math.abs(dRow);
        // } else 
        if (dir[0] !== 0) { // vertical
            if (dCol !== 0) return;
            steps = Math.abs(dRow);
        } else if (dir[1] !== 0) { // horizontal
            if (dRow !== 0) return;
            steps = Math.abs(dCol);
        }
        // Build the list of cells to select
        let cellsToSelect = [];
        for (let i = 0; i <= steps; i++) {
            const r = start[0] + i * dir[0];
            const c = start[1] + i * dir[1];
            const selCell = document.querySelector(`.wordsearch-cell[data-row="${r}"][data-col="${c}"]`);
            if (!selCell) return;
            cellsToSelect.push(selCell);
        }
        // Deselect previous
        this.selectedCells.forEach(cell => cell.classList.remove('selected'));
        this.selectedCells = cellsToSelect;
        this.selectedCells.forEach(cell => cell.classList.add('selected'));
    }

    endSelection() {
        if (!this.isSelecting || this.gameCompleted) return;
        
        this.isSelecting = false;
        this.moves++;
        
        // Check if selected cells form a word
        this.checkWord();
        
        // Clear selection
        this.selectedCells.forEach(cell => {
            cell.classList.remove('selected');
        });
        this.selectedCells = [];
        
        this.updateStats();
    }

    checkWord() {
        if (this.selectedCells.length < 3) return;
        
        const word = this.selectedCells.map(cell => cell.textContent).join('');
        const reversedWord = word.split('').reverse().join('');
        
        let foundWord = null;
        let foundDirection = null;
        
        // Check if it's a valid word
        if (this.words.includes(word)) {
            foundWord = word;
            foundDirection = 'forward';
        } else if (this.words.includes(reversedWord)) {
            foundWord = reversedWord;
            foundDirection = 'backward';
        }
        
        if (foundWord && !this.foundWords.includes(foundWord)) {
            this.foundWords.push(foundWord);
            
            // Mark cells as found
            this.selectedCells.forEach(cell => {
                cell.classList.add('found');
            });
            
            // Mark word in list as found
            const wordItem = document.querySelector(`[data-word="${foundWord}"]`);
            if (wordItem) {
                wordItem.classList.add('found');
            }
            
            // Check if all words are found
            if (this.foundWords.length === this.words.length) {
                this.completeGame();
            }
        } else {
            this.mistakes++;
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
        this.gameManager.updateStats('wordsearch', totalTime, this.moves, this.mistakes, {
            found: this.foundWords.length
        });
        
        // Show completion message
        const message = document.createElement('div');
        message.className = 'message success';
        message.innerHTML = `
            <h3>🎉 Congratulations! 🎉</h3>
            <p>You found all the words!</p>
            <p>Time: ${this.gameManager.formatTime(totalTime)} | Moves: ${this.moves} | Mistakes: ${this.mistakes}</p>
        `;
        
        this.container.appendChild(message);
    }
} 