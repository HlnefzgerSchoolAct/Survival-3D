/**
 * Placeable Items System
 * Handles torches, campfires, and other placeable objects
 */

class PlaceableSystem {
    constructor(scene, terrain, inventory) {
        this.scene = scene;
        this.terrain = terrain;
        this.inventory = inventory;
        
        this.placeables = [];
        this.previewMesh = null;
        this.placementMode = false;
        this.currentPlaceable = null;
        this.placeRange = 5;
        
        this.setupInput();
        this.loadPlaceables();
        
        console.log('🔥 Placeable system initialized');
    }
    
    setupInput() {
        window.addEventListener('keydown', (e) => {
            // ESC to cancel placement
            if (e.key === 'Escape' && this.placementMode) {
                this.cancelPlacement();
            }
            
            // Click to place
            if (e.key === 'Enter' && this.placementMode && this.previewMesh) {
                this.confirmPlacement();
            }
        });
        
        // Mouse click to place
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0 && this.placementMode && this.previewMesh) { // Left click
                this.confirmPlacement();
            }
        });
    }
    
    /**
     * Try to use selected item as placeable
     */
    tryUsePlaceable() {
        const selectedItem = this.inventory.getSelectedItem();
        if (!selectedItem) return false;
        
        const itemData = this.inventory.itemData[selectedItem.type];
        if (!itemData || itemData.type !== 'placeable') return false;
        
        // Start placement mode
        this.startPlacement(selectedItem.type);
        return true;
    }
    
    /**
     * Start placement mode
     */
    startPlacement(itemType) {
        this.currentPlaceable = itemType;
        this.placementMode = true;
        
        // Create preview
        this.createPreview(itemType);
        
        console.log(`🔥 Placing ${itemType}`);
        this.showPlacementUI();
    }
    
    /**
     * Create preview mesh
     */
    createPreview(itemType) {
        // Remove old preview
        if (this.previewMesh) {
            this.scene.remove(this.previewMesh);
        }
        
        if (itemType === 'torch') {
            this.previewMesh = this.createTorchMesh(true);
        } else if (itemType === 'campfire') {
            this.previewMesh = this.createCampfireMesh(true);
        }
        
        if (this.previewMesh) {
            this.scene.add(this.previewMesh);
        }
    }
    
    /**
     * Create torch mesh
     */
    createTorchMesh(isPreview = false) {
        const group = new THREE.Group();
        
        // Pole
        const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({
            color: isPreview ? 0x8b4513 : 0x654321,
            transparent: isPreview,
            opacity: isPreview ? 0.7 : 1
        });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 0.75;
        group.add(pole);
        
        // Flame
        const flameGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
        const flameMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: isPreview ? 0.5 : 0.8
        });
        const flame = new THREE.Mesh(flameGeometry, flameMaterial);
        flame.position.y = 1.7;
        group.add(flame);
        
        // Light
        if (!isPreview) {
            const light = new THREE.PointLight(0xff6600, 2, 10);
            light.position.y = 1.7;
            group.add(light);
            group.userData.light = light;
        }
        
        return group;
    }
    
    /**
     * Create campfire mesh
     */
    createCampfireMesh(isPreview = false) {
        const group = new THREE.Group();
        
        // Stones in circle
        const stoneGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.3);
        const stoneMaterial = new THREE.MeshStandardMaterial({
            color: isPreview ? 0x808080 : 0x606060,
            transparent: isPreview,
            opacity: isPreview ? 0.7 : 1
        });
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
            stone.position.x = Math.cos(angle) * 0.6;
            stone.position.z = Math.sin(angle) * 0.6;
            stone.position.y = 0.1;
            stone.rotation.y = angle;
            group.add(stone);
        }
        
        // Logs
        const logGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
        const logMaterial = new THREE.MeshStandardMaterial({
            color: isPreview ? 0x8b4513 : 0x654321,
            transparent: isPreview,
            opacity: isPreview ? 0.7 : 1
        });
        
        for (let i = 0; i < 4; i++) {
            const log = new THREE.Mesh(logGeometry, logMaterial);
            log.position.y = 0.2;
            log.rotation.z = Math.PI / 2;
            log.rotation.y = (i / 4) * Math.PI * 2;
            group.add(log);
        }
        
        // Fire
        const fireGeometry = new THREE.ConeGeometry(0.4, 0.8, 8);
        const fireMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: isPreview ? 0.5 : 0.7
        });
        const fire = new THREE.Mesh(fireGeometry, fireMaterial);
        fire.position.y = 0.6;
        group.add(fire);
        
        // Light
        if (!isPreview) {
            const light = new THREE.PointLight(0xff6600, 3, 15);
            light.position.y = 0.8;
            group.add(light);
            group.userData.light = light;
            
            // Warmth area (for temperature buff)
            group.userData.warmthRadius = 5;
        }
        
        return group;
    }
    
    /**
     * Update preview position
     */
    updatePlacement(camera) {
        if (!this.placementMode || !this.previewMesh) return;
        
        // Get position in front of camera
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        
        const playerPos = window.game?.player?.position || new THREE.Vector3(0, 0, 0);
        const placePos = playerPos.clone().add(direction.multiplyScalar(this.placeRange));
        
        // Snap to terrain
        const terrainHeight = this.terrain.getHeightAt(placePos.x, placePos.z);
        placePos.y = terrainHeight;
        
        this.previewMesh.position.copy(placePos);
        
        // Check if valid placement
        const isValid = this.checkValidPlacement(placePos);
        
        // Update preview color
        if (this.previewMesh.children) {
            this.previewMesh.children.forEach(child => {
                if (child.material) {
                    child.material.color.setHex(isValid ? 0x00ff00 : 0xff0000);
                }
            });
        }
    }
    
    /**
     * Check if placement is valid
     */
    checkValidPlacement(position) {
        // Check terrain height
        const terrainHeight = this.terrain.getHeightAt(position.x, position.z);
        if (terrainHeight < -1 || terrainHeight > 15) return false;
        
        // Check distance from player
        const playerPos = window.game?.player?.position || new THREE.Vector3(0, 0, 0);
        const distance = position.distanceTo(playerPos);
        if (distance > this.placeRange) return false;
        
        // Check not too close to other placeables
        for (const placeable of this.placeables) {
            if (placeable.position.distanceTo(position) < 2) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Confirm placement
     */
    confirmPlacement() {
        if (!this.previewMesh || !this.currentPlaceable) return;
        
        const position = this.previewMesh.position.clone();
        
        if (!this.checkValidPlacement(position)) {
            this.showMessage('❌ Cannot place here!', 'error');
            return;
        }
        
        // Remove item from inventory
        if (!this.inventory.removeItem(this.currentPlaceable, 1)) {
            this.showMessage('❌ No item to place!', 'error');
            this.cancelPlacement();
            return;
        }
        
        // Create actual placeable
        this.createPlaceable(this.currentPlaceable, position);
        
        this.showMessage(`✅ Placed ${this.inventory.itemData[this.currentPlaceable].name}`, 'success');
        
        // Check if we have more to place
        if (this.inventory.hasItem(this.currentPlaceable)) {
            // Keep placement mode active
            this.createPreview(this.currentPlaceable);
        } else {
            // Exit placement mode
            this.cancelPlacement();
        }
    }
    
    /**
     * Create actual placeable in world
     */
    createPlaceable(type, position) {
        let mesh;
        
        if (type === 'torch') {
            mesh = this.createTorchMesh(false);
        } else if (type === 'campfire') {
            mesh = this.createCampfireMesh(false);
        }
        
        if (!mesh) return;
        
        mesh.position.copy(position);
        this.scene.add(mesh);
        
        const placeable = {
            id: Date.now() + Math.random(),
            type: type,
            position: position.clone(),
            mesh: mesh,
            createdAt: Date.now()
        };
        
        this.placeables.push(placeable);
        this.savePlaceables();
        
        console.log(`🔥 Created ${type} at (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
    }
    
    /**
     * Cancel placement
     */
    cancelPlacement() {
        if (this.previewMesh) {
            this.scene.remove(this.previewMesh);
            this.previewMesh = null;
        }
        
        this.placementMode = false;
        this.currentPlaceable = null;
        this.hidePlacementUI();
        
        console.log('🔥 Cancelled placement');
    }
    
    /**
     * Update placeables (animate flames)
     */
    update(deltaTime, camera) {
        // Update placement preview
        if (this.placementMode) {
            this.updatePlacement(camera);
        }
        
        // Animate flames
        for (const placeable of this.placeables) {
            if (placeable.mesh && placeable.mesh.children) {
                for (const child of placeable.mesh.children) {
                    if (child.material && child.material.color.r > 0.5) {
                        // Flicker flame
                        child.position.y += Math.sin(Date.now() * 0.01) * 0.002;
                    }
                }
            }
            
            // Update light intensity for flicker
            if (placeable.mesh.userData.light) {
                const light = placeable.mesh.userData.light;
                light.intensity = light.intensity === 2 ? 2 : 3;
                light.intensity += Math.sin(Date.now() * 0.005) * 0.3;
            }
        }
    }
    
    showPlacementUI() {
        let ui = document.getElementById('placement-ui');
        if (!ui) {
            ui = document.createElement('div');
            ui.id = 'placement-ui';
            ui.className = 'placement-ui';
            document.getElementById('ui-overlay').appendChild(ui);
        }
        
        const itemData = this.inventory.itemData[this.currentPlaceable];
        ui.innerHTML = `
            <p>🔥 Placing: ${itemData.icon} ${itemData.name}</p>
            <p><kbd>Left Click</kbd> or <kbd>Enter</kbd> to place</p>
            <p><kbd>ESC</kbd> to cancel</p>
        `;
        ui.style.display = 'block';
    }
    
    hidePlacementUI() {
        const ui = document.getElementById('placement-ui');
        if (ui) ui.style.display = 'none';
    }
    
    showMessage(text, type) {
        const message = document.createElement('div');
        message.className = `inventory-message ${type}`;
        message.textContent = text;
        document.getElementById('ui-overlay').appendChild(message);
        
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => message.remove(), 300);
        }, 2000);
    }
    
    /**
     * Save placeables to localStorage
     */
    savePlaceables() {
        try {
            const data = this.placeables.map(p => ({
                id: p.id,
                type: p.type,
                position: { x: p.position.x, y: p.position.y, z: p.position.z },
                createdAt: p.createdAt
            }));
            
            localStorage.setItem('Survival3d_placeables', JSON.stringify(data));
            console.log(`💾 Saved ${data.length} placeables`);
        } catch (error) {
            console.error('❌ Failed to save placeables:', error);
        }
    }
    
    /**
     * Load placeables from localStorage
     */
    loadPlaceables() {
        try {
            const saved = localStorage.getItem('Survival3d_placeables');
            if (!saved) return;
            
            const data = JSON.parse(saved);
            
            for (const item of data) {
                const position = new THREE.Vector3(item.position.x, item.position.y, item.position.z);
                this.createPlaceable(item.type, position);
            }
            
            console.log(`📂 Loaded ${data.length} placeables`);
        } catch (error) {
            console.error('❌ Failed to load placeables:', error);
        }
    }
    
    /**
     * Get warmth at position (for campfire temperature buff)
     */
    getWarmthAtPosition(position) {
        let warmth = 0;
        
        for (const placeable of this.placeables) {
            if (placeable.type === 'campfire') {
                const distance = placeable.position.distanceTo(position);
                const radius = placeable.mesh.userData.warmthRadius || 5;
                
                if (distance < radius) {
                    warmth += (1 - distance / radius) * 10; // Up to +10°C
                }
            }
        }
        
        return warmth;
    }
}