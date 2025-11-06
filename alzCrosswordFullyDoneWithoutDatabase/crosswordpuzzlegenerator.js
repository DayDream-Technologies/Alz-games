// Import Supabase (you'll need to add this script tag to your HTML)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const attemptsToFitWords = 10000;
const gridsToMake = 5;
const gridSize = 5;

let usedWords = [];
let generatedGrids = [];
let goodStartingLetters = new Set();
let placedWords = [];

// Daily puzzle seed - ensures same puzzle for everyone on same day
let dailySeed = null;
// TEMP toggle: set to true to generate a fresh puzzle on every refresh (testing only)
const FORCE_NEW_PUZZLE_ON_REFRESH = true;
// Use user's legacy generator exactly as provided
const USE_LEGACY_GENERATOR = true;

// Supabase configuration (project URL and anon public key)
const SUPABASE_URL = 'https://jwenqqrymmryfofgfmae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3ZW5xcXJ5bW1yeWZvZmdmbWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0ODk2OTYsImV4cCI6MjA2NzA2NTY5Nn0.Yd5AzIW9SDRhQtHpntHmNprJXywoHJt0F8f-XsZPWHs';
let supabase = null;

// Initialize Supabase
function initSupabase() {
  if (typeof window !== 'undefined' && window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase initialized');
  } else {
    console.log('Supabase not available - running in offline mode');
  }
}

// Generate deterministic seed from date
function generateDailySeed() {
  const today = new Date();
  const dateString = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0');
  
  // Create a simple hash from the date string
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash);
}

// Seeded random number generator
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Get random word using seeded random
function getSeededRandomWord(wordList, seed) {
  const randomValue = seededRandom(seed);
  const index = Math.floor(randomValue * wordList.length);
  return wordList[index];
}

// Get random integer using seeded random
function getSeededRandomInt(max, seed) {
  const randomValue = seededRandom(seed);
  return Math.floor(randomValue * max);
}

let slots = gridSize * gridSize;
let gridDiv = document.getElementById("grid");
let row = 0;
let column = 0;

for (let slot = 0; slot < slots; slot++) {
  let div = document.createElement("DIV");
  div.id = row + "_" + column;
  div.classList.add("slot");
  div.style.border = "1px solid #e9e9e9";
  div.style.backgroundColor = "#e9e9e9";
  gridDiv.appendChild(div);
  column++;
  if (column >= gridSize) {
    column = 0;
    row++;
  }
}

