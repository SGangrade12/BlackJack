// Game state variables
let deck = [];
let playerHand = [];
let dealerHand = [];
let playerMoney = 1000;
let currentBet = 0;
let gameActive = false;
let dealerHidden = true;

// Game statistics
let gamesPlayed = 0;
let gamesWon = 0;

// Card suits and values
const suits = ['♠', '♥', '♦', '♣'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Sound effects (using Web Audio API for subtle feedback)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playTone(frequency, duration, type = 'sine') {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

// Initialize game
function initGame() {
    updateDisplay();
    updateMessage("Place your bet and click 'Deal' to start!", 'neutral', '🎲');
    updateStats();
}

// Create and shuffle deck
function createDeck() {
    deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({
                suit: suit,
                value: value,
                numValue: getCardValue(value)
            });
        }
    }
    shuffleDeck();
}

function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function getCardValue(value) {
    if (value === 'A') return 11;
    if (['J', 'Q', 'K'].includes(value)) return 10;
    return parseInt(value);
}

// Calculate hand value with ace handling
function calculateHandValue(hand) {
    let value = 0;
    let aces = 0;

    for (let card of hand) {
        if (card.value === 'A') {
            aces++;
            value += 11;
        } else {
            value += card.numValue;
        }
    }

    // Adjust for aces
    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }

    return value;
}

// Set bet amount with animation
function setBet(amount) {
    if (!gameActive) {
        const betInput = document.getElementById('bet-amount');
        betInput.value = amount;
        
        // Add visual feedback
        betInput.style.transform = 'scale(1.1)';
        setTimeout(() => {
            betInput.style.transform = 'scale(1)';
        }, 200);
        
        playTone(800, 0.1);
        updateCurrentBetDisplay();
    }
}

