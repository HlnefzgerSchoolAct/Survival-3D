/**
 * Environment Generator
 * Creates trees, rocks, water, and other natural elements
 */

class EnvironmentGenerator {
  constructor(scene, terrain, resourceSystem) {
    this.scene = scene;
    this.terrain = terrain;
    this.resourceSystem = resourceSystem;
    this.waterLevel = -2.5;
    this.objects = [];
    this.raycaster = new THREE.Raycaster();

    this.generateSkybox();
    this.generateWater();

    // Wait longer for terrain to be fully ready
    setTimeout(() => {
      this.generateResourceNodes();
    }, 800);

    console.log("🌲 Environment generator initialized");
  }

  generateSkybox() {
    const skyGeometry = new THREE.SphereGeometry(800, 60, 40);
    const skyMaterial = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      side: THREE.BackSide,
      fog: false,
    });
    this.skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    this.skybox.name = "skybox";
    this.scene.add(this.skybox);
    window.skybox = this.skybox;
  }

  generateResourceNodes() {
    console.log("🌲 Generating resource nodes...");

    if (!this.terrain.mesh) {
      console.error("❌ Terrain mesh not available!");
      return;
    }

    console.log("✅ Terrain mesh found:", this.terrain.mesh.name);

    // Test raycast at origin
    const testInfo = this.getTerrainInfo(0, 0);
    if (testInfo) {
      console.log(
        "✅ Raycast test successful at origin: height =",
        testInfo.height.toFixed(2)
      );
    } else {
      console.error("❌ Raycast test failed at origin!");
    }

    this.generateTrees();
    this.generateRocks();
    this.generatePlants();
  }

  // Raycast ONLY against terrain mesh
  getTerrainInfo(x, z) {
    if (!this.terrain.mesh) {
      return null;
    }

    // Cast ray from high above
    const rayOrigin = new THREE.Vector3(x, 1000, z);
    const rayDirection = new THREE.Vector3(0, -1, 0);

    this.raycaster.set(rayOrigin, rayDirection);

    // Create array with ONLY the terrain mesh
    const terrainOnly = [this.terrain.mesh];

    // Raycast against terrain only, no children
    const intersects = this.raycaster.intersectObjects(terrainOnly, false);

    if (intersects.length > 0) {
      const hit = intersects[0];

      // Transform normal to world space (account for rotation)
      const worldNormal = hit.face.normal.clone();
      worldNormal.transformDirection(this.terrain.mesh.matrixWorld);

      return {
        height: hit.point.y,
        normal: worldNormal,
        point: hit.point.clone(),
      };
    }

    return null;
  }

  // Calculate slope from surface normal
  calculateSlope(normal) {
    const worldUp = new THREE.Vector3(0, 1, 0);
    const dotProduct = normal.dot(worldUp);
    const slope = 1 - dotProduct;
    return slope;
  }

  isValidPlacement(x, z, objectType) {
    const info = this.getTerrainInfo(x, z);

    if (!info) {
      return false;
    }

    const height = info.height;
    const slope = this.calculateSlope(info.normal);

    if (objectType === "tree") {
      if (height < this.waterLevel + 2) return false;
      if (height > 12) return false;
      if (slope > 0.25) return false;
      return true;
    } else if (objectType === "rock") {
      if (height < this.waterLevel + 0.5) return false;
      if (slope > 0.5) return false;
      return true;
    } else if (objectType === "plant") {
      if (height < this.waterLevel + 1.5) return false;
      if (height > 10) return false;
      if (slope > 0.35) return false;
      return true;
    }

    return false;
  }

  generateTrees() {
    const treeCount = 40;
    let placed = 0;
    let attempts = 0;
    const maxAttempts = treeCount * 20;

    console.log("🌲 Placing trees...");

    while (placed < treeCount && attempts < maxAttempts) {
      attempts++;

      const x = (Math.random() - 0.5) * this.terrain.terrainSize * 0.6;
      const z = (Math.random() - 0.5) * this.terrain.terrainSize * 0.6;

      if (this.isValidPlacement(x, z, "tree")) {
        const info = this.getTerrainInfo(x, z);
        if (info) {
          this.resourceSystem.createResourceNode("tree", x, info.height, z);
          placed++;
        }
      }
    }

    console.log(
      `🌲 Placed ${placed}/${treeCount} trees (${attempts} attempts)`
    );
  }

  generateRocks() {
    const rockCount = 30;
    let placed = 0;
    let attempts = 0;
    const maxAttempts = rockCount * 20;

    console.log("🪨 Placing rocks...");

    while (placed < rockCount && attempts < maxAttempts) {
      attempts++;

      const x = (Math.random() - 0.5) * this.terrain.terrainSize * 0.7;
      const z = (Math.random() - 0.5) * this.terrain.terrainSize * 0.7;

      if (this.isValidPlacement(x, z, "rock")) {
        const info = this.getTerrainInfo(x, z);
        if (info) {
          this.resourceSystem.createResourceNode("rock", x, info.height, z);
          placed++;

          // Debug first few rocks
          if (placed <= 3) {
            console.log(
              `🪨 Rock ${placed}: pos=(${x.toFixed(1)}, ${info.height.toFixed(
                1
              )}, ${z.toFixed(1)})`
            );
          }
        }
      }
    }

    console.log(
      `🪨 Placed ${placed}/${rockCount} rocks (${attempts} attempts)`
    );
  }

  generatePlants() {
    const plantCount = 50;
    let placed = 0;
    let attempts = 0;
    const maxAttempts = plantCount * 20;

    console.log("🌿 Placing plants...");

    while (placed < plantCount && attempts < maxAttempts) {
      attempts++;

      const x = (Math.random() - 0.5) * this.terrain.terrainSize * 0.65;
      const z = (Math.random() - 0.5) * this.terrain.terrainSize * 0.65;

      if (this.isValidPlacement(x, z, "plant")) {
        const info = this.getTerrainInfo(x, z);
        if (info) {
          this.resourceSystem.createResourceNode("plant", x, info.height, z);
          placed++;
        }
      }
    }

    console.log(
      `🌿 Placed ${placed}/${plantCount} plants (${attempts} attempts)`
    );
  }

  generateWater() {
    const waterSize = 180;
    const waterGeometry = new THREE.PlaneGeometry(waterSize, waterSize, 40, 40);

    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x2090d0,
      transparent: true,
      opacity: 0.5,
      roughness: 0.1,
      metalness: 0.8,
      side: THREE.DoubleSide,
    });

    this.water = new THREE.Mesh(waterGeometry, waterMaterial);
    this.water.name = "water";
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = this.waterLevel;
    this.water.receiveShadow = true;

    this.scene.add(this.water);

    console.log(`💧 Water generated at level ${this.waterLevel}`);
  }
}
