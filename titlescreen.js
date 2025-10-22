/**
 * Title Screen and Help Menu System
 */

class TitleScreenManager {
  constructor() {
    this.helpMenuOpen = false;

    // Initialize help menu FIRST, before title screen
    this.initHelpMenu();

    // Then show title screen
    this.showTitleScreen();

    console.log("🎮 Title Screen initialized");
  }

  showTitleScreen() {
    const titleScreen = document.createElement("div");
    titleScreen.id = "title-screen";
    titleScreen.className = "title-screen";
    titleScreen.innerHTML = `
        <div class="title-content">
            <div class="title-logo">
                <h1 class="title-main">SURVIVAL 3D</h1>
                <h2 class="title-sub">Build • Craft • Survive</h2>
            </div>
            
            <div class="title-info">
                <p class="title-tagline">🎮 A 3D Survival Adventure</p>
            </div>
            
            <div class="title-buttons">
                <button class="title-button" id="start-game-btn">
                    <span class="btn-icon">▶</span>
                    <span class="btn-text">Start Adventure</span>
                </button>
                <button class="title-button" id="help-btn-title">
                    <span class="btn-icon">❓</span>
                    <span class="btn-text">Help & Controls</span>
                </button>
            </div>
            
            <div class="title-footer">
                <p>Developed for HlnefzgerSchoolAct</p>
                <p>Version 1.0.0 | Built 2025-10-22</p>
            </div>
            
            <div class="loading-progress" id="loading-progress" style="display: none;">
                <div class="loading-bar-bg">
                    <div class="loading-bar-fill" id="loading-bar-fill"></div>
                </div>
                <p class="loading-text" id="loading-text">Generating world...</p>
            </div>
        </div>
        
        <div class="title-bg-effects">
            <div class="bg-particle"></div>
            <div class="bg-particle"></div>
            <div class="bg-particle"></div>
            <div class="bg-particle"></div>
            <div class="bg-particle"></div>
        </div>
    `;
    document.body.appendChild(titleScreen);

    // Setup button handlers after adding to DOM
    setTimeout(() => {
      const startBtn = document.getElementById("start-game-btn");
      const helpBtn = document.getElementById("help-btn-title");

      if (startBtn) {
        startBtn.addEventListener("click", (e) => {
          e.preventDefault();
          console.log("🎮 Start button clicked");
          this.startGame();
        });
      }

      if (helpBtn) {
        helpBtn.addEventListener("click", (e) => {
          e.preventDefault();
          console.log("📖 Help button clicked on title screen");
          this.openHelpMenu();
        });
      }
    }, 100);
  }

  startGame() {
    const progress = document.getElementById("loading-progress");
    const buttons = document.querySelector(".title-buttons");

    if (buttons) buttons.style.display = "none";
    if (progress) progress.style.display = "block";

    // Simulate loading progress
    let loadProgress = 0;
    const loadInterval = setInterval(() => {
      loadProgress += Math.random() * 15;
      if (loadProgress > 100) loadProgress = 100;

      const fill = document.getElementById("loading-bar-fill");
      const text = document.getElementById("loading-text");

      if (fill) fill.style.width = `${loadProgress}%`;

      if (text) {
        if (loadProgress < 30) {
          text.textContent = "Generating terrain...";
        } else if (loadProgress < 60) {
          text.textContent = "Spawning creatures...";
        } else if (loadProgress < 90) {
          text.textContent = "Building world...";
        } else {
          text.textContent = "Ready!";
        }
      }

      if (loadProgress >= 100) {
        clearInterval(loadInterval);
        setTimeout(() => {
          const titleScreen = document.getElementById("title-screen");
          if (titleScreen) {
            titleScreen.classList.add("fade-out-screen");
            setTimeout(() => titleScreen.remove(), 1000);
          }
        }, 500);
      }
    }, 100);
  }

