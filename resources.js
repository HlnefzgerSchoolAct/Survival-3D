/**
 * Resource System
 * Handles resource gathering, item types, and resource nodes
 */

class ResourceSystem {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.resourceNodes = [];
    this.particlePool = [];

    console.log("📦 Resource system initialized");
  }

  // Create a resource node (tree, rock, plant)
  createResourceNode(type, x, y, z) {
    const node = {
      type: type,
      position: new THREE.Vector3(x, y, z),
      health: this.getMaxHealth(type),
      maxHealth: this.getMaxHealth(type),
      mesh: null,
      canGather: true,
      respawnTime: 60000, // 60 seconds
      respawnTimer: null,
    };

    // Create visual mesh based on type
    if (type === "tree") {
      node.mesh = this.createTreeMesh(x, y, z);
    } else if (type === "rock") {
      node.mesh = this.createRockMesh(x, y, z);
    } else if (type === "plant") {
      node.mesh = this.createPlantMesh(x, y, z);
    }

    // Add interaction indicator
    this.addInteractionIndicator(node);

    this.resourceNodes.push(node);

    return node;
  }

  getMaxHealth(type) {
    switch (type) {
      case "tree":
        return 5;
      case "rock":
        return 8;
      case "plant":
        return 2;
      default:
        return 3;
    }
  }

  createTreeMesh(x, y, z) {
    const treeGroup = new THREE.Group();
    treeGroup.userData.resourceNode = true;
    treeGroup.userData.resourceType = "tree";

    const trunkHeight = 2.5 + Math.random() * 1.5;
    const trunkGeometry = new THREE.CylinderGeometry(0.25, 0.3, trunkHeight, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.95,
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    const foliageHeight = 3 + Math.random() * 1.5;
    const foliageGeometry = new THREE.ConeGeometry(
      1.3 + Math.random() * 0.4,
      foliageHeight,
      8
    );
    const foliageMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5016,
      roughness: 0.85,
    });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = trunkHeight + foliageHeight / 2 - 0.3;
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    treeGroup.add(foliage);

    treeGroup.position.set(x, y, z);
    treeGroup.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(treeGroup);

    return treeGroup;
  }

  createRockMesh(x, y, z) {
    const baseSize = 0.4 + Math.random() * 0.6;
    const geometry = new THREE.DodecahedronGeometry(baseSize, 0);

    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i++) {
      vertices[i] += (Math.random() - 0.5) * baseSize * 0.15;
    }
    geometry.computeVertexNormals();

    const grayValue = 0.5 + Math.random() * 0.2;
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(grayValue, grayValue, grayValue * 0.95),
      roughness: 0.9,
      metalness: 0.1,
    });

    const rock = new THREE.Mesh(geometry, material);
    rock.userData.resourceNode = true;
    rock.userData.resourceType = "rock";

    const scaleX = 1.0 + Math.random() * 0.3;
    const scaleY = 0.5 + Math.random() * 0.3;
    const scaleZ = 1.0 + Math.random() * 0.3;
    rock.scale.set(scaleX, scaleY, scaleZ);

    const effectiveRadius = baseSize * scaleY;
    rock.position.set(x, y + effectiveRadius, z);

    rock.rotation.set(
      (Math.random() - 0.5) * 0.3,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.3
    );

    rock.castShadow = true;
    rock.receiveShadow = true;

    this.scene.add(rock);
    return rock;
  }

  createPlantMesh(x, y, z) {
    const plantGroup = new THREE.Group();
    plantGroup.userData.resourceNode = true;
    plantGroup.userData.resourceType = "plant";

    const stemGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.8, 6);
    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a7c2c,
      roughness: 0.9,
    });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 0.4;
    plantGroup.add(stem);

    for (let i = 0; i < 3; i++) {
      const leafGeometry = new THREE.ConeGeometry(0.15, 0.4, 4);
      const leafMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a8c2a,
        roughness: 0.8,
      });
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      leaf.position.y = 0.5 + i * 0.15;
      leaf.rotation.y = (i * Math.PI * 2) / 3;
      leaf.rotation.z = Math.PI / 4;
      plantGroup.add(leaf);
    }

    plantGroup.position.set(x, y, z);
    plantGroup.scale.set(
      0.8 + Math.random() * 0.4,
      0.8 + Math.random() * 0.4,
      0.8 + Math.random() * 0.4
    );
    this.scene.add(plantGroup);

    return plantGroup;
  }

  addInteractionIndicator(node) {
    const ringGeometry = new THREE.RingGeometry(0.8, 1.0, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(node.position);
    ring.position.y += 0.1;
    ring.visible = false;

    node.indicator = ring;
    this.scene.add(ring);
  }

  /**
   * Gather resource from node with optional tool bonus
   * @param {Object} node - The resource node
   * @param {Number} amountMultiplier - Multiplier for resource amount (from tools)
   */
  gatherResource(node, amountMultiplier = 1) {
    if (!node.canGather) return null;

    // Tool bonus reduces damage needed (faster gathering)
    const damageDealt = amountMultiplier >= 2 ? 2 : 1;
    node.health -= damageDealt;

    // Shake animation
    this.shakeNode(node);

    // Spawn particles (more particles with better tools)
    this.spawnGatherParticles(node, Math.floor(10 * amountMultiplier));

    // Check if depleted
    if (node.health <= 0) {
      this.depleteNode(node);
    }

    // Return gathered resources with multiplier
    const baseDrop = this.getResourceDrop(node.type);
    if (baseDrop) {
      baseDrop.amount = Math.floor(baseDrop.amount * amountMultiplier);
    }
    return baseDrop;
  }

  getResourceDrop(type) {
    switch (type) {
      case "tree":
        return { type: "wood", amount: 1 };
      case "rock":
        return { type: "stone", amount: 1 };
      case "plant":
        return { type: "fiber", amount: 2 };
      default:
        return null;
    }
  }

  shakeNode(node) {
    if (!node.mesh) return;

    const originalPos = node.position.clone();
    const shakeAmount = 0.1;
    const shakeDuration = 200;
    const startTime = Date.now();

    const shake = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < shakeDuration) {
        const progress = elapsed / shakeDuration;
        const intensity = (1 - progress) * shakeAmount;
        node.mesh.position.x =
          originalPos.x + (Math.random() - 0.5) * intensity;
        node.mesh.position.z =
          originalPos.z + (Math.random() - 0.5) * intensity;
        requestAnimationFrame(shake);
      } else {
        node.mesh.position.copy(originalPos);
      }
    };
    shake();
  }

  spawnGatherParticles(node, count = 10) {
    const color = this.getParticleColor(node.type);

    for (let i = 0; i < count; i++) {
      const geometry = new THREE.SphereGeometry(0.1, 4, 4);
      const material = new THREE.MeshBasicMaterial({ color: color });
      const particle = new THREE.Mesh(geometry, material);

      particle.position.copy(node.position);
      particle.position.y += 1;

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 2
      );

      particle.userData.velocity = velocity;
      particle.userData.lifetime = 1000;
      particle.userData.startTime = Date.now();

      this.scene.add(particle);
      this.particlePool.push(particle);
    }
  }

  getParticleColor(type) {
    switch (type) {
      case "tree":
        return 0x8b4513;
      case "rock":
        return 0x808080;
      case "plant":
        return 0x00ff00;
      default:
        return 0xffffff;
    }
  }

  depleteNode(node) {
    node.canGather = false;

    if (node.mesh) {
      const fadeDuration = 500;
      const startTime = Date.now();
      const originalScale = node.mesh.scale.clone();

      const fade = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / fadeDuration;

        if (progress < 1) {
          const scale = 1 - progress;
          node.mesh.scale.copy(originalScale).multiplyScalar(scale);
          node.mesh.position.y = node.position.y - progress * 2;
          requestAnimationFrame(fade);
        } else {
          this.scene.remove(node.mesh);
          node.mesh = null;
        }
      };
      fade();
    }

    if (node.indicator) {
      node.indicator.visible = false;
    }

    node.respawnTimer = setTimeout(() => {
      this.respawnNode(node);
    }, node.respawnTime);
  }

  respawnNode(node) {
    node.health = node.maxHealth;
    node.canGather = true;

    if (node.type === "tree") {
      node.mesh = this.createTreeMesh(
        node.position.x,
        node.position.y,
        node.position.z
      );
    } else if (node.type === "rock") {
      node.mesh = this.createRockMesh(
        node.position.x,
        node.position.y,
        node.position.z
      );
    } else if (node.type === "plant") {
      node.mesh = this.createPlantMesh(
        node.position.x,
        node.position.y,
        node.position.z
      );
    }

    if (node.indicator) {
      node.indicator.visible = true;
    }

    console.log(`♻️ ${node.type} respawned`);
  }

  updateParticles(deltaTime) {
    const now = Date.now();

    for (let i = this.particlePool.length - 1; i >= 0; i--) {
      const particle = this.particlePool[i];
      const elapsed = now - particle.userData.startTime;

      if (elapsed > particle.userData.lifetime) {
        this.scene.remove(particle);
        this.particlePool.splice(i, 1);
      } else {
        particle.userData.velocity.y -= 9.8 * deltaTime;
        particle.position.add(
          particle.userData.velocity.clone().multiplyScalar(deltaTime)
        );

        const alpha = 1 - elapsed / particle.userData.lifetime;
        particle.material.opacity = alpha;
        particle.material.transparent = true;
      }
    }
  }

  showIndicator(node) {
    if (node.indicator && node.canGather) {
      node.indicator.visible = true;
      node.indicator.material.opacity = 0.3;
    }
  }

  hideIndicator(node) {
    if (node.indicator) {
      node.indicator.visible = false;
    }
  }

  getClosestNode(position, maxDistance = 5) {
    let closest = null;
    let closestDist = maxDistance;

    for (const node of this.resourceNodes) {
      if (!node.canGather) continue;

      const dist = position.distanceTo(node.position);
      if (dist < closestDist) {
        closest = node;
        closestDist = dist;
      }
    }

    return closest;
  }
}
