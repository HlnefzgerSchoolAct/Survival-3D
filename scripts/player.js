/**
 * Player Controller
 * Handles movement, jumping, collision detection, resource gathering, combat, and item usage
 */

class Player {
  constructor(scene, terrain, resourceSystem, inventory) {
    this.scene = scene;
    this.terrain = terrain;
    this.resourceSystem = resourceSystem;
    this.inventory = inventory;

    this.position = new THREE.Vector3(0, 50, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.moveSpeed = 15;
    this.jumpForce = 10;
    this.gravity = -25;
    this.isGrounded = false;
    this.playerHeight = 1.8;
    this.playerRadius = 0.5; // Collision radius

    // Gathering properties
    this.gatherRange = 5;
    this.gatherCooldown = 500;
    this.lastGatherTime = 0;
    this.nearestResource = null;

    // Combat properties
    this.health = 100;
    this.maxHealth = 100;
    this.attackDamage = 10;
    this.attackRange = 3;
    this.attackCooldown = 1000;
    this.lastAttackTime = 0;

    // Input keys
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      gather: false,
      attack: false,
      use: false,
    };

    this.setupInput();

    setTimeout(() => {
      this.position = this.findSpawnPosition();
      console.log("🎮 Player spawned at:", this.position);
    }, 400);
  }

  findSpawnPosition() {
    for (let i = 0; i < 50; i++) {
      const x = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;
      const height = this.terrain.getHeightAt(x, z);

      if (height > 0 && height < 10) {
        const h1 = this.terrain.getHeightAt(x + 3, z);
        const h2 = this.terrain.getHeightAt(x - 3, z);
        const h3 = this.terrain.getHeightAt(x, z + 3);
        const h4 = this.terrain.getHeightAt(x, z - 3);

        const maxDiff = Math.max(
          Math.abs(height - h1),
          Math.abs(height - h2),
          Math.abs(height - h3),
          Math.abs(height - h4)
        );

        if (maxDiff < 3) {
          return new THREE.Vector3(x, height + 3, z);
        }
      }
    }

    const height = this.terrain.getHeightAt(0, 0);
    return new THREE.Vector3(0, height + 3, 0);
  }

  setupInput() {
    window.addEventListener("keydown", (e) => {
      switch (e.key.toLowerCase()) {
        case "w":
          this.keys.forward = true;
          break;
        case "s":
          this.keys.backward = true;
          break;
        case "a":
          this.keys.left = true;
          break;
        case "d":
          this.keys.right = true;
          break;
        case "e":
          this.keys.gather = true;
          break;
        case "f":
          this.keys.attack = true;
          break;
        case "r":
          this.keys.use = true;
          break;
        case " ":
          e.preventDefault();
          this.keys.jump = true;
          break;
      }
    });

    window.addEventListener("keyup", (e) => {
      switch (e.key.toLowerCase()) {
        case "w":
          this.keys.forward = false;
          break;
        case "s":
          this.keys.backward = false;
          break;
        case "a":
          this.keys.left = false;
          break;
        case "d":
          this.keys.right = false;
          break;
        case "e":
          this.keys.gather = false;
          break;
        case "f":
          this.keys.attack = false;
          break;
        case "r":
          this.keys.use = false;
          break;
        case " ":
          this.keys.jump = false;
          break;
      }
    });
  }

