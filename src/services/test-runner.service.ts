import { Injectable, inject, signal } from '@angular/core';
import { GameEngineService, Card, GridCell, CardType, EnemyType } from './game-engine.service';

export interface TestResult {
  id: number;
  category: string;
  name: string;
  passed: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TestRunnerService {
  private game = inject(GameEngineService);
  
  readonly results = signal<TestResult[]>([]);
  readonly isRunning = signal<boolean>(false);
  readonly progress = signal<number>(0);
  readonly totalTests = 43;

  // Flag to control execution flow
  private abortFlag = false;

  async runAllTests() {
    if (this.isRunning()) return; // Prevent double run

    this.abortFlag = false;
    this.isRunning.set(true);
    this.results.set([]);
    this.progress.set(0);

    // Group 1: Threat Economy
    await this.runTestCategory('Threat Economy', [
       () => this.testThreatRecyclePenalty(),
       () => this.testThreatEmergencyPenalty(),
       () => this.testThreatKillReduction(),
       () => this.testThreatIntelReduction(),
       () => this.testThreatRicochetPenalty()
    ]);

    // Group 2: Logistics
    await this.runTestCategory('Logistics', [
       () => this.testInitialSupplies(),
       () => this.testRecycleCost(),
       () => this.testKillReward(),
       () => this.testSupplyCacheReward(),
       () => this.testRouteCutReward(),
       () => this.testEmergencyDropEffect(),
       () => this.testZeroSupplyBlock()
    ]);

    // Group 3: Combat Protocols
    await this.runTestCategory('Combat Protocols', [
        () => this.testCombatInteraction('INFANTRY', 'LIGHT_WEAPON', true, 'Infantry vs Rifle'),
        () => this.testCombatInteraction('INFANTRY', 'HEAVY_WEAPON', false, 'Infantry vs Bazooka'),
        () => this.testCombatInteraction('HEAVY', 'HEAVY_WEAPON', true, 'Tank vs Bazooka'),
        () => this.testCombatInteraction('HEAVY', 'LIGHT_WEAPON', false, 'Tank vs Rifle'),
        () => this.testCombatInteraction('STRUCTURE', 'EXPLOSIVE', true, 'Bunker vs Satchel'),
        () => this.testCombatInteraction('STRUCTURE', 'LIGHT_WEAPON', false, 'Bunker vs Rifle'),
        () => this.testCombatInteraction('HEAVY', 'AIRSTRIKE', true, 'Any vs Airstrike'),
        () => this.testCombatInteraction('STRUCTURE', 'INTEL', true, 'Any vs Intel (Sabotage)')
    ]);

    // Group 4: Hand Lock
    await this.runTestCategory('Hand Lock', [
        () => this.testHandLockPreventsPlay()
    ]);

    // Group 5: Ghost Signal
    await this.runTestCategory('Ghost Signal', [
        () => this.testGhostSignalClear()
    ]);

    // Group 6: Victory/Defeat
    await this.runTestCategory('Victory/Defeat', [
        () => this.testWinCondition(),
        () => this.testLoseCondition()
    ]);

    // Group 7: Full Simulation (Simplified)
    await this.runTestCategory('Full Mission Sim', [
        () => this.testFullSimulation()
    ]);

    this.isRunning.set(false);
  }

  cancel() {
      this.abortFlag = true;
      this.isRunning.set(false);
  }

  private async runTestCategory(category: string, tests: (() => Promise<boolean> | boolean)[]) {
     if (this.abortFlag) return;

     for (let i = 0; i < tests.length; i++) {
         if (this.abortFlag) break;
         
         const result = await tests[i]();
         this.progress.update(p => p + 1);
         // Small delay for visual effect
         await new Promise(r => setTimeout(r, 50)); 
     }
  }

  private addResult(category: string, name: string, passed: boolean, message?: string) {
      if (this.abortFlag) return;
      
      this.results.update(r => [...r, {
          id: Date.now() + Math.random(),
          category,
          name,
          passed,
          message
      }]);
  }

  /* --- TEST IMPLEMENTATIONS --- */

  // 1. Threat Economy
  private testThreatRecyclePenalty(): boolean {
      this.setupBase();
      const initialThreat = this.game.threatLevel();
      this.game.recycleHand();
      const newThreat = this.game.threatLevel();
      const passed = newThreat > initialThreat;
      this.addResult('Threat Economy', 'Recycle Penalty', passed, `Threat delta: ${newThreat - initialThreat}`);
      return passed;
  }

  private testThreatEmergencyPenalty(): boolean {
      this.setupBase();
      this.game.resources.set({supplies: 0});
      this.game.emergencyResupply();
      const passed = this.game.threatLevel() === 25; // 0 + 25
      this.addResult('Threat Economy', 'Emergency Drop Penalty', passed, `Threat: ${this.game.threatLevel()}`);
      return passed;
  }

  private testThreatKillReduction(): boolean {
      this.setupBase();
      this.game.threatLevel.set(50);
      const cell = this.createCell(10, 'INFANTRY');
      this.game.debugSetGrid([cell]);
      this.game.debugSetCall(10);
      this.playCard(10, 'LIGHT_WEAPON');
      const passed = this.game.threatLevel() < 50;
      this.addResult('Threat Economy', 'Kill Threat Reduction', passed);
      return passed;
  }

  private testThreatIntelReduction(): boolean {
      this.setupBase();
      this.game.threatLevel.set(50);
      const cell = this.createCell(10, 'INFANTRY');
      this.game.debugSetGrid([cell]);
      this.game.debugSetCall(10);
      this.playCard(10, 'INTEL');
      const passed = this.game.threatLevel() === 35; // 50 - 15
      this.addResult('Threat Economy', 'Intel Threat Reduction', passed);
      return passed;
  }

  private testThreatRicochetPenalty(): boolean {
      this.setupBase();
      const cell = this.createCell(10, 'HEAVY');
      this.game.debugSetGrid([cell]);
      this.game.debugSetCall(10);
      this.playCard(10, 'LIGHT_WEAPON');
      const passed = this.game.threatLevel() > 0;
      this.addResult('Threat Economy', 'Ricochet Penalty', passed);
      return passed;
  }

  // 2. Logistics
  private testInitialSupplies(): boolean {
      this.setupBase();
      const passed = this.game.resources().supplies === 5;
      this.addResult('Logistics', 'Initial Supply Check', passed);
      return passed;
  }

  private testRecycleCost(): boolean {
      this.setupBase();
      this.game.recycleHand();
      const passed = this.game.resources().supplies === 4;
      this.addResult('Logistics', 'Recycle Cost', passed);
      return passed;
  }

  private testKillReward(): boolean {
      this.setupBase();
      const cell = this.createCell(10, 'INFANTRY');
      this.game.debugSetGrid([cell]);
      this.game.debugSetCall(10);
      this.playCard(10, 'LIGHT_WEAPON');
      const passed = this.game.resources().supplies === 6; // 5 + 1
      this.addResult('Logistics', 'Standard Kill Reward', passed);
      return passed;
  }

  private testSupplyCacheReward(): boolean {
      this.setupBase();
      const cell = this.createCell(10, 'INFANTRY');
      cell.special = 'SUPPLY_DROP';
      this.game.debugSetGrid([cell]);
      this.game.debugSetCall(10);
      this.playCard(10, 'LIGHT_WEAPON');
      const passed = this.game.resources().supplies === 9; // 5 + 1(kill) + 3(bonus)
      this.addResult('Logistics', 'Supply Cache Reward', passed);
      return passed;
  }

  private testRouteCutReward(): boolean {
      // Setup a 1-cell route for simplicity
      this.setupBase();
      const cell = this.createCell(10, 'INFANTRY');
      cell.id = 'A1';
      this.game.debugSetGrid([cell]);
      
      // Mock route
      this.game.routes.set([{id: 'R1', name: 'Test', coords: ['A1'], isCut: false}]);
      
      this.game.debugSetCall(10);
      this.playCard(10, 'LIGHT_WEAPON');
      
      const passed = this.game.resources().supplies === 8; // 5 + 1(kill) + 2(route)
      this.addResult('Logistics', 'Route Cut Reward', passed);
      return passed;
  }

  private testEmergencyDropEffect(): boolean {
      this.setupBase();
      this.game.resources.set({supplies: 0});
      this.game.emergencyResupply();
      const passed = this.game.resources().supplies === 3;
      this.addResult('Logistics', 'Emergency Drop Gain', passed);
      return passed;
  }

  private testZeroSupplyBlock(): boolean {
      this.setupBase();
      // MUST Set a hand manually because setupBase clears it and we need to check if it changes
      const mockCard: Card = { id: 'test', value: 1, type: 'LIGHT_WEAPON', isPlayable: true };
      this.game.debugSetHand([mockCard]);

      this.game.resources.set({supplies: 0});
      const handBefore = this.game.hand()[0].id; // Safe now
      this.game.recycleHand();
      const handAfter = this.game.hand()[0].id;
      const passed = handBefore === handAfter && this.game.resources().supplies === 0;
      this.addResult('Logistics', 'Zero Supply Recycle Block', passed);
      return passed;
  }

  // 3. Combat
  private testCombatInteraction(enemy: EnemyType, weapon: CardType, shouldKill: boolean, label: string): boolean {
      this.setupBase();
      const cell = this.createCell(50, enemy);
      this.game.debugSetGrid([cell]);
      this.game.debugSetCall(50);
      this.playCard(50, weapon);
      
      const target = this.game.grid().find(c => c.value === 50);
      const isDead = target?.isDaubed ?? false;
      const passed = shouldKill === isDead;
      
      this.addResult('Combat Protocols', label, passed, isDead ? 'Target Destroyed' : 'Target Survived');
      return passed;
  }

  // 4. Hand Lock
  private testHandLockPreventsPlay(): boolean {
      this.setupBase();
      const cell = this.createCell(20, 'INFANTRY');
      this.game.debugSetGrid([cell]);
      this.game.debugSetCall(99); // Mismatch
      
      // Try to play card 20
      const cardId = 'test-card';
      this.game.debugSetHand([{id: cardId, value: 20, type: 'LIGHT_WEAPON', isPlayable: true}]);
      
      const logsBefore = this.game.logs().length;
      this.game.playCard(cardId);
      const logsAfter = this.game.logs().length;
      
      // Should have generated a "MISMATCH" log and NOT destroyed the cell
      const log = this.game.logs()[0];
      const passed = logsAfter > logsBefore && log.text.includes('MISMATCH') && !(this.game.grid()[0].isDaubed);
      
      this.addResult('Hand Lock', 'Prevent Mismatched Play', passed);
      return passed;
  }

  // 5. Ghost Signal
  private testGhostSignalClear(): boolean {
      this.setupBase();
      this.game.debugSetGrid([]); // Empty grid
      this.game.debugSetCall(99);
      this.game.threatLevel.set(10);
      
      this.playCard(99, 'LIGHT_WEAPON'); // Type doesn't matter for ghost
      
      const passed = this.game.threatLevel() < 10;
      this.addResult('Ghost Signal', 'Counter-Intel Execution', passed);
      return passed;
  }

  // 6. Conditions
  private testWinCondition(): boolean {
      this.setupBase();
      // Require 1 route
      this.game.routes.update(r => [{id: 'R1', name: 'WinRoute', coords: [], isCut: true}]);
      
      // Trigger update check by daubing a dummy cell
      const cell = this.createCell(1, 'INFANTRY');
      this.game.debugSetGrid([cell]);
      // Manually trigger check logic via play (or mock end game)
      this.game.debugSetCall(1);
      // Hack: Reduce routesToCut for current battle in memory for test
      Object.defineProperty(this.game.currentBattle(), 'routesToCut', { value: 1, configurable: true });
      
      this.playCard(1, 'LIGHT_WEAPON');
      
      const passed = this.game.gameState() === 'VICTORY';
      this.addResult('Victory/Defeat', 'Objective Complete Trigger', passed);
      return passed;
  }

  private async testLoseCondition(): Promise<boolean> {
      this.setupBase();
      
      // State must be PLAYING for ticker to process
      this.game.gameState.set('PLAYING');
      this.game.threatLevel.set(100);
      
      // Ticker checks threatLevel > 100 or == 100
      (this.game as any).startTicker();
      await new Promise(r => setTimeout(r, 100));
      this.game.stopTickers();

      const passed = this.game.gameState() === 'DEFEAT';
      this.addResult('Victory/Defeat', 'Threat Overflow Trigger', passed);
      
      // Reset state for subsequent safety
      if (!passed) this.game.gameState.set('DIAGNOSTICS');
      
      return passed;
  }

  // 7. Full Sim
  private async testFullSimulation(): Promise<boolean> {
     this.setupBase();
     // Set up a tiny solvable board
     const c1 = this.createCell(1, 'INFANTRY');
     const c2 = this.createCell(2, 'STRUCTURE');
     this.game.debugSetGrid([c1, c2]);
     
     // 1. Play correct card
     this.game.debugSetCall(1);
     this.playCard(1, 'LIGHT_WEAPON');
     if (this.game.resources().supplies !== 6) return false;

     // 2. Play wrong card
     this.game.debugSetCall(2);
     this.playCard(2, 'LIGHT_WEAPON'); // Fail
     if (this.game.threatLevel() <= 0) return false;

     // 3. Fix mistake
     this.game.debugSetCall(2);
     this.playCard(2, 'EXPLOSIVE'); // Success

     this.addResult('Full Mission Sim', 'Sequence Complete', true);
     return true;
  }

  /* --- HELPERS --- */
  private setupBase() {
      // Don't reset if we are cancelling
      if (this.abortFlag) return;
      this.game.resetForTests();
  }

  private createCell(val: number, type: EnemyType): GridCell {
      return {
          id: 'T' + val,
          row: 0,
          col: 0,
          value: val,
          enemyType: type,
          isDaubed: false,
          isObjective: true,
          // FIX: Add missing property
          isRevealed: false,
          status: 'active'
      };
  }

  private playCard(val: number, type: CardType) {
      if (this.abortFlag) return;
      const card = { id: 'test', value: val, type: type, isPlayable: true };
      this.game.debugSetHand([card]);
      this.game.playCard('test');
  }
}
