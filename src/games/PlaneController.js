import * as THREE from 'three';

export class PlaneController {
    constructor(scene, camera, spotLight, playerCube) {
        this.scene = scene;
        this.camera = camera;
        this.spotLight = spotLight;
        this.playerCube = playerCube; // The player cube (box) controlled by blockGame.js

        this.planeSpeed = 0.2; // Initial plane speed
        this.isInPlane = false;

        // Movement state for the plane
        this.move = { x: 0, z: 0 };

        // Create the plane mesh
        const planeGeometry = new THREE.BoxGeometry(2, 0.3, 3);
        const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.plane = new THREE.Mesh(planeGeometry, planeMaterial);
        this.plane.castShadow = true;
        this.plane.position.set(2, 0.5, 0); // Initial plane position
        scene.add(this.plane);

        // Store references to event listener functions so they can be removed
        this.boundKeydownHandler = this.handleKeydown.bind(this);
        this.boundKeyupHandler = this.handleKeyup.bind(this);

        // Setup input
        this.setupControls();
    }

    setupControls() {
        window.addEventListener('keydown', this.boundKeydownHandler);
        window.addEventListener('keyup', this.boundKeyupHandler);
    }

    handleKeydown(e) {
        // Toggle plane mode
        if (e.key === 'e' || e.key === 'E') {
            const playerBox = new THREE.Box3().setFromObject(this.playerCube);
            const planeBox = new THREE.Box3().setFromObject(this.plane);

            // Check collision to enter plane, or if already in plane, exit.
            if (playerBox.intersectsBox(planeBox) && !this.isInPlane) {
                this.isInPlane = true;
                this.playerCube.visible = false;
                // You might also want to set the playerCube's position to the plane's position
                // here so that when you exit, you are exactly where the plane is.
                this.playerCube.position.copy(this.plane.position);
                console.log("Entered plane mode.");
                // Signal to blockGame.js to disable OrbitControls (if applicable)
                if (typeof window.dispatchEvent === 'function') {
                    window.dispatchEvent(new CustomEvent('enterPlaneMode'));
                }
            } else if (this.isInPlane) {
                this.isInPlane = false;
                this.playerCube.visible = true;
                this.playerCube.position.copy(this.plane.position); // Player lands where plane is
                this.move = { x: 0, z: 0 }; // Reset plane movement when exiting
                console.log("Exited plane mode.");
                // Signal to blockGame.js to enable OrbitControls and reset its target
                if (typeof window.dispatchEvent === 'function') {
                    window.dispatchEvent(new CustomEvent('exitPlaneMode', { detail: { position: this.plane.position.clone() } }));
                }
            }
        }

        // Plane movement controls (only when in plane)
        if (this.isInPlane) {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    this.move.z = -this.planeSpeed; // Move forward (into negative Z from camera's perspective)
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    this.move.z = this.planeSpeed; // Move backward
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.move.x = -this.planeSpeed; // Move left
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.move.x = this.planeSpeed; // Move right
                    break;
            }
        }
    }

    handleKeyup(e) {
        if (this.isInPlane) {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (this.move.z === -this.planeSpeed) this.move.z = 0;
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (this.move.z === this.planeSpeed) this.move.z = 0;
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (this.move.x === -this.planeSpeed) this.move.x = 0;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (this.move.x === this.planeSpeed) this.move.x = 0;
                    break;
            }
        }
    }

    update() {
        if (this.isInPlane) {
            // Calculate camera-relative direction for plane movement
            const forwardVector = new THREE.Vector3();
            this.camera.getWorldDirection(forwardVector); // Get camera's forward direction
            forwardVector.y = 0; // Project to XZ plane
            forwardVector.normalize();

            const rightVector = new THREE.Vector3();
            rightVector.crossVectors(this.camera.up, forwardVector).normalize(); // Get right vector relative to camera

            // Apply movement based on key presses
            const movement = new THREE.Vector3();
            movement.addScaledVector(forwardVector, this.move.z); // 'w' moves forward along camera's view
            movement.addScaledVector(rightVector, this.move.x);   // 'a' moves left relative to camera's view

            this.plane.position.add(movement);

            // Update spotlight and camera to follow the plane
            this.spotLight.position.set(this.plane.position.x, this.plane.position.y + 2, this.plane.position.z);
            this.spotLight.target.position.set(this.plane.position.x, this.plane.position.y, this.plane.position.z);

            // Camera follows the plane with a fixed offset and looks at it
            this.camera.position.set(
                this.plane.position.x + 5,
                this.plane.position.y + 5,
                this.plane.position.z + 10
            );
            this.camera.lookAt(this.plane.position);

            // Keep player cube in sync with plane for goal detection (if it's tied to the player)
            this.playerCube.position.copy(this.plane.position);
        }
    }

    getPlane() {
        return this.plane;
    }

    inPlane() {
        return this.isInPlane;
    }

    // Add this method to the PlaneController class
forceExit() {
    if (this.isInPlane) {
        this.isInPlane = false;
        this.playerCube.visible = true;
        this.playerCube.position.copy(this.plane.position);
        this.move = { x: 0, z: 0 };
        // Dispatch the exit event to re-enable OrbitControls
        window.dispatchEvent(new CustomEvent('exitPlaneMode', { detail: { position: this.plane.position.clone() } }));
    }
}


    /**
     * Disposes of Three.js resources and removes event listeners.
     * Call this when the game using this controller is unloaded.
     */
    dispose() {
        window.removeEventListener('keydown', this.boundKeydownHandler);
        window.removeEventListener('keyup', this.boundKeyupHandler);

        // Remove the plane mesh from the scene and dispose its geometry and material
        if (this.scene && this.plane) {
            this.scene.remove(this.plane);
            if (this.plane.geometry) this.plane.geometry.dispose();
            if (this.plane.material) {
                if (Array.isArray(this.plane.material)) {
                    this.plane.material.forEach(material => material.dispose());
                } else {
                    this.plane.material.dispose();
                }
            }
        }
        console.log("PlaneController disposed successfully.");
    }
}