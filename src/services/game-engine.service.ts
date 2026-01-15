import { Injectable, signal, computed, inject } from '@angular/core';
import { SoundService } from './sound.service';

/* --- Types --- */
export type Faction = 'ALLIES' | 'AXIS';
export type EnemyType = 'HEAVY' | 'INFANTRY' | 'STRUCTURE'; 
export type CardType = 'HEAVY_WEAPON' | 'LIGHT_WEAPON' | 'EXPLOSIVE' | 'AIRSTRIKE' | 'INTEL';
export type GameState = 'MENU' | 'BRIEFING' | 'TUTORIAL' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'DEFEAT' | 'WAR_WON' | 'DIAGNOSTICS';
export type SpecialCellType = 'SUPPLY_DROP' | 'COMMS_TOWER';

export interface Battle {
  id: string;
  name: string;
  year: string;
  description: string;
  difficultyMultiplier: number; // 1.0 to 2.5
  backgroundTheme: 'desert' | 'coastal' | 'beach' | 'snow' | 'urban' | 'forest' | 'plains';
  // Level Generation Config
  gridRows: number;
  gridCols: number;
  allowedEnemies: EnemyType[];
  routesToCut: number;
  introTip: string;
}

export interface Card {
  id: string;
  value: number;
  type: CardType;
  isPlayable: boolean; 
}

export interface GridCell {
  id: string;
  row: number;
  col: number;
  value: number;
  enemyType: EnemyType; 
  isDaubed: boolean;
  isObjective: boolean; 
  isRevealed: boolean; // For Intel mechanic
  special?: SpecialCellType;
  status?: 'destroyed' | 'active'; 
}

export interface Route {
  id: string;
  name: string;
  coords: string[];
  isCut: boolean;
}

export interface LogEntry {
  id: number;
  text: string;
  type: 'INFO' | 'DANGER' | 'GOOD';
  timestamp: string;
}

/* --- CAMPAIGN DATA (REBALANCED) --- */
const ALLIED_CAMPAIGN: Battle[] = [
  { 
    id: 'C1', name: 'Operation Torch', year: '1942', description: 'North Africa. Secure the landing zones.', 
    difficultyMultiplier: 0.6, backgroundTheme: 'desert',
    gridRows: 3, gridCols: 4, allowedEnemies: ['INFANTRY'], routesToCut: 1, // Easymode start
    introTip: "BOOT CAMP: Match numbers. Use RIFLES against Infantry."
  },
  { 
    id: 'C2', name: 'Sicily', year: '1943', description: 'Assault on the fortress.', 
    difficultyMultiplier: 0.9, backgroundTheme: 'coastal',
    gridRows: 3, gridCols: 5, allowedEnemies: ['INFANTRY', 'STRUCTURE'], routesToCut: 2,
    introTip: "TACTICS: Bunkers 🏯 require EXPLOSIVES 🧨. Use INTEL 📷 to identify threats."
  },
  { 
    id: 'C3', name: 'Normandy', year: '1944', description: 'Breaching the Atlantic Wall.', 
    difficultyMultiplier: 1.3, backgroundTheme: 'beach',
    gridRows: 4, gridCols: 5, allowedEnemies: ['INFANTRY', 'STRUCTURE', 'HEAVY'], routesToCut: 2,
    introTip: "WARNING: Heavy Tanks 🚜 detected! Use INTEL to confirm targets before spending Bazookas."
  },
  { 
    id: 'C4', name: 'The Bulge', year: '1944', description: 'Winter counter-offensive.', 
    difficultyMultiplier: 1.8, backgroundTheme: 'snow',
    gridRows: 4, gridCols: 6, allowedEnemies: ['INFANTRY', 'STRUCTURE', 'HEAVY'], routesToCut: 3,
    introTip: "HIGH ALERT: Threat rises faster. Prioritize COMMS TOWERS 🗼 to gain breathing room."
  },
  { 
    id: 'C5', name: 'Berlin', year: '1945', description: 'Final urban combat.', 
    difficultyMultiplier: 2.5, backgroundTheme: 'urban',
    gridRows: 5, gridCols: 6, allowedEnemies: ['INFANTRY', 'STRUCTURE', 'HEAVY'], routesToCut: 3,
    introTip: "FINALE: Expect heavy resistance and high-value targets."
  },
];

