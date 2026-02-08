const inputGrid = document.getElementById("inputGrid");
const solutionGrid = document.getElementById("solutionGrid");
const stepsEl = document.getElementById("steps");
const timeEl = document.getElementById("time");

/* ---------- BUILD GRIDS ---------- */
for (let i = 0; i < 81; i++) {
  const inp = document.createElement("input");
  inp.maxLength = 1;
  inp.oninput = () => inp.value = inp.value.replace(/[^1-9]/g, "");
  inputGrid.appendChild(inp);

  const sol = document.createElement("div");
  sol.textContent = "0";
  solutionGrid.appendChild(sol);
  
  if (i === 80) {
    const cells = solutionGrid.children;

    const picked = new Set();
    while (picked.size < 21) {
      picked.add(Math.floor(Math.random() * 81));
    }

    picked.forEach(idx => {
      cells[idx].style.backgroundColor = "#cfe9ff";
    });
  }
}


/* ---------- POPUP ---------- */
function showPopup(message, success = true) {
  const popup = document.createElement("div");
  popup.textContent = message;
  popup.style.position = "fixed";
  popup.style.top = "20px";
  popup.style.right = "20px";
  popup.style.padding = "14px 22px";
  popup.style.borderRadius = "10px";
  popup.style.color = "white";
  popup.style.fontWeight = "600";
  popup.style.zIndex = "9999";
  popup.style.background = success ? "#22c55e" : "#ef4444";
  popup.style.boxShadow = "0 10px 25px rgba(0,0,0,.25)";
  popup.style.opacity = "0";
  popup.style.transition = "opacity .3s";

  document.body.appendChild(popup);
  requestAnimationFrame(() => popup.style.opacity = "1");

  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => popup.remove(), 300);
  }, 2000);
}

/* ---------- RESET ---------- */
function resetSudoku() {
  document.querySelectorAll("#inputGrid input").forEach(i => i.value = "");

  const cells = [...document.querySelectorAll("#solutionGrid div")];
  cells.forEach(c => {
    c.textContent = "0";
    c.classList.remove("filled");
  });

  stepsEl.textContent = "–";
  timeEl.textContent = "–";
}

/* ---------- VALIDITY CHECK ---------- */
function isSudokuValid(board) {
  for (let r = 0; r < 9; r++) {
    const set = new Set();
    for (let c = 0; c < 9; c++) {
      const v = board[r][c];
      if (v === 0) continue;
      if (set.has(v)) return false;
      set.add(v);
    }
  }

  for (let c = 0; c < 9; c++) {
    const set = new Set();
    for (let r = 0; r < 9; r++) {
      const v = board[r][c];
      if (v === 0) continue;
      if (set.has(v)) return false;
      set.add(v);
    }
  }

  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const set = new Set();
      for (let r = br; r < br + 3; r++) {
        for (let c = bc; c < bc + 3; c++) {
          const v = board[r][c];
          if (v === 0) continue;
          if (set.has(v)) return false;
          set.add(v);
        }
      }
    }
  }

  return true;
}

/* ---------- FULL VALID SUDOKU GENERATOR ---------- */
function generateFullSudoku(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
        for (const num of nums) {
          board[r][c] = num;
          if (isSudokuValid(board) && generateFullSudoku(board)) return true;
          board[r][c] = 0;
        }
        return false;
      }
    }
  }
  return true;
}

/* ---------- GENERATE (70% PROPER / 30% RANDOM) ---------- */
function generateSudoku() {
  resetSudoku();

  let count = prompt("How many numbers do you want to generate? (1–81)");
  count = parseInt(count);

  if (isNaN(count) || count < 1 || count > 81) {
    alert("Enter a number between 1 and 81");
    return;
  }

  const inputs = [...document.querySelectorAll("#inputGrid input")];
  const randomMode = Math.random() < 0.3; // 30%

  /* ----- 30% RANDOM (DON'T CARE VALIDITY) ----- */
  if (randomMode) {
    const used = new Set();
    while (used.size < count) {
      const idx = Math.floor(Math.random() * 81);
      if (!used.has(idx)) {
        used.add(idx);
        inputs[idx].value = Math.floor(Math.random() * 9) + 1;
      }
    }
    return;
  }

  /* ----- 70% PROPER SUDOKU ----- */
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  generateFullSudoku(board);

  let remove = 81 - count;
  while (remove > 0) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    if (board[r][c] !== 0) {
      board[r][c] = 0;
      remove--;
    }
  }

  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9);
    const c = i % 9;
    inputs[i].value = board[r][c] === 0 ? "" : board[r][c];
  }
}