// Go all-in with confirmation
function goAllIn() {
    if (gameActive || playerMoney < 10) return;
    
    // Create confirmation modal
    const overlay = document.createElement('div');
    overlay.className = 'all-in-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'all-in-modal';
    
    modal.innerHTML = `
        <h3>🎰 ALL IN 🎰</h3>
        <p>Are you sure you want to bet everything?</p>
        <div class="all-in-amount">$${playerMoney}</div>
        <div class="modal-buttons">
            <button class="modal-btn modal-btn-confirm" onclick="confirmAllIn()">CONFIRM</button>
            <button class="modal-btn modal-btn-cancel" onclick="cancelAllIn()">CANCEL</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Store overlay reference for cleanup
    window.allInOverlay = overlay;
}

function confirmAllIn() {
    document.getElementById('bet-amount').value = playerMoney;
    updateCurrentBetDisplay();
    cancelAllIn();
    playTone(1000, 0.2);
}

function cancelAllIn() {
    if (window.allInOverlay) {
        document.body.removeChild(window.allInOverlay);
        window.allInOverlay = null;
    }
}

// Update current bet display
function updateCurrentBetDisplay() {
    const betAmount = parseInt(document.getElementById('bet-amount').value) || 0;
    document.getElementById('current-bet').textContent = betAmount;
}

// Deal initial cards with animation
function dealCards() {
    const betInput = document.getElementById('bet-amount');
    const betAmount = parseInt(betInput.value) || 0;

    if (betAmount < 10) {
        updateMessage('Minimum bet is $10!', 'lose', '⚠️');
        animateElement(betInput, 'shake');
        playTone(300, 0.3);
        return;
    }

    if (betAmount > playerMoney) {
        updateMessage(`Not enough money! You only have $${playerMoney}`, 'lose', '💸');
        animateElement(betInput, 'shake');
        playTone(300, 0.3);
        return;
    }

    currentBet = betAmount;
    playerMoney -= currentBet;
    gameActive = true;
    dealerHidden = true;
    gamesPlayed++;

    // Create new deck and shuffle
    createDeck();

    // Reset hands and clear card displays
    playerHand = [];
    dealerHand = [];
    clearCards();

    // Deal initial cards with delay
    setTimeout(() => {
        playerHand.push(deck.pop());
        updateDisplay();
        playTone(600, 0.1);
    }, 200);

    setTimeout(() => {
        dealerHand.push(deck.pop());
        updateDisplay();
        playTone(600, 0.1);
    }, 400);

    setTimeout(() => {
        playerHand.push(deck.pop());
        updateDisplay();
        playTone(600, 0.1);
    }, 600);

    setTimeout(() => {
        dealerHand.push(deck.pop());
        updateDisplay();
        updateGameState();
        playTone(600, 0.1);

        // Check for blackjack
        const playerValue = calculateHandValue(playerHand);
        const dealerValue = calculateHandValue(dealerHand);

        if (playerValue === 21) {
            setTimeout(() => {
                dealerHidden = false;
                updateDisplay();
                if (dealerValue === 21) {
                    endGame('push');
                } else {
                    endGame('blackjack');
                }
            }, 500);
        } else {
            updateMessage("Your turn! Hit or Stand?", 'neutral', '🤔');
            enablePlayerActions();
        }
    }, 800);

    updateMessage("Dealing cards...", 'neutral', '🎴');
    updateStats();
}

// Clear all cards from display
function clearCards() {
    const dealerContainer = document.getElementById('dealer-cards');
    const playerContainer = document.getElementById('player-cards');
    
    if (dealerContainer) {
        dealerContainer.innerHTML = '';
    }
    if (playerContainer) {
        playerContainer.innerHTML = '';
    }
}

// Player hits with animation
function hit() {
    if (!gameActive) return;

    playerHand.push(deck.pop());
    updateDisplay();
    playTone(700, 0.1);

    const playerValue = calculateHandValue(playerHand);
    if (playerValue > 21) {
        setTimeout(() => endGame('bust'), 500);
    } else if (playerValue === 21) {
        updateMessage("Perfect 21! Standing...", 'neutral', '🎯');
        setTimeout(() => stand(), 1000);
    } else {
        updateMessage("Hit or Stand?", 'neutral', '🤔');
    }
}

// Player stands
function stand() {
    if (!gameActive) return;

    dealerHidden = false;
    disablePlayerActions();
    updateMessage("Dealer's turn...", 'neutral', '🎩');
    
    setTimeout(() => {
        dealerPlay();
    }, 1000);
}

// Double down with validation
function doubleDown() {
    if (!gameActive || playerHand.length !== 2) return;
    
    if (currentBet > playerMoney) {
        updateMessage("Not enough money to double down!", 'lose', '💸');
        animateElement(document.getElementById('double-btn'), 'shake');
        playTone(300, 0.3);
        return;
    }

    playerMoney -= currentBet;
    currentBet *= 2;

    playerHand.push(deck.pop());
    updateDisplay();
    playTone(800, 0.2);

    const playerValue = calculateHandValue(playerHand);
    if (playerValue > 21) {
        setTimeout(() => endGame('bust'), 500);
    } else {
        dealerHidden = false;
        disablePlayerActions();
        updateMessage("Doubled down! Dealer's turn...", 'neutral', '⚡');
        setTimeout(() => dealerPlay(), 1000);
    }
}

// Dealer's turn with realistic delays
function dealerPlay() {
    updateDisplay();

    const dealerValue = calculateHandValue(dealerHand);
    updateMessage(`Dealer has ${dealerValue}...`, 'neutral', '🎩');

    if (dealerValue < 17) {
        setTimeout(() => {
            dealerHand.push(deck.pop());
            playTone(600, 0.1);
            dealerPlay();
        }, 1500);
    } else {
        setTimeout(() => {
            determineWinner();
        }, 1000);
    }
}

// Determine winner
function determineWinner() {
    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(dealerHand);

    updateMessage(`Player: ${playerValue} | Dealer: ${dealerValue}`, 'neutral', '📊');

    setTimeout(() => {
        if (dealerValue > 21) {
            endGame('dealer-bust');
        } else if (playerValue > dealerValue) {
            endGame('win');
        } else if (dealerValue > playerValue) {
            endGame('lose');
        } else {
            endGame('push');
        }
    }, 1500);
}

// End game with enhanced feedback
function endGame(result) {
    gameActive = false;
    dealerHidden = false;
    disablePlayerActions();

    let message, icon, messageType, winAmount = 0;

    switch (result) {
        case 'blackjack':
            winAmount = Math.floor(currentBet * 1.5);
            playerMoney += currentBet + winAmount;
            message = `🎉 BLACKJACK! You win $${winAmount}!`;
            icon = '🃏';
            messageType = 'win';
            gamesWon++;
            playTone(800, 0.5);
            setTimeout(() => playTone(1000, 0.3), 200);
            break;
        case 'win':
        case 'dealer-bust':
            winAmount = currentBet;
            playerMoney += currentBet * 2;
            message = result === 'dealer-bust' ? 
                `🎉 Dealer busts! You win $${winAmount}!` : 
                `🎉 You win $${winAmount}!`;
            icon = '🏆';
            messageType = 'win';
            gamesWon++;
            playTone(700, 0.4);
            break;
        case 'lose':
            message = `😞 You lose $${currentBet}!`;
            icon = '💔';
            messageType = 'lose';
            playTone(300, 0.5);
            break;
        case 'bust':
            message = `💥 Bust! You lose $${currentBet}!`;
            icon = '💥';
            messageType = 'lose';
            playTone(200, 0.6);
            break;
        case 'push':
            playerMoney += currentBet;
            message = "🤝 Push! It's a tie!";
            icon = '🤝';
            messageType = 'push';
            playTone(500, 0.3);
            break;
    }

    updateMessage(message, messageType, icon);
    currentBet = 0;
    updateDisplay();
    updateStats();

    // Animate money change
    if (winAmount > 0) {
        animateMoneyWin(winAmount);
    }

    // Check if player is out of money
    if (playerMoney < 10) {
        setTimeout(() => {
            showGameOverModal();
        }, 2000);
    }

    // Show new game button
    setTimeout(() => {
        document.getElementById('new-game-btn').style.display = 'inline-flex';
        animateElement(document.getElementById('new-game-btn'), 'bounce');
    }, 1000);
}

// Show game over modal
function showGameOverModal() {
    const overlay = document.createElement('div');
    overlay.className = 'all-in-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'all-in-modal';
    
    const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
    
    modal.innerHTML = `
        <h3>💸 GAME OVER 💸</h3>
        <p>You're out of money!</p>
        <div style="margin: 20px 0;">
            <div style="font-size: 1.1rem; margin: 10px 0;">Games Played: <span style="color: var(--primary-gold);">${gamesPlayed}</span></div>
            <div style="font-size: 1.1rem; margin: 10px 0;">Win Rate: <span style="color: var(--primary-gold);">${winRate}%</span></div>
        </div>
        <div class="modal-buttons">
            <button class="modal-btn modal-btn-confirm" onclick="resetGame()">START OVER</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    window.gameOverOverlay = overlay;
    playTone(200, 1);
}