const AXIS_CAMPAIGN: Battle[] = [
  { 
    id: 'A1', name: 'Poland', year: '1939', description: 'The first strike.', 
    difficultyMultiplier: 0.6, backgroundTheme: 'plains',
    gridRows: 3, gridCols: 4, allowedEnemies: ['INFANTRY'], routesToCut: 1,
    introTip: "BASICS: Destroy Infantry with Small Arms."
  },
  { 
    id: 'A2', name: 'France', year: '1940', description: 'Bypassing the Maginot.', 
    difficultyMultiplier: 0.9, backgroundTheme: 'forest',
    gridRows: 3, gridCols: 5, allowedEnemies: ['INFANTRY', 'STRUCTURE'], routesToCut: 2,
    introTip: "TACTICS: Demolish enemy fortifications 🏯. Use INTEL 📷 to reveal targets."
  },
  { 
    id: 'A3', name: 'Russia', year: '1941', description: 'The long winter.', 
    difficultyMultiplier: 1.3, backgroundTheme: 'snow',
    gridRows: 4, gridCols: 5, allowedEnemies: ['INFANTRY', 'STRUCTURE', 'HEAVY'], routesToCut: 2,
    introTip: "ARMOR: Enemy Tanks 🚜 inbound. Use INTEL to confirm."
  },
  { 
    id: 'A4', name: 'London', year: '1942', description: 'Operation Sea Lion.', 
    difficultyMultiplier: 1.8, backgroundTheme: 'coastal',
    gridRows: 4, gridCols: 6, allowedEnemies: ['INFANTRY', 'STRUCTURE', 'HEAVY'], routesToCut: 3,
    introTip: "INVASION: Secure the capital. Destroy COMMS TOWERS 🗼 to disrupt their command."
  },
  { 
    id: 'A5', name: 'New York', year: '1946', description: 'Trans-Atlantic Invasion.', 
    difficultyMultiplier: 2.5, backgroundTheme: 'urban',
    gridRows: 5, gridCols: 6, allowedEnemies: ['INFANTRY', 'STRUCTURE', 'HEAVY'], routesToCut: 3,
    introTip: "VICTORY: Total domination."
  },
];

@Injectable({
  providedIn: 'root'
})
export class GameEngineService {
  private sound = inject(SoundService);

  // --- State Signals ---
  readonly gameState = signal<GameState>('MENU');
  readonly faction = signal<Faction>('ALLIES');
  readonly currentBattleIndex = signal<number>(0);
  readonly tutorialStep = signal<number>(0);
  
  readonly grid = signal<GridCell[]>([]);
  readonly hand = signal<Card[]>([]);
  readonly routes = signal<Route[]>([]);
  readonly logs = signal<LogEntry[]>([]);
  readonly threatChange = signal<{ amount: number, reason: string } | null>(null);

  // Caller State
  readonly currentCall = signal<number | null>(null);
  readonly threatLevel = signal<number>(0); 
  readonly resources = signal({ supplies: 4 });

  // Derived State
  readonly routesCutCount = computed(() => this.routes().filter(r => r.isCut).length);
  readonly currentCampaign = computed(() => this.faction() === 'ALLIES' ? ALLIED_CAMPAIGN : AXIS_CAMPAIGN);
  readonly currentBattle = computed(() => this.currentCampaign()[this.currentBattleIndex()]);

  // Private internal state
  private daubedSet = new Set<string>();
  private ticker: ReturnType<typeof setInterval> | undefined;
  private pulseTicker: ReturnType<typeof setInterval> | undefined;
  private tickerPausedUntil = 0;
  
  private baseThreatRate = 0.05; // Base per tick
  private lastTickSound = 0;

  /* --- Game Loop Control --- */

  initMenu() {
    this.gameState.set('MENU');
    this.sound.init(); 
  }

  selectFaction(f: Faction) {
    this.faction.set(f);
    this.currentBattleIndex.set(0);
    this.gameState.set('BRIEFING');
  }

  startBattle() {
    this.gameState.set('TUTORIAL');
    if (this.currentBattleIndex() > 0) {
      this.finishTutorial();
    } else {
      this.tutorialStep.set(1);
    }

    this.generateMap();
    this.dealSmartHand();
    this.logs.set([]);
    this.threatLevel.set(0);
    this.resources.set({ supplies: 4 }); 
    this.addLog(`DEPLOYMENT: ${this.currentBattle().name.toUpperCase()}`, 'INFO');
  }

