import { Body, Vector } from 'matter-js';
import { getCueBall, getBalls, getPockets } from './physics.js';

export function takeAIShot(gameState, engine) {
    if (gameState.gameOver) return;

    const cueBall = getCueBall();
    const targetBalls = gameState.aiType === 'solid' ? getBalls().solids : getBalls().stripes;
    const eightBall = getBalls().eightBall;
    const pockets = getPockets();
    const difficulty = gameState.difficulty;

    let bestShot = null;
    let bestScore = -Infinity;

    const candidates = targetBalls.length > 0 ? targetBalls : (eightBall ? [eightBall] : []);

    candidates.forEach(ball => {
        pockets.forEach(pocket => {
            const score = evaluateShot(cueBall, ball, pocket, difficulty);
            if (score > bestScore) {
                bestScore = score;
                bestShot = { ball, pocket };
            }
        });
    });

    if (bestShot) {
        const { ball, pocket } = bestShot;
        const angle = Math.atan2(ball.position.y - cueBall.position.y, ball.position.x - cueBall.position.x);
        const force = difficulty === 'hard' ? 0.5 : difficulty === 'medium' ? 0.4 : 0.3;
        const forceVector = {
            x: -Math.cos(angle) * force * 0.05,
            y: -Math.sin(angle) * force * 0.05,
        };

        Body.applyForce(cueBall, cueBall.position, forceVector);
    } else {
        const angle = Math.random() * Math.PI * 2;
        const force = 0.3;
        Body.applyForce(cueBall, cueBall.position, {
            x: -Math.cos(angle) * force * 0.05,
            y: -Math.sin(angle) * force * 0.05,
        });
    }

    gameState.shotInProgress = true;
    Events.on(engine, 'afterUpdate', checkBallMovement);

    function checkBallMovement() {
        if (gameState.shotInProgress) {
            const movingBalls = [...getBalls().all, getCueBall()].filter(ball => Body.getSpeed(ball) > 0.1);
            if (movingBalls.length === 0) {
                Events.off(engine, 'afterUpdate', checkBallMovement);
                gameState.shotInProgress = false;
                endTurn(false);
            }
        }
    }
}

function evaluateShot(cueBall, targetBall, pocket, difficulty) {
    const cueToBall = Vector.sub(targetBall.position, cueBall.position);
    const ballToPocket = Vector.sub(pocket.position, targetBall.position);
    const distanceCueToBall = Vector.magnitude(cueToBall);
    const distanceBallToPocket = Vector.magnitude(ballToPocket);
    const angle = Vector.angle(cueToBall, ballToPocket);

    let score = 1000;
    score -= distanceCueToBall * 2;
    score -= distanceBallToPocket * 3;
    score -= Math.abs(angle) * 100;

    if (difficulty === 'hard') {
        score += Math.random() * 50;
    } else if (difficulty === 'medium') {
        score += Math.random() * 100;
    } else {
        score += Math.random() * 200;
    }

    return score;
}