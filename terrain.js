/**
 * Procedural Terrain Generator
 * Creates hills, valleys, and natural landscapes
 */

class TerrainGenerator {
  constructor(scene) {
    console.log("🏔️ TerrainGenerator: Starting initialization...");
    this.scene = scene;
    this.terrainSize = 200;
    this.terrainSegments = 100;
    this.heightScale = 15;
    this.mesh = null;
    this.raycaster = new THREE.Raycaster();

    try {
      this.generate();
      console.log("✅ TerrainGenerator: Initialization complete");
    } catch (error) {
      console.error("❌ TerrainGenerator: Failed to generate terrain", error);
      throw error;
    }
  }

  noise(x, z) {
    let value = 0;
    let amplitude = 1;
    let frequency = 0.02;

    for (let i = 0; i < 5; i++) {
      value += amplitude * this.simplex2D(x * frequency, z * frequency);
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value;
  }

  simplex2D(x, z) {
    const X = Math.floor(x);
    const Z = Math.floor(z);
    const xf = x - X;
    const zf = z - Z;

    const a = this.hash(X, Z);
    const b = this.hash(X + 1, Z);
    const c = this.hash(X, Z + 1);
    const d = this.hash(X + 1, Z + 1);

    const u = xf * xf * (3.0 - 2.0 * xf);
    const v = zf * zf * (3.0 - 2.0 * zf);

    const result = this.lerp(this.lerp(a, b, u), this.lerp(c, d, u), v);

    return result * 2 - 1;
  }

  hash(x, z) {
    const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return h - Math.floor(h);
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  generate() {
    console.log("🏔️ Generating terrain geometry...");

    const geometry = new THREE.PlaneGeometry(
      this.terrainSize,
      this.terrainSize,
      this.terrainSegments,
      this.terrainSegments
    );

    const positionAttribute = geometry.attributes.position;

    console.log(`🏔️ Generating ${positionAttribute.count} terrain vertices...`);

    // Generate terrain heights
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);

      const height = this.noise(x, y) * this.heightScale;
      positionAttribute.setZ(i, height);
    }

    geometry.computeVertexNormals();
    console.log("✅ Terrain vertices generated");

    // Color the terrain
    console.log("🎨 Coloring terrain...");
    const colors = [];
    for (let i = 0; i < positionAttribute.count; i++) {
      const height = positionAttribute.getZ(i);

      const deepWaterColor = new THREE.Color(0x1a4d6d);
      const waterColor = new THREE.Color(0x2e7d9e);
      const sandColor = new THREE.Color(0xd4c4a8);
      const grassColor = new THREE.Color(0x4a7c2c);
      const darkGrassColor = new THREE.Color(0x365c1f);
      const mountainColor = new THREE.Color(0x8b7355);
      const snowColor = new THREE.Color(0xf5f5f5);

      let color;

      if (height < -5) {
        color = deepWaterColor;
      } else if (height < -2.5) {
        const t = (height + 5) / 2.5;
        color = deepWaterColor.clone().lerp(waterColor, t);
      } else if (height < -0.5) {
        const t = (height + 2.5) / 2;
        color = waterColor.clone().lerp(sandColor, t);
      } else if (height < 2) {
        const t = (height + 0.5) / 2.5;
        color = sandColor.clone().lerp(grassColor, t);
      } else if (height < 7) {
        const t = (height - 2) / 5;
        color = grassColor.clone().lerp(darkGrassColor, t);
      } else if (height < 11) {
        const t = (height - 7) / 4;
        color = darkGrassColor.clone().lerp(mountainColor, t);
      } else {
        const t = Math.min(1, (height - 11) / 4);
        color = mountainColor.clone().lerp(snowColor, t);
      }

      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    console.log("✅ Terrain colored");

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = "terrain";
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;

    // Force matrix update
    this.mesh.updateMatrix();
    this.mesh.updateMatrixWorld(true);

    this.scene.add(this.mesh);

    console.log("✅ Terrain mesh added to scene");
    console.log("🏔️ Terrain position:", this.mesh.position);
    console.log("🏔️ Terrain rotation:", this.mesh.rotation);
  }

  // Get height using raycasting
  getHeightAt(worldX, worldZ) {
    if (!this.mesh) {
      console.warn("⚠️ Terrain mesh not ready");
      return 0;
    }

    const rayOrigin = new THREE.Vector3(worldX, 1000, worldZ);
    const rayDirection = new THREE.Vector3(0, -1, 0);

    this.raycaster.set(rayOrigin, rayDirection);
    const intersects = this.raycaster.intersectObject(this.mesh, false);

    if (intersects.length > 0) {
      return intersects[0].point.y;
    }

    return 0;
  }
}
