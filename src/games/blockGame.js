import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Audio, AudioListener, AudioLoader } from 'three';
import { PlaneController } from './PlaneController.js';

export function createExistingGame(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container for existing game not found:', containerId);
        return { cleanup: () => {}, loadMap: () => {} };
    }

    // Create a dedicated canvas for the Three.js scene
    const canvas = document.createElement('canvas');
    canvas.id = 'three-canvas';
    container.appendChild(canvas);

    // Get references to your UI elements
    const audioControls = document.getElementById('audioControls');
    const timerDisplay = document.getElementById('timer');
    const mapSelection = document.getElementById('mapSelection');
    const winModal = document.getElementById('winModal');
    const restartButton = document.getElementById('restartButton');
    const currentMuteButton = document.getElementById('muteButton');
    const currentVolumeSlider = document.getElementById('volumeSlider');
    const backToMenuButton = document.getElementById('backToMenuButton');

    // --- State variables must be declared here to be accessible to all inner functions ---
    let startTime = null;
    let elapsedTime = 0;
    let timerRunning = false;


    // --- Start of Three.js setup ---
    const moveDirection = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    const listener = new AudioListener();
    camera.add(listener);

    const jumpSound = new Audio(listener);
    const audioLoader = new AudioLoader();

    audioLoader.load('/sounds/jump.mp3', function (buffer) {
        jumpSound.setBuffer(buffer);
        jumpSound.setVolume(0.5);
    });

    const bgMusic = new Audio(listener);
    audioLoader.load('/sounds/background.mp3', function (buffer) {
        bgMusic.setBuffer(buffer);
        bgMusic.setLoop(true);
        bgMusic.setVolume(0.3);
        bgMusic.play();
    });

    const victorySound = new THREE.Audio(listener);
    audioLoader.load('/sounds/victory.mp3', (buffer) => {
        victorySound.setBuffer(buffer);
        victorySound.setVolume(0.5);
    });

    let isMuted = false;
    const handleMuteClick = () => {
        isMuted = !isMuted;
        if (bgMusic) bgMusic.setVolume(isMuted ? 0 : parseFloat(currentVolumeSlider.value));
        if (jumpSound) jumpSound.setVolume(isMuted ? 0 : 0.5);
        if (currentMuteButton) currentMuteButton.textContent = isMuted ? 'Unmute' : 'Mute';
    };

    const handleVolumeInput = () => {
        const volume = parseFloat(currentVolumeSlider.value);
        if (!isMuted) {
            if (bgMusic) bgMusic.setVolume(volume);
            if (jumpSound) jumpSound.setVolume(volume);
        }
    };
    
    // Attach listeners. These elements are guaranteed to exist now.
    if (currentMuteButton) currentMuteButton.addEventListener('click', handleMuteClick);
    if (currentVolumeSlider) currentVolumeSlider.addEventListener('input', handleVolumeInput);

    // Create the renderer and pass the canvas to it
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);

    // Shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Create orbit controls for the canvas
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // ... (The rest of your game logic and object creation is fine) ...
    // ... (e.g., cube, lights, floor, obstacles, map generation, etc.) ...

    // Add a cube (player)
    const geometry = new THREE.BoxGeometry();
    const textureLoader = new THREE.TextureLoader();
    const playerTexture = textureLoader.load('/textures/player.jpg');
    const material = new THREE.MeshStandardMaterial({ map: playerTexture });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 0.5, 0); 
    cube.castShadow = true;
    scene.add(cube);

    const spotLight = new THREE.SpotLight(0xffffff, 4, 50, Math.PI / 8, 0.5, 2);
    spotLight.position.set(cube.position.x, cube.position.y + 2, cube.position.z);
    spotLight.target.position.set(cube.position.x, cube.position.y, cube.position.z);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.camera.near = 0.1;
    spotLight.shadow.camera.far = 25;
    scene.add(spotLight);
    scene.add(spotLight.target);

    const planeController = new PlaneController(scene, camera, spotLight, cube);
    const plane = planeController.getPlane();

    let isInPlane = false;
    let planeSpeed = 0.2;
    const obstacles = [];

    function generateDefaultMapObstacles() {
        const generated = [];
        const rows = 2;
        const cols = 7;
        const xSpacing = 2;
        const zSpacing = 5;
        const startz = 1;
        const centerX = 0;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (i === 2 && j === 3) continue;
                const x = j * xSpacing - ((cols - 1) * xSpacing) / 2 + centerX;
                const z = startz + i * zSpacing;
                const y = 0.5;
                generated.push({ x, y, z });
            }
        }
        return generated;
    }
    
    function generateObstacleGrid(rows, cols, xSpacing = 2, zSpacing = 3, centerX = 0, startZ = 1) {
        const obstacles = [];
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                obstacles.push({
                    x: j * xSpacing - ((cols - 1) * xSpacing) / 2 + centerX,
                    y: 0.5,
                    z: startZ + i * zSpacing
                });
            }
        }
        return obstacles;
    }
    
    function generateZigZagMap(rows, cols, xSpacing = 2, zSpacing = 3, centerX = 0, startZ = 1) {
        const obstacles = [];
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < cols; j++) {
                const x = j * xSpacing - ((cols - 1) * xSpacing) / 2 + centerX;
                const z = startZ + i * zSpacing;
                const y = 0.5;
                row.push({ x, y, z });
            }
            if (i >= 2 && i % 2 !== 0) {
                row.reverse();
            }
            obstacles.push(...row);
        }
        return obstacles;
    }

    const goalGeometry = new THREE.BoxGeometry(1, 1, 1);
    const goalMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff });
    const goal = new THREE.Mesh(goalGeometry, goalMaterial);
    goal.position.set(6, 0.5, 8);
    scene.add(goal);

    const light = new THREE.DirectionalLight(0xffffff, 0.3);
    light.position.set(3, 3, 5).normalize();
    light.castShadow = true;
    scene.add(light);

    const floorTexture = textureLoader.load('/textures/floor.jpg');
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(20, 20);
    scene.add(grid);

    let speed = 0.2;
    let move = { x: 0, z: 0 };
    let velocityY = 0;
    let gravity = -0.01;
    let isOnGround = true;
    let isJumping = false;
    let jumpAnimationProgress = 0;
    
    const keydownHandler = (e) => {
        //Only handle movement keys if not in plane mode
        if (!planeController.inPlane()) {
        switch (e.key) {
            case 'ArrowUp': case 'w': case 'W': move.z = 1; break;// set a flag for forward movement
            case 'ArrowDown': case 's': case 'S': move.z = -1; break;// Set a flag for backward movement
            case 'ArrowLeft': case 'a': case 'A': move.x = -1; break;// Set a flag for left movement
            case 'ArrowRight': case 'd': case 'D': move.x = 1; break;// Set a flag for right movement
            case ' ':
                if (isOnGround) {
                    velocityY = 0.2;
                    isOnGround = false;
                    isJumping = true;
                    jumpAnimationProgress = 0;
                    if (jumpSound.isPlaying) jumpSound.stop();
                    jumpSound.play();
                }
                break;
            }    
        }
    };
    
    const keyupHandler = (e) => {
        //Only handle movement keys if not in plane mode
        if (!planeController.inPlane()) {
            switch (e.key) {
                case 'ArrowUp': case 'w': case 'W': if (move.z === 1) move.z = 0; break;
                case 'ArrowDown': case 's': case 'S': if (move.z === -1) move.z = 0; break;
                case 'ArrowLeft': case 'a': case 'A': if (move.x === -1) move.x = 0; break;
                case 'ArrowRight': case 'd': case 'D': if (move.x === 1) move.x = 0; break;
            }    
        }
    };
    window.addEventListener('keydown', keydownHandler);
    window.addEventListener('keyup', keyupHandler);

    //Add event listners to enterplane and exit plane
    window.addEventListener('enterPlaneMode', () => {
    controls.enabled = false;
    // Hide the player cube when they enter the plane
    cube.visible = false; 
});

