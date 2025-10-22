/**
 * HUD System
 * Comprehensive heads-up display with health, hunger, stamina, temperature, and minimap
 */

class HUDSystem {
  constructor(player, scene, camera) {
    this.player = player;
    this.scene = scene;
    this.camera = camera;

    // Player stats
    this.hunger = 100;
    this.maxHunger = 100;
    this.hungerDecayRate = 0.5; // Per minute

    this.stamina = 100;
    this.maxStamina = 100;
    this.staminaRegenRate = 10; // Per second
    this.staminaDrainRate = 20; // Per second when sprinting

    this.temperature = 20; // Celsius
    this.optimalTemp = 20;
    this.minTemp = -10;
    this.maxTemp = 40;

    // Compass
    this.compassDirection = 0;

    this.initHUD();
    console.log("📊 HUD System initialized");
  }

  initHUD() {
    const hudContainer = document.createElement("div");
    hudContainer.id = "hud-container";
    hudContainer.className = "hud-container";
    hudContainer.innerHTML = `
            <!-- Status Bars -->
            <div class="hud-status-bars">
                <!-- Health Bar -->
                <div class="status-bar health-bar-container">
                    <div class="status-icon">❤️</div>
                    <div class="status-bar-bg">
                        <div class="status-bar-fill health-fill" id="health-fill" style="width: 100%"></div>
                    </div>
                    <div class="status-value" id="health-value">100/100</div>
                </div>
                
                <!-- Hunger Bar -->
                <div class="status-bar hunger-bar-container">
                    <div class="status-icon">🍖</div>
                    <div class="status-bar-bg">
                        <div class="status-bar-fill hunger-fill" id="hunger-fill" style="width: 100%"></div>
                    </div>
                    <div class="status-value" id="hunger-value">100/100</div>
                </div>
                
                <!-- Stamina Bar -->
                <div class="status-bar stamina-bar-container">
                    <div class="status-icon">⚡</div>
                    <div class="status-bar-bg">
                        <div class="status-bar-fill stamina-fill" id="stamina-fill" style="width: 100%"></div>
                    </div>
                    <div class="status-value" id="stamina-value">100/100</div>
                </div>
                
                <!-- Temperature -->
                <div class="status-bar temp-bar-container">
                    <div class="status-icon">🌡️</div>
                    <div class="status-bar-bg">
                        <div class="status-bar-fill temp-fill" id="temp-fill" style="width: 50%"></div>
                    </div>
                    <div class="status-value" id="temp-value">20°C</div>
                </div>
            </div>
            
            <!-- Compass -->
            <div class="compass-container" id="compass-container">
                <div class="compass-bg">
                    <div class="compass-needle" id="compass-needle">▲</div>
                    <div class="compass-directions">
                        <span class="compass-n">N</span>
                        <span class="compass-e">E</span>
                        <span class="compass-s">S</span>
                        <span class="compass-w">W</span>
                    </div>
                </div>
            </div>
            
            <!-- Minimap -->
            <div class="minimap-container">
                <canvas id="minimap-canvas" width="150" height="150"></canvas>
                <div class="minimap-player">▲</div>
            </div>
        `;
    document.getElementById("ui-overlay").appendChild(hudContainer);

    // Initialize minimap
    this.minimapCanvas = document.getElementById("minimap-canvas");
    this.minimapCtx = this.minimapCanvas.getContext("2d");
  }

  updateHunger(deltaTime) {
    this.hunger -= (this.hungerDecayRate / 60) * deltaTime;
    if (this.hunger < 0) this.hunger = 0;

    // Hunger affects health
    if (this.hunger === 0 && this.player.health > 0) {
      this.player.takeDamage(1 * deltaTime); // 1 HP per second when starving
    }
  }

  updateStamina(deltaTime, isSprinting) {
    if (isSprinting && this.stamina > 0) {
      this.stamina -= this.staminaDrainRate * deltaTime;
      if (this.stamina < 0) this.stamina = 0;
    } else if (this.stamina < this.maxStamina) {
      this.stamina += this.staminaRegenRate * deltaTime;
      if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
    }
  }

  updateTemperature(gameHour) {
    // Temperature varies by time of day
    if (gameHour >= 6 && gameHour < 18) {
      this.temperature = 15 + Math.sin(((gameHour - 6) / 12) * Math.PI) * 10;
    } else {
      this.temperature = 5 + Math.random() * 5;
    }

    // Add warmth from nearby campfires
    if (window.game?.placeableSystem) {
      const warmth = window.game.placeableSystem.getWarmthAtPosition(
        this.player.position
      );
      this.temperature += warmth;
    }

    // Temperature affects health
    if (this.temperature < 0 || this.temperature > 35) {
      if (Math.random() < 0.001) {
        this.player.takeDamage(0.1);
      }
    }
  }