  initHelpMenu() {
    const helpMenu = document.createElement("div");
    helpMenu.id = "help-menu";
    helpMenu.className = "help-menu hidden";
    helpMenu.innerHTML = `
            <div class="help-content">
                <div class="help-header">
                    <h2>📖 Help & Guide</h2>
                    <button class="help-close" id="help-close">✕</button>
                </div>
                
                <div class="help-tabs">
                    <button class="help-tab active" data-tab="controls">🎮 Controls</button>
                    <button class="help-tab" data-tab="crafting">🔨 Crafting</button>
                    <button class="help-tab" data-tab="survival">❤️ Survival</button>
                    <button class="help-tab" data-tab="creatures">🐾 Creatures</button>
                </div>
                
                <div class="help-body">
                    <!-- Controls Tab -->
                    <div class="help-tab-content active" id="tab-controls">
                        <h3>Movement & Combat</h3>
                        <div class="help-grid">
                            <div class="help-item"><kbd>WASD</kbd> Movement</div>
                            <div class="help-item"><kbd>Space</kbd> Jump</div>
                            <div class="help-item"><kbd>Mouse</kbd> Look Around</div>
                            <div class="help-item"><kbd>E</kbd> Gather Resources</div>
                            <div class="help-item"><kbd>F</kbd> Attack</div>
                            <div class="help-item"><kbd>C</kbd> Toggle Camera</div>
                        </div>
                        
                        <h3>Inventory & Building</h3>
                        <div class="help-grid">
                            <div class="help-item"><kbd>1-9, 0</kbd> Select Item</div>
                            <div class="help-item"><kbd>Scroll</kbd> Cycle Items</div>
                            <div class="help-item"><kbd>X</kbd> Drop Mode</div>
                            <div class="help-item"><kbd>Q</kbd> Drop Items</div>
                            <div class="help-item"><kbd>TAB</kbd> Crafting Menu</div>
                            <div class="help-item"><kbd>B</kbd> Building Menu</div>
                            <div class="help-item"><kbd>R</kbd> Rotate Structure</div>
                            <div class="help-item"><kbd>H</kbd> Help Menu (in-game)</div>
                        </div>
                    </div>
                    
                    <!-- Crafting Tab -->
                    <div class="help-tab-content" id="tab-crafting">
                        <h3>Basic Recipes</h3>
                        <div class="recipe-list">
                            <div class="recipe-item">
                                <span class="recipe-icon">⛏️</span>
                                <div style="flex: 1;">
                                    <span class="recipe-name">Wooden Pickaxe</span>
                                    <div class="recipe-req">🪵 Wood x5 + 🪢 Rope x2</div>
                                </div>
                            </div>
                            <div class="recipe-item">
                                <span class="recipe-icon">🪓</span>
                                <div style="flex: 1;">
                                    <span class="recipe-name">Stone Axe</span>
                                    <div class="recipe-req">🪵 Wood x3 + 🪨 Stone x5 + 🪢 Rope x2</div>
                                </div>
                            </div>
                            <div class="recipe-item">
                                <span class="recipe-icon">⚒️</span>
                                <div style="flex: 1;">
                                    <span class="recipe-name">Stone Pickaxe</span>
                                    <div class="recipe-req">🪵 Wood x3 + 🪨 Stone x8 + 🪢 Rope x2</div>
                                </div>
                            </div>
                            <div class="recipe-item">
                                <span class="recipe-icon">🪢</span>
                                <div style="flex: 1;">
                                    <span class="recipe-name">Rope</span>
                                    <div class="recipe-req">🌿 Fiber x10</div>
                                </div>
                            </div>
                            <div class="recipe-item">
                                <span class="recipe-icon">🔦</span>
                                <div style="flex: 1;">
                                    <span class="recipe-name">Torch</span>
                                    <div class="recipe-req">🪵 Wood x2 + 🌿 Fiber x3</div>
                                </div>
                            </div>
                            <div class="recipe-item">
                                <span class="recipe-icon">🔥</span>
                                <div style="flex: 1;">
                                    <span class="recipe-name">Campfire</span>
                                    <div class="recipe-req">🪵 Wood x8 + 🪨 Stone x5</div>
                                </div>
                            </div>
                        </div>
                        <p class="help-tip">💡 Better tools gather resources faster and give more materials!</p>
                    </div>
                    
                    <!-- Survival Tab -->
                    <div class="help-tab-content" id="tab-survival">
                        <h3>Status Effects</h3>
                        <div class="survival-info">
                            <div class="survival-stat">
                                <span class="stat-icon">❤️</span>
                                <div class="stat-desc">
                                    <strong>Health</strong>
                                    <p>Take damage from creatures and environmental hazards. Eat food to restore.</p>
                                </div>
                            </div>
                            <div class="survival-stat">
                                <span class="stat-icon">🍖</span>
                                <div class="stat-desc">
                                    <strong>Hunger</strong>
                                    <p>Decreases over time. When empty, you take damage. Hunt creatures for meat.</p>
                                </div>
                            </div>
                            <div class="survival-stat">
                                <span class="stat-icon">⚡</span>
                                <div class="stat-desc">
                                    <strong>Stamina</strong>
                                    <p>Used for sprinting. Regenerates when standing still or walking.</p>
                                </div>
                            </div>
                            <div class="survival-stat">
                                <span class="stat-icon">🌡️</span>
                                <div class="stat-desc">
                                    <strong>Temperature</strong>
                                    <p>Affected by time of day. Extreme temperatures cause damage.</p>
                                </div>
                            </div>
                        </div>
                        <p class="help-tip">💡 Build shelters to protect from temperature extremes!</p>
                    </div>
                    
                    <!-- Creatures Tab -->
                    <div class="help-tab-content" id="tab-creatures">
                        <h3>Wildlife</h3>
                        <div class="creature-list">
                            <div class="creature-item">
                                <span class="creature-icon">🐰</span>
                                <div class="creature-info">
                                    <strong>Rabbit</strong>
                                    <span class="creature-tag passive-tag">Passive</span>
                                    <p>Flees when approached. Drops meat.</p>
                                </div>
                            </div>
                            <div class="creature-item">
                                <span class="creature-icon">🦌</span>
                                <div class="creature-info">
                                    <strong>Deer</strong>
                                    <span class="creature-tag passive-tag">Passive</span>
                                    <p>Fast and wary. Drops meat and hide.</p>
                                </div>
                            </div>
                            <div class="creature-item">
                                <span class="creature-icon">🐗</span>
                                <div class="creature-info">
                                    <strong>Boar</strong>
                                    <span class="creature-tag neutral-tag">Neutral</span>
                                    <p>Attacks if provoked. Drops meat and hide.</p>
                                </div>
                            </div>
                            <div class="creature-item">
                                <span class="creature-icon">🐺</span>
                                <div class="creature-info">
                                    <strong>Wolf</strong>
                                    <span class="creature-tag aggressive-tag">Aggressive</span>
                                    <p>Hunts player on sight. Drops meat and fangs.</p>
                                </div>
                            </div>
                            <div class="creature-item">
                                <span class="creature-icon">🐻</span>
                                <div class="creature-info">
                                    <strong>Bear</strong>
                                    <span class="creature-tag aggressive-tag">Aggressive</span>
                                    <p>Dangerous! High damage. Drops lots of resources.</p>
                                </div>
                            </div>
                        </div>
                        <p class="help-tip">⚠️ Aggressive creatures will chase you! Be prepared to fight or flee.</p>
                    </div>
                </div>
            </div>
        `;

    // Add to body immediately
    document.body.appendChild(helpMenu);

    // Setup event listeners immediately
    this.setupHelpMenuEvents();

    console.log("✅ Help menu initialized and ready");
  }