let createCrossWordPuzzle = function () {
  // Initialize seed (daily by default; randomized if forcing new puzzle each refresh)
  dailySeed = generateDailySeed();
  if (FORCE_NEW_PUZZLE_ON_REFRESH) {
    dailySeed += Math.floor(Math.random() * 1_000_000);
  }
  console.log(`Daily seed for ${new Date().toDateString()}: ${dailySeed}`);
  
  // ----------------------------------------------------
  // Helper: Push used word and track starting letters
  // ----------------------------------------------------
  let pushUsedWords = function (text) {
    usedWords.push(text);
    text.split("").forEach((char) => goodStartingLetters.add(char));
  };

  // ----------------------------------------------------
  // Core: Attempt to place word on grid
  // ----------------------------------------------------
  let attemptToPlaceWordOnGrid = function (grid, word, placed) {
    let text = getAWordToTry();
    let seedOffset = placed.length * 100; // Different seed for each attempt

    for (let row = 0; row < gridSize; ++row) {
      for (let column = 0; column < gridSize; ++column) {
        word.text = text;
        word.row = row;
        word.column = column;
        word.vertical = seededRandom(dailySeed + seedOffset + row * gridSize + column) >= 0.5;

        if (grid.isLetter(row, column)) {
          if (grid.update(word)) {
            pushUsedWords(word.text);
            placed.push({
              text: word.text,
              row: word.row,
              column: word.column,
              vertical: word.vertical,
            });
            return true;
          }
        }
      }
    }
    return false;
  };

  // ----------------------------------------------------
  // Word selection helpers
  // ----------------------------------------------------
  let getAWordToTry = function () {
    let word = getSeededRandomWord(words, dailySeed + usedWords.length);
    let goodWord = isGoodWord(word);
    let attempts = 0;

    while ((usedWords.includes(word) || !goodWord) && attempts < 100) {
      word = getSeededRandomWord(words, dailySeed + usedWords.length + attempts);
      goodWord = isGoodWord(word);
      attempts++;
    }
    return word;
  };

  let isGoodWord = function (word) {
    let goodWord = false;
    for (let letter of goodStartingLetters) {
      if (letter === word.charAt(0)) {
        goodWord = true;
        break;
      }
    }
    return goodWord;
  };

  let getBestGrid = function (grids) {
    let best = grids[0];
    for (let g of grids) {
      if (g.grid.getIntersections() >= best.grid.getIntersections()) {
        best = g;
      }
    }
    return best;
  };

  // ----------------------------------------------------
  // Generate multiple grids and pick the best one
  // ----------------------------------------------------
  let generateGrids = function () {
    generatedGrids = [];
    usedWords = [];

    for (let gridsMade = 0; gridsMade < gridsToMake; gridsMade++) {
      let grid = new CrosswordPuzzle();
      let gridPlaced = [];

      // First word (seed) - use deterministic selection
      let firstWordSeed = dailySeed + gridsMade;
      let firstWord = getSeededRandomWord(getUnusedWords().filter(w => w.length === gridSize), firstWordSeed);
      let word = new Word(
        firstWord,
        0,
        0,
        false
      );

      if (grid.update(word)) {
        pushUsedWords(word.text);
        gridPlaced.push({
          text: word.text,
          row: 0,
          column: 0,
          vertical: false,
        });
      }

      let continuousFails = 0;
      for (let attempts = 0; attempts < attemptsToFitWords; ++attempts) {
        let placed = attemptToPlaceWordOnGrid(grid, word, gridPlaced);
        if (placed) continuousFails = 0;
        else continuousFails++;

        if (continuousFails > 470) break;
      }

      generatedGrids.push({ grid, words: gridPlaced });
    }

    return getBestGrid(generatedGrids);
  };

  // ----------------------------------------------------
  // Display crossword puzzle with numbering
  // ----------------------------------------------------
  let displayCrosswordPuzzle = function (bestGrid, numbering) {
    const solutionGrid = bestGrid.grid;
    window.solutionGrid = solutionGrid;

    for (let row = 0; row < gridSize; ++row) {
      for (let column = 0; column < gridSize; ++column) {
        const slot = document.getElementById(row + "_" + column);
        if (solutionGrid[row][column] !== "_") {
          const n = numbering[`${row}_${column}`];
          const correctLetter = solutionGrid[row][column];
          slot.innerHTML = `
            ${n ? `<span class="cell-number">${n}</span>` : ""}
            <input type="text" maxlength="1" class="cell-input" 
                   id="input_${row}_${column}" 
                   data-answer="${correctLetter.toUpperCase()}">
          `;
          slot.style.backgroundColor = "white";
          slot.style.border = "1px solid #ccc";
        } else {
          slot.innerHTML = "";
          slot.style.backgroundColor = "#333";
          slot.style.border = "1px solid #333";
        }
      }
    }
  };

  // ----------------------------------------------------
  // Generate grid + display
  // ----------------------------------------------------
  let best = generateGrids();
  const { numbering, wordsWithNumbers } = buildNumbering(best.grid, best.words);

  console.log("✅ Final Placed Words (numbered):");
  console.table(wordsWithNumbers);

  displayCrosswordPuzzle(best.grid, numbering);
  displayNumberedClues(wordsWithNumbers);

  // === Assign data-word-id to each cell ===
  totalWords = wordsWithNumbers.length;
  for (const word of wordsWithNumbers) {
    const id = `${word.number}_${word.vertical ? "down" : "across"}`;
    for (let i = 0; i < word.text.length; i++) {
      const r = word.vertical ? word.row + i : word.row;
      const c = word.vertical ? word.column : word.column + i;
      const cell = document.getElementById(`input_${r}_${c}`);
      if (cell) cell.dataset.wordId = id;
    }
    // Initialize revealed letter counters per word
    if (!revealedLettersByWord[id]) revealedLettersByWord[id] = 0;
  }
  
  // Initialize cognitive metrics
  updateCognitiveMetrics();
  
  // Check for any already completed words (in case page was refreshed)
  setTimeout(checkForCompletedWords, 1000);
};

// ----------------------------------------------------
// Helper functions
// ----------------------------------------------------
function getUnusedWords() {
  return words.filter((val) => !usedWords.includes(val));
}