/* ---------- SOLVE ---------- */
async function solveSudoku() {
  const board = [];
  const inputs = [...document.querySelectorAll("#inputGrid input")];

  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) {
      const val = inputs[r * 9 + c].value;
      row.push(val ? parseInt(val) : 0);
    }
    board.push(row);
  }

  if (!isSudokuValid(board)) {
    showPopup("Invalid Sudoku input ✖", false);
    return;
  }

  const res = await fetch("/api/sudoku/solve/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ board })
  });

  const data = await res.json();

  if (data.success) {
    data.solution.flat().forEach((v, i) => {
      solutionGrid.children[i].textContent = v;
    });
    stepsEl.textContent = data.steps;
    timeEl.textContent = data.time_taken_ms + " ms";
    showPopup("Sudoku Solved Successfully ✔", true);
  } else {
    showPopup("Sudoku Cannot Be Solved ✖", false);
  }
}

/* ---------- EVENTS ---------- */
document.getElementById("resetBtn").onclick = resetSudoku;
document.getElementById("generateBtn").onclick = generateSudoku;
document.getElementById("solveBtn").onclick = solveSudoku;

/* ---------- INIT ---------- */
resetSudoku();



function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function findEmpty(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) return [r, c];
    }
  }
  return null;
}

function isValidMove(board, row, col, num) {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num) return false;
    if (board[i][col] === num) return false;
  }

  const sr = Math.floor(row / 3) * 3;
  const sc = Math.floor(col / 3) * 3;

  for (let r = sr; r < sr + 3; r++) {
    for (let c = sc; c < sc + 3; c++) {
      if (board[r][c] === num) return false;
    }
  }
  return true;
}

/* ---------- VISUAL SOLVER ---------- */

let steps = 0;
let speed = 200; // ⬅ slower now (increase for more slow)

async function solveSudokuVisual(board) {
  const empty = findEmpty(board);
  if (!empty) return true;

  const [row, col] = empty;

  for (let num = 1; num <= 9; num++) {
    if (isValidMove(board, row, col, num)) {
      board[row][col] = num;

      // update SOLUTION grid (not input)
      solutionGrid.children[row * 9 + col].textContent = num;

      steps++;
      stepsEl.textContent = steps;

      await sleep(speed);

      if (await solveSudokuVisual(board)) return true;

      // backtrack
      board[row][col] = 0;
      solutionGrid.children[row * 9 + col].textContent = "";

      steps++;
      stepsEl.textContent = steps;

      await sleep(speed);
    }
  }
  return false;
}

/* ---------- START VISUALIZATION ---------- */

async function startVisualizationSolve() {
  steps = 0;
  stepsEl.textContent = "0";

  const board = [];
  const inputs = [...document.querySelectorAll("#inputGrid input")];

  // read input grid
  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) {
      const val = inputs[r * 9 + c].value;
      row.push(val ? parseInt(val) : 0);
    }
    board.push(row);
  }

  if (!isSudokuValid(board)) {
    showPopup("Invalid Sudoku input ✖", false);
    return;
  }

  // initialize solution grid with input values
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9);
    const c = i % 9;
    solutionGrid.children[i].textContent =
      board[r][c] === 0 ? "" : board[r][c];
  }

  const solved = await solveSudokuVisual(board);

  if (solved) {
    showPopup("Sudoku Solved ✔", true);
  } else {
    showPopup("No Solution Found ✖", false);
  }
}
