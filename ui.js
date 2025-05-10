import { Body, Vector } from 'matter-js';
import { getCueBall } from './physics.js';

let table, cueElement, shotPreview, timerDisplay, turnDisplay, statusDisplay, foulDisplay, powerMeter, powerLevel;
let settingsMenu, settingsButton, restartButton, difficultySelect;
let aiming = false, power = 0, powerHeld = false, shotCallback;
let touchStart = null;

export function initUI(startTurn, endGame, setDifficulty) {
    table = document.getElementById('pool-table');
    cueElement = document.getElementById('cue');
    shotPreview = document.getElementById('shot-preview');
    timerDisplay = document.getElementById('timer');
    turnDisplay = document.getElementById('player-turn');
    statusDisplay = document.getElementById('game-status');
    foulDisplay = document.getElementById('foul-message');
    powerMeter = document.getElementById('power-meter');
    powerLevel = document.getElementById('power-level');
    settingsMenu = document.getElementById('settings-menu');
    settingsButton = document.getElementById('settings-button');
    restartButton = document.getElementById('restart-button');
    difficultySelect = document.getElementById('ai-difficulty');

    table.addEventListener('mousedown', handleMouseDown);
    table.addEventListener('mousemove', handleMouseMove);
    table.addEventListener('mouseup', handleMouseUp);
    table.addEventListener('touchstart', handleTouchStart, { passive: false });
    table.addEventListener('touchmove', handleTouchMove, { passive: false });
    table.addEventListener('touchend', handleTouchEnd, { passive: false });

    settingsButton.addEventListener('click', () => settingsMenu.classList.toggle('hidden'));
    document.getElementById('close-settings').addEventListener('click', () => settingsMenu.classList.add('hidden'));
    restartButton.addEventListener('click', () => location.reload());
    difficultySelect.addEventListener('change', () => setDifficulty(difficultySelect.value));

    if (!gameState.started) {
        table.addEventListener('click', placeCueBall);
    }
}

function placeCueBall(e) {
    const rect = table.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x <= table.offsetWidth / 4) {
        Body.setPosition(getCueBall(), { x, y });
        gameState.started = true;
        table.removeEventListener('click', placeCueBall);
        startTurn();
    }
}

function handleMouseDown(e) {
    if (!aiming || gameState.shotInProgress) return;
    powerHeld = true;
    updatePower();
}

function handleMouseMove(e) {
    if (!aiming) return;
    const rect = table.getBoundingClientRect();
    const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    updateAim(pos);
}

function handleMouseUp(e) {
    if (!aiming || !powerHeld) return;
    powerHeld = false;
    takeShot();
}

function handleTouchStart(e) {
    e.preventDefault();
    if (!aiming || gameState.shotInProgress) return;
    touchStart = e.touches[0];
    powerHeld = true;
    updatePower();
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!aiming) return;
    const rect = table.getBoundingClientRect();
    const pos = { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    updateAim(pos);
}

function handleTouchEnd(e) {
    e.preventDefault();
    if (!aiming || !powerHeld) return;
    powerHeld = false;
    takeShot();
}

function updatePower() {
    if (!powerHeld) return;
    power = Math.min(power + 2, 100);
    powerLevel.style.width = `${power}%`;
    if (power < 100) {
        requestAnimationFrame(updatePower);
    }
}

function updateAim(pos) {
    const cueBall = getCueBall();
    if (!cueBall) return;

    const cuePos = cueBall.position;
    const angle = Math.atan2(pos.y - cuePos.y, pos.x - cuePos.x);

    cueElement.style.left = `${cuePos.x}px`;
    cueElement.style.top = `${cuePos.y}px`;
    cueElement.style.transform = `rotate(${angle}rad)`;

    shotPreview.style.left = `${cuePos.x}px`;
    shotPreview.style.top = `${cuePos.y}px`;
    shotPreview.style.transform = `rotate(${angle}rad)`;
    shotPreview.style.display = 'block';
}

function takeShot() {
    if (!aiming || gameState.shotInProgress) return;

    const cueBall = getCueBall();
    const angle = parseFloat(cueElement.style.transform.replace(/[^0-9.-]/g, '')) || 0;
    const force = 0.2 + (power / 100) * 0.5;

    const forceVector = {
        x: -Math.cos(angle) * force * 0.05,
        y: -Math.sin(angle) * force * 0.05,
    };

    Body.applyForce(cueBall, cueBall.position, forceVector);
    gameState.shotInProgress = true;
    stopAiming();
    shotCallback();
}

export function startAiming() {
    aiming = true;
    cueElement.style.display = 'block';
    powerMeter.style.display = 'block';
    power = 0;
    powerLevel.style.width = '0%';
}

export function stopAiming() {
    aiming = false;
    cueElement.style.display = 'none';
    shotPreview.style.display = 'none';
    powerMeter.style.display = 'none';
}

export function updateUI(gameState) {
    timerDisplay.textContent = gameState.timer;
    turnDisplay.textContent = gameState.playerTurn ? 'Your turn' : "AI's turn";
}

export function showFoulMessage(reason) {
    foulDisplay.textContent = `Foul: ${reason}`;
    foulDisplay.style.display = 'block';
    setTimeout(() => foulDisplay.style.display = 'none', 3000);
}

export function showGameOver(message) {
    statusDisplay.textContent = message;
    statusDisplay.style.display = 'block';
}