// === Legacy generator (verbatim behavior requested by user) ===
function createCrossWordPuzzle_Legacy() {
  // Helper to push used words and track starting letters
  const pushUsedWords = function (text) {
    usedWords.push(text);
    text.split("").forEach((char) => goodStartingLetters.add(char));
  };

  // Attempt to place word on grid
  const attemptToPlaceWordOnGrid = function (grid, word, placed) {
    let text = getAWordToTry();
    for (let row = 0; row < gridSize; ++row) {
      for (let column = 0; column < gridSize; ++column) {
        word.text = text;
        word.row = row;
        word.column = column;
        word.vertical = Math.random() >= 0.5;
        if (grid.isLetter(row, column)) {
          if (grid.update(word)) {
            pushUsedWords(word.text);
            placed.push({ text: word.text, row: word.row, column: word.column, vertical: word.vertical });
            return true;
          }
        }
      }
    }
    return false;
  };

  const getAWordToTry = function () {
    let word = getRandomWord(words);
    let goodWord = isGoodWord(word);
    while (usedWords.includes(word) || !goodWord) {
      word = getRandomWord(words);
      goodWord = isGoodWord(word);
    }
    return word;
  };

  const isGoodWord = function (word) {
    let goodWord = false;
    for (let letter of goodStartingLetters) {
      if (letter === word.charAt(0)) { goodWord = true; break; }
    }
    return goodWord;
  };

  const getBestGrid = function (grids) {
    let best = grids[0];
    for (let g of grids) {
      if (g.grid.getIntersections() >= best.grid.getIntersections()) { best = g; }
    }
    return best;
  };

  const generateGrids = function () {
    // Ensure a fresh run each time
    generatedGrids = [];
    usedWords = [];
    goodStartingLetters = new Set();
    for (let gridsMade = 0; gridsMade < gridsToMake; gridsMade++) {
      let grid = new CrosswordPuzzle();
      let gridPlaced = [];
      let word = new Word(getRandomWordOfSize(getUnusedWords(), gridSize), 0, 0, false);
      if (grid.update(word)) {
        pushUsedWords(word.text);
        gridPlaced.push({ text: word.text, row: 0, column: 0, vertical: false });
      }
      let continuousFails = 0;
      for (let attempts = 0; attempts < attemptsToFitWords; ++attempts) {
        let placed = attemptToPlaceWordOnGrid(grid, word, gridPlaced);
        if (placed) continuousFails = 0; else continuousFails++;
        if (continuousFails > 470) break;
      }
      generatedGrids.push({ grid, words: gridPlaced });
    }
    return getBestGrid(generatedGrids);
  };

  const displayCrosswordPuzzle = function (bestGrid, numbering) {
    const solutionGrid = bestGrid.grid;
    window.solutionGrid = solutionGrid;
    for (let row = 0; row < gridSize; ++row) {
      for (let column = 0; column < gridSize; ++column) {
        const slot = document.getElementById(row + "_" + column);
        if (solutionGrid[row][column] !== "_") {
          const n = numbering[`${row}_${column}`];
          const correctLetter = solutionGrid[row][column];
          slot.innerHTML = `
            ${n ? `<span class="cell-number">${n}</span>` : ""}
            <input type="text" maxlength="1" class="cell-input" id="input_${row}_${column}" data-answer="${correctLetter.toUpperCase()}">
          `;
          slot.style.backgroundColor = "white";
          slot.style.border = "1px solid #ccc";
        } else {
          slot.innerHTML = "";
          slot.style.backgroundColor = "#333";
          slot.style.border = "1px solid #333";
        }
      }
    }
  };

  // Generate grid + display
  let best = generateGrids();
  const { numbering, wordsWithNumbers } = buildNumbering(best.grid, best.words);
  console.log("✅ Final Placed Words (numbered):");
  console.table(wordsWithNumbers);
  displayCrosswordPuzzle(best.grid, numbering);
  displayNumberedClues(wordsWithNumbers);

  // Assign data-word-id for each cell to enable check/complete logic
  totalWords = wordsWithNumbers.length;
  for (const word of wordsWithNumbers) {
    const id = `${word.number}_${word.vertical ? "down" : "across"}`;
    for (let i = 0; i < word.text.length; i++) {
      const r = word.vertical ? word.row + i : word.row;
      const c = word.vertical ? word.column : word.column + i;
      const cell = document.getElementById(`input_${r}_${c}`);
      if (cell) cell.dataset.wordId = id;
    }
  }
}

function getRandomWordOfSize(wordList, wordSize) {
  let properLengthWords = wordList.filter((val) => val.length === wordSize);
  return properLengthWords[getSeededRandomInt(properLengthWords.length, dailySeed)];
}

function getRandomWord(wordList) {
  let words = getUnusedWords().filter((val) => val.length === gridSize);
  return words[getSeededRandomInt(words.length, dailySeed)];
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

// ----------------------------------------------------
// Build numbering for clues and grid
// ----------------------------------------------------
function buildNumbering(bestGrid, words) {
  const grid = bestGrid.grid;
  const numbering = {};
  let num = 1;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === "_") continue;

      const leftBlocked = c === 0 || grid[r][c - 1] === "_";
      const rightLetter = c + 1 < gridSize && grid[r][c + 1] !== "_";
      const upBlocked = r === 0 || grid[r - 1][c] === "_";
      const downLetter = r + 1 < gridSize && grid[r + 1][c] !== "_";

      const startsAcross = leftBlocked && rightLetter;
      const startsDown = upBlocked && downLetter;

      if (startsAcross || startsDown) {
        numbering[`${r}_${c}`] = num++;
      }
    }
  }

  const unique = words.filter(
    (w, i, a) =>
      i ===
      a.findIndex(
        (x) =>
          x.text === w.text &&
          x.row === w.row &&
          x.column === w.column &&
          x.vertical === w.vertical
      )
  );

  const wordsWithNumbers = unique.map((w) => ({
    ...w,
    number: numbering[`${w.row}_${w.column}`] ?? null,
  }));

  return { numbering, wordsWithNumbers };
}

