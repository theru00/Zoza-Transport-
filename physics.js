import { Engine, Bodies, Composite, Body, Events } from 'matter-js';
import { playBallHitSound } from './sounds.js';

export function initPhysics() {
    const engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
    const table = document.getElementById('pool-table');
    const tableWidth = table.offsetWidth;
    const tableHeight = tableHeight;
    const border = tableWidth * 0.05;

    // Walls
    const wallOptions = { isStatic: true, render: { fillStyle: '#5d4037' } };
    const walls = [
        Bodies.rectangle(tableWidth / 2, 0, tableWidth, border, wallOptions),
        Bodies.rectangle(tableWidth / 2, tableHeight, tableWidth, border, wallOptions),
        Bodies.rectangle(0, tableHeight / 2, border, tableHeight, wallOptions),
        Bodies.rectangle(tableWidth, tableHeight / 2, border, tableHeight, wallOptions),
    ];

    // Pockets
    const pocketSize = tableWidth * 0.075;
    const pockets = [
        { x: border, y: border },
        { x: tableWidth - border, y: border },
        { x: tableWidth / 2, y: border },
        { x: border, y: tableHeight - border },
        { x: tableWidth - border, y: tableHeight - border },
        { x: tableWidth / 2, y: tableHeight - border },
    ].map(pos => ({
        ...pos,
        body: Bodies.circle(pos.x, pos.y, pocketSize / 2, { isStatic: true, isSensor: true, render: { fillStyle: '#111' } }),
    }));

    // Balls
    const ballRadius = tableWidth * 0.025;
    const balls = createBalls(tableWidth, tableHeight, ballRadius);

    Composite.add(engine.world, [...walls, ...pockets.map(p => p.body), ...balls.all, balls.cue]);

    // Collision detection for pocketed balls
    Events.on(engine, 'collisionStart', event => {
        event.pairs.forEach(pair => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            if (bodyA.isSensor || bodyB.isSensor) {
                const ball = bodyA.label.startsWith('ball-') || bodyA.label === 'cue-ball' ? bodyA : bodyB;
                if (ball) {
                    Composite.remove(engine.world, ball);
                    ball.isPocketed = true;
                }
            }
        });
    });

    // Collision sound
    Events.on(engine, 'collisionStart', event => {
        event.pairs.forEach(pair => {
            if ((pair.bodyA.label.startsWith('ball-') || pair.bodyA.label === 'cue-ball') &&
                (pair.bodyB.label.startsWith('ball-') || pair.bodyB.label === 'cue-ball')) {
                playBallHitSound();
            }
        });
    });

    Matter.Runner.run(engine);
    return engine;
}

function createBalls(tableWidth, tableHeight, ballRadius) {
    const ballColors = [
        { number: 1, color: '#FF0D0D' },
        { number: 2, color: '#0D47FF' },
        { number: 3, color: '#CC00CC' },
        { number: 4, color: '#FF6600' },
        { number: 5, color: '#FFCC00' },
        { number: 6, color: '#00CC00' },
        { number: 7, color: '#990000' },
        { number: 8, color: '#000000' },
        { number: 9, color: '#FF0D0D', stripe: true },
        { number: 10, color: '#0D47FF', stripe: true },
        { number: 11, color: '#CC00CC', stripe: true },
        { number: 12, color: '#FF6600', stripe: true },
        { number: 13, color: '#FFCC00', stripe: true },
        { number: 14, color: '#00CC00', stripe: true },
        { number: 15, color: '#990000', stripe: true },
    ];

    const startX = tableWidth * 0.75;
    const startY = tableHeight / 2;
    let solids = [], stripes = [], eightBall;

    const shuffledBalls = [...ballColors.filter(b => b.number !== 8)];
    shuffledBalls.sort(() => Math.random() - 0.5);
    shuffledBalls.splice(4, 0, ballColors.find(b => b.number === 8));

    const balls = shuffledBalls.map((ballInfo, index) => {
        const row = Math.floor((Math.sqrt(8 * index + 1) - 1) / 2);
        const col = index - row * (row + 1) / 2;
        const x = startX + (col - row / 2) * (ballRadius * 2.1);
        const y = startY - row * (ballRadius * 1.8);

        const ball = Bodies.circle(x, y, ballRadius, {
            restitution: 0.95,
            friction: 0.01,
            frictionAir: 0.01,
            render: {
                fillStyle: ballInfo.color,
                strokeStyle: ballInfo.stripe ? '#FFFFFF' : 'transparent',
                lineWidth: 5,
            },
            label: `ball-${ballInfo.number}`,
            number: ballInfo.number,
            isStriped: ballInfo.stripe || false,
            isPocketed: falsa,
        });

        if (ballInfo.number === 8) eightBall = ball;
        else if (ballInfo.stripe) stripes.push(ball);
        else solids.push(ball);

        return ball;
    });

    const cueBall = Bodies.circle(tableWidth / 4, tableHeight / 2, ballRadius, {
        restitution: 0.95,
        friction: 0.01,
        frictionAir: 0.01,
        render: { fillStyle: '#FFFFFF' },
        label: 'cue-ball',
        isPocketed: false,
    });

    return { all: balls, cue: cueBall, solids, stripes, eightBall };
}

export function getCueBall() {
    return Composite.allBodies(engine.world).find(body => body.label === 'cue-ball');
}

export function getBalls() {
    const balls = Composite.allBodies(engine.world).filter(body => body.label.startsWith('ball-'));
    return {
        all: balls,
        solids: balls.filter(b => !b.isStriped && b.number !== 8),
        stripes: balls.filter(b => b.isStriped),
        eightBall: balls.find(b => b.number === 8),
    };
}

export function getPockets() {
    return Composite.allBodies(engine.world).filter(body => body.isSensor);
}

export function checkPocketedBalls(gameState) {
    const cueBall = getCueBall();
    const balls = getBalls().all;
    const pocketedBalls = balls.filter(b => b.isPocketed);
    return { cue: cueBall?.isPocketed || false, balls: pocketedBalls };
}