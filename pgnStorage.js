// pgnStorage.js
const STORAGE_KEY = 'savedPGNGames';

export function saveGame(name, pgnText, parsedLines) {
  const games = getSavedGames();
  games.push({ 
    name, 
    pgnText,
    parsedLines,
    date: new Date().toISOString() 
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

export function getSavedGames() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function deleteGame(index) {
  const games = getSavedGames();
  games.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

export function clearAllGames() {
  localStorage.removeItem(STORAGE_KEY);
}