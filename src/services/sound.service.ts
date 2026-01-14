
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private audioCtx: AudioContext | null = null;
  private isMuted = false;

  constructor() {
    // Lazy load audio context
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
  }

  playCall(text: string) {
    if (this.isMuted) return;
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 0.8; // Lower pitch for radio effect
      utterance.volume = 0.8;
      // Try to find a stern voice
      const voices = window.speechSynthesis.getVoices();
      const sternVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('David'));
      if (sternVoice) utterance.voice = sternVoice;
      window.speechSynthesis.speak(utterance);
    }
  }

  // Synthesized Sound Effects (No assets required)

  playTick() {
    if (this.isMuted || !this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.05);
  }

  playExplosion() {
    if (this.isMuted || !this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    
    // Noise buffer
    const bufferSize = this.audioCtx.sampleRate * 0.5; // 0.5 sec
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = this.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    
    // Low pass filter
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.4);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.audioCtx.destination);
    noise.start();
  }

  playAlarm() {
    if (this.isMuted || !this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(400, t + 0.3);
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.3);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(t + 0.3);
  }

  playRouteCut() {
    if (this.isMuted || !this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    // Major chord arpeggio
    [440, 554, 659, 880].forEach((freq, i) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i*0.1);
      gain.gain.linearRampToValueAtTime(0.2, t + i*0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i*0.1 + 0.4);
      osc.connect(gain);
      gain.connect(this.audioCtx!.destination);
      osc.start(t + i*0.1);
      osc.stop(t + i*0.1 + 0.5);
    });
  }
}
