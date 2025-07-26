// Word lists are now loaded from wordlists.js as global variables

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

// Helper function to check if two words are anagrams
function areAnagrams(word1, word2) {
    if (word1.length !== word2.length) return false;
    const sorted1 = word1.toLowerCase().split('').sort().join('');
    const sorted2 = word2.toLowerCase().split('').sort().join('');
    return sorted1 === sorted2;
}

// Helper function to find all anagrams of a word from a word list
function findAnagrams(word, wordList) {
    return wordList.filter(w => areAnagrams(word, w));
}

class JumbleGame {
    constructor(container, gameManager) {
        this.container = container;
        this.gameManager = gameManager;
        this.usedWords = { easy: new Set(), medium: new Set(), hard: new Set() };
        this.difficulty = 'medium';
        this.consecutiveMistakes = 0;
        this.hintButton = null;
        this.init();
    }

    init() {
        this.createDifficultyUI();
        this.createGame();
        this.startTimer();
    }

    createDifficultyUI() {
        const ui = document.createElement('div');
        ui.className = 'jumble-difficulty';
        ui.innerHTML = `
            <label for="jumble-diff-select">Difficulty:</label>
            <select id="jumble-diff-select">
                <option value="easy">Easy</option>
                <option value="medium" selected>Medium</option>
                <option value="hard">Hard</option>
            </select>
            <button id="jumble-new-puzzle">New Puzzle</button>
        `;
        this.container.prepend(ui);
        const select = ui.querySelector('#jumble-diff-select');
        select.value = this.difficulty;
        select.addEventListener('change', () => {
            this.difficulty = select.value;
        });
        ui.querySelector('#jumble-new-puzzle').addEventListener('click', () => {
            this.resetGame();
        });
    }

    getWordListAndSettings() {
        if (this.difficulty === 'easy') {
            return { words: WORDS_4, count: 5 };
        } else if (this.difficulty === 'medium') {
            return { words: WORDS_5, count: 7 };
        } else {
            return { words: WORDS_6, count: 10 };
        }
    }

    resetGame() {
        this.container.querySelector('.jumble-game')?.remove();
        this.container.querySelector('.message')?.remove();
        this.createGame();
        this.startTimer();
    }

