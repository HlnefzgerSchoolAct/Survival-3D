/**
 * Crafting System
 * Handles crafting recipes, UI, and item creation
 */

class CraftingSystem {
  constructor(inventory) {
    this.inventory = inventory;
    this.isMenuOpen = false;

    // Define crafting recipes
    this.recipes = [
      {
        id: "rope",
        name: "Rope",
        icon: "🪢",
        description: "Made from plant fibers. Used for tool crafting.",
        requirements: [{ type: "fiber", amount: 10 }],
        result: { type: "rope", amount: 1 },
      },
      {
        id: "wooden_pickaxe",
        name: "Wooden Pickaxe",
        icon: "⛏️",
        description: "Basic mining tool. Better than bare hands.",
        requirements: [
          { type: "wood", amount: 5 },
          { type: "rope", amount: 2 },
        ],
        result: { type: "wooden_pickaxe", amount: 1 },
      },
      {
        id: "stone_axe",
        name: "Stone Axe",
        icon: "🪓",
        description: "Chops wood efficiently. Doubles gathering speed.",
        requirements: [
          { type: "wood", amount: 3 },
          { type: "stone", amount: 5 },
          { type: "rope", amount: 2 },
        ],
        result: { type: "stone_axe", amount: 1 },
      },
      {
        id: "stone_pickaxe",
        name: "Stone Pickaxe",
        icon: "⚒️",
        description: "Sturdy mining tool. Much faster than wooden.",
        requirements: [
          { type: "wood", amount: 3 },
          { type: "stone", amount: 8 },
          { type: "rope", amount: 2 },
        ],
        result: { type: "stone_pickaxe", amount: 1 },
      },
      {
        id: "torch",
        name: "Torch",
        icon: "🔦",
        description: "Provides light in dark areas.",
        requirements: [
          { type: "wood", amount: 2 },
          { type: "fiber", amount: 3 },
        ],
        result: { type: "torch", amount: 1 },
      },
      {
        id: "campfire",
        name: "Campfire",
        icon: "🔥",
        description: "Warmth, light, and cooking. Prevents cold damage.",
        requirements: [
          { type: "wood", amount: 8 },
          { type: "stone", amount: 5 },
        ],
        result: { type: "campfire", amount: 1 },
      },
    ];

    this.initUI();
    this.setupInput();

    console.log(
      "🔨 Crafting system initialized with",
      this.recipes.length,
      "recipes"
    );
  }

  initUI() {
    const craftingMenu = document.createElement("div");
    craftingMenu.id = "crafting-menu";
    craftingMenu.className = "crafting-menu hidden";
    craftingMenu.innerHTML = `
            <div class="crafting-content">
                <div class="crafting-header">
                    <h2>🔨 Crafting</h2>
                    <button class="crafting-close" id="crafting-close">✕</button>
                </div>
                <div class="crafting-body" id="crafting-recipes"></div>
            </div>
        `;
    document.getElementById("ui-overlay").appendChild(craftingMenu);

    this.updateRecipeList();

    // Close button
    document.getElementById("crafting-close").addEventListener("click", () => {
      this.closeMenu();
    });
  }

  setupInput() {
    window.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        this.toggleMenu();
      }

      if (e.key === "Escape" && this.isMenuOpen) {
        e.preventDefault();
        this.closeMenu();
      }
    });
  }

  toggleMenu() {
    if (this.isMenuOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    const menu = document.getElementById("crafting-menu");
    menu.classList.remove("hidden");
    this.isMenuOpen = true;

    // Update recipes when opening
    this.updateRecipeList();

    // Release pointer lock
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    console.log("🔨 Crafting menu opened");
  }

  closeMenu() {
    const menu = document.getElementById("crafting-menu");
    menu.classList.add("hidden");
    this.isMenuOpen = false;

    console.log("🔨 Crafting menu closed");
  }

  updateRecipeList() {
    const container = document.getElementById("crafting-recipes");
    if (!container) return;

    container.innerHTML = "";

    for (const recipe of this.recipes) {
      const canCraft = this.canCraftRecipe(recipe);
      const recipeEl = this.createRecipeElement(recipe, canCraft);
      container.appendChild(recipeEl);
    }
  }

  createRecipeElement(recipe, canCraft) {
    const el = document.createElement("div");
    el.className = `recipe-card ${canCraft ? "craftable" : "not-craftable"}`;

    // Requirements HTML
    let requirementsHTML = "";
    for (const req of recipe.requirements) {
      const itemData = this.inventory.itemData[req.type];
      const hasAmount = this.inventory.getItemCount(req.type);
      const hasEnough = hasAmount >= req.amount;

      requirementsHTML += `
                <div class="requirement ${hasEnough ? "has" : "needs"}">
                    <span class="req-icon">${itemData.icon}</span>
                    <span class="req-text">${itemData.name}</span>
                    <span class="req-amount">${hasAmount}/${req.amount}</span>
                </div>
            `;
    }

    el.innerHTML = `
            <div class="recipe-icon">${recipe.icon}</div>
            <div class="recipe-info">
                <h3>${recipe.name}</h3>
                <p>${recipe.description}</p>
                <div class="recipe-requirements">
                    ${requirementsHTML}
                </div>
                <button class="craft-button ${canCraft ? "" : "disabled"}" 
                        data-recipe="${recipe.id}"
                        ${canCraft ? "" : "disabled"}>
                    ${canCraft ? "✓ Craft" : "✗ Need Materials"}
                </button>
            </div>
        `;

    // Add craft button handler
    const button = el.querySelector(".craft-button");
    if (button && canCraft) {
      button.addEventListener("click", () => {
        this.craftRecipe(recipe);
      });
    }

    return el;
  }

  canCraftRecipe(recipe) {
    for (const req of recipe.requirements) {
      if (!this.inventory.hasItem(req.type, req.amount)) {
        return false;
      }
    }
    return true;
  }

  craftRecipe(recipe) {
    // Double check we can craft
    if (!this.canCraftRecipe(recipe)) {
      this.showMessage("❌ Not enough materials!", "error");
      return;
    }

    // Remove required items
    for (const req of recipe.requirements) {
      if (!this.inventory.removeItem(req.type, req.amount)) {
        this.showMessage("❌ Crafting failed!", "error");
        console.error(`Failed to remove ${req.amount} ${req.type}`);
        return;
      }
    }

    // Add result item
    this.inventory.addItem(recipe.result.type, recipe.result.amount);

    this.showMessage(`✅ Crafted ${recipe.icon} ${recipe.name}!`, "success");
    console.log(`🔨 Crafted ${recipe.name}`);

    // Update recipe list
    this.updateRecipeList();
  }

  showMessage(text, type) {
    const message = document.createElement("div");
    message.className = `crafting-message ${type}`;
    message.textContent = text;
    document.getElementById("ui-overlay").appendChild(message);

    setTimeout(() => {
      message.style.opacity = "0";
      setTimeout(() => message.remove(), 300);
    }, 2000);
  }
}