// Reset entire game
function resetGame() {
    playerMoney = 1000;
    gamesPlayed = 0;
    gamesWon = 0;
    
    if (window.gameOverOverlay) {
        document.body.removeChild(window.gameOverOverlay);
        window.gameOverOverlay = null;
    }
    
    newGame();
    playTone(600, 0.3);
}

// Start new game
function newGame() {
    gameActive = false;
    dealerHidden = true;
    playerHand = [];
    dealerHand = [];
    currentBet = 0;

    clearCards(); // Clear the display
    updateDisplay();
    updateMessage("Place your bet and click 'Deal' to start!", 'neutral', '🎲');

    document.getElementById('deal-btn').disabled = false;
    document.getElementById('new-game-btn').style.display = 'none';
    document.getElementById('betting-controls').style.display = 'flex';
    
    // Reset bet input
    document.getElementById('bet-amount').value = '50';
    updateCurrentBetDisplay();
}

// Enable/disable player actions
function enablePlayerActions() {
    document.getElementById('hit-btn').disabled = false;
    document.getElementById('stand-btn').disabled = false;
    document.getElementById('double-btn').disabled = playerHand.length !== 2 || currentBet > playerMoney;
    document.getElementById('deal-btn').disabled = true;
    document.getElementById('betting-controls').style.display = 'none';
}

function disablePlayerActions() {
    document.getElementById('hit-btn').disabled = true;
    document.getElementById('stand-btn').disabled = true;
    document.getElementById('double-btn').disabled = true;
}

function updateGameState() {
    enablePlayerActions();
}

// Update display with animations
function updateDisplay() {
    updateCards();
    updateHandValue('dealer-value', dealerHand, dealerHidden);
    updateHandValue('player-value', playerHand, false);

    // Animate money changes
    const moneyElement = document.getElementById('money');
    if (moneyElement && moneyElement.textContent !== playerMoney.toString()) {
        animateElement(moneyElement, 'pulse');
        moneyElement.textContent = playerMoney;
    }
    
    const currentBetElement = document.getElementById('current-bet');
    if (currentBetElement) {
        currentBetElement.textContent = currentBet;
    }
}

function updateCards() {
    updateCardsForHand('dealer-cards', dealerHand, dealerHidden);
    updateCardsForHand('player-cards', playerHand, false);
}

function updateCardsForHand(containerId, hand, hideFirstCard) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Clear and rebuild all cards to ensure proper display
    container.innerHTML = '';
    
    hand.forEach((card, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.style.animationDelay = `${index * 0.1}s`;

        if (hideFirstCard && index === 0) {
            cardDiv.className += ' card-back';
            cardDiv.innerHTML = '🂠<br>HIDDEN';
        } else {
            const isRed = card.suit === '♥' || card.suit === '♦';
            cardDiv.className += isRed ? ' red' : ' black';
            cardDiv.innerHTML = `
                <div>${card.value}</div>
                <div style="text-align: center; font-size: 20px;">${card.suit}</div>
                <div style="transform: rotate(180deg); text-align: right;">${card.value}</div>
            `;
        }

        container.appendChild(cardDiv);
    });
}

