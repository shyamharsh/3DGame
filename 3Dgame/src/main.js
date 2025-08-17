import { createExistingGame } from './games/blockGame.js'; // Assuming 'blockGame.js' was renamed or is actually 'existingGame.js'
import { createBowlingGame } from './games/bowlingGame.js';

const gameSelectionScreen = document.getElementById('gameSelectionScreen');
const gameContainer = document.getElementById('gameContainer');
const playExistingGameButton = document.getElementById('playExistingGame');
const playBowlingGameButton = document.getElementById('playBowlingGame');
const backToMenuButton = document.getElementById('backToMenuButton'); // <--- GET THE BACK BUTTON


// Get references to all game-specific UI elements
const audioControls = document.getElementById('audioControls');
const timerDisplay = document.getElementById('timer');
const mapSelection = document.getElementById('mapSelection');
const winModal = document.getElementById('winModal'); // The win modal should be managed here too

//Get  bowling game control container
const bowlingControls = document.getElementById('bowlingControls');

// Store the cleanup function for the currently active game
let activeGame = null;


/**
 * Unloads the currently active game by calling its cleanup function
 * and resetting the game container's visibility.
 */
function unloadCurrentGame() {
    if (activeGame) {
        activeGame.cleanup(); // Call the cleanup function for the previous game
        activeGame = null;
    }
    gameContainer.style.display = 'none'; // Hide the game container itself
    backToMenuButton.style.display = 'none'; // <--- HIDE THE BACK BUTTON

    // *** IMPORTANT: Hide all game-specific UI elements here ***
    if (audioControls) audioControls.style.display = 'none';
    if (timerDisplay) timerDisplay.style.display = 'none';
    if (mapSelection) mapSelection.style.display = 'none';
    //if (winModal) winModal.style.display = 'none'; // Make sure this is hidden on exit
    if (bowlingControls) bowlingControls.style.display = 'none';
    //if (bowlingControls) bowlingControls.classList.remove('visible');
   
}

/**
 * Loads a specified game into the gameContainer.
 * @param {string} gameType - The type of game to load ('existing' or 'bowling').
 */
function loadGame(gameType) {
    unloadCurrentGame(); // Ensure any previous game is cleaned up

    gameSelectionScreen.style.display = 'none'; // Hide the game selection screen
    gameContainer.style.display = 'block';      // Show the game container (which will contain the canvas)
    backToMenuButton.style.display = 'block';   // <--- SHOW THE BACK BUTTON

    if (gameType === 'existing') {
        // *** IMPORTANT: Show existing game's specific UI elements ***
        if (audioControls) audioControls.style.display = 'block';
        if (timerDisplay) timerDisplay.style.display = 'block';
        if (mapSelection) mapSelection.style.display = 'block';
        if (winModal) winModal.style.display = 'none'; // Ensure the modal is hidden when starting a new game
        if (bowlingControls) bowlingControls.style.display = 'none';
        
        

        activeGame = createExistingGame('gameContainer');

        // IMPORTANT: Re-attach map selection listeners here for the existing game
        const mapButtons = document.querySelectorAll('#mapSelection .map-option button');
        mapButtons.forEach(button => {
            const mapIndex = parseInt(button.dataset.mapIndex);
            button.onclick = () => activeGame.loadMap(mapIndex);
        });

    } else if (gameType === 'bowling') {
        // Hide existing game UI, show bowling game UI
        if (audioControls) audioControls.style.display = 'none';
        if (timerDisplay) timerDisplay.style.display = 'none';
        if (mapSelection) mapSelection.style.display = 'none';
        if (winModal) winModal.style.display = 'none';

        //Show bowling game Ui
        if (bowlingControls) bowlingControls.style.display = 'block';
        //if (bowlingControls) bowlingControls.classList.add('visible');

        activeGame = { cleanup: createBowlingGame('gameContainer') };

        gameContainer.focus();
        console.log("Bowling game loaded, container focused.");
    }
}

// Event listeners for game selection buttons
// Ensure these buttons are found; if not, you'll get a TypeError here.
if (playExistingGameButton) { // Defensive check
    playExistingGameButton.addEventListener('click', () => loadGame('existing'));
} else {
    console.error("Error: 'playExistingGameButton' not found. Check your index.html ID.");
}

if (playBowlingGameButton) { // Defensive check
    playBowlingGameButton.addEventListener('click', () => loadGame('bowling'));
} else {
    console.error("Error: 'playBowlingGameButton' not found. Check your index.html ID.");
}


// <--- ADD THIS SECTION FOR THE BACK BUTTON
if (backToMenuButton) { // Defensive check
    backToMenuButton.addEventListener('click', () => {
        unloadCurrentGame(); // Clean up the current game
        gameSelectionScreen.style.display = 'flex'; // Show the game selection screen
    });
} else {
    console.error("Error: 'backToMenuButton' not found. Check your index.html ID.");
}
// END ADDITION

// Initial state: show game selection screen and hide game container and back button
gameSelectionScreen.style.display = 'flex';
gameContainer.style.display = 'none';
backToMenuButton.style.display = 'none'; // <--- HIDE THE BACK BUTTON INITIALLY