  startDiagnostics() { this.stopTickers(); this.gameState.set('DIAGNOSTICS'); }
  nextLevel() {
    const nextIdx = this.currentBattleIndex() + 1;
    if (nextIdx >= this.currentCampaign().length) {
      this.gameState.set('WAR_WON');
    } else {
      this.currentBattleIndex.set(nextIdx);
      this.gameState.set('BRIEFING');
    }
  }
  togglePause() {
    if (this.gameState() === 'PLAYING') {
      this.gameState.set('PAUSED');
      this.stopTickers();
    } else if (this.gameState() === 'PAUSED') {
      this.gameState.set('PLAYING');
      this.startTicker();
    }
  }
  quitToMenu() { this.stopTickers(); this.gameState.set('MENU'); }
  restartLevel() { this.stopTickers(); this.startBattle(); }

  finishTutorial() {
    this.gameState.set('PLAYING');
    this.tutorialStep.set(0);
    this.addLog('Signal interceptor active.', 'INFO');
    this.nextCall();
    this.startTicker();
  }
  advanceTutorial() {
    this.sound.playTick();
    if (this.tutorialStep() >= 4) { this.finishTutorial(); } 
    else { this.tutorialStep.update(v => v + 1); }
  }

  public stopTickers() {
    if (this.ticker) clearInterval(this.ticker);
    if (this.pulseTicker) clearInterval(this.pulseTicker);
  }

  private startTicker() {
    this.stopTickers(); 
    const difficulty = this.currentBattle().difficultyMultiplier;

    this.ticker = setInterval(() => {
      if (this.gameState() !== 'PLAYING' || Date.now() < this.tickerPausedUntil) return;
      
      const currentThreat = this.threatLevel();
      if (currentThreat >= 100) { this.triggerThreatOverflow(); return; }

      if (currentThreat > 80) {
        const now = Date.now();
        if (now - this.lastTickSound > (800 - (currentThreat * 7))) { this.sound.playTick(); this.lastTickSound = now; }
      }

      let panicMultiplier = 1.0;
      if (currentThreat > 50) panicMultiplier = 1.2;
      if (currentThreat > 80) panicMultiplier = 1.5;

      const increase = (this.baseThreatRate * difficulty * panicMultiplier);
      this.threatLevel.update(t => Math.min(100, t + increase));
      
    }, 50); 
  }
  private triggerThreatOverflow() { this.endGame(false, 'POSITION OVERRUN.'); }

  private setThreat(value: number, reason: string) {
      const current = this.threatLevel();
      const clampedValue = Math.max(0, Math.min(100, value));
      const delta = clampedValue - current;
      this.threatLevel.set(clampedValue);
      
      this.threatChange.set({ amount: delta, reason });
      setTimeout(() => this.threatChange.set(null), 1000);
  }

  /* --- Core Mechanics --- */
  emergencyResupply() {
    if (this.resources().supplies > 0) return;
    this.addLog('EMERGENCY DROP INBOUND.', 'INFO');
    this.sound.playTick();
    this.resources.update(r => ({ ...r, supplies: 3 }));
    this.setThreat(this.threatLevel() + 25, 'EMERGENCY');
    this.dealSmartHand(false);
  }

  recycleHand() {
    if (this.gameState() !== 'PLAYING' && this.gameState() !== 'DIAGNOSTICS') return;
    const cost = 1;
    if (this.resources().supplies < cost) {
      this.addLog('Insufficient Supplies.', 'DANGER');
      return;
    }
    this.resources.update(r => ({ ...r, supplies: r.supplies - cost }));
    
    const penalty = Math.max(3, Math.ceil(5 * this.currentBattle().difficultyMultiplier));
    this.setThreat(this.threatLevel() + penalty, 'RECYCLE');
    
    this.addLog(`Comms chatter detected! +${penalty}% Threat.`, 'DANGER');
    this.sound.playTick();
    this.dealSmartHand(false);
  }

  playCard(cardId: string) {
    if (this.gameState() !== 'PLAYING' && this.gameState() !== 'DIAGNOSTICS') return;
    const card = this.hand().find(c => c.id === cardId);
    if (!card) return;
    if (card.value !== this.currentCall()) { this.addLog('MISMATCH! Check coordinates.', 'DANGER'); return; }

    const cell = this.grid().find(c => c.value === card.value);

    // FIX: Special logic for Intel card sabotage and regular use
    if (card.type === 'INTEL') {
        // Sabotage action: INTEL on an unrevealed STRUCTURE destroys it
        if (cell && cell.enemyType === 'STRUCTURE' && !cell.isRevealed) {
            this.sound.playExplosion();
            this.addLog(`Sabotage successful! Comms at ${cell.id} neutralized.`, 'GOOD');
            this.daubCell(cell.id);
            this.setThreat(this.threatLevel() - 15, 'SABOTAGE');
            
            this.hand.update(h => h.filter(c => c.id !== card.id));
            this.drawSingleSmartCard();
            this.nextCall();
        } else {
            // Regular intel gathering
            this.executeIntel(cell, card);
        }
        return;
    }
    
    if (!cell) { this.executeCounterIntel(card); return; }
    if (cell.isDaubed) return; 

    if (this.checkEffectiveness(card.type, cell.enemyType) === 'KILL') {
        this.executeHit(cell, card);
    } else {
        this.executePenalty(cell, card);
    }
  }

