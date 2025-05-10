const ballHitSound = new Audio('assets/ball-hit.wav');
const pocketSound = new Audio('assets/pocket.wav');

export function playBallHitSound() {
    ballHitSound.currentTime = 0;
    ballHitSound.play().catch(() => {});
}

export function playPocketSound() {
    pocketSound.currentTime = 0;
    pocketSound.play().catch(() => {});
}