  setupHelpMenuEvents() {
    // Tab switching
    const tabs = document.querySelectorAll(".help-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const tabName = tab.dataset.tab;
        console.log(`📑 Switching to ${tabName} tab`);

        // Remove active from all
        document
          .querySelectorAll(".help-tab")
          .forEach((t) => t.classList.remove("active"));
        document
          .querySelectorAll(".help-tab-content")
          .forEach((c) => c.classList.remove("active"));

        // Add active to selected
        tab.classList.add("active");
        const content = document.getElementById(`tab-${tabName}`);
        if (content) {
          content.classList.add("active");
        }
      });
    });

    // Close button
    const closeBtn = document.getElementById("help-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("📖 Closing help menu");
        this.closeHelpMenu();
      });
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // H key to toggle (only in-game, not on title screen)
      if (e.key.toLowerCase() === "h") {
        const titleScreen = document.getElementById("title-screen");
        const craftingOpen = document.querySelector(
          ".crafting-menu:not(.hidden)"
        );
        const buildingOpen = document.querySelector(
          ".building-menu:not(.hidden)"
        );

        if (!titleScreen && !craftingOpen && !buildingOpen) {
          e.preventDefault();
          this.toggleHelpMenu();
        }
      }

      // ESC to close
      if (e.key === "Escape" && this.helpMenuOpen) {
        e.preventDefault();
        this.closeHelpMenu();
      }
    });

    console.log("✅ Help menu events attached");
  }

  toggleHelpMenu() {
    if (this.helpMenuOpen) {
      this.closeHelpMenu();
    } else {
      this.openHelpMenu();
    }
  }

  openHelpMenu() {
    const helpMenu = document.getElementById("help-menu");
    if (!helpMenu) {
      console.error("❌ Help menu element not found!");
      return;
    }

    helpMenu.classList.remove("hidden");
    this.helpMenuOpen = true;

    // Release pointer lock if in game
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    console.log("📖 Help menu opened");
  }

  closeHelpMenu() {
    const helpMenu = document.getElementById("help-menu");
    if (!helpMenu) return;

    helpMenu.classList.add("hidden");
    this.helpMenuOpen = false;

    console.log("📖 Help menu closed");
  }
}
