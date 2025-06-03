import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Audio, AudioListener, AudioLoader } from 'three';
import './style.css';

//Add timer variables
let startTime = null;
let elapsedTime = 0;
let timerRunning = false;

//Texture loader
const textureLoader = new THREE.TextureLoader();
const playerTexture = textureLoader.load('/textures/player.jpg');
const obstacleTexture = textureLoader.load('textures/obstacle.jpg');
const floorTexture = textureLoader.load('/textures/floor.jpg');


const moveDirection = new THREE.Vector3();
const cameraDirection = new THREE.Vector3();

//Set up scene, camera, renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);

camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const listener = new AudioListener();
camera.add(listener);

const jumpSound = new Audio(listener);
const audioLoader = new AudioLoader();

audioLoader.load('/sounds/jump.mp3', function(buffer) {
  jumpSound.setBuffer(buffer);
  jumpSound.setVolume(0.5);
});

const bgMusic = new Audio(listener);

audioLoader.load('/sounds/background.mp3', function(buffer) {
  bgMusic.setBuffer(buffer);
  bgMusic.setLoop(true);
  bgMusic.setVolume(0.3); //Adjust volume
  bgMusic.play(); //Start playing
});

const victorySound = new THREE.Audio(listener);
audioLoader.load('/sounds/victory.mp3', (buffer) => {
  victorySound.setBuffer(buffer);
  victorySound.setVolume(0.5);
});

const muteButton = document.getElementById('muteButton');

let isMuted = false;

muteButton.addEventListener('click', () => {
  isMuted = !isMuted;
  bgMusic.setVolume(isMuted ? 0 : 0.3);
  jumpSound.setVolume(isMuted ? 0 : 0.5);
  muteButton.textContent = isMuted ? ' Unmute' : ' Mute';
});

const volumeSlider = document.getElementById('volumeSlider');

volumeSlider.addEventListener('input', () => {
  const volume = parseFloat(volumeSlider.value);
  bgMusic.setVolume(volume);
  jumpSound.setVolume(volume);
});

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0'; //Ensure no Scroll
document.body.appendChild(renderer.domElement);

//create orbitcontrols
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;


//add a cube
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshStandardMaterial({ map: playerTexture });
const cube = new THREE.Mesh(geometry, material);
cube.position.set(6, 0.5, 1);
scene.add(cube);



const obstacles = [];

function generateDefaultMapObstacles() {
  const rows = 2;
  const cols = 7;
  const xSpacing = 2;
  const zSpacing =  5;
  const startz = 1;
  const centerX = 0;

  const generated = [];

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

    //Zig-Zag starting from row index 2
    if (i >= 2 && i % 2 !== 0) {
      row.reverse();
    }

    obstacles.push(...row);

  }

  return obstacles;
}


//Add a gOal Cube
const goalGeometry = new THREE.BoxGeometry(1, 1, 1);
const goalMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff });
const goal = new THREE.Mesh(goalGeometry, goalMaterial);
goal.position.set(6, 0.5, 8);
scene.add(goal);

//Light
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(3, 3, 5).normalize();
scene.add(light);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

//Floor
const floorGeometry = new THREE.PlaneGeometry(20, 20);
const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture, side: THREE.DoubleSide });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

//Optional grid helper
const grid = new THREE.GridHelper(20, 20);
scene.add(grid);




//Movement Controls
let speed = 0.2;
let move = { x: 0, z: 0 };

let velocityY = 0;//Vertical speed
let gravity = -0.01; // Gravity Strength
let isOnGround = true; //Weather the cube is on the floor

window.addEventListener('keydown', (e) => {
 
  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      move.z = - speed;
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      move.z = speed;
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      move.x = -speed;
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      move.x = speed;
      break;
    case ' ':
      if (isOnGround) {
        velocityY = 0.2;
        isOnGround = false;

        if (jumpSound.isPlaying) jumpSound.stop();
        jumpSound.play();
      }
      break;
      
  }    
  });
  
  window.addEventListener('keyup', (e) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        if (move.z === -speed) move.z = 0;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        if (move.z === speed) move.z = 0;
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (move.x === -speed) move.x = 0;
        break;
      case 'ArrowRight':  
      case 'd':
      case 'D':
        if (move.x === speed) move.x = 0;
        break;                    
    }
  });
                                 

 

//Mouse interaction (move cube to clicked position)
window.addEventListener('click', (event) => {
  const x = (event.clientX / window.innerWidth) * 2 - 1;
  const y = -(event.clientY / window.innerHeight) * 2 + 1;
  cube.position.x = x * 5;
  cube.position.z = y * 5;
});

