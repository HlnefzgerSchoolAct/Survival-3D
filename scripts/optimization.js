/**
 * Optimization System
 * Handles object pooling, frustum culling, LOD, and performance monitoring
 */

class OptimizationManager {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    // Object pools
    this.pools = {
      particles: [],
      groundItems: [],
      creatureMeshes: [],
      healthBars: [],
    };

    // Performance tracking
    this.performanceData = {
      fps: 0,
      frameTime: 0,
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      programs: 0,
      visibleObjects: 0,
      culledObjects: 0,
      memoryUsage: 0,
      entities: {
        creatures: 0,
        groundItems: 0,
        structures: 0,
        resources: 0,
      },
    };

    // LOD settings
    this.lodLevels = {
      high: 30, // Full detail within 30 units
      medium: 60, // Medium detail 30-60 units
      low: 100, // Low detail 60-100 units
      cull: 150, // Cull beyond 150 units
    };

    // Frustum for culling
    this.frustum = new THREE.Frustum();
    this.frustumMatrix = new THREE.Matrix4();

    // Performance monitoring
    this.lastFrameTime = Date.now();
    this.frameCount = 0;
    this.fpsUpdateInterval = 1000;
    this.lastFpsUpdate = Date.now();

    // Optimization flags
    this.enableFrustumCulling = true;
    this.enableLOD = true;
    this.enableObjectPooling = true;

    this.initPerformanceUI();
    this.setupTextureCompression();