// ----------------------------------------------------
// Display clues with numbering
// ----------------------------------------------------
function displayNumberedClues(wordsWithNumbers) {
  const clueList = document.getElementById("clueList");
  clueList.innerHTML = "";

  const across = wordsWithNumbers
    .filter((w) => !w.vertical)
    .sort((a, b) => (a.number ?? 1e9) - (b.number ?? 1e9));
  const down = wordsWithNumbers
    .filter((w) => w.vertical)
    .sort((a, b) => (a.number ?? 1e9) - (b.number ?? 1e9));

  for (const w of across) {
    const clueText = clues[w.text.toLowerCase()] || "(No clue available)";
    clueList.innerHTML += `<li><b>${w.number}. Across:</b> ${clueText}</li>`;
  }

  for (const w of down) {
    const clueText = clues[w.text.toLowerCase()] || "(No clue available)";
    clueList.innerHTML += `<li><b>${w.number}. Down:</b> ${clueText}</li>`;
  }
}

// === Daily Puzzle + Countdown (non-invasive) ===

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function msUntilNextMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next - now;
}

function generateIfNewDay() {
  if (FORCE_NEW_PUZZLE_ON_REFRESH) {
    // For testing: always generate a fresh puzzle on refresh
    if (USE_LEGACY_GENERATOR) {
      createCrossWordPuzzle_Legacy();
    } else if (typeof createCrossWordPuzzle === "function") {
      createCrossWordPuzzle();
    }
    return;
  }
  const key = todayKey();
  const last = localStorage.getItem("puzzleDate");
  if (last !== key) {
    if (USE_LEGACY_GENERATOR) {
      createCrossWordPuzzle_Legacy();
    } else if (typeof createCrossWordPuzzle === "function") {
      createCrossWordPuzzle();
    }
    localStorage.setItem("puzzleDate", key);
  }
}

function startCountdown() {
  const el = document.getElementById("countdown");
  if (!el) return;

  function tick() {
    let ms = msUntilNextMidnight();
    if (ms < 0) ms = 0;

    const totalSec = Math.floor(ms / 1000);
    const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");

    el.textContent = `Next puzzle in: ${h}h ${m}m ${s}s`;
  }

  tick();
  return setInterval(tick, 1000);
}

function scheduleMidnightRefresh() {
  const ms = msUntilNextMidnight();
  setTimeout(() => {
    location.reload();
  }, ms + 50);
}

// Simple Cognitive Health Metrics
let startTime = Date.now();
let lettersRevealed = 0;
let wordsRevealed = 0;
let wordsCompletedManually = 0; // Track words completed by typing
let totalWords = 0;
let solveTimer = null;
let completedWords = new Set();
// Tracks last action source to decide whether a completed word came from reveals or typing
let lastActionType = null; // 'input' | 'reveal_letter' | 'reveal_word'

// Helper: if words revealed (via letters) reaches total words, finish puzzle
function checkRevealedCompletion() {
  const wordsFromReveals = revealedWordsSet.size;
  if (totalWords > 0 && wordsFromReveals >= totalWords) {
    wordsRevealed = totalWords; // normalize display
    stopSolveTimer();
    // Treat this the same as clicking "Reveal Puzzle"
    completeGame('solution');
    showDialog("Solution Revealed!", "You've revealed the complete solution! This is a great way to learn the answers. Try solving it manually next time for an even bigger challenge!");
    updateCognitiveMetrics();
  }
}

// Track revealed letters per word (only when revealed via buttons)
let revealedLettersByWord = {};
let revealedWordsSet = new Set();

// Database functions
async function saveGameResult(gameData) {
  if (!supabase) {
    console.log('Supabase not available - saving to localStorage only');
    saveToLocalStorage(gameData);
    return;
  }

  try {
    const { data, error } = await supabase
      .from('crossword_game_stats')
      .insert([gameData]);

    if (error) {
      console.error('Error saving game result:', error);
      // Fallback to localStorage
      saveToLocalStorage(gameData);
    } else {
      console.log('Game result saved to database:', data);
    }
  } catch (err) {
    console.error('Error saving game result:', err);
    // Fallback to localStorage
    saveToLocalStorage(gameData);
  }
}

function saveToLocalStorage(gameData) {
  const existingStats = JSON.parse(localStorage.getItem('crosswordStats') || '[]');
  existingStats.push(gameData);
  localStorage.setItem('crosswordStats', JSON.stringify(existingStats));
  console.log('Game result saved to localStorage');
}

async function loadStats() {
  if (!supabase) {
    console.log('Supabase not available - loading from localStorage');
    return loadFromLocalStorage();
  }

  try {
    const { data, error } = await supabase
      .from('crossword_game_stats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error loading stats:', error);
      return loadFromLocalStorage();
    }

    console.log('Stats loaded from database:', data);
    return data;
  } catch (err) {
    console.error('Error loading stats:', err);
    return loadFromLocalStorage();
  }
}

function loadFromLocalStorage() {
  const stats = JSON.parse(localStorage.getItem('crosswordStats') || '[]');
  console.log('Stats loaded from localStorage:', stats);
  return stats;
}

