
import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../services/game-engine.service';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="relative group cursor-pointer transition-all duration-300 transform select-none touch-manipulation h-full w-full max-w-[140px] animate-float"
      [class.hover:-translate-y-4]="isPlayable()"
      [class.hover:rotate-1]="isPlayable()"
      [class.opacity-50]="!isPlayable() && !isMatch()"
      [class.grayscale]="!isPlayable() && !isMatch()"
      (click)="onClick()"
    >
      <!-- Card Body (Paper) -->
      <div class="w-full aspect-[2/3] rounded-sm shadow-xl flex flex-col overflow-hidden relative border border-stone-400 bg-[#e3dac9]"
           [class.ring-4]="isMatch()"
           [class.ring-emerald-600]="isMatch()"
           [class.ring-offset-2]="isMatch()"
           [class.ring-offset-slate-900]="isMatch()">
           
        <!-- Texture Overlays -->
        <div class="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply" style="background-image: url('https://www.transparenttextures.com/patterns/cardboard.png');"></div>
        <div class="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-br from-yellow-100/50 to-stone-900/30"></div>

        <!-- Header -->
        <div class="w-full p-1.5 border-b border-stone-800/20 flex flex-col shrink-0 relative z-10 bg-stone-100/50">
             <div class="flex justify-between items-center">
                <span class="text-[8px] font-mono text-stone-600 uppercase tracking-tight font-bold">FIELD ORDER</span>
                <span class="text-[10px] font-bold text-stone-900 font-mono">{{ card().id.substring(0,4) }}</span>
             </div>
             <div class="text-[11px] font-stencil font-bold text-stone-800 uppercase tracking-widest text-center mt-1 border-t border-stone-400/50 pt-1">
                {{ prettyType() }}
             </div>
        </div>

        <!-- Main Content Area -->
        <div class="flex-1 flex flex-col items-center justify-center relative p-1 z-10">
            <!-- Icon Watermark -->
            <div class="absolute inset-0 flex items-center justify-center opacity-10 text-8xl grayscale pointer-events-none">
                 {{ typeIcon() }}
            </div>

            <!-- The Number (Stamped Effect) -->
            <div class="text-7xl font-black font-stencil tracking-tighter relative transform -rotate-2"
                 [class.text-stone-800]="!isMatch()"
                 [class.text-emerald-800]="isMatch()">
                 {{ card().value }}
                 <div class="absolute inset-0 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/grunge-wall.png')] mix-blend-screen pointer-events-none"></div>
            </div>

            <div class="mt-2 text-4xl filter drop-shadow-sm">{{ typeIcon() }}</div>
        </div>

        <!-- Strategy Footer -->
        <div class="w-full bg-stone-800 text-[#e3dac9] p-2 flex flex-col items-center z-10 shrink-0 text-center relative border-t-2 border-stone-900">
             <div class="text-[9px] font-bold font-mono leading-none uppercase tracking-wide text-amber-500">
                {{ strategyText() }}
             </div>
        </div>

        <!-- Match Overlay -->
        @if(isMatch()) {
             <div class="absolute inset-0 bg-emerald-500/10 pointer-events-none z-0"></div>
             <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 border-4 border-emerald-600 text-emerald-800 font-black text-lg p-2 uppercase tracking-widest opacity-80 mix-blend-multiply pointer-events-none whitespace-nowrap mask-stamp">
                APPROVED
             </div>
        }
      </div>

      <!-- Hover Tooltip -->
      <div class="absolute bottom-full mb-2 w-[200px] left-1/2 -translate-x-1/2 bg-slate-900 border-2 border-amber-500 text-amber-500 p-3 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 text-center">
          <h4 class="font-bold text-base font-stencil uppercase tracking-wider">{{ prettyType() }}</h4>
          <p class="text-xs text-slate-300 font-mono mt-2 normal-case leading-snug">
              {{ tooltipText() }}
          </p>
      </div>
    </div>
  `,
  styles: [`
    .animate-float {
        animation: float 6s ease-in-out infinite;
    }
    @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
        100% { transform: translateY(0px); }
    }
    .mask-stamp {
        mask-image: url('https://www.transparenttextures.com/patterns/grunge-wall.png');
    }
  `]
})
export class CardComponent {
  readonly card = input.required<Card>();
  readonly targetValue = input<number | null>(null);
  readonly cardClicked = output<string>();

  readonly isMatch = computed(() => this.card().value === this.targetValue());
  readonly isPlayable = computed(() => this.card().isPlayable);
  
  readonly typeIcon = computed(() => {
    switch (this.card().type) {
      case 'HEAVY_WEAPON': return '🚀';
      case 'LIGHT_WEAPON': return '🔫';
      case 'EXPLOSIVE': return '🧨';
      case 'AIRSTRIKE': return '✈️';
      case 'INTEL': return '📷';
      default: return '❓';
    }
  });

  readonly prettyType = computed(() => {
    switch(this.card().type) {
       case 'HEAVY_WEAPON': return 'Anti-Tank';
       case 'LIGHT_WEAPON': return 'Rifleman';
       case 'EXPLOSIVE': return 'Demolition';
       case 'AIRSTRIKE': return 'Air Support';
       case 'INTEL': return 'Recon Intel';
       default: return this.card().type;
    }
  });

  readonly strategyText = computed(() => {
      switch(this.card().type) {
          case 'HEAVY_WEAPON': return 'VS: TANKS & BUNKERS';
          case 'LIGHT_WEAPON': return 'VS: INFANTRY';
          case 'EXPLOSIVE': return 'VS: BUNKERS & TANKS';
          case 'AIRSTRIKE': return 'VS: ANY TARGET';
          case 'INTEL': return 'ACTION: REVEAL TARGET';
          default: return 'UNKNOWN';
      }
  });

  readonly tooltipText = computed(() => {
      switch(this.card().type) {
          case 'HEAVY_WEAPON': return 'Use against heavily armored targets like Panzers and Fortified Bunkers. Ineffective against infantry.';
          case 'LIGHT_WEAPON': return 'Standard issue rifle. Effective against enemy infantry squads only. Will ricochet off armor.';
          case 'EXPLOSIVE': return 'High-yield explosives for destroying fortified structures and disabling enemy tanks.';
          case 'AIRSTRIKE': return 'Calls in a fighter-bomber. A rare and powerful wild card that can destroy any single target.';
          case 'INTEL': return 'Use on a grid coordinate to reveal the enemy type in that sector, allowing for strategic planning. Gathers intel on a random sector if used on a ghost signal.';
          default: return 'No tactical data available.';
      }
  });

  onClick() {
    this.cardClicked.emit(this.card().id);
  }
}
