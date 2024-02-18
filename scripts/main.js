import * as THREE from 'three'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { World } from './world'
import { Player } from './player'
import { Physics } from './physics'
import { setupUI } from './ui'
import { ModelLoader } from './modelLoader'

// Renderer setup
const renderer = new THREE.WebGLRenderer()
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(0x80a0e0)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

// Camera setup
const orbitCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
orbitCamera.position.set(0, 32, 0)
orbitCamera.layers.enable(1)

const controls = new OrbitControls(orbitCamera, renderer.domElement)
controls.target.set(0, 0, 0)
controls.update()

// Scene setup
const scene = new THREE.Scene()
const physics = new Physics(scene)
const world = new World()
const player = new Player(scene, world)
scene.add(world)

const modelLoader = new ModelLoader((models) => {
  player.setTool(models.pickaxe)
})

const sun = new THREE.DirectionalLight()
const sunPosition = 0
const sunY = 32
sun.intensity = 1.5
sun.position.set(sunPosition, sunY, sunPosition)
sun.castShadow = true

const geometry = new THREE.SphereGeometry(1, 32, 16)
const material = new THREE.MeshBasicMaterial({ color: 0xffff00 })
const planet = new THREE.Mesh(geometry, material)
planet.position.set(new THREE.Vector3(0, 16, 0))

// Set the size of the sun's shadow box
sun.shadow.camera.left = -40
sun.shadow.camera.right = 40
sun.shadow.camera.top = 40
sun.shadow.camera.bottom = -40
sun.shadow.camera.near = 0.1
sun.shadow.camera.far = 200
sun.shadow.bias = -0.0001
sun.shadow.mapSize = new THREE.Vector2(2048, 2048)
scene.add(sun)
scene.add(sun.target)
scene.add(planet)

const ambient = new THREE.AmbientLight()
ambient.intensity = 0.2
scene.add(ambient)

THREE.ShaderChunk.fog_vertex = `#ifdef USE_FOG\n\tvFogDepth = length( mvPosition );\n#endif`
scene.fog = new THREE.Fog(0x80a0e0, 16, 32)

// Events
window.addEventListener('resize', () => {
  // Resize camera aspect ratio and renderer size to the new window size
  orbitCamera.aspect = window.innerWidth / window.innerHeight
  orbitCamera.updateProjectionMatrix()
  player.camera.aspect = window.innerWidth / window.innerHeight
  player.camera.updateProjectionMatrix()
  
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// UI Setup
const stats = new Stats()
document.body.appendChild(stats.dom)

// Render loop
let previousTime = performance.now()
let tick = 0
function animate() {
  requestAnimationFrame(animate)

  const currentTime = performance.now()
  const dt = (currentTime - previousTime) / 1000

  // Position the sun relative to the player. Need to adjust both the
  // position and target of the sun to keep the same sun angle
  const period = 30 * 60 * 1
  const frequency = tick / period
  const planetPosition = (new THREE.Vector3(Math.cos(frequency), Math.sin(frequency), sunPosition)).multiplyScalar(16)
  sun.position.copy(player.camera.position)
  sun.position.add(planetPosition)
  sun.target.position.copy(player.camera.position)
  planet.position.copy(player.camera.position)
  planet.position.add(planetPosition)

  // Only update physics when player controls are locked
  if (player.controls.isLocked) {
    physics.update(dt, player, world)
    player.update(world)
  }

  world.update(player.position)
  renderer.render(scene, player.controls.isLocked ? player.camera : orbitCamera)
  stats.update()

  previousTime = currentTime
  tick++
}

setupUI(world, player, physics, scene)
animate()