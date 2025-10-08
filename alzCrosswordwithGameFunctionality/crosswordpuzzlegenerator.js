const attemptsToFitWords = 5000;
const gridsToMake = 5;
const gridSize = 5;

let usedWords = [];
let generatedGrids = [];
let goodStartingLetters = new Set();
let placedWords = [];

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

    for (let row = 0; row < gridSize; ++row) {
      for (let column = 0; column < gridSize; ++column) {
        word.text = text;
        word.row = row;
        word.column = column;
        word.vertical = Math.random() >= 0.5;

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
    let word = getRandomWord(words);
    let goodWord = isGoodWord(word);

    while (usedWords.includes(word) || !goodWord) {
      word = getRandomWord(words);
      goodWord = isGoodWord(word);
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

      // First word (seed)
      let word = new Word(
        getRandomWordOfSize(getUnusedWords(), gridSize),
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
          slot.innerHTML = `
            ${n ? `<span class="cell-number">${n}</span>` : ""}
            <input type="text" maxlength="1" class="cell-input" id="input_${row}_${column}">
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
};

// ----------------------------------------------------
// Helper functions
// ----------------------------------------------------
function getUnusedWords() {
  return words.filter((val) => !usedWords.includes(val));
}

function getRandomWordOfSize(wordList, wordSize) {
  let properLengthWords = wordList.filter((val) => val.length === wordSize);
  return properLengthWords[getRandomInt(properLengthWords.length)];
}

function getRandomWord(wordList) {
  let words = getUnusedWords().filter((val) => val.length === gridSize);
  return words[getRandomInt(words.length)];
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