const maps = [
  {

    name: 'Default Grid',
    goalPosition: new THREE.Vector3(6, 0.5, 8),
    obstacles: generateDefaultMapObstacles()
  },
  {
    name: 'Map 1',
    goalPosition: new THREE.Vector3(6, 0.5, 10),
    obstacles: generateZigZagMap(4,5)
  },
  
  
 {
  name: 'Map 2',
  goalPosition: new THREE.Vector3(0, 0.5, 10),
  obstacles: generateObstacleGrid(3, 8)
 }
];

function loadMap(index) {
  const selectedMap = maps[index];
  //clear existing obstacles from scene
  for (const obs of obstacles) {
    scene.remove(obs);
  }
  
  obstacles.length = 0;

  for (const pos of selectedMap.obstacles) {
    const obsGeometry = new THREE.BoxGeometry(1, 1, 1);
    const obsMaterial = new THREE.MeshStandardMaterial({ map: obstacleTexture });
    const obstacle = new THREE.Mesh(obsGeometry, obsMaterial);
    obstacle.position.set(pos.x, pos.y, pos.z);
    scene.add(obstacle);
    obstacles.push(obstacle);


  }

  goal.position.copy(selectedMap.goalPosition);
  cube.position.set(0, 0.5, 0);
  velocityY = 0;
  isOnGround = true;

  //Start the timer
  startTime = performance.now();
  timerRunning = true;
  updateTimer();
}

loadMap(0);

function createMapPreview(index) {
  const map = maps[index];
  const canvas = document.getElementById(`preview${index}`);
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(canvas.width, canvas.height);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.1, 100);
  camera.position.set(5, 7, 10);
  camera.lookAt(0, 0, 0);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 7, 10).normalize();
  scene.add(light);

  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);


  //Floor
  const floorGeo = new THREE.PlaneGeometry(20, 20);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  //Goal

  const goalGeo = new THREE.BoxGeometry(1, 1, 1);
  const goalMat = new THREE.MeshStandardMaterial({ color: 0x00ffff });
  const goal = new THREE.Mesh(goalGeo, goalMat);
  scene.add(goal);

  //obstacles
  for (const pos of map.obstacles) {
    const geo = new THREE.BoxGeometry(1, 1, 1 );
    const mat = new THREE.MeshStandardMaterial({ map: obstacleTexture });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, pos.y, pos.z);
    scene.add(mesh);
  }

  renderer.render(scene, camera);
  renderer.setClearColor(0x000000, 0);


}

for (let i = 0; i < maps.length; i++) {
  createMapPreview(i);
}

const restartButton = document.getElementById('restartButton');

restartButton.addEventListener('click', () => {
  cube.position.set(0, 0.5, 0);
  move = { x: 0, z: 0 };
  velocityY = 0;
  isOnGround = true;

  document.getElementById('winModal').style.display = 'none';

  if (!bgMusic.isPlaying && !isMuted) {
    bgMusic.play();
  }

  //Restart the timer
  startTime = performance.now();
  timerRunning = true;

  console.log("Game Restarted!");
});

//Animation loop
function animate() {
  requestAnimationFrame(animate);
  updateTimer();
  
  //Apply Gravity
  velocityY += gravity;
  cube.position.y += velocityY

  //Collision with the floor (y=0.5 is floor)
  if (cube.position.y <= 0.5) {
    cube.position.y = 0.5;
    velocityY = 0;
    isOnGround = true;
  }


  //Predict Next Position
  const nextPosition = cube.position.clone();
  nextPosition.x += move.x;
  nextPosition.z += move.z;


  //Add Collision Detection(with bounding boxes)
const predictedBox = new THREE.Box3().setFromObject(cube);
predictedBox.translate(new THREE.Vector3(move.x, 0, move.z));

//Check Collision with each obstacle
let willCollide = false;

for (const obstacle of obstacles) {
  const obstacleBox = new THREE.Box3().setFromObject(obstacle);
  if (predictedBox.intersectsBox(obstacleBox)) {
  //console.log('Collision!');
  willCollide = true;
  break;

  
  }

}
//apply movement if no collision
  if (!willCollide) {
    cube.position.x = nextPosition.x;
    cube.position.z = nextPosition.z;
  
}

//Check if cube raech the goal
const cubeBox = new THREE.Box3().setFromObject(cube);
const goalBox = new THREE.Box3().setFromObject(goal);
if (cubeBox.intersectsBox(goalBox)) {
  console.log('🎉 You reached the goal!');

  bgMusic.stop();
  victorySound.play();

  timerRunning = false;

  //show pop up 
  document.getElementById('winModal').style.display = 'block';
  return;

  
}



  renderer.render(scene, camera);
  controls.update();
}

function updateTimer() {
  if (timerRunning && startTime !== null) {
    const now = performance.now();
    elapsedTime = (now - startTime) / 1000;
    document.getElementById('timer').textContent = `Time: ${elapsedTime.toFixed(2)}s`;
  }
}


animate();
window.loadMap = loadMap;