async function updateStreak() {
  if (!supabase) {
    console.log('Supabase not available - updating streak in localStorage');
    updateStreakLocalStorage();
    return;
  }

  try {
    // Get today's date
    const today = new Date().toDateString();
    
    // Check if we already have a record for today
    const { data: existingRecord, error: selectError } = await supabase
      .from('crossword_game_stats')
      .select('id')
      .eq('date', today)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking existing record:', selectError);
      updateStreakLocalStorage();
      return;
    }

    if (!existingRecord) {
      // No record for today, increment streak
      const currentStreak = parseInt(localStorage.getItem('exerciseDay') || '1');
      localStorage.setItem('exerciseDay', currentStreak + 1);
      console.log('Streak updated to:', currentStreak + 1);
    }
  } catch (err) {
    console.error('Error updating streak:', err);
    updateStreakLocalStorage();
  }
}

function updateStreakLocalStorage() {
  const today = new Date().toDateString();
  const lastVisit = localStorage.getItem('lastVisit');
  const exerciseDay = parseInt(localStorage.getItem('exerciseDay') || '1');
  
  if (lastVisit !== today) {
    localStorage.setItem('exerciseDay', exerciseDay + 1);
    localStorage.setItem('lastVisit', today);
    console.log('Streak updated in localStorage to:', exerciseDay + 1);
  }
}

// Complete game function - saves stats to database
async function completeGame(completionType) {
  const endTime = Date.now();
  const solveTime = Math.floor((endTime - startTime) / 1000);
  const minutes = Math.floor(solveTime / 60);
  const seconds = solveTime % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const gameData = {
    user_id: supabase ? (await supabase.auth.getUser()).data.user?.id : null,
    date: new Date().toDateString(),
    solve_time_seconds: solveTime,
    solve_time_formatted: timeString,
    letters_revealed: lettersRevealed,
    words_revealed: wordsRevealed,
    words_completed_manually: wordsCompletedManually,
    total_words: totalWords,
    completion_type: completionType, // 'manual', 'revealed', 'mixed', 'solution'
    hints_used: lettersRevealed + wordsRevealed,
    perfect_completion: completionType === 'manual' && lettersRevealed === 0 && wordsRevealed === 0,
    created_at: new Date().toISOString()
  };
  
  console.log('Saving game data:', gameData);
  
  // Save to database
  await saveGameResult(gameData);
  
  // Update streak
  await updateStreak();
  
  // Update metrics display
  updateCognitiveMetrics();
}

function updateCognitiveMetrics() {
  // Update exercise day (based on localStorage)
  const today = new Date().toDateString();
  const lastVisit = localStorage.getItem('lastVisit');
  const exerciseDay = parseInt(localStorage.getItem('exerciseDay') || '1');
  
  if (lastVisit !== today) {
    localStorage.setItem('exerciseDay', exerciseDay + 1);
    localStorage.setItem('lastVisit', today);
  }
  
  document.getElementById('exerciseDay').textContent = `Day ${localStorage.getItem('exerciseDay')}`;
  
  // Update simple metrics
  document.getElementById('lettersRevealed').textContent = lettersRevealed;
  document.getElementById('wordsRevealed').textContent = wordsRevealed;
  
  // Update solve time
  updateSolveTime();
}

function updateSolveTime() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  document.getElementById('solveTime').textContent = timeString;
}

function startSolveTimer() {
  if (!solveTimer) {
    solveTimer = setInterval(updateSolveTime, 1000);
  }
}

function stopSolveTimer() {
  if (solveTimer) {
    clearInterval(solveTimer);
    solveTimer = null;
  }
}

function trackLetterRevealed() {
  lettersRevealed++;
  updateCognitiveMetrics();
  checkRevealedCompletion();
}

function trackWordRevealed() {
  wordsRevealed++;
  updateCognitiveMetrics();
  
  // Check if all words have been revealed individually
  if (wordsRevealed === totalWords) {
    stopSolveTimer();
    completeGame('revealed');
    showDialog("Puzzle Complete!", "Great job! You've revealed all the words and completed today's crossword puzzle. Keep practicing to improve your memory and cognitive skills!");
  } else if (wordsRevealed % 3 === 0) {
    showDialog("Great Progress!", "You're doing wonderfully! Every word helps your memory and focus.");
  }
}

// Track when words are completed manually (not revealed)
function trackManualWordCompletion() {
  // This function is called when words are completed by typing, not by revealing
  // We don't increment wordsRevealed here, so manual completion can still trigger confetti
  wordsCompletedManually++;
  updateCognitiveMetrics();
}