  private checkEffectiveness(weapon: CardType, enemy: EnemyType): 'KILL' | 'FAIL' {
    if (weapon === 'AIRSTRIKE') return 'KILL';
    if (enemy === 'HEAVY') return (weapon === 'HEAVY_WEAPON' || weapon === 'EXPLOSIVE') ? 'KILL' : 'FAIL';
    if (enemy === 'STRUCTURE') return (weapon === 'HEAVY_WEAPON' || weapon === 'EXPLOSIVE') ? 'KILL' : 'FAIL';
    if (enemy === 'INFANTRY') return (weapon === 'LIGHT_WEAPON') ? 'KILL' : 'FAIL';
    return 'FAIL';
  }

  private executeHit(cell: GridCell, card: Card) {
    this.sound.playExplosion();
    this.daubCell(cell.id);
    
    this.resources.update(r => ({...r, supplies: r.supplies + 1}));
    
    let threatReduction = 8;
    if (cell.enemyType === 'HEAVY' || cell.enemyType === 'STRUCTURE') threatReduction = 12;

    this.setThreat(this.threatLevel() - threatReduction, 'KILL');
    this.addLog(`${cell.enemyType} Neutralized.`, 'GOOD');

    if (cell.special === 'SUPPLY_DROP') {
        this.resources.update(r => ({...r, supplies: r.supplies + 3}));
        this.addLog('Supply cache secured!', 'GOOD');
    }
    if (cell.special === 'COMMS_TOWER') {
        this.addLog('Comms Disrupted! Threat gain paused.', 'GOOD');
        this.setThreat(this.threatLevel() - 25, 'SABOTAGE');
        this.tickerPausedUntil = Date.now() + 5000;
    }
    
    this.hand.update(h => h.filter(c => c.id !== card.id));
    this.drawSingleSmartCard();
    this.nextCall();
  }

  private executeIntel(cell: GridCell | undefined, card: Card) {
    this.sound.playTick();
    if (cell && !cell.isRevealed) {
        // Reveal specific cell
        this.grid.update(grid => grid.map(c => c.id === cell.id ? {...c, isRevealed: true} : c));
        this.addLog(`Intel gathered on Sector ${cell.id}.`, 'INFO');
        // FIX: Add threat reduction for successful intel gathering, as per tests
        this.setThreat(this.threatLevel() - 15, 'INTEL');
    } else {
        // Reveal random cell (Ghost Signal bonus)
        const unrevealed = this.grid().filter(c => !c.isRevealed && !c.isDaubed);
        if (unrevealed.length > 0) {
            const target = unrevealed[Math.floor(Math.random() * unrevealed.length)];
            this.grid.update(grid => grid.map(c => c.id === target.id ? {...c, isRevealed: true} : c));
            this.addLog(`Ghost signal traced. Intel on Sector ${target.id}.`, 'INFO');
        } else {
             this.addLog(`No new intel available.`, 'INFO');
        }
    }
    
    this.hand.update(h => h.filter(c => c.id !== card.id));
    this.drawSingleSmartCard();
    this.nextCall();
  }

  private executePenalty(cell: GridCell, card: Card) {
      this.sound.playTick(); 
      const penalty = this.currentBattle().difficultyMultiplier < 1.0 ? 5 : 15;
      this.setThreat(this.threatLevel() + penalty, 'PENALTY');
      
      let reason = 'Ineffective';
      if (cell.enemyType === 'HEAVY' && card.type === 'LIGHT_WEAPON') reason = 'Ricochet';
      this.addLog(`${reason}! +${penalty}% Threat.`, 'DANGER');
  }

