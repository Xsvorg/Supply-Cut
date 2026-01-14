
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameEngineService, GridCell } from '../services/game-engine.service';

@Component({
  selector: 'app-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative bg-slate-900/90 p-4 rounded-xl border-4 border-slate-700 shadow-2xl backdrop-blur-sm h-full flex flex-col">
      <!-- Decor: Topo Lines -->
      <div class="absolute inset-0 opacity-20 pointer-events-none" 
           style="background-image: repeating-linear-gradient(45deg, #475569 0, #475569 1px, transparent 0, transparent 50%); background-size: 20px 20px;">
      </div>

      <!-- Current Battle Label -->
      <div class="absolute -top-3 left-6 bg-slate-800 px-3 border border-slate-600 text-xs text-slate-400 uppercase tracking-widest font-bold z-20">
         {{ game.currentBattle().name }} // {{ game.currentBattle().year }}
      </div>

      <!-- THE GRID ITSELF -->
      <div class="relative flex-1 grid gap-3 z-10 w-full"
           [style.grid-template-columns]="gridColStyle()">
        @for (cell of game.grid(); track cell.id) {
          <div 
            class="relative w-full h-full min-h-[60px] lg:min-h-[80px] rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-300 overflow-hidden group"
            [class.border-slate-600]="!cell.isDaubed && !cell.isObjective"
            [class.bg-slate-800]="!cell.isDaubed"
            [class.border-emerald-500]="cell.isDaubed"
            [class.bg-emerald-900]="cell.isDaubed"
            [class.opacity-50]="cell.isDaubed"
            [class.border-amber-500]="cell.isObjective && !cell.isDaubed"
            [class.ring-2]="cell.isObjective && !cell.isDaubed"
            [class.ring-amber-500]="cell.isObjective && !cell.isDaubed"
          >
            <!-- Map Texture -->
            @if (!cell.isDaubed) {
                <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]"></div>
            }

            <!-- ID Tag -->
            <div class="absolute top-1 left-1 text-[10px] text-slate-500 font-mono z-20 bg-slate-900/90 px-1.5 rounded border border-slate-700/50">{{ cell.id }}</div>
            
            <!-- Value -->
            <div class="text-3xl lg:text-5xl font-black font-stencil z-20 drop-shadow-md relative" 
                 [class.text-slate-100]="!cell.isDaubed"
                 [class.text-emerald-400]="cell.isDaubed"
                 [class.scale-0]="cell.isDaubed"> <!-- Shrink value on death -->
              {{ cell.value }}
            </div>

            <!-- Enemy Icon -->
            @if (!cell.isDaubed) {
              <div class="absolute inset-0 flex items-center justify-center opacity-30 z-10 select-none text-5xl lg:text-6xl group-hover:opacity-50 transition-opacity" [title]="cell.enemyType">
                {{ getEnemyIcon(cell) }}
              </div>
            }

            <!-- Type Label -->
             @if (!cell.isDaubed) {
                <div class="absolute bottom-1 w-full text-center text-[9px] uppercase tracking-widest text-slate-400 z-20 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    {{ getEnemyName(cell) }}
                </div>
             }

            <!-- Special Icon -->
            @if (cell.special && !cell.isDaubed) {
              <div class="absolute top-1 right-1 text-lg animate-pulse z-30">📦</div>
            }

            <!-- Destroyed Marker -->
            @if (cell.isDaubed) {
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in duration-300">
                <div class="w-16 h-16 border-4 border-emerald-500 rounded-full opacity-90 transform -rotate-12 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center justify-center">
                    <span class="text-emerald-500 font-bold text-xs uppercase -rotate-12">Cleared</span>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class GridComponent {
  game = inject(GameEngineService);

  // Dynamic column calculation
  readonly gridColStyle = computed(() => {
    const cols = this.game.currentBattle().gridCols;
    return `repeat(${cols}, minmax(0, 1fr))`;
  });

  getEnemyIcon(cell: GridCell): string {
    switch(cell.enemyType) {
      case 'HEAVY': return '🚜';
      case 'INFANTRY': return '🪖';
      case 'STRUCTURE': return '🏯';
      default: return '';
    }
  }

  getEnemyName(cell: GridCell): string {
      const isAllies = this.game.faction() === 'ALLIES';
      switch(cell.enemyType) {
          case 'HEAVY': return isAllies ? 'PANZER' : 'SHERMAN';
          case 'INFANTRY': return isAllies ? 'INFANTRY' : 'GI SQUAD';
          case 'STRUCTURE': return isAllies ? 'BUNKER' : 'OUTPOST';
          default: return 'UNIT';
      }
  }
}
