/**
 * Inventory System
 * Manages player inventory, item storage, UI, persistence, ground item drops, and manual dropping
 */

class Inventory {
  constructor() {
    this.slots = 10;
    this.items = new Map();
    this.maxStackSize = 99;
    this.selectedSlot = 0; // Currently selected hotbar slot

    // Ground items
    this.groundItems = [];
    this.pickupRange = 3;

    // Drop mode
    this.dropMode = false;
    this.dropAmount = 1; // How many to drop at once

    // Item definitions
    this.itemData = {
      // Resources
      wood: {
        name: "Wood",
        icon: "🪵",
        color: "#8b4513",
        description: "Gathered from trees",
        type: "resource",
      },
      stone: {
        name: "Stone",
        icon: "🪨",
        color: "#808080",
        description: "Mined from rocks",
        type: "resource",
      },
      fiber: {
        name: "Fiber",
        icon: "🌿",
        color: "#00ff00",
        description: "Collected from plants",
        type: "resource",
      },
      // Loot items
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
      // Tools
      wooden_pickaxe: {
        name: "Wooden Pickaxe",
        icon: "⛏️",
        color: "#ffa500",
        description: "Basic mining tool",
        type: "tool",
        toolType: "pickaxe",
        tier: 1,
        gatherBonus: {
          rock: { amountMultiplier: 1.5, speedMultiplier: 1.5 },
        },
      },
      stone_axe: {
        name: "Stone Axe",
        icon: "🪓",
        color: "#ffa500",
        description: "Chops wood efficiently",
        type: "tool",
        toolType: "axe",
        tier: 2,
        gatherBonus: {
          tree: { amountMultiplier: 2, speedMultiplier: 2 },
        },
      },
      stone_pickaxe: {
        name: "Stone Pickaxe",
        icon: "⚒️",
        color: "#ffa500",
        description: "Sturdy mining tool",
        type: "tool",
        toolType: "pickaxe",
        tier: 2,
        gatherBonus: {
          rock: { amountMultiplier: 2, speedMultiplier: 2.5 },
        },
      },
      rope: {
        name: "Rope",
        icon: "🪢",
        color: "#ffa500",
        description: "Useful for crafting",
        type: "material",
      },
      torch: {
        name: "Torch",
        icon: "🔦",
        color: "#ffa500",
        description: "Provides light",
        type: "tool",
        toolType: "light",
      },
      campfire: {
        name: "Campfire",
        icon: "🔥",
        color: "#ffa500",
        description: "Warmth and cooking",
        type: "placeable",
      },
    };

    // Load saved inventory
    this.loadInventory();

    this.initUI();
    this.setupHotbarInput();
    this.setupDropInput();
    console.log("🎒 Inventory system initialized with manual drop feature");
  }

  initUI() {
    // Create inventory bar
    const inventoryBar = document.createElement("div");
    inventoryBar.id = "inventory-bar";
    inventoryBar.innerHTML = `
            <div id="inventory-slots"></div>
            <div id="inventory-info">
                <span id="selected-item-name"></span>
            </div>
        `;
    document.getElementById("ui-overlay").appendChild(inventoryBar);

    // Create slots
    const slotsContainer = document.getElementById("inventory-slots");
    for (let i = 0; i < this.slots; i++) {
      const slot = document.createElement("div");
      slot.className = "inventory-slot";
      slot.dataset.slot = i;
      slot.innerHTML = `
                <div class="slot-icon"></div>
                <div class="slot-count">0</div>
                <div class="slot-number">${i + 1}</div>
            `;
      slotsContainer.appendChild(slot);
    }

    // Create drop indicator
    const dropIndicator = document.createElement("div");
    dropIndicator.id = "drop-indicator";
    dropIndicator.className = "drop-indicator";
    dropIndicator.style.display = "none";
    dropIndicator.innerHTML = `
            <div class="drop-content">
                <p><strong>DROP MODE</strong></p>
                <p class="drop-item-info" id="drop-item-info">Select an item to drop</p>
                <p class="drop-controls">
                    <span>[Q] Drop 1</span> • 
                    <span>[Shift+Q] Drop 10</span> • 
                    <span>[Ctrl+Q] Drop All</span> • 
                    <span>[X] Cancel</span>
                </p>
            </div>
        `;
    document.getElementById("ui-overlay").appendChild(dropIndicator);

    this.updateUI();
    this.updateSelectedSlot();
  }

