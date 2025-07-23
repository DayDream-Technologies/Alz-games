class SudokuGame {
    constructor(container, gameManager) {
        this.container = container;
        this.gameManager = gameManager;
        this.grid = [];
        this.solution = [];
        this.selectedCell = null;
        this.moves = 0;
        this.mistakes = 0;
        this.attempts = 0;
        this.startTime = Date.now();
        this.gameStarted = false;
        this.gameCompleted = false;
        this.difficulty = 'medium';
        this.init();
    }

    init() {
        this.createGame();
        this.startTimer();
        this.setupDifficultyDropdown();
        this.setupKeyboardInput();
    }

    setupDifficultyDropdown() {
        const select = document.getElementById('sudoku-diff-select');
        const newBtn = document.getElementById('sudoku-new-puzzle');
        select.value = this.difficulty;
        select.addEventListener('change', () => {
            this.difficulty = select.value;
        });
        newBtn.addEventListener('click', () => {
            this.difficulty = select.value;
            this.incrementAttempts();
            this.resetGame();
        });
    }

    incrementAttempts() {
        this.attempts++;
        // Update stats in localStorage
        const stats = JSON.parse(localStorage.getItem('gameStats') || '{}');
        if (!stats.sudoku) stats.sudoku = {};
        stats.sudoku.attempts = (stats.sudoku.attempts || 0) + 1;
        localStorage.setItem('gameStats', JSON.stringify(stats));
        this.updateStatsDisplay();
    }

    setupKeyboardInput() {
        document.addEventListener('keydown', (e) => {
            if (!this.selectedCell || this.gameCompleted) return;
            if (this.selectedCell.classList.contains('fixed')) return;
            if (e.key >= '1' && e.key <= '9') {
                this.placeNumber(parseInt(e.key));
            } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
                this.clearCell();
            }
        });
    }

    resetGame() {
        this.container.innerHTML = '';
        this.grid = [];
        this.solution = [];
        this.selectedCell = null;
        this.moves = 0;
        this.mistakes = 0;
        this.startTime = Date.now();
        this.gameStarted = false;
        this.gameCompleted = false;
        this.createGame();
        this.startTimer();
    }

    createGame() {
        this.generatePuzzle();
        const grid = document.createElement('div');
        grid.className = 'sudoku-grid';
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'sudoku-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                const value = this.grid[row][col];
                if (value !== 0) {
                    cell.textContent = value;
                    cell.classList.add('fixed');
                } else {
                    cell.addEventListener('click', () => this.selectCell(cell));
                }
                grid.appendChild(cell);
            }
        }
        this.container.appendChild(grid);
        this.createControls();
        this.updateStatsDisplay();
    }

    generatePuzzle() {
        // Use sudoku.js library to generate a new puzzle and its solution
        const puzzleString = window.sudoku.generate(this.difficulty);
        const solutionString = window.sudoku.solve(puzzleString);
        this.grid = window.sudoku.board_string_to_grid(puzzleString).map(row => row.map(c => c === '.' ? 0 : parseInt(c)));
        this.solution = window.sudoku.board_string_to_grid(solutionString).map(row => row.map(c => parseInt(c)));
    }



    isValid(grid, row, col, num) {
        // Check row
        for (let x = 0; x < 9; x++) {
            if (grid[row][x] === num) return false;
        }
        
        // Check column
        for (let x = 0; x < 9; x++) {
            if (grid[x][col] === num) return false;
        }
        
        // Check 3x3 box
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (grid[startRow + i][startCol + j] === num) return false;
            }
        }
        
        return true;
    }

    removeNumbers() {
        const cellsToRemove = 40; // Remove 40 numbers for medium difficulty
        let removed = 0;
        
        while (removed < cellsToRemove) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            
            if (this.grid[row][col] !== 0) {
                this.grid[row][col] = 0;
                removed++;
            }
        }
    }

    selectCell(cell) {
        if (this.gameCompleted) return;
        
        if (!this.gameStarted) {
            this.gameStarted = true;
        }
        
        // Remove previous selection
        if (this.selectedCell) {
            this.selectedCell.classList.remove('selected');
        }
        
        this.selectedCell = cell;
        cell.classList.add('selected');
    }

    createControls() {
        const controls = document.createElement('div');
        controls.className = 'sudoku-controls';
        
        // Number buttons
        for (let i = 1; i <= 9; i++) {
            const btn = document.createElement('button');
            btn.className = 'sudoku-btn';
            btn.textContent = i;
            btn.addEventListener('click', () => this.placeNumber(i));
            controls.appendChild(btn);
        }
        
        // Clear button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'sudoku-btn';
        clearBtn.textContent = 'Clear';
        clearBtn.addEventListener('click', () => this.clearCell());
        controls.appendChild(clearBtn);
        
        this.container.appendChild(controls);
    }

    placeNumber(num) {
        if (!this.selectedCell || this.gameCompleted) return;
        
        const row = parseInt(this.selectedCell.dataset.row);
        const col = parseInt(this.selectedCell.dataset.col);
        
        // Only allow input in empty (not fixed) cells
        if (this.grid[row][col] !== 0) return;

        // Check if the number is correct
        if (this.solution[row][col] === num) {
            this.selectedCell.textContent = num;
            this.selectedCell.classList.remove('selected');
            this.selectedCell.classList.add('fixed');
            this.selectedCell.removeEventListener('click', () => this.selectCell(this.selectedCell));
            this.selectedCell = null;
            this.moves++;
            
            // Check if puzzle is complete
            this.checkCompletion();
        } else {
            this.mistakes++;
            this.selectedCell.classList.add('error');
            // Use a unique error id for this cell
            const errorCell = this.selectedCell;
            const errorId = Date.now() + Math.random();
            errorCell.dataset.errorId = errorId;
            setTimeout(() => {
                // Only remove error if this is the latest error for this cell
                if (errorCell.dataset.errorId == errorId) {
                    errorCell.classList.remove('error');
                    delete errorCell.dataset.errorId;
                }
            }, 1000);
        }
        
        this.updateStats();
    }

    clearCell() {
        if (!this.selectedCell || this.gameCompleted) return;
        
        this.selectedCell.textContent = '';
        this.selectedCell.classList.remove('selected');
        this.selectedCell = null;
    }

    checkCompletion() {
        // Check if all cells are filled
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (!cell.textContent) {
                    return; // Not complete yet
                }
            }
        }
        
        this.completeGame();
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
        this.gameManager.updateStats('sudoku', totalTime, this.moves, this.mistakes);
        
        // Show completion message
        const message = document.createElement('div');
        message.className = 'message success';
        message.innerHTML = `
            <h3>🎉 Congratulations! 🎉</h3>
            <p>You completed the Sudoku puzzle!</p>
            <p>Time: ${this.gameManager.formatTime(totalTime)} | Moves: ${this.moves} | Mistakes: ${this.mistakes}</p>
        `;
        
        this.container.appendChild(message);
    }

    updateStatsDisplay() {
        // Update attempts in the UI
        const stats = JSON.parse(localStorage.getItem('gameStats') || '{}');
        const attempts = stats.sudoku && stats.sudoku.attempts ? stats.sudoku.attempts : 0;
        const el = document.getElementById('sudoku-attempts');
        if (el) el.textContent = attempts;
    }
} 