  private executeCounterIntel(card: Card) {
      this.sound.playTick();
      // FIX: Add small threat reduction and update log message to match test expectation
      this.setThreat(this.threatLevel() - 2, 'GHOST_CLEAR');
      this.addLog('Ghost Signal cleared. Minor threat reduction.', 'GOOD');
      this.hand.update(h => h.filter(c => c.id !== card.id));
      this.drawSingleSmartCard();
      this.nextCall();
  }

  private daubCell(cellId: string) {
    this.daubedSet.add(cellId);
    this.grid.update(cells => cells.map(c => c.id === cellId ? { ...c, isDaubed: true, status: 'destroyed' } : c));
    this.checkRoutes();
    if (this.routesCutCount() >= this.currentBattle().routesToCut) {
      this.endGame(true, 'Objective Completed.');
    }
  }

  private checkRoutes() {
    const updatedRoutes = this.routes().map(route => {
      const isNowCut = route.coords.every(coord => this.daubedSet.has(coord));
      if (isNowCut && !route.isCut) {
        this.sound.playRouteCut();
        this.addLog(`ROUTE SECURED: ${route.name}`, 'GOOD');
        this.setThreat(this.threatLevel() - 20, 'ROUTE CUT');
        this.resources.update(r => ({...r, supplies: r.supplies + 2}));
      }
      return { ...route, isCut: isNowCut };
    });
    this.routes.set(updatedRoutes);
  }

  private nextCall() {
    const undaubedCells = this.grid().filter(c => !c.isDaubed);
    if (this.gameState() === 'DIAGNOSTICS' && undaubedCells.length === 0) return;
    if (undaubedCells.length === 0) { this.endGame(true, 'Area cleared.'); return; }

    let nextVal: number;
    const ghostChance = this.currentBattle().difficultyMultiplier > 1.0 ? 0.15 : 0;
    if (Math.random() > ghostChance) {
        const idx = Math.floor(Math.random() * undaubedCells.length);
        nextVal = undaubedCells[idx].value;
    } else {
        nextVal = Math.floor(Math.random() * 99) + 1;
    }
    this.currentCall.set(nextVal);
    
    if (this.gameState() !== 'DIAGNOSTICS') {
        setTimeout(() => {
            this.sound.playCall(`${Math.random() > 0.5 ? 'Target' : 'Sector'}... ${nextVal}`);
        }, 500);
    }
  }

  private dealSmartHand(isPenalty = false) {
      const newHand: Card[] = [];
      const deckSize = 5;
      let perfectMatches = 0;
      const maxPerfectMatches = 1;

      for(let i=0; i<deckSize; i++) {
          const card = this.generateSmartCard(i, isPenalty, perfectMatches >= maxPerfectMatches);
          if (this.currentCall() && card.value === this.currentCall()) {
              perfectMatches++;
          }
          newHand.push(card);
      }
      this.hand.set(newHand);
  }

  private drawSingleSmartCard() {
      const hasMatch = this.hand().some(c => c.value === this.currentCall());
      this.hand.update(h => [...h, this.generateSmartCard(h.length, false, hasMatch)]);
  }

  private generateSmartCard(index: number, isPenalty: boolean, forceNoMatch: boolean = false): Card {
      const call = this.currentCall();
      const undaubed = this.grid().filter(c => !c.isDaubed);
      let val: number;

      const isTutorial = this.currentBattle().difficultyMultiplier <= 0.6;
      const isDesperate = this.threatLevel() > 80;

      if (isPenalty) {
          val = Math.floor(Math.random() * 99) + 1;
      } else {
          const chanceToMatchCall = isTutorial ? 0.6 : (isDesperate ? 0.5 : 0.2);
          const chanceToMatchGrid = 0.7;

          if (!forceNoMatch && call && undaubed.some(c => c.value === call) && Math.random() < chanceToMatchCall) {
             val = call;
          }
          else if (!forceNoMatch && index === 0 && call && undaubed.some(c => c.value === call) && Math.random() < 0.3) {
              val = call;
          } 
          else if (undaubed.length > 0 && Math.random() < chanceToMatchGrid) {
              val = undaubed[Math.floor(Math.random() * undaubed.length)].value;
          } 
          else {
              val = Math.floor(Math.random() * 99) + 1;
          }
      }

      return {
          id: crypto.randomUUID(),
          value: val,
          type: this.getSmartTypeForValue(val),
          isPlayable: true
      };
  }