  setupHotbarInput() {
    // Number keys 1-9, 0 to select hotbar slots
    window.addEventListener("keydown", (e) => {
      if (e.key >= "1" && e.key <= "9") {
        this.selectedSlot = parseInt(e.key) - 1;
        this.updateSelectedSlot();
        this.updateDropIndicator();
      } else if (e.key === "0") {
        this.selectedSlot = 9;
        this.updateSelectedSlot();
        this.updateDropIndicator();
      }
    });

    // Mouse wheel to cycle through hotbar
    window.addEventListener("wheel", (e) => {
      if (e.deltaY > 0) {
        this.selectedSlot = (this.selectedSlot + 1) % this.slots;
      } else {
        this.selectedSlot = (this.selectedSlot - 1 + this.slots) % this.slots;
      }
      this.updateSelectedSlot();
      this.updateDropIndicator();
    });
  }

  /**
   * Setup drop mode input
   */
  setupDropInput() {
    window.addEventListener("keydown", (e) => {
      // X key to toggle drop mode
      if (e.key.toLowerCase() === "x") {
        e.preventDefault();
        this.toggleDropMode();
        return;
      }

      // Q key to drop items
      if (e.key.toLowerCase() === "q" && this.dropMode) {
        e.preventDefault();

        if (e.ctrlKey || e.metaKey) {
          // Ctrl+Q: Drop all
          this.dropSelectedItem("all");
        } else if (e.shiftKey) {
          // Shift+Q: Drop 10
          this.dropSelectedItem(10);
        } else {
          // Q: Drop 1
          this.dropSelectedItem(1);
        }
        return;
      }
    });
  }

  /**
   * Toggle drop mode on/off
   */
  toggleDropMode() {
    this.dropMode = !this.dropMode;

    const indicator = document.getElementById("drop-indicator");
    if (this.dropMode) {
      indicator.style.display = "block";
      this.updateDropIndicator();
      console.log("📤 Drop mode: ON");
    } else {
      indicator.style.display = "none";
      console.log("📤 Drop mode: OFF");
    }
  }

  /**
   * Update drop indicator with current item info
   */
  updateDropIndicator() {
    if (!this.dropMode) return;

    const selectedItem = this.getSelectedItem();
    const infoEl = document.getElementById("drop-item-info");

    if (selectedItem && infoEl) {
      const itemData = this.itemData[selectedItem.type];
      infoEl.innerHTML = `
                ${itemData.icon} ${itemData.name} 
                <span style="color: #ffa500;">(${selectedItem.count} available)</span>
            `;
    } else if (infoEl) {
      infoEl.textContent = "No item selected in this slot";
    }
  }

  /**
   * Drop the currently selected item
   */
  dropSelectedItem(amount) {
    const selectedItem = this.getSelectedItem();

    if (!selectedItem) {
      this.showMessage("No item to drop!", "error");
      return;
    }

    const itemData = this.itemData[selectedItem.type];

    // Calculate how many to drop
    let dropCount = amount;
    if (amount === "all") {
      dropCount = selectedItem.count;
    } else {
      dropCount = Math.min(amount, selectedItem.count);
    }

    // Remove from inventory
    if (this.removeItem(selectedItem.type, dropCount)) {
      // Drop on ground
      this.dropItemOnGround(selectedItem.type, dropCount);

      this.showMessage(
        `Dropped ${dropCount}x ${itemData.icon} ${itemData.name}`,
        "info"
      );
      console.log(`📤 Dropped ${dropCount}x ${selectedItem.type}`);

      // Update drop indicator
      this.updateDropIndicator();
    } else {
      this.showMessage("Failed to drop item", "error");
    }
  }

