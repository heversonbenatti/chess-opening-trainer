// script.js
import { getSavedGames } from "./pgnStorage.js";

let board, game;
let userColor = 'w';
let openingContext = []; // Array of all selected opening lines as arrays of moves

// Populate the openings list from local storage on document ready
$(document).ready(function () {
  loadOpeningsList();
});

// Build the openings UI from saved games
function loadOpeningsList() {
  const games = getSavedGames();
  const container = $("#openings-container");
  container.empty();

  if (games.length === 0) {
    container.append("<p>No saved openings found.</p>");
    return;
  }

  games.forEach((gameData, gameIndex) => {
    const groupDiv = $("<div>").addClass("opening-group");
    // Group header with a "select all" checkbox
    const groupHeader = $("<div>").addClass("group-header");
    const groupCheckbox = $(`<input type="checkbox" class="group-select" id="group-${gameIndex}">`);
    const groupLabel = $(`<label for="group-${gameIndex}">${gameData.name} (Selecionar todas)</label>`);
    groupHeader.append(groupCheckbox, groupLabel);
    groupDiv.append(groupHeader);

    // Add each opening line under this group
    gameData.parsedLines.forEach((line, lineIndex) => {
      const id = `opening-${gameIndex}-${lineIndex}`;
      const checkbox = $(`<input type="checkbox" class="line-select" id="${id}" data-line="${line}">`);
      const label = $(`<label for="${id}" class="opening-line">${line}</label>`);
      groupDiv.append(checkbox).append(label).append("<br>");
    });
    container.append(groupDiv);
  });

  // Event: When a group checkbox is toggled, select/deselect all lines within its group.
  $(".group-select").on("change", function () {
    const checked = $(this).is(":checked");
    $(this).closest(".opening-group").find(".line-select").prop("checked", checked);
  });
}

function onDragStart(source, piece, position, orientation) {
  if (game.game_over()) return false;
  if ((userColor === 'w' && piece[0] !== 'w') || (userColor === 'b' && piece[0] !== 'b')) {
    return false;
  }
}

function onDrop(source, target) {
  const move = game.move({
    from: source,
    to: target,
    promotion: 'q'
  });
  if (move === null) return 'snapback';

  updateTurnLabel();
  setTimeout(() => botMove(), 250);
}

function onSnapEnd() {
  board.position(game.fen());
}

function updateTurnLabel() {
  const turnLabel = $("#turn-label");
  const turnText = game.turn() === userColor ? "Your turn" : "Bot's turn";
  turnLabel.text("Turn: " + turnText);
}

function resetBotMessage() {
  $("#bot-message").text("");
}

function botMove() {
  if (game.game_over()) return;

  const history = game.history();
  const currentSequence = history.map(move => move.toLowerCase());

  let possibleMoves = [];
  let candidateLines = [];
  openingContext.forEach(lineMoves => {
    const prefix = lineMoves.slice(0, currentSequence.length).map(m => m.toLowerCase());
    if (arraysEqual(prefix, currentSequence)) {
      if (lineMoves.length > currentSequence.length) {
        possibleMoves.push(lineMoves[currentSequence.length]);
        candidateLines.push(lineMoves.join(" "));
      }
    }
  });

  if (possibleMoves.length === 0) {
    $("#bot-message").text("No opening moves found for the current sequence.");
    return;
  }

  const randIdx = Math.floor(Math.random() * possibleMoves.length);
  const chosenMove = possibleMoves[randIdx];
  const chosenLine = candidateLines[randIdx];

  game.move(chosenMove, { promotion: 'q' });
  board.position(game.fen());
  updateTurnLabel();
  $("#bot-message").text("Bot opening line: " + chosenLine);
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Updated function: Cleans PGN line by removing move numbers and dots before splitting into moves
function gatherSelectedOpenings() {
  openingContext = [];
  $("#openings-container input[type='checkbox'].line-select:checked").each(function () {
    let line = $(this).data("line");
    if (line && typeof line === "string") {
      // Remove move numbers and dots, e.g., "1. e4 e5 2. f4 f5" becomes "e4 e5 f4 f5"
      line = line.replace(/\d+\.(\.\.)?\s*/g, '').trim();
      const moves = line.split(/\s+/);
      if (moves.length > 0) {
        openingContext.push(moves);
      }
    }
  });
}

function startGame() {
  userColor = $("#user-color").val();
  gatherSelectedOpenings();
  resetBotMessage();

  game = new Chess();
  board = Chessboard('board', {
    draggable: true,
    position: 'start',
    orientation: userColor === 'w' ? 'white' : 'black',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: 'pieces/{piece}.png'
  });
  $("#start-game").attr("disabled", true);
  $("#reset-game").attr("disabled", false);
  updateTurnLabel();

  if (userColor === 'b') {
    setTimeout(() => botMove(), 250);
  }
}

function resetGame() {
  if (game) game.reset();
  if (board) board.start();
  $("#start-game").attr("disabled", false);
  $("#reset-game").attr("disabled", true);
  $("#turn-label").text("Turn: ");
  resetBotMessage();
  $("#openings-container input[type='checkbox']").prop("checked", false);
  openingContext = [];
}

$("#start-game").on("click", startGame);
$("#reset-game").on("click", resetGame);