    console.log("⚡ Optimization Manager initialized");
  }

  /**
   * Initialize performance monitoring UI
   */
  initPerformanceUI() {
    const perfPanel = document.createElement('div');
    perfPanel.id = 'performance-panel';
    perfPanel.className = 'performance-panel';
    perfPanel.innerHTML = `
        <div class="perf-header" id="perf-header-click">
            <h4>⚡ Performance</h4>
            <button id="toggle-perf" class="perf-toggle">▼</button>
        </div>
        <div class="perf-content" id="perf-content">
            <div class="perf-section">
                <strong>Rendering</strong>
                <div class="perf-item">FPS: <span id="perf-fps">0</span></div>
                <div class="perf-item">Frame Time: <span id="perf-frame-time">0</span>ms</div>
                <div class="perf-item">Draw Calls: <span id="perf-draw-calls">0</span></div>
                <div class="perf-item">Triangles: <span id="perf-triangles">0</span></div>
            </div>
            <div class="perf-section">
                <strong>Objects</strong>
                <div class="perf-item">Visible: <span id="perf-visible">0</span></div>
                <div class="perf-item">Culled: <span id="perf-culled">0</span></div>
                <div class="perf-item">Creatures: <span id="perf-creatures">0</span></div>
                <div class="perf-item">Structures: <span id="perf-structures">0</span></div>
            </div>
            <div class="perf-section">
                <strong>Memory</strong>
                <div class="perf-item">Geometries: <span id="perf-geometries">0</span></div>
                <div class="perf-item">Textures: <span id="perf-textures">0</span></div>
                <div class="perf-item">Programs: <span id="perf-programs">0</span></div>
                <div class="perf-item">Memory: <span id="perf-memory">N/A</span></div>
            </div>
            <div class="perf-section">
                <strong>Optimizations</strong>
                <label class="perf-checkbox">
                    <input type="checkbox" id="opt-frustum" checked>
                    <span>Frustum Culling</span>
                </label>
                <label class="perf-checkbox">
                    <input type="checkbox" id="opt-lod" checked>
                    <span>LOD System</span>
                </label>
                <label class="perf-checkbox">
                    <input type="checkbox" id="opt-pooling" checked>
                    <span>Object Pooling</span>
                </label>
            </div>
        </div>
    `;
    document.getElementById('ui-overlay').appendChild(perfPanel);
    
    // Toggle button - click on header OR button
    const toggleContent = () => {
        const content = document.getElementById('perf-content');
        const button = document.getElementById('toggle-perf');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            button.textContent = '▼';
        } else {
            content.style.display = 'none';
            button.textContent = '▶';
        }
    };
    
    document.getElementById('toggle-perf').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleContent();
    });
    
    document.getElementById('perf-header-click').addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
            toggleContent();
        }
    });
    
    // Optimization toggles
    document.getElementById('opt-frustum').addEventListener('change', (e) => {
        this.enableFrustumCulling = e.target.checked;
        console.log(`Frustum Culling: ${this.enableFrustumCulling ? 'ON' : 'OFF'}`);
    });
    
    document.getElementById('opt-lod').addEventListener('change', (e) => {
        this.enableLOD = e.target.checked;
        console.log(`LOD System: ${this.enableLOD ? 'ON' : 'OFF'}`);
    });
    
    document.getElementById('opt-pooling').addEventListener('change', (e) => {
        this.enableObjectPooling = e.target.checked;
        console.log(`Object Pooling: ${this.enableObjectPooling ? 'ON' : 'OFF'}`);
    });
}

  /**
   * Setup texture compression for better performance
   */
  setupTextureCompression() {
    // Enable texture compression if available
    const gl = this.renderer.getContext();
    const ext =
      gl.getExtension("WEBGL_compressed_texture_s3tc") ||
      gl.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc") ||
      gl.getExtension("MOZ_WEBGL_compressed_texture_s3tc");

    if (ext) {
      console.log("✅ Texture compression supported");
    } else {
      console.log("⚠️ Texture compression not supported");
    }
  }

  /**
   * Check if object can be frustum culled safely
   */
  canBeCulled(object) {
    if (!object) return false;
    if (!object.geometry) return false;
    if (!object.geometry.boundingSphere) {
      // Compute bounding sphere if missing
      try {
        object.geometry.computeBoundingSphere();
      } catch (e) {
        return false;
      }
    }
    return true;
  }

  /**
   * Update frustum culling
   */
  updateFrustumCulling() {
    if (!this.enableFrustumCulling) return;

    // Update frustum
    this.frustumMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.frustumMatrix);

    let culledCount = 0;
    let visibleCount = 0;

    // Cull creatures
    if (window.game?.creatureSystem) {
      for (const creature of window.game.creatureSystem.creatures) {
        if (!creature.mesh) continue;

        // Safe distance check
        const distance = creature.position.distanceTo(this.camera.position);

        // Check if can be culled
        let inFrustum = true;
        if (this.canBeCulled(creature.mesh)) {
          try {
            inFrustum = this.frustum.intersectsObject(creature.mesh);
          } catch (e) {
            // If frustum check fails, assume visible
            inFrustum = true;
          }
        }

        if (inFrustum && distance < this.lodLevels.cull) {
          creature.mesh.visible = true;
          visibleCount++;

          // Apply LOD
          if (this.enableLOD) {
            this.applyCreatureLOD(creature, distance);
          }
        } else {
          creature.mesh.visible = false;
          culledCount++;
        }
      }
    }

    // Cull ground items
    if (window.game?.inventory) {
      for (const item of window.game.inventory.groundItems) {
        if (!item.mesh) continue;

        const distance = item.position.distanceTo(this.camera.position);

        let inFrustum = true;
        if (this.canBeCulled(item.mesh)) {
          try {
            inFrustum = this.frustum.intersectsObject(item.mesh);
          } catch (e) {
            inFrustum = true;
          }
        }

        if (inFrustum && distance < this.lodLevels.cull) {
          item.mesh.visible = true;
          visibleCount++;
        } else {
          item.mesh.visible = false;
          culledCount++;
        }
      }
    }

    // Cull structures
    if (window.game?.buildingSystem) {
      for (const mesh of window.game.buildingSystem.placedMeshes) {
        if (!mesh) continue;

        const distance = mesh.position.distanceTo(this.camera.position);

        let inFrustum = true;
        if (this.canBeCulled(mesh)) {
          try {
            inFrustum = this.frustum.intersectsObject(mesh);
          } catch (e) {
            inFrustum = true;
          }
        }

        if (inFrustum && distance < this.lodLevels.cull) {
          mesh.visible = true;
          visibleCount++;
        } else {
          mesh.visible = false;
          culledCount++;
        }
      }
    }

    this.performanceData.visibleObjects = visibleCount;
    this.performanceData.culledObjects = culledCount;
  }

  /**
   * Apply LOD to creature based on distance
   */
  applyCreatureLOD(creature, distance) {
    if (!creature.mesh || !creature.healthBar) return;

    if (distance < this.lodLevels.high) {
      // High detail
      creature.healthBar.visible = true;
      if (creature.mesh.children[0] && creature.mesh.children[0].material) {
        creature.mesh.children[0].material.wireframe = false;
      }
    } else if (distance < this.lodLevels.medium) {
      // Medium detail - hide health bar
      creature.healthBar.visible = false;
    } else if (distance < this.lodLevels.low) {
      // Low detail - simple rendering
      creature.healthBar.visible = false;
    }
  }

  /**
   * Object pooling - Get particle from pool
   */
  getPooledParticle() {
    if (!this.enableObjectPooling) return null;

    for (const particle of this.pools.particles) {
      if (!particle.visible) {
        particle.visible = true;
        return particle;
      }
    }

    // Pool is full, create new particle
    const geometry = new THREE.SphereGeometry(0.1, 4, 4);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const particle = new THREE.Mesh(geometry, material);

    this.pools.particles.push(particle);
    this.scene.add(particle);

    return particle;
  }

  /**
   * Return particle to pool
   */
  returnParticleToPool(particle) {
    if (!this.enableObjectPooling) {
      this.scene.remove(particle);
      return;
    }

    particle.visible = false;
    particle.position.set(0, -1000, 0); // Move out of view
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(deltaTime) {
    const now = Date.now();
    this.frameCount++;

    // Calculate frame time
    this.performanceData.frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Update FPS
    if (now - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      this.performanceData.fps = Math.round(
        (this.frameCount * 1000) / (now - this.lastFpsUpdate)
      );
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    // Get renderer info
    const info = this.renderer.info;
    this.performanceData.drawCalls = info.render.calls;
    this.performanceData.triangles = info.render.triangles;
    this.performanceData.geometries = info.memory.geometries;
    this.performanceData.textures = info.memory.textures;
    this.performanceData.programs = info.programs?.length || 0;

    // Get entity counts
    if (window.game) {
      this.performanceData.entities.creatures =
        window.game.creatureSystem?.creatures.length || 0;
      this.performanceData.entities.groundItems =
        window.game.inventory?.groundItems.length || 0;
      this.performanceData.entities.structures =
        window.game.buildingSystem?.placedStructures.length || 0;
      this.performanceData.entities.resources =
        window.game.resourceSystem?.resourceNodes.length || 0;
    }

    // Estimate memory usage (if available)
    if (window.performance && window.performance.memory) {
      this.performanceData.memoryUsage = (
        window.performance.memory.usedJSHeapSize / 1048576
      ).toFixed(2);
    } else {
      this.performanceData.memoryUsage = "N/A";
    }
  }

  /**
   * Update performance UI
   */
  updatePerformanceUI() {
    const data = this.performanceData;

    // Update rendering stats
    this.updateElement("perf-fps", data.fps);
    this.updateElement("perf-frame-time", data.frameTime.toFixed(2));
    this.updateElement("perf-draw-calls", data.drawCalls);
    this.updateElement("perf-triangles", data.triangles.toLocaleString());

    // Update object stats
    this.updateElement("perf-visible", data.visibleObjects);
    this.updateElement("perf-culled", data.culledObjects);
    this.updateElement("perf-creatures", data.entities.creatures);
    this.updateElement("perf-structures", data.entities.structures);

    // Update memory stats
    this.updateElement("perf-geometries", data.geometries);
    this.updateElement("perf-textures", data.textures);
    this.updateElement("perf-programs", data.programs);
    this.updateElement("perf-memory", data.memoryUsage);

    // Color code FPS
    const fpsEl = document.getElementById("perf-fps");
    if (fpsEl) {
      if (data.fps >= 50) {
        fpsEl.style.color = "#00ff00";
      } else if (data.fps >= 30) {
        fpsEl.style.color = "#ffff00";
      } else {
        fpsEl.style.color = "#ff0000";
      }
    }
  }

  updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    }
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    const data = this.performanceData;

    console.log(
      "%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "color: #64c864;"
    );
    console.log(
      "%c⚡ PERFORMANCE REPORT",
      "font-size: 16px; color: #64c864; font-weight: bold;"
    );
    console.log(
      "%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "color: #64c864;"
    );
    console.log("");

    console.log("%c📊 RENDERING", "color: #ffa500; font-weight: bold;");
    console.log(`   FPS: ${data.fps}`);
    console.log(`   Frame Time: ${data.frameTime.toFixed(2)}ms`);
    console.log(`   Draw Calls: ${data.drawCalls}`);
    console.log(`   Triangles: ${data.triangles.toLocaleString()}`);
    console.log("");

    console.log("%c🎮 ENTITIES", "color: #ff6666; font-weight: bold;");
    console.log(`   Creatures: ${data.entities.creatures}`);
    console.log(`   Ground Items: ${data.entities.groundItems}`);
    console.log(`   Structures: ${data.entities.structures}`);
    console.log(`   Resources: ${data.entities.resources}`);
    console.log(
      `   Total: ${Object.values(data.entities).reduce((a, b) => a + b, 0)}`
    );
    console.log("");

    console.log("%c👁️ VISIBILITY", "color: #87ceeb; font-weight: bold;");
    console.log(`   Visible Objects: ${data.visibleObjects}`);
    console.log(`   Culled Objects: ${data.culledObjects}`);
    const totalObjects = data.visibleObjects + data.culledObjects;
    const efficiency =
      totalObjects > 0
        ? ((data.culledObjects / totalObjects) * 100).toFixed(1)
        : 0;
    console.log(`   Culling Efficiency: ${efficiency}%`);
    console.log("");

    console.log("%c💾 MEMORY", "color: #ff00ff; font-weight: bold;");
    console.log(`   Geometries: ${data.geometries}`);
    console.log(`   Textures: ${data.textures}`);
    console.log(`   Shader Programs: ${data.programs}`);
    console.log(`   Memory Usage: ${data.memoryUsage}MB`);
    console.log("");

    console.log("%c⚙️ OPTIMIZATIONS", "color: #00ffff; font-weight: bold;");
    console.log(
      `   Frustum Culling: ${
        this.enableFrustumCulling ? "ENABLED ✓" : "DISABLED ✗"
      }`
    );
    console.log(
      `   LOD System: ${this.enableLOD ? "ENABLED ✓" : "DISABLED ✗"}`
    );
    console.log(
      `   Object Pooling: ${
        this.enableObjectPooling ? "ENABLED ✓" : "DISABLED ✗"
      }`
    );
    console.log("");

    // Performance rating
    let rating = "EXCELLENT";
    let color = "#00ff00";
    if (data.fps < 50) {
      rating = "GOOD";
      color = "#ffff00";
    }
    if (data.fps < 30) {
      rating = "POOR";
      color = "#ff0000";
    }

    console.log(
      `%c📈 Performance Rating: ${rating}`,
      `color: ${color}; font-weight: bold; font-size: 14px;`
    );
    console.log(
      "%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "color: #64c864;"
    );
    console.log("");

    return data;
  }

  /**
   * Main update loop
   */
  update(deltaTime) {
    // Update frustum culling with error handling
    try {
      this.updateFrustumCulling();
    } catch (error) {
      console.warn("⚠️ Frustum culling error (non-critical):", error.message);
    }

    // Update performance metrics
    this.updatePerformanceMetrics(deltaTime);

    // Update UI every frame
    this.updatePerformanceUI();
  }
}