function updateHandValue(elementId, hand, hideFirst) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const valueElement = element.querySelector('.value-number');
    if (!valueElement) return;
    
    if (hideFirst && hand.length > 0) {
        const visibleCards = hand.slice(1);
        const visibleValue = calculateHandValue(visibleCards);
        valueElement.textContent = `${visibleValue} + ?`;
    } else {
        const value = calculateHandValue(hand);
        valueElement.textContent = value;
        
        // Highlight dangerous values
        if (value > 21) {
            valueElement.style.color = '#ef4444';
            animateElement(valueElement, 'shake');
        } else if (value === 21) {
            valueElement.style.color = '#22c55e';
            animateElement(valueElement, 'pulse');
        } else {
            valueElement.style.color = 'var(--primary-gold)';
        }
    }
}

function updateMessage(message, type, icon = '🎲') {
    const messageElement = document.getElementById('game-message');
    if (!messageElement) return;
    
    const messageContent = messageElement.querySelector('.message-content');
    const messageIcon = messageElement.querySelector('.message-icon');
    const messageText = messageElement.querySelector('.message-text');
    
    if (messageIcon) messageIcon.textContent = icon;
    if (messageText) messageText.textContent = message;
    messageElement.className = `game-message message-${type}`;
    
    // Animate message appearance
    animateElement(messageElement, 'bounce');
}

// Update game statistics
function updateStats() {
    const gamesPlayedElement = document.getElementById('games-played');
    const winRateElement = document.getElementById('win-rate');
    
    if (gamesPlayedElement) {
        gamesPlayedElement.textContent = gamesPlayed;
    }
    
    if (winRateElement) {
        const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
        winRateElement.textContent = `${winRate}%`;
    }
}

// Animation utilities
function animateElement(element, animationType) {
    if (!element) return;
    
    element.style.animation = 'none';
    element.offsetHeight; // Trigger reflow
    
    switch (animationType) {
        case 'shake':
            element.style.animation = 'shake 0.5s ease-in-out';
            break;
        case 'pulse':
            element.style.animation = 'pulse 0.6s ease-in-out';
            break;
        case 'bounce':
            element.style.animation = 'bounce 0.6s ease-in-out';
            break;
        case 'glow':
            element.style.animation = 'glow 1s ease-in-out';
            break;
    }
    
    setTimeout(() => {
        element.style.animation = '';
    }, 1000);
}

function animateMoneyWin(amount) {
    const moneyElement = document.getElementById('money');
    if (!moneyElement) return;
    
    const winIndicator = document.createElement('div');
    
    winIndicator.textContent = `+$${amount}`;
    winIndicator.style.cssText = `
        position: absolute;
        color: #22c55e;
        font-weight: bold;
        font-size: 1.2rem;
        z-index: 1000;
        pointer-events: none;
        animation: moneyWin 2s ease-out forwards;
    `;
    
    const rect = moneyElement.getBoundingClientRect();
    winIndicator.style.left = rect.left + 'px';
    winIndicator.style.top = rect.top + 'px';
    
    document.body.appendChild(winIndicator);
    
    setTimeout(() => {
        if (document.body.contains(winIndicator)) {
            document.body.removeChild(winIndicator);
        }
    }, 2000);
}

// Add CSS animations dynamically
function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            25% { transform: translateY(-10px); }
            50% { transform: translateY(0); }
            75% { transform: translateY(-5px); }
        }
        
        @keyframes glow {
            0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.3); }
            50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
        }
        
        @keyframes moneyWin {
            0% { 
                transform: translateY(0) scale(1);
                opacity: 1;
            }
            100% { 
                transform: translateY(-50px) scale(1.5);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Event listeners for bet input
document.addEventListener('DOMContentLoaded', function() {
    addAnimationStyles();
    
    const betInput = document.getElementById('bet-amount');
    if (betInput) {
        betInput.addEventListener('input', updateCurrentBetDisplay);
        betInput.addEventListener('focus', () => {
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
        });
    }
    
    // Initialize the game
    initGame();
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (!gameActive) return;
    
    const hitBtn = document.getElementById('hit-btn');
    const standBtn = document.getElementById('stand-btn');
    const doubleBtn = document.getElementById('double-btn');
    
    switch(e.key.toLowerCase()) {
        case 'h':
            if (hitBtn && !hitBtn.disabled) {
                hit();
            }
            break;
        case 's':
            if (standBtn && !standBtn.disabled) {
                stand();
            }
            break;
        case 'd':
            if (doubleBtn && !doubleBtn.disabled) {
                doubleDown();
            }
            break;
    }
});

// Start the game
initGame();