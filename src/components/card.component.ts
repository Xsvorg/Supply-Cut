
import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../services/game-engine.service';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="relative group cursor-pointer transition-all duration-200 transform hover:-translate-y-2 select-none touch-manipulation h-full"
      (click)="onClick()"
    >
      <!-- Card Body -->
      <div class="w-full aspect-[2/3] rounded-lg border-2 shadow-lg flex flex-col items-center justify-between p-2 overflow-hidden bg-[#e2e8f0] text-slate-900 border-slate-400 relative"
           [class.border-emerald-500]="isMatch()"
           [class.ring-4]="isMatch()"
           [class.ring-emerald-400]="isMatch()"
           [class.bg-indigo-100]="card().type === 'INTEL'">
        
        <!-- Type Decorator Background -->
        <div class="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none overflow-hidden">
          <span class="text-6xl grayscale">{{ typeIcon() }}</span>
        </div>

        <!-- Top Metadata -->
        <div class="w-full flex justify-between text-[10px] lg:text-xs font-bold opacity-60 uppercase tracking-tighter z-10">
          <span>{{ prettyType() }}</span>
        </div>

        <!-- Main Value -->
        <div class="text-5xl lg:text-6xl font-black font-stencil tracking-tighter z-10"
             [class.text-emerald-700]="isMatch()"
             [class.text-indigo-800]="card().type === 'INTEL'">
          {{ card().value }}
        </div>

        <!-- Weapon Icon Large -->
        <div class="text-3xl z-10 h-10 flex items-center justify-center">{{ typeIcon() }}</div>

        <!-- Status / Action Indicator -->
        <div class="w-full text-center py-1 rounded text-[10px] font-bold text-white uppercase transition-colors z-10"
          [class.bg-emerald-600]="isMatch()"
          [class.bg-indigo-600]="card().type === 'INTEL' && isMatch()"
          [class.bg-slate-500]="!isMatch()">
          @if (isMatch()) {
            {{ card().type === 'INTEL' ? 'SABOTAGE' : 'EXECUTE' }}
          } @else {
            HOLD
          }
        </div>
      </div>
      
      <!-- Match Indicator Pulse -->
      @if (isMatch()) {
        <div class="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full animate-ping z-20"></div>
      }
    </div>
  `
})
export class CardComponent {
  readonly card = input.required<Card>();
  readonly targetValue = input<number | null>(null);
  readonly cardClicked = output<string>();

  readonly isMatch = computed(() => this.card().value === this.targetValue());
  
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
       case 'HEAVY_WEAPON': return 'ANTI-TANK';
       case 'LIGHT_WEAPON': return 'RIFLE';
       case 'EXPLOSIVE': return 'SATCHEL';
       case 'INTEL': return 'RECON';
       default: return this.card().type;
    }
  });

  onClick() {
    this.cardClicked.emit(this.card().id);
  }
}