function checkForCompletedWords() {
  // Check all words to see if any are now complete
  const allCells = document.querySelectorAll('.cell-input');
  const wordGroups = {};
  
  console.log(`Checking ${allCells.length} cells for completed words`);
  
  // Group cells by word ID
  allCells.forEach(cell => {
    const wordId = cell.dataset.wordId;
    if (wordId) {
      if (!wordGroups[wordId]) {
        wordGroups[wordId] = [];
      }
      wordGroups[wordId].push(cell);
    }
  });
  
  console.log(`Found ${Object.keys(wordGroups).length} word groups:`, Object.keys(wordGroups));
  
  // Check each word group
  Object.keys(wordGroups).forEach(wordId => {
    const cells = wordGroups[wordId];
    let isComplete = true;
    let allCorrect = true;
    
    console.log(`Checking word ${wordId} with ${cells.length} cells`);
    
    cells.forEach(cell => {
      const correct = cell.dataset.answer?.toUpperCase();
      const guess = cell.value?.toUpperCase();
      
      console.log(`Cell: correct="${correct}", guess="${guess}"`);
      
      if (!guess) {
        isComplete = false;
      } else if (guess !== correct) {
        allCorrect = false;
      }
    });
    
    console.log(`Word ${wordId}: isComplete=${isComplete}, allCorrect=${allCorrect}, alreadyCompleted=${completedWords.has(wordId)}`);
    
    // If word is complete and all correct, mark it once (metrics based on letters revealed rule)
    if (isComplete && allCorrect && !completedWords.has(wordId)) {
      completedWords.add(wordId);
      lastActionType = null;
      console.log(`Word completed: ${wordId}`);
    }
  });
  
  // Check if all words are now completed
  checkIfPuzzleComplete();
}

function checkIfPuzzleComplete() {
  const allCells = document.querySelectorAll('.cell-input');
  const wordGroups = {};
  
  // Group cells by word ID
  allCells.forEach(cell => {
    const wordId = cell.dataset.wordId;
    if (wordId) {
      if (!wordGroups[wordId]) {
        wordGroups[wordId] = [];
      }
      wordGroups[wordId].push(cell);
    }
  });
  
  const totalWords = Object.keys(wordGroups).length;
  let completedCount = 0;
  
  // Check each word group to see if it's complete and correct
  Object.keys(wordGroups).forEach(wordId => {
    const cells = wordGroups[wordId];
    let isComplete = true;
    let allCorrect = true;
    
    cells.forEach(cell => {
      const correct = cell.dataset.answer?.toUpperCase();
      const guess = cell.value?.toUpperCase();
      
      if (!guess) {
        isComplete = false;
      } else if (guess !== correct) {
        allCorrect = false;
      }
    });
    
    if (isComplete && allCorrect) {
      completedCount++;
    }
  });
  
  // If all words are completed manually (not through individual reveals), show the completion popup
  // Only show this if we haven't already shown the individual word completion popup
  if (completedCount === totalWords && totalWords > 0 && wordsRevealed === 0) {
    stopSolveTimer();
    console.log("Manual completion detected! Showing confetti popup");
    completeGame('manual');
    showDialog("🎉 PUZZLE MASTER! 🎉", "INCREDIBLE! You solved the entire crossword puzzle manually without any hints! Your memory, focus, and problem-solving skills are absolutely outstanding! You're a true crossword champion!", true);
  } else if (completedCount === totalWords && totalWords > 0) {
    console.log("All words completed but some were revealed - no confetti");
    completeGame('mixed');
  }
}

// Confetti Effect Function
function createConfetti() {
  console.log("Creating confetti effect!");
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
  const confettiCount = 150;
  
  for (let i = 0; i < confettiCount; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.style.position = 'fixed';
      confetti.style.width = '10px';
      confetti.style.height = '10px';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = Math.random() * window.innerWidth + 'px';
      confetti.style.top = '-10px';
      confetti.style.zIndex = '10000';
      confetti.style.borderRadius = '50%';
      confetti.style.pointerEvents = 'none';
      
      document.body.appendChild(confetti);
      
      // Animate confetti falling
      const animation = confetti.animate([
        { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
        { transform: `translateY(${window.innerHeight + 100}px) rotate(720deg)`, opacity: 0 }
      ], {
        duration: 3000 + Math.random() * 2000,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });
      
      animation.onfinish = () => {
        confetti.remove();
      };
    }, i * 20);
  }
  console.log(`Confetti animation started with ${confettiCount} pieces`);
}

// Custom Dialog Functions
function showDialog(title, message, showConfetti = false) {
  console.log(`showDialog called with title: "${title}", message: "${message}", confetti: ${showConfetti}`); // Debug log
  
  const dialog = document.getElementById('customDialog');
  const dialogTitle = document.getElementById('dialogTitle');
  const dialogMessage = document.getElementById('dialogMessage');
  
  console.log('Dialog elements found:', { dialog, dialogTitle, dialogMessage }); // Debug log
  
  if (!dialog || !dialogTitle || !dialogMessage) {
    console.error('Dialog elements not found!'); // Debug log
    return;
  }
  
  dialogTitle.textContent = title;
  dialogMessage.textContent = message;
  dialog.style.display = 'flex';
  
  // Add confetti effect if requested
  if (showConfetti) {
    setTimeout(() => {
      createConfetti();
    }, 500); // Delay confetti slightly to let dialog appear first
  }
  
  console.log('Dialog should now be visible'); // Debug log
  
  // Focus the OK button for accessibility
  setTimeout(() => {
    document.getElementById('dialogOk').focus();
  }, 100);
}

function hideDialog() {
  const dialog = document.getElementById('customDialog');
  dialog.style.display = 'none';
}