  updateCompass() {
    // Get camera direction
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    // Calculate angle (0 = North)
    this.compassDirection =
      Math.atan2(direction.x, direction.z) * (180 / Math.PI);

    const needle = document.getElementById("compass-needle");
    if (needle) {
      needle.style.transform = `rotate(${-this.compassDirection}deg)`;
    }
  }

  updateMinimap() {
    if (!this.minimapCtx) return;

    const ctx = this.minimapCtx;
    const size = 150;
    const scale = 2; // 1 pixel = 2 world units

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Background
    ctx.fillStyle = "rgba(20, 40, 20, 0.8)";
    ctx.fillRect(0, 0, size, size);

    // Border
    ctx.strokeStyle = "#64c864";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);

    // Center point (player position)
    const centerX = size / 2;
    const centerY = size / 2;

    // Draw structures
    if (window.game?.buildingSystem) {
      ctx.fillStyle = "#8b7355";
      for (const structure of window.game.buildingSystem.placedStructures) {
        const relX = (structure.position.x - this.player.position.x) / scale;
        const relZ = (structure.position.z - this.player.position.z) / scale;

        const mapX = centerX + relX;
        const mapY = centerY + relZ;

        if (mapX >= 0 && mapX < size && mapY >= 0 && mapY < size) {
          ctx.fillRect(mapX - 2, mapY - 2, 4, 4);
        }
      }
    }

    // Draw creatures
    if (window.game?.creatureSystem) {
      for (const creature of window.game.creatureSystem.creatures) {
        if (creature.isDead) continue;

        const relX = (creature.position.x - this.player.position.x) / scale;
        const relZ = (creature.position.z - this.player.position.z) / scale;

        const mapX = centerX + relX;
        const mapY = centerY + relZ;

        if (mapX >= 0 && mapX < size && mapY >= 0 && mapY < size) {
          // Color by behavior
          if (creature.speciesData.behavior === "aggressive") {
            ctx.fillStyle = "#ff0000";
          } else if (creature.speciesData.behavior === "neutral") {
            ctx.fillStyle = "#ffaa00";
          } else {
            ctx.fillStyle = "#00ff00";
          }

          ctx.beginPath();
          ctx.arc(mapX, mapY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw player (center)
    ctx.fillStyle = "#00ffff";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Player direction indicator
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const angle = Math.atan2(direction.x, direction.z);
    const dirX = Math.sin(angle) * 10;
    const dirY = Math.cos(angle) * 10;
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + dirX, centerY + dirY);
    ctx.stroke();
  }

  updateBars() {
    // Health
    const healthPercent = (this.player.health / this.player.maxHealth) * 100;
    const healthFill = document.getElementById("health-fill");
    const healthValue = document.getElementById("health-value");
    if (healthFill) healthFill.style.width = `${healthPercent}%`;
    if (healthValue)
      healthValue.textContent = `${Math.ceil(this.player.health)}/${
        this.player.maxHealth
      }`;

    // Hunger
    const hungerPercent = (this.hunger / this.maxHunger) * 100;
    const hungerFill = document.getElementById("hunger-fill");
    const hungerValue = document.getElementById("hunger-value");
    if (hungerFill) hungerFill.style.width = `${hungerPercent}%`;
    if (hungerValue)
      hungerValue.textContent = `${Math.ceil(this.hunger)}/${this.maxHunger}`;

    // Stamina
    const staminaPercent = (this.stamina / this.maxStamina) * 100;
    const staminaFill = document.getElementById("stamina-fill");
    const staminaValue = document.getElementById("stamina-value");
    if (staminaFill) staminaFill.style.width = `${staminaPercent}%`;
    if (staminaValue)
      staminaValue.textContent = `${Math.ceil(this.stamina)}/${
        this.maxStamina
      }`;

    // Temperature
    const tempPercent =
      ((this.temperature - this.minTemp) / (this.maxTemp - this.minTemp)) * 100;
    const tempFill = document.getElementById("temp-fill");
    const tempValue = document.getElementById("temp-value");
    if (tempFill) {
      tempFill.style.width = `${tempPercent}%`;
      // Color based on temperature
      if (this.temperature < 5) {
        tempFill.style.background = "linear-gradient(90deg, #0088ff, #00ffff)";
      } else if (this.temperature > 30) {
        tempFill.style.background = "linear-gradient(90deg, #ff8800, #ff0000)";
      } else {
        tempFill.style.background = "linear-gradient(90deg, #00ff00, #88ff00)";
      }
    }
    if (tempValue) tempValue.textContent = `${Math.ceil(this.temperature)}°C`;
  }

  update(deltaTime, gameHour, isSprinting = false) {
    this.updateHunger(deltaTime);
    this.updateStamina(deltaTime, isSprinting);
    this.updateTemperature(gameHour);
    this.updateCompass();
    this.updateMinimap();
    this.updateBars();
  }

  eatFood(hungerRestore) {
    this.hunger += hungerRestore;
    if (this.hunger > this.maxHunger) this.hunger = this.maxHunger;
  }
}
