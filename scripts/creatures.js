/**
 * Creature System
 * Handles AI creatures, behaviors, spawning, and combat
 */

class CreatureSystem {
  constructor(scene, terrain, player) {
    this.scene = scene;
    this.terrain = terrain;
    this.player = player;

    this.creatures = [];
    this.maxCreatures = 15;
    this.spawnRadius = 80; // Distance from center to spawn
    this.despawnRadius = 100; // Remove if too far

    // Define creature species
    this.species = this.initializeSpecies();

    // Spawn initial creatures
    this.spawnInitialCreatures();

    console.log(
      "🐾 Creature system initialized with",
      this.species.length,
      "species"
    );
  }

  /**
   * Define all creature species with stats and behaviors
   */
  initializeSpecies() {
    return [
      {
        id: "rabbit",
        name: "Rabbit",
        emoji: "🐰",
        color: 0xffffff,
        size: 0.5,
        health: 10,
        maxHealth: 10,
        speed: 8,
        damage: 0,
        attackRange: 0,
        detectionRange: 15,
        behavior: "passive", // passive, neutral, aggressive
        aggroOnHit: false,
        wanderSpeed: 3,
        fleeSpeed: 10,
        dropItems: [{ type: "meat", amount: 1, chance: 1.0 }],
        spawnWeight: 30, // Higher = more common
      },
      {
        id: "deer",
        name: "Deer",
        emoji: "🦌",
        color: 0x8b6f47,
        size: 1.0,
        health: 25,
        maxHealth: 25,
        speed: 10,
        damage: 0,
        attackRange: 0,
        detectionRange: 20,
        behavior: "passive",
        aggroOnHit: false,
        wanderSpeed: 4,
        fleeSpeed: 12,
        dropItems: [
          { type: "meat", amount: 3, chance: 1.0 },
          { type: "hide", amount: 1, chance: 0.8 },
        ],
        spawnWeight: 20,
      },
      {
        id: "wolf",
        name: "Wolf",
        emoji: "🐺",
        color: 0x4a4a4a,
        size: 0.8,
        health: 40,
        maxHealth: 40,
        speed: 12,
        damage: 10,
        attackRange: 2,
        detectionRange: 25,
        behavior: "aggressive",
        aggroOnHit: true,
        wanderSpeed: 5,
        attackCooldown: 1500,
        dropItems: [
          { type: "meat", amount: 2, chance: 1.0 },
          { type: "fang", amount: 1, chance: 0.5 },
        ],
        spawnWeight: 15,
      },
      {
        id: "boar",
        name: "Boar",
        emoji: "🐗",
        color: 0x5c4033,
        size: 0.9,
        health: 50,
        maxHealth: 50,
        speed: 9,
        damage: 8,
        attackRange: 1.8,
        detectionRange: 15,
        behavior: "neutral",
        aggroOnHit: true,
        wanderSpeed: 3,
        attackCooldown: 2000,
        dropItems: [
          { type: "meat", amount: 4, chance: 1.0 },
          { type: "hide", amount: 2, chance: 0.7 },
        ],
        spawnWeight: 18,
      },
      {
        id: "bear",
        name: "Bear",
        emoji: "🐻",
        color: 0x654321,
        size: 1.5,
        health: 100,
        maxHealth: 100,
        speed: 8,
        damage: 20,
        attackRange: 2.5,
        detectionRange: 30,
        behavior: "aggressive",
        aggroOnHit: true,
        wanderSpeed: 4,
        attackCooldown: 2500,
        dropItems: [
          { type: "meat", amount: 8, chance: 1.0 },
          { type: "hide", amount: 3, chance: 1.0 },
          { type: "fang", amount: 2, chance: 0.8 },
        ],
        spawnWeight: 8,
      },
    ];
  }

  /**
   * Spawn initial creatures around the map
   */
  spawnInitialCreatures() {
    for (let i = 0; i < this.maxCreatures; i++) {
      this.spawnRandomCreature();
    }
    console.log(`🐾 Spawned ${this.creatures.length} creatures`);
  }

  /**
   * Spawn a random creature based on spawn weights
   */
  spawnRandomCreature() {
    // Calculate total weight
    const totalWeight = this.species.reduce((sum, s) => sum + s.spawnWeight, 0);
    let random = Math.random() * totalWeight;

    // Select species based on weight
    let selectedSpecies = this.species[0];
    for (const species of this.species) {
      random -= species.spawnWeight;
      if (random <= 0) {
        selectedSpecies = species;
        break;
      }
    }

    // Find valid spawn position
    const spawnPos = this.findSpawnPosition();
    if (spawnPos) {
      this.spawnCreature(selectedSpecies, spawnPos);
    }
  }