// Set up dialog event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Supabase
  initSupabase();
  
  // Dialog OK button
  document.getElementById('dialogOk').addEventListener('click', hideDialog);
  
  // Close dialog when clicking overlay
  document.getElementById('customDialog').addEventListener('click', (e) => {
    if (e.target.id === 'customDialog') {
      hideDialog();
    }
  });
  
  // Close dialog with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('customDialog').style.display === 'flex') {
      hideDialog();
    }
  });

  if (USE_LEGACY_GENERATOR) {
    createCrossWordPuzzle_Legacy();
  } else if (typeof createCrossWordPuzzle === "function") {
    createCrossWordPuzzle();
  }
  generateIfNewDay();
  startCountdown();
  scheduleMidnightRefresh();
  
  // Start the solve timer
  startSolveTimer();

  // ✅ Button bindings
  let lastClickedCell = null;
  
  const getCell = () => {
    // First try to get the currently focused cell
    const active = document.activeElement;
    if (active && active.classList.contains("cell-input")) {
      return active;
    }
    // If no active cell, return the last clicked cell
    return lastClickedCell;
  };

  // Add click listeners to all cell inputs and their containers
  document.addEventListener('click', (e) => {
    // Remove selection from all cells first
    document.querySelectorAll('.cell-input').forEach(cell => {
      cell.classList.remove('selected');
    });
    
    // Check if clicking on a cell input directly
    if (e.target.classList.contains('cell-input')) {
      lastClickedCell = e.target;
      e.target.focus();
      e.target.classList.add('selected');
    }
    // Check if clicking on a slot that contains a cell input
    else if (e.target.classList.contains('slot')) {
      const cellInput = e.target.querySelector('.cell-input');
      if (cellInput) {
        lastClickedCell = cellInput;
        cellInput.focus();
        cellInput.classList.add('selected');
      }
    }
  });

  // Add input listeners to check for completed words when typing
  document.addEventListener('input', (e) => {
    if (e.target.classList.contains('cell-input')) {
      lastActionType = 'input';
      // Check for completed words after a short delay
      setTimeout(checkForCompletedWords, 100);
    }
  });

  // Also add focus listeners to track when cells get focus
  document.addEventListener('focusin', (e) => {
    if (e.target.classList.contains('cell-input')) {
      // Remove selection from all cells first
      document.querySelectorAll('.cell-input').forEach(cell => {
        cell.classList.remove('selected');
      });
      lastClickedCell = e.target;
      e.target.classList.add('selected');
    }
  });

  document.getElementById("btnCheckLetter")?.addEventListener("click", (e) => {
    e.preventDefault();
    const cell = getCell();
    if (!cell) return showDialog("Select a Cell", "Please click on a white cell in the crossword grid first.");
    const correct = cell.dataset.answer?.toUpperCase();
    const guess = cell.value?.toUpperCase();
    if (!guess) return showDialog("Enter a Letter", "Please type a letter in the cell first.");
    
    if (guess === correct) {
      cell.style.backgroundColor = "#c8f7c5";
    } else {
      cell.style.backgroundColor = "#f7c5c5";
    }
  });

  document.getElementById("btnCheckWord")?.addEventListener("click", (e) => {
    e.preventDefault();
    const cell = getCell();
    if (!cell) return showDialog("Select a Cell", "Please click on a white cell in the crossword grid first.");
    const wordId = cell.dataset.wordId;
    if (!wordId) return showDialog("Invalid Cell", "This cell is not part of a word.");
    
    const cells = document.querySelectorAll(`.cell-input[data-word-id='${wordId}']`);
    let allCorrect = true;
    let hasEmptyCells = false;
    
    cells.forEach((c) => {
      const correct = c.dataset.answer?.toUpperCase();
      const guess = c.value?.toUpperCase();
      if (!guess) {
        hasEmptyCells = true;
        allCorrect = false;
      } else if (guess !== correct) {
        allCorrect = false;
      }
    });
    
    if (hasEmptyCells) {
      showDialog("Incomplete Word", "Please fill in all letters of the word first.");
      return;
    }
    
    cells.forEach((c) => {
      const correct = c.dataset.answer?.toUpperCase();
      const guess = c.value?.toUpperCase();
      if (guess === correct) {
        c.style.backgroundColor = "#c8f7c5";
      } else {
        c.style.backgroundColor = "#f7c5c5";
      }
    });
    
    if (allCorrect) {
      // Mark this word as completed if not already (no increment to words revealed under new rule)
      if (!completedWords.has(wordId)) {
        completedWords.add(wordId);
      }
      showDialog("Correct!", "Great job! That word is correct.");
    } else {
      showDialog("Incorrect", "Some letters are wrong. Try again!");
    }
  });

  document.getElementById("btnRevealLetter")?.addEventListener("click", (e) => {
    e.preventDefault();
    const cell = getCell();
    if (!cell) return showDialog("Select a Cell", "Please click on a white cell in the crossword grid first.");
    const correct = cell.dataset.answer;
    if (correct) {
      cell.value = correct.toUpperCase();
      cell.style.backgroundColor = "#fff";
      // Only count if this specific cell wasn't already revealed via buttons
      const wordId = cell.dataset.wordId;
      if (!cell.dataset.revealed) {
        cell.dataset.revealed = '1';
        trackLetterRevealed();
        if (wordId) {
          revealedLettersByWord[wordId] = (revealedLettersByWord[wordId] || 0) + 1;
          const wordLen = document.querySelectorAll(`.cell-input[data-word-id='${wordId}']`).length || gridSize;
          if (revealedLettersByWord[wordId] >= wordLen && !revealedWordsSet.has(wordId)) {
            revealedWordsSet.add(wordId);
            wordsRevealed = revealedWordsSet.size; // display words revealed as words completed by reveals
          }
        }
      }
      // Programmatic value set doesn't trigger input event; check word completion explicitly
      lastActionType = 'reveal_letter';
      setTimeout(checkForCompletedWords, 50);
      checkRevealedCompletion();
    }
  });

  document.getElementById("btnRevealWord")?.addEventListener("click", (e) => {
    e.preventDefault();
    const cell = getCell();
    if (!cell) return showDialog("Select a Cell", "Please click on a white cell in the crossword grid first.");
    const wordId = cell.dataset.wordId;
    if (!wordId) return showDialog("Invalid Cell", "This cell is not part of a word.");
    const cells = document.querySelectorAll(`.cell-input[data-word-id='${wordId}']`);
    
    let lettersRevealedInWord = 0;
    cells.forEach((c) => {
      const correct = c.dataset.answer;
      if (correct && c.value !== correct.toUpperCase()) {
        c.value = correct.toUpperCase();
        c.style.backgroundColor = "#fff";
        lettersRevealedInWord++;
        if (!c.dataset.revealed) {
          c.dataset.revealed = '1';
          revealedLettersByWord[wordId] = (revealedLettersByWord[wordId] || 0) + 1;
        }
      }
    });
    
    // Update letters revealed counter
    lettersRevealed += lettersRevealedInWord;
    // Mark whole word as revealed
    const wordLen = cells.length || gridSize;
    if (revealedLettersByWord[wordId] >= wordLen && !revealedWordsSet.has(wordId)) {
      revealedWordsSet.add(wordId);
    }
    wordsRevealed = revealedWordsSet.size;
    updateCognitiveMetrics();
    checkRevealedCompletion();
  });

  document.getElementById("btnRevealPuzzle")?.addEventListener("click", (e) => {
    e.preventDefault();
    console.log("Reveal Puzzle button event triggered!"); // Debug log
    revealSolution();
  });
  
  // Add a debug function to manually check words (temporary)
  window.debugCheckWords = function() {
    console.log("Manual word check triggered");
    checkForCompletedWords();
  };
  
  // Add a debug function to test confetti
  window.testConfetti = function() {
    console.log("Testing confetti effect");
    showDialog("Test Confetti!", "This is a test of the confetti effect!", true);
  };
});

