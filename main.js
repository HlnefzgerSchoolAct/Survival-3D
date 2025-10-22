/**
 * Survival 3d
 * Main Game Controller
 * Version: 1.0.0
 * Build: 2025-10-22 18:16:45 UTC
 * Developer: HlnefzgerSchoolAct
 */

class EdenfallGame {
  constructor() {
    this.collisionDebugEnabled = false;
    this.collisionHelpers = [];
    this.init();
  }

  async init() {
    // Show title screen FIRST
    this.titleScreen = new TitleScreenManager();

    // Wait for title screen to finish
    await this.waitForTitleScreen();

    console.log("🌍 Initializing Survival 3d...");

    try {
      // Setup scene
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.Fog(0x87ceeb, 150, 600);

      // Setup camera
      this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );

      // Setup renderer with optimizations
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        logarithmicDepthBuffer: true,
        powerPreference: "high-performance",
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Enable optimizations
      this.renderer.sortObjects = true;
      this.renderer.autoClear = true;

      document
        .getElementById("game-container")
        .appendChild(this.renderer.domElement);

      console.log("✅ Renderer created with optimizations");

      // Initialize optimization manager EARLY
      console.log("⚡ Creating optimization manager...");
      this.optimizationManager = new OptimizationManager(
        this.scene,
        this.camera,
        this.renderer
      );

      // Setup lighting
      this.setupLighting();
      console.log("✅ Lighting setup complete");

      // Initialize game systems in order
      console.log("🏔️ Creating terrain...");
      this.terrain = new TerrainGenerator(this.scene);

      await this.wait(100);

      console.log("🎒 Creating inventory...");
      this.inventory = new Inventory();

      console.log("🔨 Creating crafting system...");
      this.craftingSystem = new CraftingSystem(this.inventory);

      console.log("🏗️ Creating building system...");
      this.buildingSystem = new BuildingSystem(
        this.scene,
        this.terrain,
        this.inventory
      );

      console.log("📦 Creating resource system...");
      this.resourceSystem = new ResourceSystem(this.scene, this.terrain);

      console.log("🌲 Creating environment...");
      this.environment = new EnvironmentGenerator(
        this.scene,
        this.terrain,
        this.resourceSystem
      );

      await this.wait(500);

      console.log("🎮 Creating player...");
      this.player = new Player(
        this.scene,
        this.terrain,
        this.resourceSystem,
        this.inventory
      );

      console.log("📷 Creating camera controller...");
      this.cameraController = new CameraController(this.camera, this.player);

      await this.wait(500);

      console.log("🐾 Creating creature system...");
      this.creatureSystem = new CreatureSystem(
        this.scene,
        this.terrain,
        this.player
      );

      console.log("📊 Creating HUD system...");
      this.hudSystem = new HUDSystem(this.player, this.scene, this.camera);

      // Performance tracking
      this.clock = new THREE.Clock();
      this.frameCount = 0;
      this.fps = 0;
      this.lastFPSUpdate = 0;

      // Time system
      this.gameHour = 8;
      this.timeSpeed = 1 / 30; // 1 in-game hour = 30 real seconds

      // Event listeners
      this.setupEventListeners();

      // Start game loop
      this.animate();

      console.log("✅ Game initialized successfully!");
      console.log("💾 Progress auto-saves to localStorage");
      console.log("⚡ Optimizations enabled");
      console.log(
        `🐾 ${this.creatureSystem.creatures.length} creatures spawned`
      );
      console.log("🎮 Press [H] for help and controls");

      // Generate initial performance report after everything loads
      setTimeout(() => {
        this.optimizationManager.generatePerformanceReport();
      }, 3000);
    } catch (error) {
      console.error("❌ Error initializing game:", error);
      console.error(error.stack);

      // Show error screen
      const errorScreen = document.createElement("div");
      errorScreen.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                color: #ff6666;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 99999;
                font-family: monospace;
            `;
      errorScreen.innerHTML = `
                <h1 style="font-size: 48px; margin: 0;">⚠️ INITIALIZATION ERROR</h1>
                <p style="font-size: 18px; margin: 20px 0;">Failed to start Edenfall</p>
                <div style="background: rgba(255, 100, 100, 0.1); border: 2px solid #ff6666; padding: 20px; border-radius: 8px; max-width: 600px;">
                    <p style="margin: 0; color: #fff;">${error.message}</p>
                </div>
                <p style="font-size: 14px; color: #aaa; margin-top: 30px;">Check console (F12) for details</p>
                <button onclick="location.reload()" style="
                    margin-top: 30px;
                    padding: 15px 40px;
                    background: transparent;
                    border: 2px solid #ff6666;
                    color: #ff6666;
                    font-size: 16px;
                    cursor: pointer;
                    border-radius: 8px;
                    font-family: inherit;
                ">Reload Page</button>
            `;
      document.body.appendChild(errorScreen);
    }
  }

  /**
   * Wait for title screen to complete
   */
  waitForTitleScreen() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!document.getElementById("title-screen")) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Utility wait function
   */
  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Setup scene lighting
   */
  setupLighting() {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    // Directional sun light
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sunLight.position.set(80, 120, 60);
    this.sunLight.castShadow = true;

    // Shadow map settings
    this.sunLight.shadow.camera.left = -150;
    this.sunLight.shadow.camera.right = 150;
    this.sunLight.shadow.camera.top = 150;
    this.sunLight.shadow.camera.bottom = -150;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.bias = -0.0005;

    this.scene.add(this.sunLight);

    // Hemisphere light for ambient color variation
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x6b5d46, 0.4);
    this.scene.add(this.hemiLight);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Window resize
    window.addEventListener("resize", () => this.onWindowResize());

    // Pointer lock for mouse look
    document.addEventListener("click", () => {
      // Check if any menu is open
      const craftingOpen = this.craftingSystem?.isMenuOpen;
      const buildingOpen = this.buildingSystem?.menuOpen;
      const helpOpen = this.titleScreen?.helpMenuOpen;
      const titleScreenExists = document.getElementById("title-screen");

      const noPtrLock =
        craftingOpen || buildingOpen || helpOpen || titleScreenExists;

      if (!document.pointerLockElement && !noPtrLock) {
        this.renderer.domElement.requestPointerLock();
      }
    });

    // Visibility change (pause when tab hidden)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        console.log("⏸️ Game paused (tab hidden)");
      } else {
        console.log("▶️ Game resumed");
        this.clock.getDelta(); // Reset delta time to prevent jump
      }
    });
  }

  /**
   * Handle window resize
   */
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Toggle collision debug visualization
   */
  toggleCollisionDebug() {
    if (!this.collisionDebugEnabled) {
      this.collisionDebugEnabled = true;
      this.collisionHelpers = [];

      // Create box helpers for all structures
      for (const mesh of this.buildingSystem.placedMeshes) {
        const helper = new THREE.BoxHelper(mesh, 0xff0000);
        this.scene.add(helper);
        this.collisionHelpers.push(helper);
      }

      console.log("🔴 Collision debug: ON");
    } else {
      this.collisionDebugEnabled = false;

      // Remove helpers
      for (const helper of this.collisionHelpers) {
        this.scene.remove(helper);
      }
      this.collisionHelpers = [];

      console.log("⚫ Collision debug: OFF");
    }
  }

  /**
   * Update day/night cycle and lighting
   */
  updateTimeOfDay(deltaTime) {
    this.gameHour += deltaTime * this.timeSpeed;

    if (this.gameHour >= 24) {
      this.gameHour -= 24;
    }

    const hour = Math.floor(this.gameHour);
    const minute = Math.floor((this.gameHour - hour) * 60);

    let timeOfDayString = "";
    let sunIntensity = 1.0;
    let ambientIntensity = 0.5;
    let skyColor, fogColor;

    // Time-based lighting
    if (hour >= 0 && hour < 5) {
      // Night
      timeOfDayString = "Night";
      sunIntensity = 0.05;
      ambientIntensity = 0.1;
      skyColor = new THREE.Color(0x0a0a1a);
      fogColor = new THREE.Color(0x0a0a1a);
    } else if (hour >= 5 && hour < 7) {
      // Dawn
      timeOfDayString = "Dawn";
      const t = (this.gameHour - 5) / 2;
      sunIntensity = 0.05 + t * 0.65;
      ambientIntensity = 0.1 + t * 0.3;
      const nightColor = new THREE.Color(0x0a0a1a);
      const dawnColor = new THREE.Color(0x8b4513);
      skyColor = nightColor.clone().lerp(dawnColor, t);
      fogColor = skyColor.clone();
    } else if (hour >= 7 && hour < 9) {
      // Sunrise
      timeOfDayString = "Sunrise";
      const t = (this.gameHour - 7) / 2;
      sunIntensity = 0.7 + t * 0.5;
      ambientIntensity = 0.4 + t * 0.2;
      const dawnColor = new THREE.Color(0x8b4513);
      const dayColor = new THREE.Color(0x87ceeb);
      skyColor = dawnColor.clone().lerp(dayColor, t);
      fogColor = skyColor.clone();
    } else if (hour >= 9 && hour < 17) {
      // Day
      timeOfDayString = "Day";
      sunIntensity = 1.2;
      ambientIntensity = 0.6;
      skyColor = new THREE.Color(0x87ceeb);
      fogColor = new THREE.Color(0xa0d8f0);
    } else if (hour >= 17 && hour < 19) {
      // Sunset
      timeOfDayString = "Sunset";
      const t = (this.gameHour - 17) / 2;
      sunIntensity = 1.2 - t * 0.5;
      ambientIntensity = 0.6 - t * 0.3;
      const dayColor = new THREE.Color(0x87ceeb);
      const sunsetColor = new THREE.Color(0xff4500);
      skyColor = dayColor.clone().lerp(sunsetColor, t);
      fogColor = skyColor.clone();
    } else if (hour >= 19 && hour < 21) {
      // Dusk
      timeOfDayString = "Dusk";
      const t = (this.gameHour - 19) / 2;
      sunIntensity = 0.7 - t * 0.5;
      ambientIntensity = 0.3 - t * 0.15;
      const sunsetColor = new THREE.Color(0xff4500);
      const duskColor = new THREE.Color(0x1a1a3e);
      skyColor = sunsetColor.clone().lerp(duskColor, t);
      fogColor = skyColor.clone();
    } else {
      // Evening
      timeOfDayString = "Evening";
      const t = (this.gameHour - 21) / 3;
      sunIntensity = 0.2 - t * 0.15;
      ambientIntensity = 0.15 - t * 0.05;
      const duskColor = new THREE.Color(0x1a1a3e);
      const nightColor = new THREE.Color(0x0a0a1a);
      skyColor = duskColor.clone().lerp(nightColor, t);
      fogColor = skyColor.clone();
    }

    // Apply lighting
    this.sunLight.intensity = sunIntensity;
    this.ambientLight.intensity = ambientIntensity;

    // Update sky color (if skybox exists)
    if (window.skybox) {
      window.skybox.material.color.copy(skyColor);
    }

    // Update fog color
    this.scene.fog.color.copy(fogColor);

    // Update sun position
    const sunAngle = ((this.gameHour - 6) / 12) * Math.PI;
    const sunDistance = 200;
    this.sunLight.position.x = Math.cos(sunAngle) * sunDistance;
    this.sunLight.position.y = Math.sin(sunAngle) * sunDistance;
    this.sunLight.position.z = 50;

    // Update sun color based on time
    if (hour >= 5 && hour < 9) {
      this.sunLight.color.setHex(0xffaa66); // Orange morning
    } else if (hour >= 9 && hour < 17) {
      this.sunLight.color.setHex(0xffffee); // Bright white day
    } else if (hour >= 17 && hour < 21) {
      this.sunLight.color.setHex(0xff6644); // Red evening
    } else {
      this.sunLight.color.setHex(0x4466aa); // Blue night
    }

    // Update time display
    const hourString = hour.toString().padStart(2, "0");
    const minuteString = minute.toString().padStart(2, "0");
    const timeEl = document.getElementById("game-time");
    if (timeEl) {
      timeEl.textContent = `${hourString}:${minuteString} (${timeOfDayString})`;
    }
  }

  /**
   * Update UI elements
   */
  updateUI() {
    if (this.player) {
      const pos = this.player.position;
      const posEl = document.getElementById("position");
      if (posEl) {
        posEl.textContent = `X: ${pos.x.toFixed(1)}, Y: ${pos.y.toFixed(
          1
        )}, Z: ${pos.z.toFixed(1)}`;
      }
    }
  }

  /**
   * Main animation loop
   */
  animate() {
    if (!this.isRunning) {
      this.isRunning = true;
      console.log("🎬 Animation loop started");
    }

    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();

    // Limit delta time to prevent physics issues when tab is inactive
    const cappedDeltaTime = Math.min(deltaTime, 0.1);

    // Update player and camera
    if (this.player && this.cameraController) {
      this.player.update(cappedDeltaTime, this.camera);
      this.cameraController.update();
    }

    // Update resource particles
    if (this.resourceSystem) {
      this.resourceSystem.updateParticles(cappedDeltaTime);
    }

    // Update building system
    if (this.buildingSystem) {
      this.buildingSystem.update(this.camera);
    }

    // Update creatures
    if (this.creatureSystem) {
      this.creatureSystem.update(cappedDeltaTime);
    }

    // Update inventory ground items
    if (this.inventory) {
      this.inventory.updateGroundItems(cappedDeltaTime);
      this.inventory.checkNearbyItems();
    }

    // Update HUD (health, hunger, stamina, temperature, minimap, compass)
    if (this.hudSystem) {
      this.hudSystem.update(cappedDeltaTime, this.gameHour, false);
    }

    // Update optimizations (frustum culling, LOD, performance tracking)
    if (this.optimizationManager) {
      this.optimizationManager.update(cappedDeltaTime);
    }

    // Update time of day
    this.updateTimeOfDay(cappedDeltaTime);

    // Update UI
    this.updateUI();

    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize game when DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  console.log("📄 DOM loaded, starting game...");
  console.log("🌍 Survival 3d");
  console.log("👤 Player: HlnefzgerSchoolAct");
  console.log("📅 Build: 2025-10-22 18:16:45 UTC");
  console.log("");

  window.game = new EdenfallGame();
});
