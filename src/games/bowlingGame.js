import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';

export function createBowlingGame(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container for bowling game not found:', containerId);
        return;
    }

    container.innerHTML = '';

    //container.focus();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87CEEB);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 15, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);

    // --- PHYSICS MATERIALS ---
    const groundMaterial = new CANNON.Material('ground');
    const ballMaterial = new CANNON.Material('ball');
    const pinMaterial = new CANNON.Material('pin');

    const groundBallCm = new CANNON.ContactMaterial(groundMaterial, ballMaterial, {
        friction: 0.05,
        restitution: 0.1
    });
    const ballPinCm = new CANNON.ContactMaterial(ballMaterial, pinMaterial, {
        friction: 0.5,
        restitution: 0.2
    });
    const pinPinCm = new CANNON.ContactMaterial(pinMaterial, pinMaterial, {
        friction: 0.7,
        restitution: 0.05
    });

    world.addContactMaterial(groundBallCm);
    world.addContactMaterial(ballPinCm);
    world.addContactMaterial(pinPinCm);
    // -----------------------

    const laneWidth = 3;
    const laneLength = 20;
    const laneGeometry = new THREE.BoxGeometry(laneWidth, 0.1, laneLength);
    const laneMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const laneMesh = new THREE.Mesh(laneGeometry, laneMaterial);
    laneMesh.position.set(0, -0.05, 0);
    laneMesh.receiveShadow = true;
    scene.add(laneMesh);

    const laneBody = new CANNON.Body({ mass: 0, material: groundMaterial }); // Assign material
    laneBody.addShape(new CANNON.Box(new CANNON.Vec3(laneWidth / 2, 0.05, laneLength / 2)));
    laneBody.position.set(0, -0.05, 0);
    world.addBody(laneBody);

    const ballRadius = 0.2;
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMaterialThree = new THREE.MeshPhongMaterial({ color: 0x0000FF });
    const ballMesh = new THREE.Mesh(ballGeometry, ballMaterialThree);
    ballMesh.castShadow = true;
    ballMesh.receiveShadow = true;
    scene.add(ballMesh);

    const ballBody = new CANNON.Body({
        mass: 5,
        shape: new CANNON.Sphere(ballRadius),
        position: new CANNON.Vec3(0, ballRadius + 0.01, laneLength / 2 - 2),
        material: ballMaterial // Assign material
    });
    world.addBody(ballBody);

    console.log('Ball mass:', ballBody.mass);

    const pinGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.38, 16);
    const pinMaterialThree = new THREE.MeshPhongMaterial({ color: 0xFFFFFF, shininess: 100 });
    const pins = [];
    const pinBodies = [];

    const pinPositions = [
        { x: 0, z: -laneLength / 2 + 2 },
        { x: -0.2, z: -laneLength / 2 + 2.5 }, { x: 0.2, z: -laneLength / 2 + 2.5 },
        { x: -0.4, z: -laneLength / 2 + 3 }, { x: 0, z: -laneLength / 2 + 3 }, { x: 0.4, z: -laneLength / 2 + 3 },
        { x: -0.6, z: -laneLength / 2 + 3.5 }, { x: -0.2, z: -laneLength / 2 + 3.5 }, { x: 0.2, z: -laneLength / 2 + 3.5 }, { x: 0.6, z: -laneLength / 2 + 3.5 }
    ];
    
    // Y-offset to prevent initial intersection
    const pinInitialY = 0.38 / 2 + 0.01;

    const pinShape = new CANNON.Cylinder(0.08, 0.1, 0.38, 16);
    for (const pos of pinPositions) {
        const pinMesh = new THREE.Mesh(pinGeometry, pinMaterialThree);
        pinMesh.position.set(pos.x, pinInitialY, pos.z); // Use adjusted Y
        pinMesh.castShadow = true;
        pinMesh.receiveShadow = true;
        scene.add(pinMesh);
        pins.push(pinMesh);

        const pinBody = new CANNON.Body({
            mass: 1.5,
            shape: pinShape,
            position: new CANNON.Vec3(pos.x, pinInitialY, pos.z), // Use adjusted Y
            material: pinMaterial // Assign material
        });
        world.addBody(pinBody);
        pinBodies.push(pinBody);
    }

    camera.position.set(0, 2, laneLength / 2 - 5);
    camera.lookAt(0, 0, -laneLength / 2 + 2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    let isBallLaunched = false;
    let launchForce = 150;
    const initialBallPosition = new CANNON.Vec3(0, ballRadius + 0.01, laneLength / 2 - 2);

    // Get UI elements for interactive controls and data display
    const forceSlider = document.getElementById('forceSlider');
    const forceValueSpan = document.getElementById('forceValue');
    const massInput = document.getElementById('massInput');
    const frictionSlider = document.getElementById('frictionSlider');
    const frictionValueSpan = document.getElementById('frictionValue');
    const velocityDisplay = document.getElementById('velocity');
    const pinsStandingDisplay = document.getElementById('pinsStanding');

    // Initialize UI values
    if (forceSlider) forceSlider.value = launchForce;
    if (forceValueSpan) forceValueSpan.textContent = launchForce;
    if (massInput) massInput.value = ballBody.mass;
    if (frictionSlider) frictionSlider.value = groundBallCm.friction;
    if (frictionValueSpan) frictionValueSpan.textContent = groundBallCm.friction;
    if (pinsStandingDisplay) pinsStandingDisplay.textContent = pinBodies.length;

    // Add event listeners to the controls
    if (forceSlider) {
        forceSlider.addEventListener('input', (event) => {
            launchForce = parseFloat(event.target.value);
            forceValueSpan.textContent = launchForce;
        });
    }

    if (massInput) {
        massInput.addEventListener('change', (event) => {
            ballBody.mass = parseFloat(event.target.value);
            ballBody.updateMassProperties();
        });
    }

    if (frictionSlider) {
        frictionSlider.addEventListener('input', (event) => {
            const newFriction = parseFloat(event.target.value);
            groundBallCm.friction = newFriction;
            frictionValueSpan.textContent = newFriction;
        });
    }

    function countFallenPins() {
        let fallenPins = 0;
        const standingThreshold = 0.1; // Pins are considered fallen if their y-position is below this value
        pinBodies.forEach(body => {
            if (body.position.y < standingThreshold) {
                fallenPins++;
            }
        });
        return pinBodies.length - fallenPins;
    }


    function resetGame() {
        ballBody.position.copy(initialBallPosition);
        ballBody.quaternion.set(0, 0, 0, 1);
        ballBody.velocity.set(0, 0, 0);
        ballBody.angularVelocity.set(0, 0, 0);

        pinBodies.forEach((body, index) => {
            const pos = pinPositions[index];
            // Correct the reset position for pins
            body.position.set(pos.x, 0.38 / 2 + 0.01, pos.z); 
            body.quaternion.set(0, 0, 0, 1);
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
        });

        isBallLaunched = false;
        console.log('Game reset, ready to launch!');
    }

    const launchHandler = (event) => {
        if ((event.code === 'Space' || event.key === ' ') && !isBallLaunched) {
            const launchVector = new CANNON.Vec3(0, 0, -launchForce);
            const worldPoint = new CANNON.Vec3(0, -ballRadius, 0);
            ballBody.applyImpulse(launchVector, worldPoint);
            //console.log('Spacebar pressed!');
            isBallLaunched = true;
            console.log('Ball launched!');

            //Add a single timer to reset the game
            setTimeout(() => {
                resetGame();
            }, 5000);
        }
    };
    window.addEventListener('keydown', launchHandler);

    let lastTime;
    let animationFrameId;

    function animate(currentTime) {
        animationFrameId = requestAnimationFrame(animate);

        if (lastTime === undefined) {
            lastTime = currentTime;
        }
        const dt = (currentTime - lastTime) / 1000;

        world.step(1 / 60);

        ballMesh.position.copy(ballBody.position);
        ballMesh.quaternion.copy(ballBody.quaternion);

        pins.forEach((mesh, index) => {
            mesh.position.copy(pinBodies[index].position);
            mesh.quaternion.copy(pinBodies[index].quaternion);
        });

        //checking the ball has gone past the pins
        /*if (isBallLaunched && ballBody.position.z < -laneLength / 2 - 2) {
            setTimeout(() => {
                resetGame();
            }, 3000); 
        }*/

        // Update real-time velocity display
        if (velocityDisplay) {
            const velocity = ballBody.velocity.length();
            velocityDisplay.textContent = velocity.toFixed(2);
        }
        
        // Update pins standing count after the ball has been launched and the reset timer has started
        if(isBallLaunched && pinsStandingDisplay){
            pinsStandingDisplay.textContent = countFallenPins();
        }

        renderer.render(scene, camera);
        controls.update();
        lastTime = currentTime;
    }
    animate();

    return () => {
        cancelAnimationFrame(animationFrameId);
        renderer.dispose();
        controls.dispose();
        world.bodies.forEach(body => world.removeBody(body));
        scene.children.forEach(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        window.removeEventListener('keydown', launchHandler);
        container.innerHTML = '';
        console.log('Bowling game cleaned up.');
    };
}