  /**
   * Find a valid spawn position on terrain
   */
  findSpawnPosition() {
    for (let attempts = 0; attempts < 20; attempts++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * this.spawnRadius;

      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      const height = this.terrain.getHeightAt(x, z);

      // Check if valid (on land, not too steep)
      if (height > -1 && height < 15) {
        return new THREE.Vector3(x, height, z);
      }
    }
    return null;
  }

  /**
   * Spawn a specific creature at a position
   */
  spawnCreature(species, position) {
    const creature = {
      id: Date.now() + Math.random(),
      species: species.id,
      speciesData: species,
      position: position.clone(),
      velocity: new THREE.Vector3(0, 0, 0),
      rotation: Math.random() * Math.PI * 2,

      health: species.health,
      maxHealth: species.maxHealth,
      isDead: false,

      state: "idle", // idle, wander, chase, attack, flee
      target: null,
      lastAttackTime: 0,
      stateTimer: 0,
      wanderTarget: null,

      mesh: null,
    };

    // Create visual mesh
    creature.mesh = this.createCreatureMesh(creature);

    this.creatures.push(creature);

    console.log(
      `🐾 Spawned ${species.emoji} ${species.name} at (${position.x.toFixed(
        1
      )}, ${position.z.toFixed(1)})`
    );

    return creature;
  }

  /**
   * Create visual mesh for creature
   */
  createCreatureMesh(creature) {
    const group = new THREE.Group();
    const species = creature.speciesData;

    // Body (box for now, can be replaced with models)
    const bodyGeometry = new THREE.BoxGeometry(
      species.size,
      species.size * 0.8,
      species.size * 1.2
    );
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: species.color,
      roughness: 0.8,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = species.size * 0.4;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Head (smaller box)
    const headGeometry = new THREE.BoxGeometry(
      species.size * 0.6,
      species.size * 0.6,
      species.size * 0.6
    );
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0, species.size * 0.6, species.size * 0.7);
    head.castShadow = true;
    group.add(head);

    // Health bar
    const healthBar = this.createHealthBar(species.size);
    healthBar.position.y = species.size * 1.2;
    group.add(healthBar);
    creature.healthBar = healthBar;

    group.position.copy(creature.position);
    group.rotation.y = creature.rotation;

    group.userData.creature = creature;

    this.scene.add(group);