  update(deltaTime, camera) {
    // Apply gravity
    this.velocity.y += this.gravity * deltaTime;

    // Calculate movement direction
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const direction = new THREE.Vector3();
    if (this.keys.forward) direction.add(forward);
    if (this.keys.backward) direction.sub(forward);
    if (this.keys.left) direction.sub(right);
    if (this.keys.right) direction.add(right);

    if (direction.length() > 0) {
      direction.normalize();
      this.velocity.x = direction.x * this.moveSpeed;
      this.velocity.z = direction.z * this.moveSpeed;
    } else {
      this.velocity.x *= 0.9;
      this.velocity.z *= 0.9;
    }

    // Jump
    if (this.keys.jump && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }

    // Store old position for collision resolution
    const oldPosition = this.position.clone();

    // Apply horizontal movement with collision check
    const horizontalVelocity = new THREE.Vector3(
      this.velocity.x,
      0,
      this.velocity.z
    );
    const newHorizontalPos = oldPosition
      .clone()
      .add(horizontalVelocity.multiplyScalar(deltaTime));
    newHorizontalPos.y = this.position.y;

    // Check if new horizontal position would collide
    if (!this.checkHorizontalStructureCollision(newHorizontalPos)) {
      this.position.x = newHorizontalPos.x;
      this.position.z = newHorizontalPos.z;
    } else {
      // Stop horizontal velocity when hitting a wall
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // Apply vertical movement
    this.position.y += this.velocity.y * deltaTime;

    // Check if standing on a structure (foundation/floor)
    const structureHeight = this.getStructureHeightBelow();
    const terrainHeight = this.terrain.getHeightAt(
      this.position.x,
      this.position.z
    );

    // Use whichever is higher - structure or terrain
    const groundLevel =
      Math.max(structureHeight, terrainHeight) + this.playerHeight / 2;

    if (this.position.y <= groundLevel) {
      this.position.y = groundLevel;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // Check terrain collision (world bounds)
    this.checkTerrainCollision();

    // Resource gathering
    this.updateResourceGathering();

    // Combat
    this.updateCombat();

    // Item usage (torches, campfires, etc.)
    this.updateItemUse();
  }

  /**
   * Check if new horizontal position would collide with structures
   * Returns true if collision would occur
   */
  checkHorizontalStructureCollision(testPosition) {
    const buildingSystem = window.game?.buildingSystem;
    if (!buildingSystem || !buildingSystem.placedMeshes) return false;

    for (const structureMesh of buildingSystem.placedMeshes) {
      const structureType = structureMesh.userData.structureType;

      // Get structure bounding box
      const geometry = structureMesh.geometry;
      if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
      }

      const boundingBox = geometry.boundingBox.clone();
      boundingBox.applyMatrix4(structureMesh.matrixWorld);

      // Create a 2D horizontal check (ignore Y for walls)
      // Expand by player radius
      const minX = boundingBox.min.x - this.playerRadius;
      const maxX = boundingBox.max.x + this.playerRadius;
      const minZ = boundingBox.min.z - this.playerRadius;
      const maxZ = boundingBox.max.z + this.playerRadius;

      // Check if player would be inside horizontally
      if (
        testPosition.x >= minX &&
        testPosition.x <= maxX &&
        testPosition.z >= minZ &&
        testPosition.z <= maxZ
      ) {
        // Check vertical overlap - only block if player intersects vertically
        const playerBottom = this.position.y - this.playerHeight / 2;
        const playerTop = this.position.y + this.playerHeight / 2;

        const structureBottom = boundingBox.min.y;
        const structureTop = boundingBox.max.y;

        // Check if there's vertical overlap
        if (playerBottom < structureTop && playerTop > structureBottom) {
          return true; // Collision would occur
        }
      }
    }

    return false; // No collision
  }

  /**
   * Get the height of any structure directly below the player
   * Used for standing on foundations and floors
   */
  getStructureHeightBelow() {
    const buildingSystem = window.game?.buildingSystem;
    if (!buildingSystem || !buildingSystem.placedMeshes) return -Infinity;

    let highestStructure = -Infinity;

    for (const structureMesh of buildingSystem.placedMeshes) {
      const structureType = structureMesh.userData.structureType;

      // Only check foundation and floor for standing
      if (structureType !== "foundation" && structureType !== "floor") {
        continue;
      }

      const geometry = structureMesh.geometry;
      if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
      }

      const boundingBox = geometry.boundingBox.clone();
      boundingBox.applyMatrix4(structureMesh.matrixWorld);

      // Check if player is horizontally above this structure
      if (
        this.position.x >= boundingBox.min.x &&
        this.position.x <= boundingBox.max.x &&
        this.position.z >= boundingBox.min.z &&
        this.position.z <= boundingBox.max.z
      ) {
        // Player is above this structure - check if close enough to stand on
        const structureTop = boundingBox.max.y;
        const playerBottom = this.position.y - this.playerHeight / 2;

        // If player is falling and close to the top surface
        if (
          playerBottom <= structureTop + 0.5 &&
          playerBottom >= structureTop - 1
        ) {
          highestStructure = Math.max(highestStructure, structureTop);
        }
      }
    }

    return highestStructure;
  }