// === Crossword answer functions ===

function checkAnswers() {
  const inputs = document.querySelectorAll(".cell-input");
  inputs.forEach((input) => {
    const correct = input.dataset.answer;
    const guess = input.value?.toUpperCase().trim();

    if (!guess) return;
    if (guess === correct) {
      input.style.backgroundColor = "#d4edda";
    } else {
      input.style.backgroundColor = "#f8d7da";
    }
  });
}

function revealSolution() {
  console.log("Reveal Puzzle button clicked!"); // Debug log
  
  const inputs = document.querySelectorAll(".cell-input");
  console.log(`Found ${inputs.length} cell inputs`); // Debug log
  
  let lettersRevealedCount = 0;
  
  // Track which words we've revealed to avoid double counting
  const revealedWords = new Set();
  
  inputs.forEach((input) => {
    const correct = input.dataset.answer;
    if (correct && input.value !== correct.toUpperCase()) {
      input.value = correct.toUpperCase();
      input.style.backgroundColor = "#fff";
      lettersRevealedCount++;
      console.log(`Filled cell with: ${correct}`); // Debug log
      
      // Mark cell as revealed for per-word accounting
      const wordId = input.dataset.wordId;
      if (wordId && !input.dataset.revealed) {
        input.dataset.revealed = '1';
        revealedLettersByWord[wordId] = (revealedLettersByWord[wordId] || 0) + 1;
        const wordLen = document.querySelectorAll(`.cell-input[data-word-id='${wordId}']`).length || gridSize;
        if (revealedLettersByWord[wordId] >= wordLen && !revealedWordsSet.has(wordId)) {
          revealedWordsSet.add(wordId);
        }
      }
    }
  });
  
  // Update the metrics
  lettersRevealed += lettersRevealedCount;
  wordsRevealed = revealedWordsSet.size;
  updateCognitiveMetrics();
  checkRevealedCompletion();
  
  console.log(`Revealed ${lettersRevealedCount} letters and ${wordsRevealedCount} words`); // Debug log
  
  // Show completion popup when puzzle is revealed
  console.log("About to show completion dialog"); // Debug log
  completeGame('solution');
  showDialog("Solution Revealed!", "You've revealed the complete solution! This is a great way to learn the answers. Try solving it manually next time for an even bigger challenge!");
}

