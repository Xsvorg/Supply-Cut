import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestRunnerService } from '../services/test-runner.service';
import { GameEngineService } from '../services/game-engine.service';

@Component({
  selector: 'app-test-terminal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-black z-50 flex flex-col font-mono text-xs md:text-sm p-4 text-green-500 overflow-hidden">
        <!-- Scanlines -->
        <div class="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/scan-lines.png')] opacity-20"></div>
        
        <!-- Header -->
        <div class="flex justify-between items-center border-b border-green-800 pb-2 mb-4 shrink-0">
            <div>
                <h1 class="text-xl font-bold tracking-widest">FIELD MANUAL DIAGNOSTICS // V.1.0.4</h1>
                <p class="text-green-800 uppercase">Automated Verification Protocol</p>
            </div>
            <div class="text-right">
                <div class="text-2xl font-bold">{{ progressPercent() }}%</div>
                <div class="text-[10px] animate-pulse" [class.invisible]="!runner.isRunning()">EXECUTING...</div>
            </div>
        </div>

        <!-- Terminal Output -->
        <div class="flex-1 overflow-y-auto space-y-1 font-mono pr-2" #terminal>
            @for (res of runner.results(); track res.id) {
                <div class="flex gap-4 border-b border-green-900/30 py-1 items-start animate-in fade-in slide-in-from-left-2 duration-300">
                    <span class="w-16 opacity-50">{{ res.category.split(' ')[0].toUpperCase() }}</span>
                    <span class="flex-1">{{ res.name }}</span>
                    <span class="w-32 text-right font-bold" [class.text-red-500]="!res.passed" [class.text-green-400]="res.passed">
                        {{ res.passed ? '[PASS]' : '[FAIL]' }}
                    </span>
                    @if(res.message) {
                        <span class="text-green-700 text-[10px] italic">{{ res.message }}</span>
                    }
                </div>
            }
        </div>

        <!-- Controls -->
        <div class="mt-4 pt-4 border-t border-green-800 flex justify-between items-center shrink-0">
            <div class="flex gap-4">
                <div class="flex flex-col">
                    <span class="text-[10px] text-green-800">PASSED</span>
                    <span class="text-xl font-bold">{{ passCount() }}</span>
                </div>
                <div class="flex flex-col">
                    <span class="text-[10px] text-green-800">FAILED</span>
                    <span class="text-xl font-bold text-red-500">{{ failCount() }}</span>
                </div>
            </div>
            
            <div class="flex gap-4">
                <button (click)="exitDiagnostics()" class="px-6 py-3 border border-green-800 hover:bg-green-900 text-green-600 hover:text-green-400 transition-colors uppercase tracking-widest font-bold rounded">
                    Return to HQ
                </button>
                <!-- FIX: Replace *ngIf with @if block -->
                @if (!runner.isRunning()) {
                <button 
                    (click)="runner.runAllTests()" 
                    class="px-6 py-3 bg-green-900 hover:bg-green-800 text-green-100 transition-colors uppercase tracking-widest font-bold rounded shadow-[0_0_15px_rgba(22,163,74,0.3)]">
                    Re-Run Diagnostics
                </button>
                }
            </div>
        </div>
    </div>
  `
})
export class TestTerminalComponent {
  runner = inject(TestRunnerService);
  game = inject(GameEngineService);

  readonly progressPercent = computed(() => Math.floor((this.runner.progress() / this.runner.totalTests) * 100));
  
  readonly passCount = computed(() => this.runner.results().filter(r => r.passed).length);
  readonly failCount = computed(() => this.runner.results().filter(r => !r.passed).length);

  ngOnInit() {
      // Auto-start
      this.runner.runAllTests();
  }

  exitDiagnostics() {
      this.runner.cancel();
      this.game.initMenu();
  }
}