  updateSelectedSlot() {
    // Update visual indication of selected slot
    const slots = document.querySelectorAll(".inventory-slot");
    slots.forEach((slot, index) => {
      if (index === this.selectedSlot) {
        slot.classList.add("selected");
      } else {
        slot.classList.remove("selected");
      }
    });

    // Update selected item name display
    const selectedItem = this.getSelectedItem();
    const nameDisplay = document.getElementById("selected-item-name");
    if (nameDisplay && selectedItem) {
      const itemData = this.itemData[selectedItem.type];
      nameDisplay.textContent = `${itemData.icon} ${itemData.name}`;
    } else if (nameDisplay) {
      nameDisplay.textContent = "";
    }
  }

  getSelectedItem() {
    // Get the item in the currently selected slot
    let slotIndex = 0;
    for (const [itemType, count] of this.items.entries()) {
      if (slotIndex === this.selectedSlot) {
        return { type: itemType, count: count };
      }
      slotIndex++;
    }
    return null;
  }

  getSelectedTool() {
    // Get the currently selected tool (if any)
    const selected = this.getSelectedItem();
    if (!selected) return null;

    const itemData = this.itemData[selected.type];
    if (itemData && itemData.type === "tool") {
      return itemData;
    }
    return null;
  }

  /**
   * Check if inventory has room for item
   */
  hasRoom(itemType, amount = 1) {
    const currentAmount = this.items.get(itemType) || 0;
    return currentAmount + amount <= this.maxStackSize;
  }

  /**
   * Get how many items can fit
   */
  getRoomFor(itemType) {
    const currentAmount = this.items.get(itemType) || 0;
    return this.maxStackSize - currentAmount;
  }

  addItem(itemType, amount = 1) {
    if (!this.itemData[itemType]) {
      console.warn(`Unknown item type: ${itemType}`);
      return false;
    }

    const currentAmount = this.items.get(itemType) || 0;
    const roomAvailable = this.maxStackSize - currentAmount;

    // Check if inventory is full for this item type
    if (roomAvailable <= 0) {
      // Inventory full - drop on ground
      this.dropItemOnGround(itemType, amount);
      this.showMessage(
        `Inventory full! Dropped ${amount} ${this.itemData[itemType].name}`,
        "info"
      );
      return false;
    }

    // Check if we need to split between inventory and ground
    if (amount > roomAvailable) {
      // Add what we can to inventory
      this.items.set(itemType, this.maxStackSize);
      this.updateUI();
      this.saveInventory();

      // Drop the rest on ground
      const leftover = amount - roomAvailable;
      this.dropItemOnGround(itemType, leftover);

      this.showMessage(
        `+${roomAvailable} ${this.itemData[itemType].name} (${leftover} dropped)`,
        "info"
      );
      return true;
    }

    // Normal add - everything fits
    const newAmount = currentAmount + amount;
    this.items.set(itemType, newAmount);
    this.updateUI();
    this.showMessage(`+${amount} ${this.itemData[itemType].name}`, "success");

    // Save inventory after adding item
    this.saveInventory();

    console.log(`📦 Added ${amount} ${itemType}. Total: ${newAmount}`);
    return true;
  }

  /**
   * Drop item on ground at player position
   */
  dropItemOnGround(itemType, amount) {
    if (!window.game?.player) {
      console.warn("Cannot drop item - player not found");
      return;
    }

    const playerPos = window.game.player.position.clone();

    // Scatter items slightly in front of player
    const forwardOffset = 2; // Drop in front of player
    const offsetX = (Math.random() - 0.5) * 1.5 + forwardOffset;
    const offsetZ = (Math.random() - 0.5) * 1.5;

    this.createGroundItem(
      itemType,
      amount,
      playerPos.x + offsetX,
      playerPos.z + offsetZ
    );
  }

  /**
   * Create a ground item (loot drop)
   */
  createGroundItem(itemType, amount, x, z) {
    if (!this.itemData[itemType]) return;
    if (!window.game?.scene || !window.game?.terrain) return;

    const itemData = this.itemData[itemType];
    const y = window.game.terrain.getHeightAt(x, z);

    const groundItem = {
      id: Date.now() + Math.random(),
      type: itemType,
      amount: amount,
      position: new THREE.Vector3(x, y + 0.5, z),
      mesh: null,
      bobTimer: 0,
    };

    // Create visual mesh
    groundItem.mesh = this.createGroundItemMesh(groundItem);

    this.groundItems.push(groundItem);

    console.log(
      `📦 Dropped ${amount}x ${itemType} on ground at (${x.toFixed(
        1
      )}, ${z.toFixed(1)})`
    );
  }