window.addEventListener('exitPlaneMode', (event) => {
    controls.enabled = true;
    // Set the camera's target to the player's new position
    controls.target.copy(event.detail.position);
    // You can also adjust the camera position here for a smooth transition back
    camera.position.set(event.detail.position.x + 5, event.detail.position.y + 5, event.detail.position.z + 10);
    // Show the player cube again
    cube.visible = true;
});

    const maps = [
        { name: 'Default Grid', goalPosition: new THREE.Vector3(6, 0.5, 8), obstacles: generateDefaultMapObstacles() },
        { name: 'Map 1 (Zig-Zag)', goalPosition: new THREE.Vector3(6, 0.5, 10), obstacles: generateZigZagMap(4, 5) },
        { name: 'Map 2 (Grid)', goalPosition: new THREE.Vector3(0, 0.5, 10), obstacles: generateObstacleGrid(3, 8) }
    ];
    
    const obstacleTexture = textureLoader.load('textures/obstacle.jpg');
    const loadMap = (index) => {
        const selectedMap = maps[index];
        for (const obs of obstacles) {
            scene.remove(obs);
        }
        obstacles.length = 0;
        for (const pos of selectedMap.obstacles) {
            const obsGeometry = new THREE.BoxGeometry(1, 5, 1);
            const obsMaterial = new THREE.MeshStandardMaterial({ map: obstacleTexture });
            const obstacle = new THREE.Mesh(obsGeometry, obsMaterial);
            obstacle.position.set(pos.x, 2.5, pos.z);
            obstacle.castShadow = true;
            scene.add(obstacle);
            obstacles.push(obstacle);
        }
        goal.position.copy(selectedMap.goalPosition);
        cube.position.set(0, 0.5, 0);
        velocityY = 0;
        isOnGround = true;
        isJumping = false;
        cube.scale.y = 1;
        startTime = performance.now();
        timerRunning = true;
        updateTimer();
    };
    window.loadMap = loadMap;
    loadMap(0);

    function createMapPreview(index) {
        const map = maps[index];
        const previewCanvas = document.getElementById(`preview${index}`);
        if (!previewCanvas) return;
        const previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: true });
        previewRenderer.setSize(previewCanvas.width, previewCanvas.height);
        const previewScene = new THREE.Scene();
        const previewCamera = new THREE.PerspectiveCamera(50, previewCanvas.width / previewCanvas.height, 0.1, 100);
        previewCamera.position.set(5, 7, 10);
        previewCamera.lookAt(0, 0, 0);
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(5, 7, 10).normalize();
        previewScene.add(light);
        const ambient = new THREE.AmbientLight(0xffffff, 0.3);
        previewScene.add(ambient);
        const floorGeo = new THREE.PlaneGeometry(20, 20);
        const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture, side: THREE.DoubleSide });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        previewScene.add(floor);
        const goalGeo = new THREE.BoxGeometry(1, 1, 1);
        const goalMat = new THREE.MeshStandardMaterial({ color: 0x00ffff });
        const goalPreview = new THREE.Mesh(goalGeo, goalMat);
        goalPreview.position.copy(map.goalPosition);
        previewScene.add(goalPreview);
        for (const pos of map.obstacles) {
            const geo = new THREE.BoxGeometry(1, 1, 1);
            const mat = new THREE.MeshStandardMaterial({ map: obstacleTexture });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(pos.x, pos.y, pos.z);
            previewScene.add(mesh);
        }
        previewRenderer.render(previewScene, previewCamera);
        previewRenderer.setClearColor(0x000000, 0);
    }
    for (let i = 0; i < maps.length; i++) {
        createMapPreview(i);
    }

    const handleRestartClick = () => {
        cube.position.set(0, 0.5, 0);
        move = { x: 0, z: 0 };
        velocityY = 0;
        isOnGround = true;
        isJumping = false;
        cube.scale.y = 1;
        if (winModal) winModal.style.display = 'none';
        if (bgMusic && !bgMusic.isPlaying && !isMuted) {
            bgMusic.play();
        }
        startTime = performance.now();
        timerRunning = true;
        updateTimer();
        console.log("Game Restarted!");
    };
    if (restartButton) restartButton.addEventListener('click', handleRestartClick);
    let animationFrameId;

    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        updateTimer();
        spotLight.position.set(cube.position.x, cube.position.y + 2, cube.position.z);
        spotLight.target.position.set(cube.position.x, cube.position.y, cube.position.z);
        velocityY += gravity;
        cube.position.y += velocityY;
        if (!isOnGround) {
            jumpAnimationProgress += 0.05;
            const scaleY = 1 + Math.sin(jumpAnimationProgress * Math.PI) * 0.3;
            cube.scale.y = scaleY;
        } else {
            cube.scale.y = 1;
        }
        if (cube.position.y <= 0.5) {
            cube.position.y = 0.5;
            velocityY = 0;
            if (!isOnGround) {
                cube.scale.y = 0.7;
                setTimeout(() => {
                    cube.scale.y = 1;
                }, 100);
            }
            isOnGround = true;
            isJumping = false;
        }
        planeController.update();
        isInPlane = planeController.inPlane();

        if (!isInPlane) {
            controls.update();

        const forwardVector = new THREE.Vector3();
        camera.getWorldDirection(forwardVector);
        forwardVector.y = 0;
        forwardVector.normalize();

        const rightVector = new THREE.Vector3();
        rightVector.crossVectors(forwardVector, camera.up).normalize();

        const movement = new THREE.Vector3();
        movement.addScaledVector(forwardVector, move.z * speed);
        movement.addScaledVector(rightVector, move.x * speed);

        const nextPosition = cube.position.clone().add(movement);
        const predictedBox = new THREE.Box3().setFromObject(cube);
        predictedBox.translate(movement);

        let willCollide = false;
        // Collision detection for obstacles
            for (const obstacle of obstacles) {
                const obstacleBox = new THREE.Box3().setFromObject(obstacle);
                if (predictedBox.intersectsBox(obstacleBox)) {
                    willCollide = true;
                    break;
                }
            }
        
        if (!willCollide) {
            cube.position.copy(nextPosition);
        }
    }    
        const cubeBox = new THREE.Box3().setFromObject(cube);
        const goalBox = new THREE.Box3().setFromObject(goal);
        if (cubeBox.intersectsBox(goalBox)) {
            console.log('🎉 You reached the goal!');
            if (bgMusic) bgMusic.stop();
            if (victorySound) victorySound.play();
            timerRunning = false;
            if (winModal) winModal.style.display = 'block';
        }
        renderer.render(scene, camera);
        //controls.update();
    }
    function updateTimer() {
        if (timerRunning && startTime !== null) {
            const now = performance.now();
            elapsedTime = (now - startTime) / 1000;
            if (timerDisplay) timerDisplay.textContent = `Time: ${elapsedTime.toFixed(2)}s`;
        }
    }
    animate();

    const cleanup = () => {
        cancelAnimationFrame(animationFrameId);
        renderer.dispose();
        controls.dispose();
        if (bgMusic) bgMusic.stop();
        if (jumpSound) jumpSound.stop();
        if (victorySound) victorySound.stop();
        window.removeEventListener('keydown', keydownHandler);
        window.removeEventListener('keyup', keyupHandler);
        if (currentMuteButton) currentMuteButton.removeEventListener('click', handleMuteClick);
        if (currentVolumeSlider) currentVolumeSlider.removeEventListener('input', handleVolumeInput);
        if (restartButton) restartButton.removeEventListener('click', handleRestartClick);
        if (planeController && typeof planeController.dispose === 'function') {
            planeController.dispose();
        }
        if (window.loadMap === loadMap) {
            window.loadMap = undefined;
        }
        // This is a cleaner way to hide the UI elements, the main.js cleanup function should handle this as well
        // You should move the hiding logic into main.js, but keeping it here for robustness
        // if (audioControls) audioControls.style.display = 'none';
        // if (timerDisplay) timerDisplay.style.display = 'none';
        // if (mapSelection) mapSelection.style.display = 'none';
        // if (winModal) winModal.style.display = 'none';
        container.removeChild(canvas);
        console.log('Existing game cleaned up.');
    };

    return {
    cleanup: cleanup,
    loadMap: loadMap // Return the function so it can be called from main.js
};

    
}