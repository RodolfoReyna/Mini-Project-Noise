(function () {
  "use strict";

  const playPauseBtn = document.getElementById("playPause");
  const btnLabel = playPauseBtn.querySelector(".btn-label");
  const frequencyInput = document.getElementById("frequency");
  const frequencyValue = document.getElementById("frequencyValue");
  const volumeInput = document.getElementById("volume");
  const volumeValue = document.getElementById("volumeValue");
  const timerMinutesInput = document.getElementById("timerMinutes");
  const timerDisplay = document.getElementById("timerDisplay");

  /** @type {AudioContext | null} */
  let audioContext = null;
  /** @type {AudioBufferSourceNode | null} */
  let noiseSource = null;
  /** @type {BiquadFilterNode | null} */
  let filterNode = null;
  /** @type {GainNode | null} */
  let gainNode = null;

  let isPlaying = false;
  /** Absolute performance.now() when timer fires; 0 = no active countdown */
  let timerEndTime = 0;
  /** Remaining ms saved when pausing (timer continues only while playing) */
  let pausedTimerRemainingMs = 0;
  let timerRafId = 0;

  const NOISE_DURATION = 2;
  const OUTPUT_ATTENUATION = 0.5;

  function formatFrequency(hz) {
    if (hz >= 1000) {
      return (hz / 1000).toFixed(hz % 1000 === 0 ? 0 : 1) + " kHz";
    }
    return Math.round(hz) + " Hz";
  }

  function updateFrequencyLabel() {
    frequencyValue.textContent = formatFrequency(Number(frequencyInput.value));
  }

  function updateVolumeLabel() {
    volumeValue.textContent = volumeInput.value + "%";
  }

  function ensureContext() {
    if (!audioContext) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioContext = new AC();
    }
    return audioContext;
  }

  function createNoiseBuffer(ctx) {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * NOISE_DURATION);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function connectGraph() {
    const ctx = ensureContext();
    if (noiseSource) {
      try {
        noiseSource.stop();
      } catch (_) {}
      noiseSource.disconnect();
      noiseSource = null;
    }

    const buffer = createNoiseBuffer(ctx);
    noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    filterNode = ctx.createBiquadFilter();
    filterNode.type = "lowpass";
    filterNode.frequency.value = Number(frequencyInput.value);
    filterNode.Q.value = 0.7;

    gainNode = ctx.createGain();
    gainNode.gain.value = (Number(volumeInput.value) / 100) * OUTPUT_ATTENUATION;

    noiseSource.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(ctx.destination);

    noiseSource.start(0);
  }

  function applyFilterAndVolume() {
    if (filterNode) {
      filterNode.frequency.setValueAtTime(
        Number(frequencyInput.value),
        ensureContext().currentTime
      );
    }
    if (gainNode) {
      gainNode.gain.setValueAtTime(
        (Number(volumeInput.value) / 100) * OUTPUT_ATTENUATION,
        ensureContext().currentTime
      );
    }
  }

  function clearTimerLoop() {
    if (timerRafId) {
      cancelAnimationFrame(timerRafId);
      timerRafId = 0;
    }
  }

  function updateTimerDisplay(remainingMs) {
    if (remainingMs <= 0) {
      timerDisplay.textContent = "Off";
      return;
    }
    const totalSec = Math.ceil(remainingMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    timerDisplay.textContent =
      m > 0 ? m + ":" + String(s).padStart(2, "0") : s + "s";
  }

  function timerLoop() {
    if (!isPlaying || timerEndTime <= 0) {
      clearTimerLoop();
      return;
    }
    const now = performance.now();
    const left = timerEndTime - now;
    if (left <= 0) {
      stopPlayback();
      timerDisplay.textContent = "Done";
      clearTimerLoop();
      return;
    }
    updateTimerDisplay(left);
    timerRafId = requestAnimationFrame(timerLoop);
  }

  function getTimerMinutes() {
    return Math.max(0, Math.min(999, Number(timerMinutesInput.value) || 0));
  }

  function startTimerIfNeeded() {
    clearTimerLoop();
    const minutes = getTimerMinutes();
    const now = performance.now();

    if (pausedTimerRemainingMs > 0) {
      timerEndTime = now + pausedTimerRemainingMs;
      pausedTimerRemainingMs = 0;
    } else if (minutes > 0) {
      timerEndTime = now + minutes * 60 * 1000;
    } else {
      timerEndTime = 0;
      timerDisplay.textContent = "Off";
      return;
    }

    updateTimerDisplay(timerEndTime - now);
    timerRafId = requestAnimationFrame(timerLoop);
  }

  function stopPlayback() {
    if (timerEndTime > 0) {
      const left = timerEndTime - performance.now();
      pausedTimerRemainingMs = left > 0 ? left : 0;
    }
    isPlaying = false;
    playPauseBtn.setAttribute("aria-pressed", "false");
    playPauseBtn.setAttribute("aria-label", "Play");
    btnLabel.textContent = "Play";

    if (noiseSource) {
      try {
        noiseSource.stop();
      } catch (_) {}
      noiseSource.disconnect();
      noiseSource = null;
    }
    filterNode = null;
    gainNode = null;
    clearTimerLoop();
    timerEndTime = 0;
  }

  async function startPlayback() {
    const ctx = ensureContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    connectGraph();
    applyFilterAndVolume();
    isPlaying = true;
    playPauseBtn.setAttribute("aria-pressed", "true");
    playPauseBtn.setAttribute("aria-label", "Pause");
    btnLabel.textContent = "Pause";
    startTimerIfNeeded();
  }

  playPauseBtn.addEventListener("click", async () => {
    if (isPlaying) {
      stopPlayback();
      if (pausedTimerRemainingMs > 0) {
        updateTimerDisplay(pausedTimerRemainingMs);
      } else if (getTimerMinutes() <= 0) {
        timerDisplay.textContent = "Off";
      }
    } else {
      await startPlayback();
    }
  });

  frequencyInput.addEventListener("input", () => {
    updateFrequencyLabel();
    applyFilterAndVolume();
  });

  volumeInput.addEventListener("input", () => {
    updateVolumeLabel();
    applyFilterAndVolume();
  });

  timerMinutesInput.addEventListener("change", () => {
    const v = getTimerMinutes();
    timerMinutesInput.value = String(v);
    pausedTimerRemainingMs = v > 0 ? v * 60 * 1000 : 0;
    if (isPlaying && v > 0) {
      pausedTimerRemainingMs = 0;
      startTimerIfNeeded();
    } else if (!isPlaying && v > 0) {
      updateTimerDisplay(v * 60 * 1000);
    } else if (v <= 0) {
      pausedTimerRemainingMs = 0;
      if (!isPlaying) {
        timerDisplay.textContent = "Off";
      }
    }
  });

  updateFrequencyLabel();
  updateVolumeLabel();
})();
