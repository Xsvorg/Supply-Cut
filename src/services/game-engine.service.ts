
import { Injectable, signal, computed, inject } from '@angular/core';
import { SoundService } from './sound.service';

/* --- Types --- */
export type Faction = 'ALLIES' | 'AXIS';
export type EnemyType = 'HEAVY' | 'INFANTRY' | 'STRUCTURE'; 
export type CardType = 'HEAVY_WEAPON' | 'LIGHT_WEAPON' | 'EXPLOSIVE' | 'AIRSTRIKE' | 'INTEL';
export type GameState = 'MENU' | 'BRIEFING' | 'TUTORIAL' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'DEFEAT' | 'WAR_WON';

export interface Battle {
  id: string;
  name: string;
  year: string;
  description: string;
  difficultyMultiplier: number; // 1.0 to 2.5
  backgroundTheme: string;
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
  special?: 'SUPPLY_DROP';
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

/* --- CAMPAIGN DATA --- */
const ALLIED_CAMPAIGN: Battle[] = [
  { 
    id: 'C1', name: 'Operation Torch', year: '1942', description: 'North Africa. Secure the landing zones.', 
    difficultyMultiplier: 0.5, backgroundTheme: 'desert',
    gridRows: 3, gridCols: 4, allowedEnemies: ['INFANTRY'], routesToCut: 2,
    introTip: "BOOT CAMP: Match numbers. Use RIFLES against Infantry."
  },
  { 
    id: 'C2', name: 'Sicily', year: '1943', description: 'Assault on the fortress.', 
    difficultyMultiplier: 0.8, backgroundTheme: 'coastal',
    gridRows: 3, gridCols: 5, allowedEnemies: ['INFANTRY', 'STRUCTURE'], routesToCut: 2,
    introTip: "TACTICS: Bunkers 🏯 require EXPLOSIVES 🧨."
  },
  { 
    id: 'C3', name: 'Normandy', year: '1944', description: 'Breaching the Atlantic Wall.', 
    difficultyMultiplier: 1.2, backgroundTheme: 'beach',
    gridRows: 4, gridCols: 6, allowedEnemies: ['INFANTRY', 'STRUCTURE', 'HEAVY'], routesToCut: 3,
    introTip: "WARNING: Heavy Tanks 🚜 detected! Use BAZOOKAS 🚀."
  },
  { 
    id: 'C4', name: 'The Bulge', year: '1944', description: 'Winter counter-offensive.', 
    difficultyMultiplier: 1.6, backgroundTheme: 'snow',
    gridRows: 4, gridCols: 6, allowedEnemies: ['INFANTRY', 'STRUCTURE', 'HEAVY'], routesToCut: 3,
    introTip: "HIGH ALERT: Enemy offensive imminent."
  },
  { 
    id: 'C5', name: 'Berlin', year: '1945', description: 'Final urban combat.', 
    difficultyMultiplier: 2.2, backgroundTheme: 'urban',
    gridRows: 4, gridCols: 6, allowedEnemies: ['INFANTRY', 'STRUCTURE', 'HEAVY'], routesToCut: 3,
    introTip: "FINALE: Expect heavy resistance."
  },
];

const AXIS_CAMPAIGN: Battle[] = [
  { 
    id: 'A1', name: 'Poland', year: '1939', description: 'The first strike.', 
    difficultyMultiplier: 0.5, backgroundTheme: 'plains',
    gridRows: 3, gridCols: 4, allowedEnemies: ['INFANTRY'], routesToCut: 2,
    introTip: "BASICS: Destroy Infantry with Small Arms."
  },
  { 
    id: 'A2', name: 'France', year: '1940', description: 'Bypassing the Maginot.', 
    difficultyMultiplier: 0.8, backgroundTheme: 'forest',
    gridRows: 3, gridCols: 5, allowedEnemies: ['INFANTRY', 'STRUCTURE'], routesToCut: 2,
    introTip: "TACTICS: Demolish enemy fortifications 🏯."
  },
  { 
    id: 'A3', name: 'Russia', year: '1941', description: 'The long winter.', 
    difficultyMultiplier: 1.2, backgroundTheme: 'snow',
    gridRows: 4, gridCols: 6, allowedEnemies: ['INFANTRY', 'STRUCTURE', 'HEAVY'], routesToCut: 3,
    introTip: "ARMOR: Enemy Tanks 🚜 inbound."
  },
  { 
    id: 'A4', name: 'London', year: '1942', description: 'Operation Sea Lion.', 
    difficultyMultiplier: 1.6, backgroundTheme: 'coastal',
    gridRows: 4, gridCols: 6, allowedEnemies: ['INFANTRY', 'STRUCTURE', 'HEAVY'], routesToCut: 3,
    introTip: "INVASION: Secure the capital."
  },
  { 
    id: 'A5', name: 'New York', year: '1946', description: 'Trans-Atlantic Invasion.', 
    difficultyMultiplier: 2.2, backgroundTheme: 'urban',
    gridRows: 4, gridCols: 6, allowedEnemies: ['INFANTRY', 'STRUCTURE', 'HEAVY'], routesToCut: 3,
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

  // Caller State
  readonly currentCall = signal<number | null>(null);
  readonly threatLevel = signal<number>(0); 
  readonly resources = signal({ supplies: 5 }); 

  // Derived State
  readonly routesCutCount = computed(() => this.routes().filter(r => r.isCut).length);
  readonly currentCampaign = computed(() => this.faction() === 'ALLIES' ? ALLIED_CAMPAIGN : AXIS_CAMPAIGN);
  readonly currentBattle = computed(() => this.currentCampaign()[this.currentBattleIndex()]);

  // Private internal state
  private daubedSet = new Set<string>();
  private ticker: ReturnType<typeof setInterval> | undefined;
  private pulseTicker: ReturnType<typeof setInterval> | undefined;
  
  private baseThreatRate = 0.04; 
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
    // Only show tutorial on absolute first level of campaign
    if (this.currentBattleIndex() > 0) {
      this.finishTutorial();
    } else {
      this.tutorialStep.set(1);
    }

    this.generateMap();
    this.dealSmartHand();
    this.logs.set([]);
    this.threatLevel.set(0);
    this.resources.set({ supplies: 5 }); 
    this.addLog(`DEPLOYMENT: ${this.currentBattle().name.toUpperCase()}`, 'INFO');
  }

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

  quitToMenu() {
    this.stopTickers();
    this.gameState.set('MENU');
  }

  restartLevel() {
    this.stopTickers();
    this.startBattle();
  }

  finishTutorial() {
    this.gameState.set('PLAYING');
    this.tutorialStep.set(0);
    this.addLog('Signal interceptor active.', 'INFO');
    this.nextCall();
    this.startTicker();
  }

  advanceTutorial() {
    this.sound.playTick();
    if (this.tutorialStep() >= 4) { // Shortened Tutorial
      this.finishTutorial();
    } else {
      this.tutorialStep.update(v => v + 1);
    }
  }

  private stopTickers() {
    if (this.ticker) clearInterval(this.ticker);
    if (this.pulseTicker) clearInterval(this.pulseTicker);
  }

  private startTicker() {
    this.stopTickers(); 

    const difficulty = this.currentBattle().difficultyMultiplier;

    this.ticker = setInterval(() => {
      if (this.gameState() !== 'PLAYING') return;

      const currentThreat = this.threatLevel();
      
      if (currentThreat > 80) {
        const now = Date.now();
        if (now - this.lastTickSound > (800 - (currentThreat * 7))) { 
           this.sound.playTick();
           this.lastTickSound = now;
        }
      }

      if (currentThreat >= 100) {
        this.triggerThreatOverflow();
      } else {
        // Linear threat increase based on difficulty
        this.threatLevel.set(Math.min(100, currentThreat + (this.baseThreatRate * difficulty)));
      }
    }, 50); 

    // Pulse only on Level 3+ (Multiplier > 1.0)
    if (difficulty > 1.0) {
        const pulseRate = Math.max(2000, 6000 - (difficulty * 1000)); 
        this.pulseTicker = setInterval(() => {
        if (this.gameState() !== 'PLAYING') return;
        const t = this.threatLevel();
        if (t < 95) {
            const spike = Math.random() * 3 * difficulty;
            this.threatLevel.set(Math.min(100, t + spike));
        }
        }, pulseRate);
    }
  }

  private triggerThreatOverflow() {
    this.endGame(false, 'POSITION OVERRUN.');
  }

  /* --- Core Mechanics --- */

  emergencyResupply() {
    if (this.resources().supplies > 0) return;
    this.addLog('EMERGENCY DROP INBOUND.', 'INFO');
    this.sound.playTick();
    this.resources.update(r => ({ ...r, supplies: 3 }));
    this.threatLevel.update(t => Math.min(100, t + 25)); 
  }

  recycleHand() {
    if (this.gameState() !== 'PLAYING') return;
    const cost = 1;
    if (this.resources().supplies < cost) {
      this.addLog('Insufficient Supplies.', 'DANGER');
      return;
    }
    this.resources.update(r => ({ ...r, supplies: r.supplies - cost }));
    
    // PENALTY: Cycling cards increases threat (Radio Silence Broken)
    // Scales with difficulty (Min 3%, Max ~12%)
    const difficulty = this.currentBattle().difficultyMultiplier;
    const penalty = Math.max(3, Math.ceil(5 * difficulty));
    
    this.threatLevel.update(t => Math.min(100, t + penalty));
    
    this.addLog(`Comms chatter detected! +${penalty}% Threat.`, 'DANGER');
    this.sound.playTick();
    this.dealSmartHand(false);
  }

  playCard(cardId: string) {
    if (this.gameState() !== 'PLAYING') return;

    const hand = this.hand();
    const card = hand.find(c => c.id === cardId);
    if (!card) return;

    const call = this.currentCall();
    if (call === null) return;

    if (card.value !== call) {
        this.addLog('MISMATCH! Check coordinates.', 'DANGER');
        return;
    }

    const cell = this.grid().find(c => c.value === card.value);

    // Ghost Signal
    if (!cell) {
        this.executeCounterIntel(card);
        return;
    }

    if (cell.isDaubed) return; 

    const effectiveness = this.checkEffectiveness(card.type, cell.enemyType);

    if (effectiveness === 'KILL') {
        this.executeHit(cell, card);
    } else if (effectiveness === 'SABOTAGE') {
        this.executeSabotage(cell, card);
    } else {
        this.executePenalty(cell, card);
    }
  }

  private checkEffectiveness(weapon: CardType, enemy: EnemyType): 'KILL' | 'SABOTAGE' | 'FAIL' {
    if (weapon === 'INTEL') return 'SABOTAGE';
    if (weapon === 'AIRSTRIKE') return 'KILL';
    
    if (enemy === 'HEAVY') {
        return (weapon === 'HEAVY_WEAPON' || weapon === 'EXPLOSIVE') ? 'KILL' : 'FAIL';
    }
    if (enemy === 'STRUCTURE') {
        return (weapon === 'HEAVY_WEAPON' || weapon === 'EXPLOSIVE') ? 'KILL' : 'FAIL';
    }
    if (enemy === 'INFANTRY') {
        return (weapon === 'LIGHT_WEAPON') ? 'KILL' : 'FAIL';
    }
    return 'FAIL';
  }

  private executeHit(cell: GridCell, card: Card) {
    this.sound.playExplosion();
    this.daubCell(cell.id);
    
    this.resources.update(r => ({...r, supplies: r.supplies + 1}));
    this.addLog(`${cell.enemyType} Neutralized. +1 Supply.`, 'GOOD');
    this.threatLevel.update(t => Math.max(0, t - 10));

    if (cell.special === 'SUPPLY_DROP') {
        this.resources.update(r => ({...r, supplies: r.supplies + 3}));
        this.addLog('Supply cache secured!', 'GOOD');
    }
    
    this.hand.update(h => h.filter(c => c.id !== card.id));
    this.drawSingleSmartCard();
    this.nextCall();
  }

  private executeSabotage(cell: GridCell, card: Card) {
    this.sound.playTick(); 
    this.daubCell(cell.id);
    this.addLog(`Intel used on ${cell.id}. Threat reduced.`, 'INFO');
    this.threatLevel.update(t => Math.max(0, t - 15));
    this.hand.update(h => h.filter(c => c.id !== card.id));
    this.drawSingleSmartCard();
    this.nextCall();
  }

  private executePenalty(cell: GridCell, card: Card) {
      this.sound.playTick(); 
      // Level 1-2 have very low penalty to be forgiving
      const difficulty = this.currentBattle().difficultyMultiplier;
      const penalty = difficulty < 1.0 ? 5 : 15;

      this.threatLevel.update(t => Math.min(100, t + penalty));
      
      let reason = 'Ineffective';
      if (cell.enemyType === 'HEAVY' && card.type === 'LIGHT_WEAPON') reason = 'Ricochet';
      
      this.addLog(`${reason}! +${penalty}% Threat.`, 'DANGER');
  }

  private executeCounterIntel(card: Card) {
      this.sound.playTick();
      this.addLog('Ghost Signal cleared.', 'INFO');
      this.threatLevel.update(t => Math.max(0, t - 5)); 
      this.hand.update(h => h.filter(c => c.id !== card.id));
      this.drawSingleSmartCard();
      this.nextCall();
  }

  private daubCell(cellId: string) {
    this.daubedSet.add(cellId);
    this.grid.update(cells => cells.map(c => c.id === cellId ? { ...c, isDaubed: true, status: 'destroyed' } : c));
    this.checkRoutes();
    
    // Win Condition
    if (this.routesCutCount() >= this.currentBattle().routesToCut) {
      this.endGame(true, 'Objective Completed.');
    }
  }

  private checkRoutes() {
    const currentRoutes = this.routes();
    const updatedRoutes = currentRoutes.map(route => {
      const isNowCut = route.coords.every(coord => this.daubedSet.has(coord));
      if (isNowCut && !route.isCut) {
        this.sound.playRouteCut();
        this.addLog(`ROUTE SECURED: ${route.name}`, 'GOOD');
        this.threatLevel.update(t => Math.max(0, t - 25)); 
        this.resources.update(r => ({...r, supplies: r.supplies + 2}));
      }
      return { ...route, isCut: isNowCut };
    });
    this.routes.set(updatedRoutes);
  }

  private nextCall() {
    const undaubedCells = this.grid().filter(c => !c.isDaubed);
    
    if (undaubedCells.length === 0) {
      // Rare edge case where board is clear but routes not cut (due to route logic overlapping)
      // Usually this means victory anyway
      this.endGame(true, 'Area cleared.');
      return;
    }

    let nextVal: number;
    // Ghost Signals only appear on Level 3+
    const ghostChance = this.currentBattle().difficultyMultiplier > 1.0 ? 0.2 : 0;

    if (Math.random() > ghostChance) {
        const idx = Math.floor(Math.random() * undaubedCells.length);
        nextVal = undaubedCells[idx].value;
    } else {
        nextVal = Math.floor(Math.random() * 99) + 1;
    }

    this.currentCall.set(nextVal);
    
    setTimeout(() => {
        this.sound.playCall(`${Math.random() > 0.5 ? 'Target' : 'Sector'}... ${nextVal}`);
    }, 500);
  }

  private dealSmartHand(isPenalty = false) {
      const newHand: Card[] = [];
      const deckSize = 5;
      for(let i=0; i<deckSize; i++) {
          newHand.push(this.generateSmartCard(i, isPenalty));
      }
      this.hand.set(newHand);
  }

  private drawSingleSmartCard() {
      this.hand.update(h => [...h, this.generateSmartCard(h.length, false)]);
  }

  private generateSmartCard(index: number, isPenalty: boolean): Card {
      const call = this.currentCall();
      const undaubed = this.grid().filter(c => !c.isDaubed);
      let val: number;

      // Helper for first level: Be very generous
      const isTutorial = this.currentBattle().difficultyMultiplier <= 0.5;

      if (isPenalty) {
          val = Math.floor(Math.random() * 99) + 1;
      } else {
          // If Tutorial, 60% chance to match Call immediately
          if (isTutorial && call && undaubed.some(c => c.value === call) && Math.random() < 0.6) {
             val = call;
          }
          // Normal Smart Logic
          else if (index === 0 && call && undaubed.some(c => c.value === call) && Math.random() < 0.3) {
              val = call;
          } 
          else if (undaubed.length > 0 && Math.random() < 0.6) {
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
      
      // INTEL CARD CHANCE (Starts appearing Level 3)
      if (this.currentBattle().difficultyMultiplier > 1.0 && Math.random() < 0.05) return 'INTEL';

      if (cell) {
          // 90% Chance to give correct weapon (Forgiving RNG)
          if (Math.random() < 0.9) {
             if (cell.enemyType === 'HEAVY') return 'HEAVY_WEAPON';
             if (cell.enemyType === 'STRUCTURE') return 'EXPLOSIVE';
             if (cell.enemyType === 'INFANTRY') return 'LIGHT_WEAPON';
          }
      }
      
      const types: CardType[] = ['HEAVY_WEAPON', 'LIGHT_WEAPON', 'EXPLOSIVE', 'AIRSTRIKE'];
      if (Math.random() > 0.95) return 'AIRSTRIKE';
      
      return types[Math.floor(Math.random() * 3)];
  }

  private endGame(win: boolean, reason: string) {
    if (win) this.sound.playRouteCut();
    else this.sound.playAlarm();
    this.gameState.set(win ? 'VICTORY' : 'DEFEAT');
    this.addLog(`MISSION STATUS: ${reason}`, win ? 'GOOD' : 'DANGER');
    this.stopTickers();
  }

  private addLog(text: string, type: 'INFO' | 'DANGER' | 'GOOD') {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
    
    const currentLogs = this.logs();
    if (currentLogs.length > 0 && currentLogs[0].text === text) {
       return;
    }

    const entry: LogEntry = {
      id: Date.now(),
      text,
      type,
      timestamp
    };
    this.logs.update(l => [entry, ...l].slice(0, 8)); 
  }

  private generateMap() {
    this.daubedSet.clear();
    const battle = this.currentBattle();
    const rows = battle.gridRows;
    const cols = battle.gridCols;
    const newGrid: GridCell[] = [];
    
    const pool = Array.from({ length: 99 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const id = `${String.fromCharCode(65 + c)}${r + 1}`;
        // Pick enemy from allowed list for this level
        const eType = battle.allowedEnemies[Math.floor(Math.random() * battle.allowedEnemies.length)];

        newGrid.push({
          id,
          row: r,
          col: c,
          value: pool[idx++],
          enemyType: eType,
          isDaubed: false,
          isObjective: false,
          special: Math.random() > 0.9 ? 'SUPPLY_DROP' : undefined,
          status: 'active'
        });
      }
    }
    this.grid.set(newGrid);

    // Route Logic: Dynamic based on rows/cols
    // Simplification: Always generate vertical columns as "Routes" for now to ensure validity on small maps
    const generatedRoutes: Route[] = [];
    
    // Route 1: Column 1
    generatedRoutes.push({
        id: 'R1', name: 'Alpha Line', 
        coords: Array.from({length: rows}, (_, i) => `A${i+1}`), 
        isCut: false 
    });

    // Route 2: Last Column
    const lastChar = String.fromCharCode(65 + cols - 1);
    generatedRoutes.push({
        id: 'R2', name: 'Bravo Supply', 
        coords: Array.from({length: rows}, (_, i) => `${lastChar}${i+1}`), 
        isCut: false 
    });

    // Route 3: Diagonal (Only if level requires 3 routes)
    if (battle.routesToCut > 2) {
        // Simple middle row route
        const midRow = Math.floor(rows / 2);
        const midCoords = [];
        for(let c=1; c<cols-1; c++) {
             midCoords.push(`${String.fromCharCode(65 + c)}${midRow + 1}`);
        }
        generatedRoutes.push({
            id: 'R3', name: 'Charlie Train', 
            coords: midCoords, 
            isCut: false 
        });
    }

    this.routes.set(generatedRoutes);

    const routeCoords = new Set(generatedRoutes.flatMap(r => r.coords));
    this.grid.update(cells => cells.map(c => ({
      ...c,
      isObjective: routeCoords.has(c.id)
    })));
  }
}
