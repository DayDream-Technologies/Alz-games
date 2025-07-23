// Game state management
class GameManager {
    constructor() {
        this.currentGame = null;
        this.gameStats = this.loadStats();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateStatsDisplay();
    }

    setupEventListeners() {
        // No event listeners needed since we're using separate pages
    }

    // Statistics management
    loadStats() {
        const stats = localStorage.getItem('gameStats');
        return stats ? JSON.parse(stats) : {
            memory: { bestTime: null, bestMoves: null },
            sudoku: { bestTime: null, bestMistakes: null },
            wordsearch: { bestTime: null, bestFound: null },
            jumble: { bestTime: null, bestMistakes: null }
        };
    }

    saveStats() {
        localStorage.setItem('gameStats', JSON.stringify(this.gameStats));
    }

    updateStats(gameType, time, moves, mistakes, additional = {}) {
        const stats = this.gameStats[gameType];
        
        if (!stats.bestTime || time < stats.bestTime) {
            stats.bestTime = time;
        }
        
        if (gameType === 'memory') {
            if (!stats.bestMoves || moves < stats.bestMoves) {
                stats.bestMoves = moves;
            }
        } else if (gameType === 'sudoku' || gameType === 'jumble') {
            if (!stats.bestMistakes || mistakes < stats.bestMistakes) {
                stats.bestMistakes = mistakes;
            }
        } else if (gameType === 'wordsearch') {
            if (!stats.bestFound || additional.found > stats.bestFound) {
                stats.bestFound = additional.found;
            }
        }

        this.saveStats();
        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        Object.keys(this.gameStats).forEach(gameType => {
            const stats = this.gameStats[gameType];
            
            if (gameType === 'memory') {
                document.getElementById(`${gameType}-best-time`).textContent = 
                    stats.bestTime ? this.formatTime(stats.bestTime) : '--';
                document.getElementById(`${gameType}-best-moves`).textContent = 
                    stats.bestMoves || '--';
            } else if (gameType === 'sudoku' || gameType === 'jumble') {
                document.getElementById(`${gameType}-best-time`).textContent = 
                    stats.bestTime ? this.formatTime(stats.bestTime) : '--';
                document.getElementById(`${gameType}-best-mistakes`).textContent = 
                    stats.bestMistakes || '--';
            } else if (gameType === 'wordsearch') {
                document.getElementById(`${gameType}-best-time`).textContent = 
                    stats.bestTime ? this.formatTime(stats.bestTime) : '--';
                document.getElementById(`${gameType}-best-found`).textContent = 
                    stats.bestFound || '--';
            }
        });
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }


}

// Initialize the game manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GameManager();
}); 