  updateResourceGathering() {
    const previousResource = this.nearestResource;
    this.nearestResource = this.resourceSystem.getClosestNode(
      this.position,
      this.gatherRange
    );

    if (previousResource && previousResource !== this.nearestResource) {
      this.resourceSystem.hideIndicator(previousResource);
    }

    if (this.nearestResource) {
      this.resourceSystem.showIndicator(this.nearestResource);
      this.showGatherPrompt(this.nearestResource);

      if (this.keys.gather) {
        this.attemptGather();
      }
    } else {
      this.hideGatherPrompt();
    }
  }

  getGatheringBonuses(resourceType) {
    const tool = this.inventory.getSelectedTool();

    let amountMultiplier = 1;
    let speedMultiplier = 1;

    if (tool && tool.gatherBonus && tool.gatherBonus[resourceType]) {
      const bonus = tool.gatherBonus[resourceType];
      amountMultiplier = bonus.amountMultiplier || 1;
      speedMultiplier = bonus.speedMultiplier || 1;
    }

    return { amountMultiplier, speedMultiplier, tool };
  }

  attemptGather() {
    const now = Date.now();

    if (!this.nearestResource) {
      return;
    }

    const bonuses = this.getGatheringBonuses(this.nearestResource.type);
    const effectiveCooldown = this.gatherCooldown / bonuses.speedMultiplier;

    if (now - this.lastGatherTime < effectiveCooldown) {
      return;
    }

    const resource = this.resourceSystem.gatherResource(
      this.nearestResource,
      bonuses.amountMultiplier
    );

    if (resource) {
      this.inventory.addItem(resource.type, resource.amount);
      this.lastGatherTime = now;

      if (bonuses.tool) {
        this.showToolFeedback(bonuses.tool, bonuses.speedMultiplier);
      }
    }
  }

  showToolFeedback(tool, speedMultiplier) {
    const feedbackEl = document.getElementById("tool-feedback");
    if (feedbackEl) {
      feedbackEl.textContent = `Using ${tool.icon} ${tool.name} (${speedMultiplier}x speed)`;
      feedbackEl.style.display = "block";

      setTimeout(() => {
        feedbackEl.style.display = "none";
      }, 500);
    }
  }

  showGatherPrompt(node) {
    let prompt = document.getElementById("gather-prompt");
    if (!prompt) {
      prompt = document.createElement("div");
      prompt.id = "gather-prompt";
      document.getElementById("ui-overlay").appendChild(prompt);
    }

    const resourceName = node.type.charAt(0).toUpperCase() + node.type.slice(1);
    const bonuses = this.getGatheringBonuses(node.type);

    let promptText = `[E] Gather ${resourceName} (${node.health}/${node.maxHealth})`;

    if (bonuses.tool) {
      promptText += `\n${bonuses.tool.icon} ${bonuses.amountMultiplier}x amount, ${bonuses.speedMultiplier}x speed`;
    } else {
      promptText += "\n(No tool equipped)";
    }

    prompt.textContent = promptText;
    prompt.style.display = "block";
    prompt.style.whiteSpace = "pre-line";
  }

