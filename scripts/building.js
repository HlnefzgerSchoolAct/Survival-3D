/**
 * Building System
 * Handles structure placement, previews, edge-middle snapping, and persistence
 */

class BuildingSystem {
  constructor(scene, terrain, inventory) {
    this.scene = scene;
    this.terrain = terrain;
    this.inventory = inventory;

    this.buildMode = false;
    this.menuOpen = false;
    this.selectedStructure = null;
    this.previewMesh = null;
    this.placedStructures = [];
    this.placedMeshes = [];
    this.maxPlacementDistance = 10;
    this.snapDistance = 2.5;
    this.raycaster = new THREE.Raycaster();

    // Grid settings for snapping
    this.gridSize = 2;
    this.enableGridSnap = true;
    this.enableStructureSnap = true;

    // Debug helpers
    this.debugSnapPoints = [];
    this.showDebugPoints = false;

    // Track last snap info for rotation
    this.lastSnapInfo = null;

    // Structure definitions
    this.structures = this.initializeStructures();

    // Load saved structures
    this.loadStructures();

    this.initUI();
    this.setupInput();

    console.log(
      "🏗️ Building system initialized with edge-middle snapping + manual rotation"
    );
  }

  /**
   * Define all buildable structures with costs and specs
   * Walls snap to middle of edges, rotatable manually
   */
  initializeStructures() {
    return {
      foundation: {
        id: "foundation",
        name: "Foundation",
        icon: "🟫",
        description: "A solid base for building",
        cost: [
          { type: "wood", amount: 5 },
          { type: "stone", amount: 3 },
        ],
        dimensions: { width: 2, height: 0.2, depth: 2 },
        color: 0x8b7355,
        snapToGround: true,
        snapPoints: [
          // Foundation edge-to-edge snapping (for foundation-to-foundation)
          { x: -1, y: 0.1, z: -1, edge: "north", offset: { x: 0, z: -2 } },
          { x: 0, y: 0.1, z: -1, edge: "north", offset: { x: 0, z: -2 } },
          { x: 1, y: 0.1, z: -1, edge: "north", offset: { x: 0, z: -2 } },
          { x: -1, y: 0.1, z: 1, edge: "south", offset: { x: 0, z: 2 } },
          { x: 0, y: 0.1, z: 1, edge: "south", offset: { x: 0, z: 2 } },
          { x: 1, y: 0.1, z: 1, edge: "south", offset: { x: 0, z: 2 } },
          { x: -1, y: 0.1, z: -1, edge: "west", offset: { x: -2, z: 0 } },
          { x: -1, y: 0.1, z: 0, edge: "west", offset: { x: -2, z: 0 } },
          { x: -1, y: 0.1, z: 1, edge: "west", offset: { x: -2, z: 0 } },
          { x: 1, y: 0.1, z: -1, edge: "east", offset: { x: 2, z: 0 } },
          { x: 1, y: 0.1, z: 0, edge: "east", offset: { x: 2, z: 0 } },
          { x: 1, y: 0.1, z: 1, edge: "east", offset: { x: 2, z: 0 } },

          // Wall snap points at MIDDLE of edges (not corners)
          // North edge middle
          {
            x: 0,
            y: 0.2,
            z: -1,
            edge: "wall-north",
            offset: { x: 0, z: -1.15, y: 1.6 },
            suggestedRotation: 0,
          },
          // South edge middle
          {
            x: 0,
            y: 0.2,
            z: 1,
            edge: "wall-south",
            offset: { x: 0, z: 1.15, y: 1.6 },
            suggestedRotation: Math.PI,
          },
          // West edge middle
          {
            x: -1,
            y: 0.2,
            z: 0,
            edge: "wall-west",
            offset: { x: -1.15, z: 0, y: 1.6 },
            suggestedRotation: Math.PI / 2,
          },
          // East edge middle
          {
            x: 1,
            y: 0.2,
            z: 0,
            edge: "wall-east",
            offset: { x: 1.15, z: 0, y: 1.6 },
            suggestedRotation: -Math.PI / 2,
          },

          // Door snap points at MIDDLE of edges
          {
            x: 0,
            y: 0.2,
            z: -1,
            edge: "door-north",
            offset: { x: 0, z: -1.1, y: 1.35 },
            suggestedRotation: 0,
          },
          {
            x: 0,
            y: 0.2,
            z: 1,
            edge: "door-south",
            offset: { x: 0, z: 1.1, y: 1.35 },
            suggestedRotation: Math.PI,
          },
          {
            x: -1,
            y: 0.2,
            z: 0,
            edge: "door-west",
            offset: { x: -1.1, z: 0, y: 1.35 },
            suggestedRotation: Math.PI / 2,
          },
          {
            x: 1,
            y: 0.2,
            z: 0,
            edge: "door-east",
            offset: { x: 1.1, z: 0, y: 1.35 },
            suggestedRotation: -Math.PI / 2,
          },
        ],
      },
      wall: {
        id: "wall",
        name: "Wall",
        icon: "🧱",
        description: "Vertical wall - snaps to edge midpoints",
        cost: [
          { type: "wood", amount: 3 },
          { type: "stone", amount: 2 },
        ],
        dimensions: { width: 2, height: 3, depth: 0.3 },
        color: 0xa0826d,
        snapToGround: true,
        isWall: true,
        snapPoints: [
          // Wall-to-wall edge snapping
          { x: -1, y: 0, z: 0, edge: "left", offset: { x: -2, z: 0 } },
          { x: 1, y: 0, z: 0, edge: "right", offset: { x: 2, z: 0 } },
          // Top for stacking
          { x: -1, y: 1.5, z: 0, edge: "top", offset: { x: 0, y: 3, z: 0 } },
          { x: 0, y: 1.5, z: 0, edge: "top", offset: { x: 0, y: 3, z: 0 } },
          { x: 1, y: 1.5, z: 0, edge: "top", offset: { x: 0, y: 3, z: 0 } },
        ],
      },
      floor: {
        id: "floor",
        name: "Floor",
        icon: "⬛",
        description: "A flat floor section",
        cost: [{ type: "wood", amount: 4 }],
        dimensions: { width: 2, height: 0.15, depth: 2 },
        color: 0x6b5d46,
        snapToGround: false,
        snapPoints: [
          // Floor edge-to-edge
          { x: -1, y: 0.075, z: -1, edge: "north", offset: { x: 0, z: -2 } },
          { x: 0, y: 0.075, z: -1, edge: "north", offset: { x: 0, z: -2 } },
          { x: 1, y: 0.075, z: -1, edge: "north", offset: { x: 0, z: -2 } },
          { x: -1, y: 0.075, z: 1, edge: "south", offset: { x: 0, z: 2 } },
          { x: 0, y: 0.075, z: 1, edge: "south", offset: { x: 0, z: 2 } },
          { x: 1, y: 0.075, z: 1, edge: "south", offset: { x: 0, z: 2 } },
          { x: -1, y: 0.075, z: -1, edge: "west", offset: { x: -2, z: 0 } },
          { x: -1, y: 0.075, z: 0, edge: "west", offset: { x: -2, z: 0 } },
          { x: -1, y: 0.075, z: 1, edge: "west", offset: { x: -2, z: 0 } },
          { x: 1, y: 0.075, z: -1, edge: "east", offset: { x: 2, z: 0 } },
          { x: 1, y: 0.075, z: 0, edge: "east", offset: { x: 2, z: 0 } },
          { x: 1, y: 0.075, z: 1, edge: "east", offset: { x: 2, z: 0 } },

          // Wall snap points at MIDDLE of edges
          {
            x: 0,
            y: 0.15,
            z: -1,
            edge: "wall-north",
            offset: { x: 0, z: -1.15, y: 1.575 },
            suggestedRotation: 0,
          },
          {
            x: 0,
            y: 0.15,
            z: 1,
            edge: "wall-south",
            offset: { x: 0, z: 1.15, y: 1.575 },
            suggestedRotation: Math.PI,
          },
          {
            x: -1,
            y: 0.15,
            z: 0,
            edge: "wall-west",
            offset: { x: -1.15, z: 0, y: 1.575 },
            suggestedRotation: Math.PI / 2,
          },
          {
            x: 1,
            y: 0.15,
            z: 0,
            edge: "wall-east",
            offset: { x: 1.15, z: 0, y: 1.575 },
            suggestedRotation: -Math.PI / 2,
          },

          // Door snap points at MIDDLE of edges
          {
            x: 0,
            y: 0.15,
            z: -1,
            edge: "door-north",
            offset: { x: 0, z: -1.1, y: 1.4 },
            suggestedRotation: 0,
          },
          {
            x: 0,
            y: 0.15,
            z: 1,
            edge: "door-south",
            offset: { x: 0, z: 1.1, y: 1.4 },
            suggestedRotation: Math.PI,
          },
          {
            x: -1,
            y: 0.15,
            z: 0,
            edge: "door-west",
            offset: { x: -1.1, z: 0, y: 1.4 },
            suggestedRotation: Math.PI / 2,
          },
          {
            x: 1,
            y: 0.15,
            z: 0,
            edge: "door-east",
            offset: { x: 1.1, z: 0, y: 1.4 },
            suggestedRotation: -Math.PI / 2,
          },
        ],
      },
      door: {
        id: "door",
        name: "Door",
        icon: "🚪",
        description: "Doorway - snaps to edge midpoints",
        cost: [{ type: "wood", amount: 2 }],
        dimensions: { width: 1, height: 2.5, depth: 0.2 },
        color: 0x5c4033,
        snapToGround: true,
        isDoor: true,
        snapPoints: [],
      },
      pillar: {
        id: "pillar",
        name: "Pillar",
        icon: "🏛️",
        description: "A support pillar",
        cost: [{ type: "stone", amount: 4 }],
        dimensions: { width: 0.4, height: 3, depth: 0.4 },
        color: 0x808080,
        snapToGround: true,
        snapPoints: [
          {
            x: 0,
            y: -1.5,
            z: 0,
            edge: "bottom",
            offset: { x: 0, y: -1.7, z: 0 },
          },
          { x: 0, y: 1.5, z: 0, edge: "top", offset: { x: 0, y: 3, z: 0 } },
        ],
      },
    };
  }