  /**
   * Create visual mesh for ground item
   */
  createGroundItemMesh(groundItem) {
    const group = new THREE.Group();
    const itemData = this.itemData[groundItem.type];

    // Create a box with item color
    const geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const material = new THREE.MeshStandardMaterial({
      color: itemData.color,
      emissive: itemData.color,
      emissiveIntensity: 0.2,
      roughness: 0.5,
      metalness: 0.3,
    });
    const box = new THREE.Mesh(geometry, material);
    box.castShadow = true;
    group.add(box);

    // Add item icon as sprite
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(itemData.icon, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.6, 0.6, 1);
    sprite.position.y = 0.5;
    group.add(sprite);

    group.position.copy(groundItem.position);

    group.userData.groundItem = groundItem;

    window.game.scene.add(group);

    return group;
  }

  /**
   * Update ground items (bobbing animation, pickup check)
   */
  updateGroundItems(deltaTime) {
    if (!window.game?.player) return;

    const playerPos = window.game.player.position;

    for (let i = this.groundItems.length - 1; i >= 0; i--) {
      const item = this.groundItems[i];

      // Bobbing animation
      item.bobTimer += deltaTime * 3;
      if (item.mesh) {
        const bobHeight = Math.sin(item.bobTimer) * 0.1;
        item.mesh.position.y = item.position.y + bobHeight;
        item.mesh.rotation.y += deltaTime * 2;
      }

      // Check if player is close enough to pick up
      const distance = playerPos.distanceTo(item.position);
      if (distance < this.pickupRange) {
        this.attemptPickup(item, i);
      }
    }
  }

  /**
   * Try to pick up a ground item
   */
  attemptPickup(item, index) {
    const roomAvailable = this.getRoomFor(item.type);

    if (roomAvailable <= 0) {
      // Can't pick up - show message occasionally
      if (Math.random() < 0.01) {
        this.showMessage(
          `Inventory full! Can't pick up ${this.itemData[item.type].name}`,
          "error"
        );
      }
      return;
    }

    // Pick up what we can
    const amountToPickup = Math.min(item.amount, roomAvailable);

    // Add to inventory
    const currentAmount = this.items.get(item.type) || 0;
    this.items.set(item.type, currentAmount + amountToPickup);
    this.updateUI();
    this.saveInventory();

    this.showMessage(
      `Picked up ${amountToPickup}x ${this.itemData[item.type].icon} ${
        this.itemData[item.type].name
      }`,
      "success"
    );

    // Update or remove item
    item.amount -= amountToPickup;

    if (item.amount <= 0) {
      // Remove item completely
      if (item.mesh) {
        window.game.scene.remove(item.mesh);
      }
      this.groundItems.splice(index, 1);
    }

    // Update drop indicator if in drop mode
    this.updateDropIndicator();
  }

  /**
   * Show pickup prompt for nearby items
   */
  checkNearbyItems() {
    if (!window.game?.player) return;

    const playerPos = window.game.player.position;
    let nearestItem = null;
    let nearestDist = this.pickupRange;

    for (const item of this.groundItems) {
      const distance = playerPos.distanceTo(item.position);
      if (distance < nearestDist) {
        nearestItem = item;
        nearestDist = distance;
      }
    }

    if (nearestItem) {
      this.showPickupPrompt(nearestItem);
    } else {
      this.hidePickupPrompt();
    }
  }

  /**
   * Show pickup prompt
   */
  showPickupPrompt(item) {
    let prompt = document.getElementById("pickup-prompt");
    if (!prompt) {
      prompt = document.createElement("div");
      prompt.id = "pickup-prompt";
      prompt.className = "pickup-prompt";
      document.getElementById("ui-overlay").appendChild(prompt);
    }

    const itemData = this.itemData[item.type];
    prompt.innerHTML = `
            ${itemData.icon} ${itemData.name} x${item.amount}
            <br><span style="font-size: 12px;">Walk over to pick up</span>
        `;
    prompt.style.display = "block";
  }