  private getSmartTypeForValue(val: number): CardType {
      const cell = this.grid().find(c => c.value === val);
      
      if (this.currentBattle().difficultyMultiplier > 0.8 && Math.random() < 0.1) return 'INTEL';

      if (cell) {
          if (Math.random() < 0.9) {
             if (cell.enemyType === 'HEAVY') return 'HEAVY_WEAPON';
             if (cell.enemyType === 'STRUCTURE') return 'EXPLOSIVE';
             if (cell.enemyType === 'INFANTRY') return 'LIGHT_WEAPON';
          }
      }
      
      const types: CardType[] = ['HEAVY_WEAPON', 'LIGHT_WEAPON', 'EXPLOSIVE'];
      if (Math.random() > 0.95) return 'AIRSTRIKE';
      return types[Math.floor(Math.random() * 3)];
  }

  private endGame(win: boolean, reason: string) {
    if (this.gameState() === 'DIAGNOSTICS') { this.gameState.set(win ? 'VICTORY' : 'DEFEAT'); return; }
    if (win) this.sound.playRouteCut(); else this.sound.playAlarm();
    this.gameState.set(win ? 'VICTORY' : 'DEFEAT');
    this.addLog(`MISSION STATUS: ${reason}`, win ? 'GOOD' : 'DANGER');
    this.stopTickers();
  }

  private addLog(text: string, type: 'INFO' | 'DANGER' | 'GOOD') {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
    if (this.logs().length > 0 && this.logs()[0].text === text) return;
    this.logs.update(l => [{ id: Date.now(), text, type, timestamp }, ...l].slice(0, 8)); 
  }

  public generateMap() {
    this.daubedSet.clear();
    const battle = this.currentBattle();
    const { gridRows: rows, gridCols: cols, allowedEnemies } = battle;
    const newGrid: GridCell[] = [];
    const pool = Array.from({ length: 99 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        newGrid.push({
          id: `${String.fromCharCode(65 + c)}${r + 1}`,
          row: r, col: c, value: pool[idx++],
          enemyType: allowedEnemies[Math.floor(Math.random() * allowedEnemies.length)],
          isDaubed: false, isObjective: false, isRevealed: false, status: 'active'
        });
      }
    }
    
    // Place special objectives
    const placeSpecial = (type: SpecialCellType, count: number) => {
        const candidates = newGrid.filter(c => !c.isObjective && !c.special);
        for(let i=0; i < Math.min(count, candidates.length); i++) {
            const pick = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
            if(pick) pick.special = type;
        }
    };
    
    placeSpecial('SUPPLY_DROP', Math.floor(Math.random() * 2) + 1); // 1-2 supply drops
    if (battle.difficultyMultiplier > 1.2) {
        placeSpecial('COMMS_TOWER', 1); // 1 comms tower on harder levels
    }

    this.grid.set(newGrid);

    // Generate Routes
    const generatedRoutes: Route[] = [];
    if (cols > 0) generatedRoutes.push({ id: 'R1', name: 'Alpha Line', coords: Array.from({length: rows}, (_, i) => `A${i+1}`), isCut: false });
    if (cols > 2) generatedRoutes.push({ id: 'R2', name: 'Bravo Supply', coords: Array.from({length: rows}, (_, i) => `${String.fromCharCode(65 + cols - 1)}${i+1}`), isCut: false });
    if (battle.routesToCut > 2 && cols > 3) {
        const midRow = Math.floor(rows / 2);
        generatedRoutes.push({ id: 'R3', name: 'Charlie Train', coords: Array.from({length: cols-2}, (_, i) => `${String.fromCharCode(66+i)}${midRow+1}`), isCut: false });
    }
    this.routes.set(generatedRoutes);

    const routeCoords = new Set(generatedRoutes.flatMap(r => r.coords));
    this.grid.update(cells => cells.map(c => ({...c, isObjective: routeCoords.has(c.id) })));
  }

  // FIX: Implement test helper methods
  public resetForTests() {
    this.gameState.set('DIAGNOSTICS');
    this.faction.set('ALLIES');
    this.currentBattleIndex.set(0);
    this.grid.set([]);
    this.hand.set([]);
    this.routes.set([]);
    this.logs.set([]);
    this.threatChange.set(null);
    this.currentCall.set(null);
    this.threatLevel.set(0);
    // Set supplies to 5 as expected by tests
    this.resources.set({ supplies: 5 });
    this.daubedSet.clear();
    this.tickerPausedUntil = 0;
    this.stopTickers();
  }
  public debugSetGrid(cells: GridCell[]) { this.grid.set(cells); }
  public debugSetHand(cards: Card[]) { this.hand.set(cards); }
  public debugSetCall(val: number) { this.currentCall.set(val); }
}