  /**
   * Create the building menu UI
   */
  initUI() {
    const buildingMenu = document.createElement("div");
    buildingMenu.id = "building-menu";
    buildingMenu.className = "building-menu hidden";
    buildingMenu.innerHTML = `
            <div class="building-container">
                <div class="building-header">
                    <h2>🏗️ Building</h2>
                    <button class="close-button" id="close-building">✕</button>
                </div>
                <div class="building-options">
                    <label class="snap-toggle">
                        <input type="checkbox" id="toggle-grid-snap" checked>
                        <span>Grid Snap</span>
                    </label>
                    <label class="snap-toggle">
                        <input type="checkbox" id="toggle-structure-snap" checked>
                        <span>Edge Snap</span>
                    </label>
                    <label class="snap-toggle">
                        <input type="checkbox" id="toggle-debug-points">
                        <span>Show Snap Points</span>
                    </label>
                </div>
                <div class="building-content">
                    <div class="structures-list" id="structures-list"></div>
                </div>
                <div class="building-footer">
                    <p class="hint">🧲 Walls snap to edge centers • Press [R] to rotate even when snapped</p>
                </div>
            </div>
        `;
    document.getElementById("ui-overlay").appendChild(buildingMenu);

    this.updateStructuresList();

    document.getElementById("close-building").addEventListener("click", () => {
      this.toggleMenu();
    });

    document
      .getElementById("toggle-grid-snap")
      .addEventListener("change", (e) => {
        this.enableGridSnap = e.target.checked;
      });

    document
      .getElementById("toggle-structure-snap")
      .addEventListener("change", (e) => {
        this.enableStructureSnap = e.target.checked;
      });

    document
      .getElementById("toggle-debug-points")
      .addEventListener("change", (e) => {
        this.showDebugPoints = e.target.checked;
        this.updateDebugPoints();
      });

    buildingMenu.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });

    const buildingInfo = document.createElement("div");
    buildingInfo.id = "building-info";
    buildingInfo.className = "building-info";
    buildingInfo.style.display = "none";
    document.getElementById("ui-overlay").appendChild(buildingInfo);

    console.log("✅ Building UI created");
  }

  /**
   * Show/hide debug snap point visualizations
   */
  updateDebugPoints() {
    this.debugSnapPoints.forEach((point) => this.scene.remove(point));
    this.debugSnapPoints = [];

    if (!this.showDebugPoints) return;

    for (const placedMesh of this.placedMeshes) {
      const structureType = placedMesh.userData.structureType;
      const structure = this.structures[structureType];
      if (!structure || !structure.snapPoints) continue;

      for (const snapPoint of structure.snapPoints) {
        const worldSnapPoint = new THREE.Vector3(
          snapPoint.x,
          snapPoint.y,
          snapPoint.z
        );
        worldSnapPoint.applyMatrix4(placedMesh.matrixWorld);

        // Color code
        let color = 0xffff00; // Yellow default
        if (snapPoint.edge && snapPoint.edge.startsWith("wall-")) {
          color = 0xff0000; // Red for wall edges
        } else if (snapPoint.edge && snapPoint.edge.startsWith("door-")) {
          color = 0xff00ff; // Magenta for door edges
        }

        const geometry = new THREE.SphereGeometry(0.15, 8, 8);
        const material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.8,
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(worldSnapPoint);

        this.scene.add(sphere);
        this.debugSnapPoints.push(sphere);
      }
    }
  }

  setupInput() {
    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        this.toggleMenu();
      }

      if (this.buildMode && e.key === "Escape") {
        if (this.selectedStructure) {
          this.cancelPlacement();
        } else {
          this.exitBuildMode();
        }
      }

      // R key to rotate - works even when snapped
      if (
        this.buildMode &&
        this.selectedStructure &&
        e.key.toLowerCase() === "r"
      ) {
        this.rotatePreview();
      }
    });

    window.addEventListener("mousedown", (e) => {
      if (this.buildMode && this.selectedStructure && !this.menuOpen) {
        if (e.button === 0) {
          this.attemptPlacement();
        } else if (e.button === 2) {
          this.cancelPlacement();
        }
      }
    });

    window.addEventListener("contextmenu", (e) => {
      if (this.buildMode) {
        e.preventDefault();
      }
    });
  }

  rotatePreview() {
    if (this.previewMesh) {
      this.previewMesh.rotation.y += Math.PI / 2;
      console.log("🔄 Rotated structure (manual override)");
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    const menu = document.getElementById("building-menu");

    if (this.menuOpen) {
      menu.classList.remove("hidden");
      this.updateStructuresList();

      if (!this.buildMode) {
        this.buildMode = true;
      }

      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } else {
      menu.classList.add("hidden");

      if (this.buildMode && !document.pointerLockElement) {
        document.body.requestPointerLock();
      }
    }
  }

  exitBuildMode() {
    this.buildMode = false;
    this.menuOpen = false;

    const menu = document.getElementById("building-menu");
    menu.classList.add("hidden");

    this.cancelPlacement();
  }

  updateStructuresList() {
    const structuresList = document.getElementById("structures-list");
    if (!structuresList) return;

    structuresList.innerHTML = "";

    for (const [key, structure] of Object.entries(this.structures)) {
      const canAfford = this.canAffordStructure(structure);
      const structureCard = document.createElement("div");
      structureCard.className = `structure-card ${
        canAfford ? "affordable" : "not-affordable"
      }`;

      let costHTML = "";
      structure.cost.forEach((cost) => {
        const itemData = this.inventory.itemData[cost.type];
        const hasAmount = this.inventory.getItemCount(cost.type);
        const hasEnough = hasAmount >= cost.amount;

        costHTML += `
                    <div class="cost-item ${
                      hasEnough ? "has-enough" : "not-enough"
                    }">
                        <span class="cost-icon">${itemData.icon}</span>
                        <span class="cost-count">${hasAmount}/${
          cost.amount
        }</span>
                    </div>
                `;
      });

      structureCard.innerHTML = `
                <div class="structure-icon">${structure.icon}</div>
                <div class="structure-info">
                    <h3 class="structure-name">${structure.name}</h3>
                    <p class="structure-description">${
                      structure.description
                    }</p>
                    <div class="structure-cost">
                        ${costHTML}
                    </div>
                </div>
                <button class="select-button ${canAfford ? "" : "disabled"}" 
                        data-structure="${structure.id}"
                        ${canAfford ? "" : "disabled"}>
                    Select
                </button>
            `;

      structuresList.appendChild(structureCard);

      const selectButton = structureCard.querySelector(".select-button");
      selectButton.addEventListener("click", () => {
        if (canAfford) {
          this.selectStructure(structure.id);
        }
      });
    }
  }

  canAffordStructure(structure) {
    for (const cost of structure.cost) {
      if (!this.inventory.hasItem(cost.type, cost.amount)) {
        return false;
      }
    }
    return true;
  }

  selectStructure(structureId) {
    const structure = this.structures[structureId];
    if (!structure) return;

    this.selectedStructure = structure;
    this.createPreview();

    this.menuOpen = false;
    document.getElementById("building-menu").classList.add("hidden");

    if (!document.pointerLockElement) {
      document.body.requestPointerLock();
    }

    this.showBuildingInfo();
  }

  createPreview() {
    if (this.previewMesh) {
      this.scene.remove(this.previewMesh);
    }

    const structure = this.selectedStructure;
    const geometry = new THREE.BoxGeometry(
      structure.dimensions.width,
      structure.dimensions.height,
      structure.dimensions.depth
    );

    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 2,
    });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);

    const material = new THREE.MeshBasicMaterial({
      color: structure.color,
      transparent: true,
      opacity: 0.5,
      wireframe: false,
    });

    this.previewMesh = new THREE.Mesh(geometry, material);
    this.previewMesh.add(wireframe);
    this.previewMesh.userData.isPreview = true;
    this.scene.add(this.previewMesh);
  }

  snapToGrid(position) {
    if (!this.enableGridSnap) return position;

    return new THREE.Vector3(
      Math.round(position.x / this.gridSize) * this.gridSize,
      position.y,
      Math.round(position.z / this.gridSize) * this.gridSize
    );
  }

  /**
   * Find nearest edge snap point (middle of edges for walls/doors)
   */
  findNearestEdgeSnap(targetPosition) {
    if (!this.enableStructureSnap || this.placedMeshes.length === 0) {
      return null;
    }

    const isPlacingWall =
      this.selectedStructure && this.selectedStructure.isWall;
    const isPlacingDoor =
      this.selectedStructure && this.selectedStructure.isDoor;

    let closestSnap = null;
    let closestDistance = this.snapDistance;

    for (const placedMesh of this.placedMeshes) {
      const structureType = placedMesh.userData.structureType;
      const structure = this.structures[structureType];
      if (!structure || !structure.snapPoints) continue;

      for (const snapPoint of structure.snapPoints) {
        // Filter snap points based on what we're placing
        if (
          isPlacingWall &&
          (!snapPoint.edge || !snapPoint.edge.startsWith("wall-"))
        ) {
          continue;
        }

        if (
          isPlacingDoor &&
          (!snapPoint.edge || !snapPoint.edge.startsWith("door-"))
        ) {
          continue;
        }

        if (
          !isPlacingWall &&
          !isPlacingDoor &&
          snapPoint.edge &&
          (snapPoint.edge.startsWith("wall-") ||
            snapPoint.edge.startsWith("door-"))
        ) {
          continue;
        }

        const worldSnapPoint = new THREE.Vector3(
          snapPoint.x,
          snapPoint.y,
          snapPoint.z
        );
        worldSnapPoint.applyMatrix4(placedMesh.matrixWorld);

        const distance = worldSnapPoint.distanceTo(targetPosition);

        if (distance < closestDistance) {
          const placementOffset = new THREE.Vector3(
            snapPoint.offset.x || 0,
            snapPoint.offset.y || 0,
            snapPoint.offset.z || 0
          );

          // Don't rotate offset for walls/doors
          if (!isPlacingWall && !isPlacingDoor) {
            placementOffset.applyEuler(placedMesh.rotation);
          }

          const newPosition = placedMesh.position.clone().add(placementOffset);

          closestDistance = distance;
          closestSnap = {
            position: newPosition,
            distance: distance,
            parentMesh: placedMesh,
            edge: snapPoint.edge,
            suggestedRotation: snapPoint.suggestedRotation, // Suggested, not forced
          };
        }
      }
    }

    return closestSnap;
  }

  /**
   * Update preview position with edge-middle snapping
   * Rotation is suggested but can be overridden with R key
   */
  updatePreview(camera) {
    if (!this.previewMesh || !this.selectedStructure) return;

    const mouse = new THREE.Vector2(0, 0);
    this.raycaster.setFromCamera(mouse, camera);

    const intersects = this.raycaster.intersectObject(this.terrain.mesh, false);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const normal = intersects[0].face.normal.clone();
      normal.transformDirection(this.terrain.mesh.matrixWorld);

      let finalPosition = new THREE.Vector3(
        point.x,
        point.y + this.selectedStructure.dimensions.height / 2,
        point.z
      );

      let finalRotation = this.previewMesh.rotation.clone();

      const edgeSnap = this.findNearestEdgeSnap(finalPosition);

      if (edgeSnap) {
        finalPosition.copy(edgeSnap.position);
        this.previewMesh.material.opacity = 0.75;

        // Only apply suggested rotation if this is a NEW snap (not rotating manually)
        if (
          !this.lastSnapInfo ||
          this.lastSnapInfo.edge !== edgeSnap.edge ||
          this.lastSnapInfo.parentMesh !== edgeSnap.parentMesh
        ) {
          // New snap point - apply suggested rotation
          if (
            (this.selectedStructure.isWall || this.selectedStructure.isDoor) &&
            edgeSnap.suggestedRotation !== undefined
          ) {
            finalRotation.y = edgeSnap.suggestedRotation;
          }

          this.lastSnapInfo = edgeSnap;
        }
        // Otherwise keep current rotation (user has manually rotated)
      } else {
        finalPosition = this.snapToGrid(finalPosition);
        this.previewMesh.material.opacity = 0.5;
        this.lastSnapInfo = null;
      }

      this.previewMesh.position.copy(finalPosition);
      this.previewMesh.rotation.copy(finalRotation);

      const isFlat = this.isTerrainFlat(point, normal);

      if (isFlat && this.canAffordStructure(this.selectedStructure)) {
        if (edgeSnap) {
          this.previewMesh.material.color.setHex(0x00ffff);
        } else {
          this.previewMesh.material.color.setHex(0x00ff00);
        }
      } else {
        this.previewMesh.material.color.setHex(0xff0000);
      }

      this.previewMesh.visible = true;
    } else {
      this.previewMesh.visible = false;
    }
  }

  isTerrainFlat(point, normal) {
    const up = new THREE.Vector3(0, 1, 0);
    const dotProduct = normal.dot(up);
    const slope = 1 - dotProduct;

    return slope < 0.15;
  }

  attemptPlacement() {
    if (!this.previewMesh || !this.selectedStructure) return;
    if (!this.previewMesh.visible) return;

    const color = this.previewMesh.material.color.getHex();
    const isValid = color === 0x00ff00 || color === 0x00ffff;

    if (!isValid) {
      this.showMessage(
        "Cannot place here! Terrain too steep or insufficient resources.",
        "error"
      );
      return;
    }

    for (const cost of this.selectedStructure.cost) {
      this.inventory.removeItem(cost.type, cost.amount);
    }

    this.placeStructure(
      this.selectedStructure,
      this.previewMesh.position.clone(),
      this.previewMesh.rotation.clone()
    );

    const snapText = color === 0x00ffff ? " (Edge Snapped!)" : "";
    this.showMessage(
      `Placed ${this.selectedStructure.name}!${snapText}`,
      "success"
    );

    // Reset snap tracking
    this.lastSnapInfo = null;

    if (this.showDebugPoints) {
      this.updateDebugPoints();
    }

    this.updateStructuresList();
  }

  placeStructure(structure, position, rotation) {
    const geometry = new THREE.BoxGeometry(
      structure.dimensions.width,
      structure.dimensions.height,
      structure.dimensions.depth
    );

    const material = new THREE.MeshStandardMaterial({
      color: structure.color,
      roughness: 0.8,
      metalness: 0.2,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.rotation.copy(rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.updateMatrix();
    mesh.updateMatrixWorld(true);

    mesh.userData.isStructure = true;
    mesh.userData.structureType = structure.id;

    this.scene.add(mesh);
    this.placedMeshes.push(mesh);

    const structureData = {
      type: structure.id,
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
      timestamp: Date.now(),
    };

    this.placedStructures.push(structureData);
    this.saveStructures();
  }

  cancelPlacement() {
    if (this.previewMesh) {
      this.scene.remove(this.previewMesh);
      this.previewMesh = null;
    }

    this.selectedStructure = null;
    this.lastSnapInfo = null;
    this.hideBuildingInfo();
  }

  showBuildingInfo() {
    const info = document.getElementById("building-info");
    if (!info || !this.selectedStructure) return;

    let hint = "";
    if (this.selectedStructure.isWall || this.selectedStructure.isDoor) {
      hint =
        '<p class="small">🧲 Snaps to edge centers • Press [R] to rotate freely</p>';
    }

    info.innerHTML = `
            <div class="building-info-content">
                <p><strong>${this.selectedStructure.icon} ${this.selectedStructure.name}</strong></p>
                ${hint}
                <p class="small">Left-click: place • Right-click: cancel • [B]: menu</p>
            </div>
        `;
    info.style.display = "block";
  }

  hideBuildingInfo() {
    const info = document.getElementById("building-info");
    if (info) {
      info.style.display = "none";
    }
  }

  saveStructures() {
    try {
      const saveData = {
        structures: this.placedStructures,
        playerName: "HlnefzgerSchoolAct",
        timestamp: Date.now(),
        version: "1.0",
      };

      localStorage.setItem("Survival3d_structures", JSON.stringify(saveData));
    } catch (error) {
      console.error("❌ Failed to save structures:", error);
    }
  }

  loadStructures() {
    try {
      const savedData = localStorage.getItem("Survival3d_structures");
      if (!savedData) return;

      const saveData = JSON.parse(savedData);
      this.placedStructures = saveData.structures || [];

      for (const structureData of this.placedStructures) {
        const structure = this.structures[structureData.type];
        if (!structure) continue;

        const position = new THREE.Vector3(
          structureData.position.x,
          structureData.position.y,
          structureData.position.z
        );

        const rotation = new THREE.Euler(
          structureData.rotation.x,
          structureData.rotation.y,
          structureData.rotation.z
        );

        const geometry = new THREE.BoxGeometry(
          structure.dimensions.width,
          structure.dimensions.height,
          structure.dimensions.depth
        );

        const material = new THREE.MeshStandardMaterial({
          color: structure.color,
          roughness: 0.8,
          metalness: 0.2,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.rotation.copy(rotation);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.updateMatrix();
        mesh.updateMatrixWorld(true);

        mesh.userData.isStructure = true;
        mesh.userData.structureType = structure.id;

        this.scene.add(mesh);
        this.placedMeshes.push(mesh);
      }

      console.log(`📂 Loaded ${this.placedStructures.length} structures`);
    } catch (error) {
      console.error("❌ Failed to load structures:", error);
    }
  }

  clearAllStructures() {
    for (const mesh of this.placedMeshes) {
      this.scene.remove(mesh);
    }

    this.debugSnapPoints.forEach((point) => this.scene.remove(point));
    this.debugSnapPoints = [];

    this.placedMeshes = [];
    this.placedStructures = [];

    localStorage.removeItem("Survival3d_structures");

    console.log("🗑️ All structures cleared");
  }

  showMessage(text, type = "info") {
    const message = document.createElement("div");
    message.className = `building-message ${type}`;
    message.textContent = text;
    document.getElementById("ui-overlay").appendChild(message);

    setTimeout(() => {
      message.style.opacity = "0";
      setTimeout(() => message.remove(), 300);
    }, 2500);
  }

  update(camera) {
    if (this.buildMode && this.selectedStructure && !this.menuOpen) {
      this.updatePreview(camera);
    }
  }
}