    return group;
  }

  /**
   * Create health bar above creature
   */
  createHealthBar(size) {
    const group = new THREE.Group();

    // Background
    const bgGeometry = new THREE.PlaneGeometry(size * 1.2, 0.15);
    const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const bg = new THREE.Mesh(bgGeometry, bgMaterial);
    group.add(bg);

    // Health fill
    const healthGeometry = new THREE.PlaneGeometry(size * 1.2, 0.12);
    const healthMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const health = new THREE.Mesh(healthGeometry, healthMaterial);
    health.position.z = 0.01;
    group.add(health);

    group.userData.healthFill = health;
    group.userData.maxWidth = size * 1.2;

    return group;
  }

  /**
   * Update health bar display
   */
  updateHealthBar(creature) {
    if (!creature.healthBar) return;

    const healthPercent = creature.health / creature.maxHealth;
    const healthFill = creature.healthBar.userData.healthFill;
    const maxWidth = creature.healthBar.userData.maxWidth;

    healthFill.scale.x = healthPercent;
    healthFill.position.x = -(maxWidth / 2) * (1 - healthPercent);

    // Change color based on health
    if (healthPercent > 0.6) {
      healthFill.material.color.setHex(0x00ff00);
    } else if (healthPercent > 0.3) {
      healthFill.material.color.setHex(0xffff00);
    } else {
      healthFill.material.color.setHex(0xff0000);
    }
  }

  /**
   * Damage a creature
   */
  damageCreature(creature, damage, attacker = null) {
    if (creature.isDead) return;

    creature.health -= damage;
    this.updateHealthBar(creature);

    console.log(
      `💥 ${creature.speciesData.emoji} ${creature.speciesData.name} took ${damage} damage (${creature.health}/${creature.maxHealth} HP)`
    );

    // React to damage
    if (
      creature.speciesData.behavior === "passive" ||
      (creature.speciesData.behavior === "neutral" &&
        creature.speciesData.aggroOnHit)
    ) {
      creature.state = "flee";
      creature.stateTimer = 5000; // Flee for 5 seconds
    } else if (
      creature.speciesData.behavior === "neutral" ||
      creature.speciesData.behavior === "aggressive"
    ) {
      creature.state = "chase";
      creature.target = attacker || this.player.position;
    }

    // Check if dead
    if (creature.health <= 0) {
      this.killCreature(creature);
    }
  }

  /**
   * Kill creature and drop loot
   */
  killCreature(creature) {
    creature.isDead = true;
    creature.health = 0;

    console.log(
      `☠️ ${creature.speciesData.emoji} ${creature.speciesData.name} died`
    );

    // Drop items
    this.dropLoot(creature);

    // Remove mesh after animation
    if (creature.mesh) {
      const fadeOut = () => {
        creature.mesh.position.y -= 0.02;
        creature.mesh.scale.multiplyScalar(0.95);

        if (creature.mesh.scale.x > 0.1) {
          requestAnimationFrame(fadeOut);
        } else {
          this.scene.remove(creature.mesh);

          // Remove from creatures array
          const index = this.creatures.indexOf(creature);
          if (index > -1) {
            this.creatures.splice(index, 1);
          }

          // Respawn new creature
          setTimeout(() => {
            this.spawnRandomCreature();
          }, 10000);
        }
      };
      fadeOut();
    }
  }

  /**
   * Drop loot from creature
   */
  dropLoot(creature) {
    const species = creature.speciesData;

    for (const drop of species.dropItems) {
      if (Math.random() < drop.chance) {
        // Create ground item at creature position
        if (window.game?.inventory) {
          // Register item if needed
          if (!window.game.inventory.itemData[drop.type]) {
            this.registerLootItem(drop.type);
          }

          // Drop on ground
          window.game.inventory.createGroundItem(
            drop.type,
            drop.amount,
            creature.position.x,
            creature.position.z
          );
        }
      }
    }
  }

  /**
   * Register new loot item types
   */
  registerLootItem(itemType) {
    const itemData = {
      meat: {
        name: "Meat",
        icon: "🥩",
        color: "#8b0000",
        description: "Raw meat from creatures",
        type: "resource",
      },
      hide: {
        name: "Hide",
        icon: "🦴",
        color: "#8b6f47",
        description: "Animal hide for crafting",
        type: "resource",
      },
      fang: {
        name: "Fang",
        icon: "🦷",
        color: "#ffffff",
        description: "Sharp fang from predators",
        type: "resource",
      },
    };

    if (itemData[itemType] && window.game?.inventory) {
      window.game.inventory.itemData[itemType] = itemData[itemType];
    }
  }

  /**
   * Update all creatures
   */
  update(deltaTime) {
    for (const creature of this.creatures) {
      if (creature.isDead) continue;

      this.updateCreature(creature, deltaTime);
    }
  }

  /**
   * Update individual creature AI
   */
  updateCreature(creature, deltaTime) {
    const species = creature.speciesData;

    // Update state timer
    if (creature.stateTimer > 0) {
      creature.stateTimer -= deltaTime * 1000;
      if (creature.stateTimer <= 0) {
        creature.state = "idle";
      }
    }

    // Calculate distance to player
    const distanceToPlayer = creature.position.distanceTo(this.player.position);

    // State machine
    switch (creature.state) {
      case "idle":
        this.updateIdle(creature, distanceToPlayer, deltaTime);
        break;
      case "wander":
        this.updateWander(creature, distanceToPlayer, deltaTime);
        break;
      case "chase":
        this.updateChase(creature, distanceToPlayer, deltaTime);
        break;
      case "attack":
        this.updateAttack(creature, distanceToPlayer, deltaTime);
        break;
      case "flee":
        this.updateFlee(creature, distanceToPlayer, deltaTime);
        break;
    }

    // Apply movement
    this.applyMovement(creature, deltaTime);

    // Update mesh
    this.updateCreatureMesh(creature);

    // Make health bar face camera
    if (creature.healthBar && window.game?.camera) {
      creature.healthBar.lookAt(window.game.camera.position);
    }
  }

  updateIdle(creature, distanceToPlayer, deltaTime) {
    const species = creature.speciesData;

    // Check for player
    if (
      species.behavior === "aggressive" &&
      distanceToPlayer < species.detectionRange
    ) {
      creature.state = "chase";
      creature.target = this.player.position;
      return;
    }

    // Random chance to wander
    if (Math.random() < 0.01) {
      creature.state = "wander";
      creature.stateTimer = 3000 + Math.random() * 5000;
    }
  }

  updateWander(creature, distanceToPlayer, deltaTime) {
    const species = creature.speciesData;

    // Check for player
    if (
      species.behavior === "aggressive" &&
      distanceToPlayer < species.detectionRange
    ) {
      creature.state = "chase";
      creature.target = this.player.position;
      return;
    }

    // Pick random wander target
    if (!creature.wanderTarget || Math.random() < 0.02) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 5 + Math.random() * 10;
      creature.wanderTarget = new THREE.Vector3(
        creature.position.x + Math.cos(angle) * distance,
        0,
        creature.position.z + Math.sin(angle) * distance
      );
    }

    // Move towards wander target
    if (creature.wanderTarget) {
      const direction = new THREE.Vector3()
        .subVectors(creature.wanderTarget, creature.position)
        .normalize();

      creature.velocity.x = direction.x * species.wanderSpeed;
      creature.velocity.z = direction.z * species.wanderSpeed;

      creature.rotation = Math.atan2(direction.x, direction.z);
    }
  }

  updateChase(creature, distanceToPlayer, deltaTime) {
    const species = creature.speciesData;

    // Check if in attack range
    if (distanceToPlayer < species.attackRange) {
      creature.state = "attack";
      return;
    }

    // Check if lost player
    if (distanceToPlayer > species.detectionRange * 1.5) {
      creature.state = "idle";
      creature.target = null;
      return;
    }

    // Chase player
    const direction = new THREE.Vector3()
      .subVectors(this.player.position, creature.position)
      .normalize();

    creature.velocity.x = direction.x * species.speed;
    creature.velocity.z = direction.z * species.speed;

    creature.rotation = Math.atan2(direction.x, direction.z);
  }

  updateAttack(creature, distanceToPlayer, deltaTime) {
    const species = creature.speciesData;
    const now = Date.now();

    // Check if out of range
    if (distanceToPlayer > species.attackRange * 1.2) {
      creature.state = "chase";
      return;
    }

    // Stop moving during attack
    creature.velocity.x = 0;
    creature.velocity.z = 0;

    // Face player
    const direction = new THREE.Vector3()
      .subVectors(this.player.position, creature.position)
      .normalize();
    creature.rotation = Math.atan2(direction.x, direction.z);

    // Attack on cooldown
    if (now - creature.lastAttackTime > species.attackCooldown) {
      this.performAttack(creature);
      creature.lastAttackTime = now;
    }
  }

  updateFlee(creature, distanceToPlayer, deltaTime) {
    const species = creature.speciesData;

    // Flee away from player
    const direction = new THREE.Vector3()
      .subVectors(creature.position, this.player.position)
      .normalize();

    creature.velocity.x = direction.x * species.fleeSpeed;
    creature.velocity.z = direction.z * species.fleeSpeed;

    creature.rotation = Math.atan2(direction.x, direction.z);
  }

  performAttack(creature) {
    const species = creature.speciesData;

    console.log(
      `⚔️ ${species.emoji} ${species.name} attacks for ${species.damage} damage!`
    );

    // Damage player
    if (window.game?.player) {
      window.game.player.takeDamage?.(species.damage);
    }

    // Visual feedback
    this.showAttackEffect(creature);
  }

  showAttackEffect(creature) {
    // Flash creature red
    if (creature.mesh) {
      const originalColor = creature.mesh.children[0].material.color.getHex();
      creature.mesh.children[0].material.color.setHex(0xff0000);

      setTimeout(() => {
        creature.mesh.children[0].material.color.setHex(originalColor);
      }, 100);
    }
  }

  applyMovement(creature, deltaTime) {
    // Apply velocity
    creature.position.x += creature.velocity.x * deltaTime;
    creature.position.z += creature.velocity.z * deltaTime;

    // Keep on terrain
    const terrainHeight = this.terrain.getHeightAt(
      creature.position.x,
      creature.position.z
    );
    creature.position.y = terrainHeight;

    // Damping
    creature.velocity.multiplyScalar(0.9);
  }

  updateCreatureMesh(creature) {
    if (creature.mesh) {
      creature.mesh.position.copy(creature.position);
      creature.mesh.rotation.y = creature.rotation;
    }
  }

  /**
   * Get closest creature to a position
   */
  getClosestCreature(position, maxDistance = 5) {
    let closest = null;
    let closestDist = maxDistance;

    for (const creature of this.creatures) {
      if (creature.isDead) continue;

      const dist = position.distanceTo(creature.position);
      if (dist < closestDist) {
        closest = creature;
        closestDist = dist;
      }
    }

    return closest;
  }
}
