# Neon Rush Runner

A fast neon-themed 3D endless runner built with HTML, CSS, vanilla JavaScript, Three.js, and the Web Audio API.

Race through a glowing metro track, dodge obstacles, collect coins, unlock achievements, and use power-ups like magnet, shield, boost, hoverboard, double coins, and slow motion.

## Live Demo

[Play Game](https://neon-rush-runner.vercel.app/)

## Features

- 3D endless runner gameplay
- Three-lane movement system
- Procedural neon metro world
- Coins, obstacles, power-ups, combo, score, and distance tracking
- Character selection
- Daily reward system
- Achievements with locked and unlocked states
- Local high score and coin bank using LocalStorage
- Responsive desktop and mobile controls
- Keyboard, swipe, and touch button controls
- Web Audio music and sound effects
- Rain, fog, speed lines, screen shake, and particle effects
- No backend and no build step required

## Tech Stack

- HTML5
- CSS3
- JavaScript
- Three.js
- GSAP
- Web Audio API

## Controls

### Desktop

- Left: `Arrow Left` or `A`
- Right: `Arrow Right` or `D`
- Jump: `Arrow Up`, `W`, or `Space`
- Slide: `Arrow Down` or `S`
- Pause: `Esc` or `P`

### Mobile

- Swipe left or right to change lanes
- Swipe up to jump
- Swipe down to slide
- Use the on-screen touch buttons

## Run Locally

Open `index.html` in a modern browser.

For the best result, run it with a local server:

```bash
python -m http.server 5173
```

Then open:

```text
http://127.0.0.1:5173/
```

## Deploy On Vercel

Use these settings:

- Framework Preset: `Other`
- Build Command: leave empty
- Output Directory: leave empty or use `.`
- Root Directory: project folder containing `index.html`

The project is fully static, so it does not need Node.js, a backend, or a build command.

## Project Structure

```text
NeonRush/
├── index.html
├── style.css
├── main.js
├── player.js
├── world.js
├── ui.js
├── audio.js
├── controls.js
├── effects.js
├── assets/
│   ├── images/
│   ├── models/
│   ├── sounds/
│   └── textures/
└── README.md
```

## Performance Tips

- Use the in-game Quality toggle if the game feels slow.
- Keep browser hardware acceleration enabled.
- Close heavy background tabs while playing.
- For public deployment, consider self-hosting CDN libraries for maximum reliability.

## Credits

Created with Love by [Faizan Ali](https://www.instagram.com/faiizanaly/).
