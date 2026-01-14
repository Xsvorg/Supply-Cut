
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameEngineService } from './services/game-engine.service';
import { SoundService } from './services/sound.service';
import { CardComponent } from './components/card.component';
import { GridComponent } from './components/grid.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, CardComponent, GridComponent],
  template: `
    <div class="h-screen w-screen bg-[#0f1115] text-slate-200 crt overflow-hidden font-mono flex flex-col">
      
      <!-- BACKGROUND OVERLAY -->
      <div class="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black -z-10"></div>
      
      <!-- GAME VIEW (Only visible when Playing/Paused/Tut) -->
      @if (['PLAYING', 'PAUSED', 'TUTORIAL'].includes(game.gameState())) {
        <div class="flex-1 w-full h-full flex flex-col lg:flex-row gap-4 p-4 relative z-10 transition-all duration-300">

            <!-- LEFT PANEL: MAP & OBJECTIVES -->
            <div class="flex-[2] flex flex-col gap-4 h-full">
            
            <!-- HUD / HEADER -->
            <div class="flex items-center justify-between bg-slate-900/90 p-4 border-b-2 border-slate-700 rounded-lg backdrop-blur shadow-lg shrink-0">
                <div class="flex items-center gap-6">
                <div class="flex flex-col">
                     <span class="text-[10px] text-slate-500 uppercase tracking-widest">{{ game.faction() }} CAMPAIGN</span>
                     <span class="text-xl font-mono text-amber-500 tracking-widest uppercase font-bold">{{ game.currentBattle().name }}</span>
                </div>
                <div class="h-8 w-px bg-slate-600"></div>
                <div class="text-base text-slate-300">
                    SECURED: <span class="text-emerald-400 font-bold text-2xl ml-2">{{ game.routesCutCount() }}/{{ game.currentBattle().routesToCut }}</span>
                </div>
                </div>
                
                <div class="flex gap-4 items-center font-mono">
                <!-- Pause Button -->
                <button (click)="game.togglePause()" 
                        class="px-4 py-2 border border-slate-600 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors text-xs font-bold tracking-wider uppercase min-w-[80px]">
                    {{ game.gameState() === 'PAUSED' ? 'RESUME' : 'PAUSE' }}
                </button>

                <div class="flex flex-col items-end">
                    <span class="text-slate-500 text-[10px] uppercase">Supplies</span>
                    <span class="text-amber-400 text-3xl font-bold leading-none">{{ game.resources().supplies }}</span>
                </div>
                <button (click)="sound.toggleMute()" class="p-3 bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-600 transition-colors">
                    🔊
                </button>
                </div>
            </div>

            <!-- THE GRID (FLEX GROW TO FILL) -->
            <div class="relative flex-1 min-h-0">
                <app-grid class="h-full w-full block" />
                @if(game.tutorialStep() === 1) {
                    <div class="absolute inset-0 bg-amber-500/10 border-4 border-amber-500 animate-pulse pointer-events-none rounded-xl"></div>
                    <div class="absolute -top-12 left-10 bg-slate-900 text-amber-500 p-3 rounded border border-amber-500 text-sm z-50 font-bold shadow-lg">
                    INTELLIGENCE: Match coordinates. Deploy specific weapons against Enemy Types.
                    </div>
                }
            </div>

            <!-- ROUTES STATUS (Bottom Bar) -->
            <div class="grid gap-4 shrink-0 h-16" [style.grid-template-columns]="'repeat(' + game.routes().length + ', minmax(0, 1fr))'">
                @for (route of game.routes(); track route.id) {
                <div class="bg-slate-900/60 p-2 px-4 rounded border border-slate-700 flex flex-col justify-center relative overflow-hidden transition-all duration-500 group hover:border-slate-500"
                    [class.border-emerald-500]="route.isCut"
                    [class.bg-emerald-900]="route.isCut">
                    <div class="flex justify-between items-center z-10 mb-1">
                    <span class="text-xs text-slate-400 uppercase tracking-widest font-bold group-hover:text-slate-200">{{ route.name }}</span>
                    @if (route.isCut) {
                        <span class="text-[10px] text-black font-bold bg-emerald-400 px-2 py-0.5 rounded shadow-lg animate-bounce">SECURE</span>
                    } @else {
                        <span class="text-[10px] text-emerald-500 font-bold border border-emerald-500/30 px-2 rounded">ACTIVE</span>
                    }
                    </div>
                    <div class="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                    <div class="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" [style.width]="route.isCut ? '0%' : '100%'"></div>
                    </div>
                </div>
                }
            </div>

            </div>

            <!-- RIGHT PANEL: CALLER & HAND -->
            <div class="flex-1 lg:flex-[0.8] xl:flex-[0.6] flex flex-col gap-4 relative h-full min-w-[350px]">

            <!-- ENEMY INTEL (CALLER) -->
            <div class="bg-slate-800 border-4 border-slate-700 rounded-xl p-4 flex flex-col items-center relative overflow-hidden shadow-2xl transition-all shrink-0"
                [class.border-amber-500]="game.tutorialStep() === 2"
                [class.scale-105]="game.tutorialStep() === 2">
                
                <div class="absolute inset-0 opacity-20 pointer-events-none" style="background-image: radial-gradient(black 15%, transparent 16%), radial-gradient(black 15%, transparent 16%); background-size: 4px 4px; background-position: 0 0, 2px 2px;"></div>
                
                <div class="text-slate-400 text-sm font-mono mb-2 z-10 tracking-[0.2em] uppercase border-b border-slate-600 pb-1 w-full text-center">Intercepted Signal</div>
                
                @if (game.gameState() === 'PLAYING' || game.gameState() === 'TUTORIAL') {
                <div class="text-8xl lg:text-9xl font-black text-amber-500 font-stencil tracking-tighter z-10 drop-shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse">
                    {{ game.currentCall() ?? '--' }}
                </div>
                
                <!-- THREAT METER -->
                <div class="w-full mt-4 z-10 relative" [class.z-50]="game.tutorialStep() === 4">
                    <div class="flex justify-between text-xs text-slate-400 mb-2 font-bold">
                    <span>ENEMY TRACE SIGNAL</span>
                    <span>{{ game.threatLevel() | number:'1.0-0' }}%</span>
                    </div>
                    <div class="h-8 bg-black rounded border-2 border-slate-600 overflow-hidden relative shadow-inner">
                    <!-- Pulsing Bar -->
                    <div 
                        class="h-full transition-all duration-300 ease-out"
                        [class.bg-gradient-to-r]="true"
                        [class.from-red-900]="game.threatLevel() > 80"
                        [class.to-red-600]="game.threatLevel() > 80"
                        [class.from-amber-700]="game.threatLevel() <= 80"
                        [class.to-amber-500]="game.threatLevel() <= 80"
                        [style.width.%]="game.threatLevel()">
                    </div>
                    
                    <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/scan-lines.png')] opacity-30"></div>

                    @if (game.threatLevel() > 80) {
                        <div class="absolute inset-0 bg-red-500/30 animate-ping"></div>
                    }
                    </div>
                    <div class="text-xs text-red-400 mt-2 text-center animate-pulse font-black tracking-widest h-4" [class.invisible]="game.threatLevel() < 80">
                    ⚠️ DETECTION IMMINENT ⚠️
                    </div>
                </div>

                } @else {
                <div class="text-6xl text-slate-600 font-stencil z-10 py-8">--</div>
                }
            </div>

            <!-- BATTLE LOG (Flexible Height) -->
            <div class="relative bg-black/60 rounded-lg border border-slate-700 flex-[0.5] overflow-hidden flex flex-col font-mono text-sm shadow-inner min-h-[150px]">
                <div class="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none"></div>
                
                <div class="text-slate-500 bg-slate-900/80 px-4 py-2 text-xs font-bold border-b border-slate-700 uppercase tracking-wider z-20 flex justify-between shrink-0">
                    <span>Comms Log</span>
                    <span class="text-emerald-500 animate-pulse">● LIVE</span>
                </div>
                
                <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-2 pt-4">
                    @for (log of game.logs(); track log.id) {
                    <div class="animate-in slide-in-from-left-2 fade-in duration-300 flex gap-3 items-start leading-tight">
                        <span class="text-slate-600 text-[10px] whitespace-nowrap mt-0.5 opacity-60 font-mono">{{log.timestamp}}</span>
                        <span class="font-bold tracking-wide"
                            [class.text-red-400]="log.type==='DANGER'" 
                            [class.text-emerald-400]="log.type==='GOOD'"
                            [class.text-slate-300]="log.type==='INFO'">
                        {{ log.text }}
                        </span>
                    </div>
                    }
                </div>
            </div>

            <!-- PLAYER HAND & CONTROLS (Bottom Fixed) -->
            <div class="flex-1 flex flex-col justify-end relative bg-slate-800/20 rounded-xl p-3 border border-slate-700/50 min-h-[300px]"
                [class.z-50]="game.tutorialStep() === 3">
                <div class="text-xs text-slate-500 mb-3 text-center uppercase tracking-[0.3em] font-bold border-b border-slate-700 pb-2">Available Orders</div>
                
                <!-- CARDS GRID -->
                <div class="grid grid-cols-3 gap-3 mb-4 flex-1">
                    @for (card of game.hand(); track card.id) {
                    <div class="flex justify-center h-full">
                        <app-card 
                        class="w-full h-full"
                        [card]="card" 
                        [targetValue]="game.currentCall()"
                        (cardClicked)="game.playCard($event)"
                        />
                    </div>
                    }
                </div>

                <!-- RECYCLE BUTTON -->
                <button 
                    class="w-full bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 border-2 border-slate-500 text-slate-200 font-bold py-4 px-6 rounded-lg uppercase tracking-widest transition-all text-sm flex items-center justify-between group shadow-xl active:scale-[0.98] shrink-0"
                    (click)="game.recycleHand()"
                    [disabled]="game.resources().supplies < 1">
                    <div class="flex flex-col items-start">
                    <span class="group-hover:text-white transition-colors">REQUEST NEW ORDERS</span>
                    <span class="text-[10px] text-slate-400 font-normal normal-case">Scramble hand. ⚠️ +Threat</span>
                    </div>
                    <span class="bg-amber-600 text-black px-3 py-1 rounded text-xs font-black shadow-lg">-1 SUPPLY</span>
                </button>
                
                <!-- EMERGENCY SUPPLY BUTTON -->
                @if (game.resources().supplies === 0) {
                <button 
                    class="w-full mt-3 bg-red-900/90 hover:bg-red-800 border-2 border-red-500 text-white font-bold py-3 px-4 rounded-lg uppercase tracking-widest transition-all text-xs flex items-center justify-between animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)] shrink-0"
                    (click)="game.emergencyResupply()">
                    <span class="flex items-center gap-2 text-lg">⚠️ <span class="text-sm">EMERGENCY DROP</span></span>
                    <div class="flex flex-col items-end text-[10px]">
                        <span>+3 SUPPLY</span>
                        <span class="text-red-300">+25% THREAT</span>
                    </div>
                </button>
                }

                @if(game.tutorialStep() === 3) {
                    <div class="absolute -top-16 inset-x-0 bg-slate-900 text-amber-500 p-4 rounded-lg border-2 border-amber-500 text-sm text-center font-bold shadow-2xl z-50">
                    Click Green Cards to ATTACK. <br>Use 'REQUEST NEW ORDERS' to swap bad cards.
                    </div>
                }
            </div>
            </div>

        </div>
      }

      <!-- START MENU -->
      @if (game.gameState() === 'MENU') {
         <div class="absolute inset-0 bg-black flex flex-col items-center justify-center z-50">
            <div class="w-full h-full absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30"></div>
            
            <div class="relative z-10 text-center space-y-8 animate-in fade-in duration-1000 zoom-in-90">
                <div class="space-y-2">
                    <h1 class="text-8xl font-stencil text-amber-500 tracking-tighter drop-shadow-lg">SUPPLY CUT</h1>
                    <p class="text-2xl text-slate-400 tracking-[0.8em] font-light uppercase">Global Conflict 1939-1945</p>
                </div>

                <div class="flex gap-8 mt-12">
                    <!-- Allies Card -->
                    <div class="w-80 h-96 bg-slate-900/50 border-4 border-slate-700 hover:border-emerald-500 rounded-xl p-6 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:scale-105 hover:bg-slate-900"
                         (click)="game.selectFaction('ALLIES')">
                        <div class="text-6xl">⭐</div>
                        <h2 class="text-3xl font-stencil text-emerald-500">ALLIED FORCES</h2>
                        <p class="text-sm text-slate-400 text-center">Historical Timeline.<br>Liberate Europe from tyranny.</p>
                        <div class="mt-auto px-4 py-2 bg-emerald-900/30 text-emerald-500 rounded border border-emerald-900 text-xs font-bold tracking-widest uppercase">Select Campaign</div>
                    </div>

                    <!-- Axis Card -->
                    <div class="w-80 h-96 bg-slate-900/50 border-4 border-slate-700 hover:border-red-500 rounded-xl p-6 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:scale-105 hover:bg-slate-900"
                         (click)="game.selectFaction('AXIS')">
                        <div class="text-6xl">🦅</div>
                        <h2 class="text-3xl font-stencil text-red-500">AXIS POWERS</h2>
                        <p class="text-sm text-slate-400 text-center">Alternate History.<br>Conquer the globe.</p>
                         <div class="mt-auto px-4 py-2 bg-red-900/30 text-red-500 rounded border border-red-900 text-xs font-bold tracking-widest uppercase">Select Campaign</div>
                    </div>
                </div>
            </div>
         </div>
      }

      <!-- PAUSE MENU -->
      @if (game.gameState() === 'PAUSED') {
         <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div class="bg-slate-900 border-2 border-slate-600 p-8 rounded-xl shadow-2xl text-center max-w-sm w-full">
                <h2 class="text-3xl font-stencil text-slate-300 mb-6">MISSION PAUSED</h2>
                <div class="space-y-4">
                    <button (click)="game.togglePause()" class="w-full py-4 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded uppercase tracking-widest">Resume</button>
                    <button (click)="game.quitToMenu()" class="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded uppercase tracking-widest border border-slate-600">Abort to Menu</button>
                </div>
            </div>
         </div>
      }

      <!-- TUTORIAL CONTROLS OVERLAY -->
      @if (game.gameState() === 'TUTORIAL') {
        <div class="fixed bottom-10 left-0 right-0 flex justify-center z-[100] pointer-events-none">
          <div class="bg-slate-900/95 border-2 border-amber-500 p-8 rounded-xl shadow-2xl pointer-events-auto max-w-2xl w-full text-center backdrop-blur-md">
             <div class="text-amber-500 font-stencil text-3xl mb-4 border-b border-amber-500/30 pb-4">FIELD TRAINING</div>
             <p class="text-lg text-slate-200 mb-8 h-20 flex items-center justify-center px-4 font-mono leading-relaxed">
               @switch (game.tutorialStep()) {
                 @case (1) { Commander, welcome to the front. Secure {{ game.currentBattle().routesToCut }} Supply Routes to win. }
                 @case (2) { The INTERCEPTED SIGNAL (Top Right) shows the enemy's target coordinates. }
                 @case (3) { To attack, play a Card that MATCHES the coordinate number. }
                 @case (4) { KEY INTEL: Use matching weapons! Wrong weapons cause Threat Penalties! <br>🚀 vs 🚜/🏯 | 🔫 vs 🪖 | 🧨 vs 🏯/🚜 }
               }
             </p>
             <button (click)="game.advanceTutorial()" class="bg-amber-600 hover:bg-amber-500 text-black font-black py-4 px-12 rounded-lg uppercase text-xl tracking-widest shadow-lg hover:scale-105 transition-transform">
               {{ game.tutorialStep() === 4 ? 'BEGIN OFFENSIVE' : 'NEXT' }}
             </button>
          </div>
        </div>
        <div class="fixed inset-0 bg-black/70 z-0 pointer-events-none backdrop-blur-sm"></div>
      }

      <!-- MISSION BRIEFING -->
      @if (game.gameState() === 'BRIEFING') {
        <div class="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 px-4">
          <div class="bg-slate-900 border-2 border-slate-600 p-10 max-w-2xl w-full shadow-2xl rounded-xl text-center relative overflow-hidden">
            <div class="absolute -right-10 -top-10 text-[150px] opacity-5 text-white font-stencil select-none pointer-events-none">CONFIDENTIAL</div>
            
            <h3 class="text-sm text-slate-500 tracking-[0.5em] mb-4 uppercase">Mission Briefing // {{ game.currentBattle().year }}</h3>
            <h1 class="text-5xl font-stencil text-amber-500 mb-4">{{ game.currentBattle().name }}</h1>
            
            <p class="text-xl text-slate-300 font-mono mb-6 leading-relaxed border-y border-slate-700 py-6">
                "{{ game.currentBattle().description }}"
            </p>

            <div class="bg-slate-800/50 p-4 rounded border border-slate-700 mb-8">
                 <div class="text-amber-500 font-bold mb-2 uppercase tracking-wider text-sm">Intel Report</div>
                 <div class="text-slate-400 italic">"{{ game.currentBattle().introTip }}"</div>
            </div>

            <div class="grid grid-cols-2 gap-8 text-left mb-10 pl-8">
                <div>
                    <span class="block text-xs text-slate-500 uppercase">Resistance Level</span>
                    <span class="text-2xl font-bold" [class.text-green-500]="game.currentBattle().difficultyMultiplier < 1" [class.text-red-500]="game.currentBattle().difficultyMultiplier >= 1">
                        {{ game.currentBattle().difficultyMultiplier < 1 ? 'LOW' : 'EXTREME' }}
                    </span>
                </div>
                 <div>
                    <span class="block text-xs text-slate-500 uppercase">Area Size</span>
                    <span class="text-2xl text-slate-300 font-bold uppercase">{{ game.currentBattle().gridRows }}x{{ game.currentBattle().gridCols }} SECTOR</span>
                </div>
            </div>

            <button (click)="game.startBattle()" 
              class="w-full bg-amber-600 hover:bg-amber-500 text-black font-black py-5 px-6 rounded-lg uppercase tracking-[0.2em] transition-all text-2xl shadow-[0_0_20px_rgba(217,119,6,0.5)] hover:shadow-[0_0_30px_rgba(217,119,6,0.8)]">
              Deploy
            </button>
            <button (click)="game.quitToMenu()" class="mt-4 text-slate-500 hover:text-slate-300 underline text-xs">Return to HQ</button>
          </div>
        </div>
      }

      <!-- VICTORY / DEFEAT / WAR WON -->
      @if (['VICTORY', 'DEFEAT', 'WAR_WON'].includes(game.gameState())) {
        <div class="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-500 px-4">
          <div class="text-center max-w-xl border-4 border-slate-700 bg-slate-900 p-10 rounded-2xl shadow-2xl relative">
            
            <h1 class="text-7xl font-black font-stencil mb-6 drop-shadow-lg" 
                [class.text-emerald-500]="game.gameState() === 'VICTORY' || game.gameState() === 'WAR_WON'"
                [class.text-red-500]="game.gameState() === 'DEFEAT'">
              {{ game.gameState() === 'WAR_WON' ? 'WAR OVER' : game.gameState() }}
            </h1>

            @if (game.gameState() === 'WAR_WON') {
                <p class="text-xl text-slate-300 mb-8 font-mono">
                    Total Victory. The enemy has capitulated.<br>History has been written.
                </p>
                <button (click)="game.initMenu()" 
                  class="bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-5 px-10 rounded-lg border-2 border-emerald-500 uppercase w-full text-xl tracking-widest hover:scale-105 transition-transform">
                  Return to Menu
                </button>
            } @else {
                <div class="text-2xl text-slate-200 mb-8 font-mono border-b-2 border-slate-700 pb-8 leading-relaxed">
                {{ game.logs()[0]?.text }}
                </div>
                
                @if (game.gameState() === 'VICTORY') {
                    <button (click)="game.nextLevel()" 
                    class="bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-5 px-10 rounded-lg border-2 border-emerald-500 uppercase w-full text-xl tracking-widest hover:scale-105 transition-transform">
                    Next Battle
                    </button>
                }

                @if (game.gameState() === 'DEFEAT') {
                    <button (click)="game.restartLevel()" 
                    class="bg-slate-700 hover:bg-slate-600 text-white font-bold py-5 px-10 rounded-lg border-2 border-slate-500 uppercase w-full text-xl tracking-widest hover:scale-105 transition-transform">
                    Retry Mission
                    </button>
                }
                 <button (click)="game.quitToMenu()" class="mt-6 text-slate-500 hover:text-slate-300 underline text-xs">Abandon Campaign</button>
            }
          </div>
        </div>
      }

    </div>
  `
})
export class AppComponent {
  game = inject(GameEngineService);
  sound = inject(SoundService);

  ngOnInit() {
      this.game.initMenu();
  }
}
