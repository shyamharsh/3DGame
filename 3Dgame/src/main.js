import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Audio, AudioListener, AudioLoader } from 'three';
import './style.css';



//Set up scene, camera, renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 5;

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
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

//Add a another cube as obstacle
//const obstacleGeometry = new THREE.BoxGeometry(1, 1, 1);
//const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000});
//const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
//obstacle.position.set(2, 0, 0);
//scene.add(obstacle);

//Create multiple obstacles
const obstacles = [];
const obstacleCount = 5;

for (let i = 0; i < obstacleCount; i++) {
  const obsGeometry = new THREE.BoxGeometry(1, 1, 1);
  const obsMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000});
  const obstacle = new THREE.Mesh(obsGeometry, obsMaterial);

  //Random position on the floor
  obstacle.position.x = Math.random() * 10 - 5;
  obstacle.position.z = Math.random() * 10 - 5;
  obstacle.position.y = 0.5;// to lift it slightly above the floor

  scene.add(obstacle);
  obstacles.push(obstacle);


}

//Add a gOal Cube
const goalGeometry = new THREE.BoxGeometry(1, 1, 1);
const goalMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff });
const goal = new THREE.Mesh(goalGeometry, goalMaterial);
goal.position.set(4, 0.5, 4);
scene.add(goal);

//Light
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(3, 3, 5).normalize();
scene.add(light);

//Floor
const floorGeometry = new THREE.PlaneGeometry(20, 20);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, side: THREE.DoubleSide });
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
 // if (e.key === 'ArrowUp') move.z = -speed;
  //if (e.key === 'ArrowDown') move.z = speed;
  //if (e.key === 'ArrowLeft') move.x = -speed;
  //if (e.key === 'ArrowRight') move.x = speed;
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
      case 'd':
      case 'D':
        if (move.x === speed) move.x = 0;
        break;                    
    }
  });
          
        
                            
  

 /* if (e.key === ' ' && isOnGround) {
    velocityY = 0.2; // jump upward
    isOnGround = false;

    //play jump sound
    if (jumpSound.isPlaying) jumpSound.stop(); //prevent overlapping
    jumpSound.play();
  }
});*/

window.addEventListener('keyup', () => {
  move = { x: 0, z: 0 };
});

//Mouse interaction (move cube to clicked position)
window.addEventListener('click', (event) => {
  const x = (event.clientX / window.innerWidth) * 2 - 1;
  const y = -(event.clientY / window.innerHeight) * 2 + 1;
  cube.position.x = x * 5;
  cube.position.z = y * 5;
});

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

  console.log("Game Restarted!");
});

//Animation loop
function animate() {
  requestAnimationFrame(animate);
  cube.position.x += move.x;
  cube.position.z += move.z;

  //Apply Gravity
  velocityY += gravity;
  cube.position.y += velocityY

  //Collision with the floor (y=0.5 is floor)
  if (cube.position.y <= 0.5) {
    cube.position.y = 0.5;
    velocityY = 0;
    isOnGround = true;
  }

  //Add Collision Detection(with bounding boxes)
const cubeBox = new THREE.Box3().setFromObject(cube);

for (const obstacle of obstacles) {
  const obstacleBox = new THREE.Box3().setFromObject(obstacle);
  if (cubeBox.intersectsBox(obstacleBox)) {
  console.log('Collision!');

  cube.position.x -= move.x;
  cube.position.z -= move.z;
  break;


  }
  
}

//Check if cube raech the goal
const goalBox = new THREE.Box3().setFromObject(goal);
if (cubeBox.intersectsBox(goalBox)) {
  console.log('🎉 You reached the goal!');
//document.getElementById('winMessage').style.display = 'block';
  //Show an altert or stop the game
  //alert('🎉 You Win!');

  bgMusic.stop();
  victorySound.play();

  //show pop up 
  document.getElementById('winModal').style.display = 'block';
  return;

  
}


  renderer.render(scene, camera);
  controls.update();
}

animate();
