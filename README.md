# White Noise Web App

A lightweight browser-based white-noise generator built with plain HTML, CSS, and JavaScript.

## Features

- Play and pause noise at any time
- Tone control with a frequency slider (implemented as a low-pass filter)
- Volume control slider
- Sleep timer in minutes with live countdown while playing
- Timer pauses when playback is paused and resumes from remaining time
- Reduced global output level for safer listening

## Default Settings

- Tone: `740 Hz`
- Volume slider: `20%`
- Global output attenuation: `50%` (final loudness is half of the slider value)
- Timer: `Off` (`0` minutes)

## Project Structure

- `index.html` - App layout and UI controls
- `styles.css` - Visual styling
- `app.js` - Audio generation, filtering, volume, and timer logic

## How to Run

### Option 1: Open directly

1. Open the project folder.
2. Double-click `index.html` in your file explorer.

### Option 2: Run from a local server (recommended)

From the project folder, run:

```bash
npx --yes serve .
```

Then open the URL shown in the terminal (usually `http://localhost:3000`).

## How to Use

1. Click **Play** to start noise.
2. Adjust **Tone** to shape brightness:
   - Lower values sound darker/softer
   - Higher values sound brighter
3. Adjust **Volume** as needed.
4. (Optional) Enter timer minutes:
   - `0` = play until manually paused
   - `>0` = auto-stop after countdown

## Technical Notes

- Audio is generated with the **Web Audio API**.
- White noise is created from random samples in an `AudioBuffer` and looped.
- A `BiquadFilterNode` (`lowpass`) controls tone.
- A `GainNode` controls volume and applies global attenuation.
- Browser autoplay rules require a user interaction before audio starts.

## Safety

- Start at low volume, especially with headphones.
- Increase volume gradually to avoid hearing fatigue.
