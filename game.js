import { initPhysics, getCueBall, getBalls, getPockets, checkPocketedBalls } from './physics.js';
import { initUI, updateUI, showFoulMessage, showGameOver, startAiming, stopAiming } from './ui.js';
import { takeAIShot } from './ai.js';
import { playBallHitSound, playPocketSound } from './sounds.js';

const gameState = {
    started: false,
    playerTurn: true,
    timer: 15,
    playerType: null,
    aiType: null,
    gameOver: false,
    shotInProgress: false,
    difficulty: 'medium',
    foulReason: '',
};

let engine, timerInterval;

export function initGame() {
    gameState.started = false;
    gameState.playerTurn = true;
    gameState.playerType = null;
    gameState.aiType = null;
    gameState.gameOver = false;
    gameState.shotInProgress = false;
    gameState.foulReason = '';

    engine = initPhysics();
    initUI(startTurn, endGame, setDifficulty);
    updateUI(gameState);
}

function startTurn() {
    if (gameState.gameOver) return;

    gameState.timer = 15;
    updateUI(gameState);

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        gameState.timer--;
        updateUI(gameState);
        if (gameState.timer <= 0) {
            clearInterval(timerInterval);
            endTurn(true, 'Time ran out');
        }
    }, 1000);

    if (gameState.playerTurn) {
        startAiming();
    } else {
        setTimeout(() => takeAIShot(gameState, engine), 1500);
    }
}

function endTurn(foul, reason = '') {
    if (gameState.gameOver) return;

    gameState.foulReason = foul ? reason : '';
    stopAiming();
    clearInterval(timerInterval);

    if (foul) {
        showFoulMessage(reason);
        gameState.playerTurn = !gameState.playerTurn;
    }

    const pocketed = checkPocketedBalls(gameState);
    handlePocketedBalls(pocketed);

    if (!gameState.gameOver) {
        startTurn();
    }
}

function handlePocketedBalls(pocketed) {
    const cuePocketed = pocketed.cue;
    const eightPocketed = pocketed.balls.some(ball => ball.number === 8);

    if (cuePocketed) {
        showFoulMessage('Cue ball pocketed');
        endTurn(true, 'Cue ball pocketed');
        return;
    }

    if (eightPocketed) {
        const playerBalls = gameState.playerType === 'solid' ? getBalls().solids : getBalls().stripes;
        const remaining = playerBalls.filter(ball => !ball.isPocketed);
        if (remaining.length === 0 && gameState.playerTurn) {
            endGame('You win!');
        } else {
            endGame(gameState.playerTurn ? 'You lose!' : 'AI wins!');
        }
        return;
    }

    if (!gameState.playerType && pocketed.balls.length > 0) {
        const firstBall = pocketed.balls[0];
        if (firstBall.number !== 8) {
            gameState.playerType = gameState.playerTurn ? (firstBall.isStriped ? 'stripes' : 'solid') : (firstBall.isStriped ? 'solid' : 'stripes');
            gameState.aiType = gameState.playerType === 'solid' ? 'stripes' : 'solid';
        } else {
            endTurn(true, '8-ball pocketed on break');
            return;
        }
    }

    if (gameState.playerType && pocketed.balls.length > 0) {
        const validBalls = pocketed.balls.filter(ball =>
            (gameState.playerType === 'solid' && !ball.isStriped) ||
            (gameState.playerType === 'stripes' && ball.isStriped)
        );
        if (validBalls.length > 0 && !gameState.playerTurn) {
            gameState.playerTurn = true;
            startTurn();
        } else if (validBalls.length === 0) {
            endTurn(true, 'Wrong ball pocketed');
        }
    } else {
        gameState.playerTurn = !gameState.playerTurn;
    }

    if (pocketed.balls.length > 0) {
        playPocketSound();
    }
}

function endGame(message) {
    gameState.gameOver = true;
    clearInterval(timerInterval);
    showGameOver(message);
}

function setDifficulty(difficulty) {
    gameState.difficulty = difficulty;
}

initGame();