    createGame() {
        const { words, count } = this.getWordListAndSettings();
        this.wordList = getRandomWords(words, count, this.usedWords[this.difficulty]);
        this.fullWordList = words; // Store full word list for anagram checking
        this.currentWordIndex = 0;
        this.moves = 0;
        this.mistakes = 0;
        this.consecutiveMistakes = 0;
        this.hintButton = null;
        this.startTime = Date.now();
        this.gameStarted = false;
        this.gameCompleted = false;
        
        const gameDiv = document.createElement('div');
        gameDiv.className = 'jumble-game';
        
        // Progress indicator
        const progress = document.createElement('div');
        progress.innerHTML = `<p>Word ${this.currentWordIndex + 1} of ${this.wordList.length}</p>`;
        gameDiv.appendChild(progress);
        
        // Jumbled word display
        const jumbledDisplay = document.createElement('div');
        jumbledDisplay.className = 'jumble-word';
        jumbledDisplay.textContent = this.jumbledWord;
        gameDiv.appendChild(jumbledDisplay);
        
        // Input field
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'jumble-input';
        input.placeholder = 'Enter your answer...';
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.checkAnswer();
            }
        });
        gameDiv.appendChild(input);
        
        // Submit button
        const submitBtn = document.createElement('button');
        submitBtn.className = 'jumble-btn';
        submitBtn.textContent = 'Submit';
        submitBtn.addEventListener('click', () => this.checkAnswer());
        gameDiv.appendChild(submitBtn);
        
        // Hint button
        const hintBtn = document.createElement('button');
        hintBtn.className = 'jumble-btn hint-btn disabled';
        hintBtn.textContent = 'Hint';
        hintBtn.disabled = true;
        hintBtn.addEventListener('click', () => this.showHint());
        gameDiv.appendChild(hintBtn);
        this.hintButton = hintBtn;
        
        // Skip button - removed to prevent skipping
        // const skipBtn = document.createElement('button');
        // skipBtn.className = 'jumble-btn';
        // skipBtn.textContent = 'Skip';
        // skipBtn.addEventListener('click', () => this.skipWord());
        // gameDiv.appendChild(skipBtn);
        
        this.container.appendChild(gameDiv);
        this.input = input;
        
        // Initialize the first word
        this.nextWord();
    }

    jumbleWord(word) {
        const letters = word.split('');
        let jumbledWord;
        let attempts = 0;
        const maxAttempts = 100; // Prevent infinite loops
        
        do {
            // Use different shuffling techniques for better randomization
            if (attempts % 3 === 0) {
                // Fisher-Yates shuffle
                for (let i = letters.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [letters[i], letters[j]] = [letters[j], letters[i]];
                }
            } else if (attempts % 3 === 1) {
                // Reverse and shuffle
                letters.reverse();
                for (let i = 0; i < letters.length - 1; i++) {
                    const j = i + Math.floor(Math.random() * (letters.length - i));
                    [letters[i], letters[j]] = [letters[j], letters[i]];
                }
            } else {
                // Random swaps
                for (let i = 0; i < letters.length * 2; i++) {
                    const idx1 = Math.floor(Math.random() * letters.length);
                    const idx2 = Math.floor(Math.random() * letters.length);
                    [letters[idx1], letters[idx2]] = [letters[idx2], letters[idx1]];
                }
            }
            
            jumbledWord = letters.join('');
            attempts++;
            
            // If we've tried too many times, use a fallback method
            if (attempts >= maxAttempts) {
                console.warn(`Could not find a valid jumble for "${word}" after ${maxAttempts} attempts, using fallback`);
                jumbledWord = this.fallbackJumble(word);
                break;
            }
        } while (this.isInvalidJumble(jumbledWord, word));
        
        return jumbledWord;
    }

    fallbackJumble(word) {
        // Fallback method: systematically rearrange letters to avoid the original
        const letters = word.split('');
        const length = letters.length;
        
        // For even-length words, swap halves
        if (length % 2 === 0) {
            const mid = length / 2;
            for (let i = 0; i < mid; i++) {
                [letters[i], letters[mid + i]] = [letters[mid + i], letters[i]];
            }
        } else {
            // For odd-length words, rotate by half length
            const rotations = Math.floor(length / 2);
            for (let r = 0; r < rotations; r++) {
                const temp = letters.pop();
                letters.unshift(temp);
            }
        }
        
        return letters.join('');
    }

    isInvalidJumble(jumbledWord, originalWord) {
        // Check if jumbled word is the same as original
        if (jumbledWord.toUpperCase() === originalWord.toUpperCase()) {
            return true;
        }
        
        // Check if jumbled word is a valid anagram that could be the answer
        if (this.isValidAnagram(jumbledWord, originalWord)) {
            return true;
        }
        
        // Check if jumbled word spells any other valid word from the word list
        // that could be confused with the answer
        if (this.fullWordList.some(word => 
            word.toUpperCase() === jumbledWord.toUpperCase()
        )) {
            return true;
        }
        
        // Check for common prefixes/suffixes that might give away the answer
        const commonPrefixes = ['RE', 'UN', 'IN', 'IM', 'DIS', 'MIS', 'PRE', 'PRO'];
        const commonSuffixes = ['ING', 'ED', 'ER', 'EST', 'LY', 'FUL', 'LESS', 'NESS'];
        
        // Check if jumbled word starts with a common prefix that the original word has
        for (const prefix of commonPrefixes) {
            if (originalWord.toUpperCase().startsWith(prefix) && 
                jumbledWord.toUpperCase().startsWith(prefix)) {
                return true;
            }
        }
        
        // Check if jumbled word ends with a common suffix that the original word has
        for (const suffix of commonSuffixes) {
            if (originalWord.toUpperCase().endsWith(suffix) && 
                jumbledWord.toUpperCase().endsWith(suffix)) {
                return true;
            }
        }
        
        // Check if jumbled word contains the first 2 or last 2 letters of the original word
        // in the same position (this could be too revealing)
        const original = originalWord.toUpperCase();
        const jumbled = jumbledWord.toUpperCase();
        
        if (original.length >= 2) {
            const firstTwo = original.substring(0, 2);
            const lastTwo = original.substring(original.length - 2);
            
            if (jumbled.startsWith(firstTwo) || jumbled.endsWith(lastTwo)) {
                return true;
            }
        }
        
        return false;
    }

    isValidAnagram(answer, targetWord) {
        // Check if answer is an anagram of the target word
        if (!areAnagrams(answer, targetWord)) return false;
        
        // Check if the answer is a valid word from the word list
        return this.fullWordList.some(word => 
            word.toUpperCase() === answer
        );
    }

    checkAnswer() {
        if (this.gameCompleted) return;
        
        if (!this.gameStarted) {
            this.gameStarted = true;
        }
        
        const answer = this.input.value.trim().toUpperCase();
        this.moves++;
        
        // Check if answer is correct (exact match or anagram)
        const isCorrect = answer === this.currentWord.toUpperCase() || 
                         this.isValidAnagram(answer, this.currentWord);
        
        if (isCorrect) {
            this.correctAnswer();
        } else {
            this.incorrectAnswer();
        }
        
        this.updateStats();
    }

    correctAnswer() {
        this.input.value = '';
        this.currentWordIndex++;
        this.consecutiveMistakes = 0; // Reset consecutive mistakes on correct answer
        
        if (this.currentWordIndex >= this.wordList.length) {
            this.completeGame();
        } else {
            this.nextWord();
        }
    }

    incorrectAnswer() {
        this.mistakes++;
        this.consecutiveMistakes++;
        this.input.classList.add('error');
        setTimeout(() => {
            this.input.classList.remove('error');
        }, 1000);
        
        // Enable hint button after 1 consecutive mistake
        if (this.consecutiveMistakes >= 1 && this.hintButton) {
            this.hintButton.disabled = false;
            this.hintButton.classList.remove('disabled');
        }
    }

    showHint() {
        if (!this.currentWord) {
            console.error('No current word available for hint');
            return;
        }
        
        // Add a mistake for using the hint
        this.mistakes++;
        this.consecutiveMistakes = 0; // Reset consecutive mistakes after using hint
        
        const hint = this.currentWord.charAt(0) + '...' + this.currentWord.charAt(this.currentWord.length - 1);
        const hintDiv = document.createElement('div');
        hintDiv.className = 'jumble-hint';
        hintDiv.textContent = `Hint: ${hint}`;
        
        // Remove previous hint if exists
        const prevHint = this.container.querySelector('.jumble-hint');
        if (prevHint) {
            prevHint.remove();
        }
        
        this.container.appendChild(hintDiv);
        
        // Disable hint button after use
        if (this.hintButton) {
            this.hintButton.disabled = true;
            this.hintButton.classList.add('disabled');
        }
        
        this.updateStats();
    }

    skipWord() {
        this.mistakes++;
        this.currentWordIndex++;
        
        if (this.currentWordIndex >= this.wordList.length) {
            this.completeGame();
        } else {
            this.nextWord();
        }
        
        this.updateStats();
    }

    nextWord() {
        this.currentWord = this.wordList[this.currentWordIndex];
        this.jumbledWord = this.jumbleWord(this.currentWord);
        this.consecutiveMistakes = 0; // Reset consecutive mistakes for new word
        
        // Update display
        const jumbledDisplay = this.container.querySelector('.jumble-word');
        jumbledDisplay.textContent = this.jumbledWord;
        
        // Update progress
        const progress = this.container.querySelector('p');
        progress.textContent = `Word ${this.currentWordIndex + 1} of ${this.wordList.length}`;
        
        // Clear input
        this.input.value = '';
        
        // Remove hint
        const hint = this.container.querySelector('.jumble-hint');
        if (hint) {
            hint.remove();
        }
        
        // Reset hint button state
        if (this.hintButton) {
            this.hintButton.disabled = true;
            this.hintButton.classList.add('disabled');
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
        this.gameManager.updateStats('jumble', totalTime, this.moves, this.mistakes);
        
        // Show completion message
        const message = document.createElement('div');
        message.className = 'message success';
        message.innerHTML = `
            <h3>🎉 Congratulations! 🎉</h3>
            <p>You completed the Jumble Word game!</p>
            <p>Time: ${this.gameManager.formatTime(totalTime)} | Moves: ${this.moves} | Mistakes: ${this.mistakes}</p>
        `;
        
        this.container.appendChild(message);
    }
} 