  hideGatherPrompt() {
    const prompt = document.getElementById("gather-prompt");
    if (prompt) {
      prompt.style.display = "none";
    }
  }

  /**
   * Handle combat
   */
  updateCombat() {
    if (this.keys.attack) {
      this.attemptAttack();
    }
  }

  /**
   * Attempt to attack nearby creature
   */
  attemptAttack() {
    const now = Date.now();

    if (now - this.lastAttackTime < this.attackCooldown) {
      return;
    }

    // Get creature system
    const creatureSystem = window.game?.creatureSystem;
    if (!creatureSystem) return;

    // Find closest creature
    const target = creatureSystem.getClosestCreature(
      this.position,
      this.attackRange
    );

    if (target) {
      // Calculate damage with tool bonus
      let damage = this.attackDamage;
      const tool = this.inventory.getSelectedTool();
      if (tool && tool.toolType === "axe") {
        damage *= 1.5; // Axes do more damage
      } else if (tool && tool.toolType === "pickaxe") {
        damage *= 1.2; // Pickaxes do some damage
      }

      creatureSystem.damageCreature(target, damage, this);
      this.lastAttackTime = now;

      this.showAttackFeedback(target);
    }
  }

  /**
   * Show attack feedback
   */
  showAttackFeedback(target) {
    const message = document.createElement("div");
    message.className = "combat-message";
    message.textContent = `⚔️ Hit ${target.speciesData.emoji} ${target.speciesData.name}!`;
    document.getElementById("ui-overlay").appendChild(message);

    setTimeout(() => {
      message.style.opacity = "0";
      setTimeout(() => message.remove(), 300);
    }, 1000);
  }

  /**
   * Try to use/place item (torches, campfires, etc.)
   */
  updateItemUse() {
    if (this.keys.use) {
      this.keys.use = false; // Prevent spam

      // Try to place item with placeable system
      if (window.game?.placeableSystem) {
        const used = window.game.placeableSystem.tryUsePlaceable();
        if (used) {
          console.log("🔥 Used placeable item");
        }
      }
    }
  }

  /**
   * Take damage from creatures
   */
  takeDamage(damage) {
    this.health -= damage;

    if (this.health < 0) this.health = 0;

    this.showDamageEffect();

    console.log(
      `💔 Player took ${damage} damage (${this.health}/${this.maxHealth} HP)`
    );

    if (this.health <= 0) {
      this.die();
    }
  }

  /**
   * Update player health UI - now handled by HUD system
   * Keep method for compatibility
   */
  updateHealthUI() {
    // Health display is now handled by HUD system in hud.js
    // This method is kept for backward compatibility
    // HUD automatically reads this.health and this.maxHealth
  }

  /**
   * Show damage visual effect
   */
  showDamageEffect() {
    const overlay = document.createElement("div");
    overlay.className = "damage-overlay";
    document.body.appendChild(overlay);

    setTimeout(() => overlay.remove(), 200);
  }

  /**
   * Player death
   */
  die() {
    console.log("💀 Player died!");

    // Show death screen
    const deathScreen = document.createElement("div");
    deathScreen.className = "death-screen";
    deathScreen.innerHTML = `
            <h1>☠️ YOU DIED</h1>
            <p>Respawning...</p>
        `;
    document.body.appendChild(deathScreen);

    // Respawn after delay
    setTimeout(() => {
      this.health = this.maxHealth;
      this.position = this.findSpawnPosition();
      deathScreen.remove();
      console.log("♻️ Player respawned");
    }, 3000);
  }

  checkTerrainCollision() {
    // Only check world bounds here, structure collision handled separately
    const maxDist = this.terrain.terrainSize / 2 - 5;
    this.position.x = Math.max(-maxDist, Math.min(maxDist, this.position.x));
    this.position.z = Math.max(-maxDist, Math.min(maxDist, this.position.z));
  }
}