  /**
   * Hide pickup prompt
   */
  hidePickupPrompt() {
    const prompt = document.getElementById("pickup-prompt");
    if (prompt) {
      prompt.style.display = "none";
    }
  }

  removeItem(itemType, amount = 1) {
    const currentAmount = this.items.get(itemType) || 0;
    if (currentAmount < amount) {
      return false;
    }

    const newAmount = currentAmount - amount;
    if (newAmount === 0) {
      this.items.delete(itemType);
    } else {
      this.items.set(itemType, newAmount);
    }

    this.updateUI();
    this.updateSelectedSlot();

    // Save inventory after removing item
    this.saveInventory();

    return true;
  }

  hasItem(itemType, amount = 1) {
    return (this.items.get(itemType) || 0) >= amount;
  }

  getItemCount(itemType) {
    return this.items.get(itemType) || 0;
  }

  updateUI() {
    const slots = document.querySelectorAll(".inventory-slot");
    let slotIndex = 0;

    // Clear all slots first
    slots.forEach((slot) => {
      slot.querySelector(".slot-icon").textContent = "";
      slot.querySelector(".slot-count").textContent = "0";
      slot.classList.remove("has-item");
      slot.style.borderColor = "rgba(100, 200, 100, 0.3)";
    });

    // Fill slots with items
    for (const [itemType, count] of this.items.entries()) {
      if (slotIndex >= this.slots) break;

      const slot = slots[slotIndex];
      const itemInfo = this.itemData[itemType];

      slot.querySelector(".slot-icon").textContent = itemInfo.icon;
      slot.querySelector(".slot-count").textContent = count;
      slot.classList.add("has-item");
      slot.style.borderColor = itemInfo.color;
      slot.dataset.itemType = itemType;

      // Add tool indicator
      if (itemInfo.type === "tool") {
        slot.classList.add("tool-slot");
      }

      slotIndex++;
    }
  }

  showMessage(text, type = "info") {
    const message = document.createElement("div");
    message.className = `inventory-message ${type}`;
    message.textContent = text;
    document.getElementById("ui-overlay").appendChild(message);

    setTimeout(() => {
      message.style.opacity = "0";
      setTimeout(() => message.remove(), 300);
    }, 2000);
  }

  getInventorySummary() {
    const summary = [];
    for (const [itemType, count] of this.items.entries()) {
      summary.push(
        `${this.itemData[itemType].icon} ${this.itemData[itemType].name}: ${count}`
      );
    }
    return summary.join(" | ") || "Empty";
  }

  /**
   * Save inventory to localStorage
   */
  saveInventory() {
    try {
      const inventoryData = {
        items: Array.from(this.items.entries()),
        selectedSlot: this.selectedSlot,
        playerName: "HlnefzgerSchoolAct",
        timestamp: Date.now(),
        version: "1.0",
      };

      localStorage.setItem(
        "Survival3d_inventory",
        JSON.stringify(inventoryData)
      );
    } catch (error) {
      console.error("❌ Failed to save inventory:", error);
    }
  }

  /**
   * Load inventory from localStorage
   */
  loadInventory() {
    try {
      const savedData = localStorage.getItem("Survival3d_inventory");
      if (!savedData) {
        console.log("📂 No saved inventory found - starting fresh");
        return;
      }

      const inventoryData = JSON.parse(savedData);

      this.items = new Map(inventoryData.items || []);

      if (inventoryData.selectedSlot !== undefined) {
        this.selectedSlot = inventoryData.selectedSlot;
      }

      console.log(`📂 Loaded inventory (${this.items.size} item types)`);
    } catch (error) {
      console.error("❌ Failed to load inventory:", error);
      this.items = new Map();
    }
  }

  /**
   * Clear all inventory items
   */
  clearInventory() {
    this.items.clear();
    this.selectedSlot = 0;
    this.updateUI();
    this.updateSelectedSlot();
    this.saveInventory();
    console.log("🗑️ Inventory cleared");
  }

  /**
   * Export inventory data for debugging
   */
  exportInventory() {
    const data = {
      items: Array.from(this.items.entries()),
      selectedSlot: this.selectedSlot,
      groundItems: this.groundItems.length,
      summary: this.getInventorySummary(),
    };
    console.log("📋 Inventory Export:", data);
    return data;
  }
}
