import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { SunderloomEngine } from './engine';
import type { GameSettings } from './settings';
import { buildThreeDungeon, CM_TO_M, type BuiltThreeDungeon } from './threeDungeon';
import {
  createEnemyRig,
  createOrganicFireCluster,
  createPedestalRig,
  createPortalRig,
  createSharedRigMaterials,
  createWardenRig,
  type EnemyRig,
  type PedestalRig,
  type PortalRig,
  type SharedRigMaterials,
  type WardenRig,
} from './threeModels';
import { createSunderloomTextureSuite, type SunderloomTextureSuite } from './threeTextures';

const _vec3 = new THREE.Vector3();
const _vec3b = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();
const _ndc = new THREE.Vector2();
const _aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.9);
const _rayHit = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function normalizeAngle(a: number): number {
  let out = a;
  while (out > Math.PI) out -= Math.PI * 2;
  while (out < -Math.PI) out += Math.PI * 2;
  return out;
}

export class SunderloomThreeViewport {
  public readonly isSoftwareGl: boolean;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly overlayCanvas: HTMLCanvasElement;
  private readonly overlayCtx: CanvasRenderingContext2D;

  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private raycaster = new THREE.Raycaster();

  private textures: SunderloomTextureSuite;
  private rigMats: SharedRigMaterials;
  private builtDungeon: BuiltThreeDungeon | null = null;
  private builtDungeonKey = '';

  // AAA Dark-Fantasy Warm/Ash Studio PBR Lighting Rig
  private hemiLight: THREE.HemisphereLight;
  private keyLight: THREE.DirectionalLight;
  private wardenRimLight: THREE.PointLight;
  private brazierLights: THREE.PointLight[] = [];

  // Actors & Pooled 3D VFX
  private wardenRig: WardenRig;
  private enemyRigs = new Map<number, EnemyRig>();
  private pedestalRigs = new Map<number, PedestalRig>();
  private portalRig: PortalRig | null = null;
  private projectileMeshes = new Map<number, THREE.Mesh>();
  private hazardMeshes: THREE.Mesh[] = [];
  private spawnMeshes: THREE.Mesh[] = [];
  private particleInstanced: THREE.InstancedMesh;
  private superNovaDome: THREE.Mesh;
  private superNovaRing: THREE.Mesh;

  // Title Screen Cathedral Sanctuary Group
  private titleGroup: THREE.Group;
  private titleWarden: WardenRig;
  private titleOuterRing: THREE.Mesh;
  private titleInnerRing: THREE.Mesh;
  private titleFireGroups: Array<{ group: THREE.Group; x: number; y: number; z: number }> = [];
  private titleMotes: THREE.InstancedMesh;

  // Shared VFX geometries/materials
  private projGeo: THREE.SphereGeometry;
  private hazardGeo: THREE.RingGeometry;
  private spawnGeo: THREE.RingGeometry;

  // Dynamic Orbit + Auto-Follow 3D SpringArm Camera state
  public cameraYaw = 0;
  private manualOrbitCooldown = 0;
  private camPos = new THREE.Vector3(0, 8, 10);
  private camLook = new THREE.Vector3(0, 1.0, 0);
  private settings: GameSettings;

  constructor(container: HTMLElement, initialSettings: GameSettings) {
    this.settings = { ...initialSettings };
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);

    // 1. Modern WebGLRenderer with ACES Filmic, SRGB, PCFSoftShadowMap & Software-GL guard
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && this.settings.shadowsEnabled;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(this.computePixelRatio());
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // 2. Crisp 2D transparent overlay exclusively for projected floating damage numbers & enemy HP bars
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.width = width;
    this.overlayCanvas.height = height;
    this.overlayCanvas.style.position = 'absolute';
    this.overlayCanvas.style.inset = '0';
    this.overlayCanvas.style.width = '100%';
    this.overlayCanvas.style.height = '100%';
    this.overlayCanvas.style.pointerEvents = 'none';
    container.appendChild(this.overlayCanvas);
    this.overlayCtx = this.overlayCanvas.getContext('2d')!;

    // 3. Scene, Warm Charred-Ash Fog & Studio RoomEnvironment IBL
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0a09);
    this.scene.fog = new THREE.FogExp2(0x0c0a09, 0.019);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    pmrem.dispose();

    // 4. Perspective Third-Person Camera
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, width / height, 0.25, 140);

    // 5. Optional GPU Bloom Post-Processing (strictly skipped on Software WebGL)
    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.28, 0.42, 0.85);
      this.composer.addPass(this.bloomPass);
    }

    // 6. Procedural AAA Dark-Fantasy PBR Textures & Shared Composite Materials
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createSunderloomTextureSuite(maxAniso);
    this.rigMats = createSharedRigMaterials(this.textures);

    // 7. Authentic AAA Dark-Fantasy Lighting Rig (Warm Ash/Amber vs Deep Iron Shadow)
    this.hemiLight = new THREE.HemisphereLight(0x8a7968, 0x1a1411, 0.62);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffd8ab, 2.05);
    this.keyLight.position.set(10, 18, 8);
    this.keyLight.castShadow = !this.isSoftwareGl && this.settings.shadowsEnabled;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 55;
    const d = 22;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.03;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    // Warm Forge-Ember Rim Bounce around the Unbound Warden
    this.wardenRimLight = new THREE.PointLight(0xe0a15a, 5.2, 10, 1.8);
    this.scene.add(this.wardenRimLight);

    // 4 Dynamic Nearest-Brazier Flickering Fire PointLights
    for (let i = 0; i < 4; i++) {
      const pt = new THREE.PointLight(0xff7e26, 15, 16, 1.65);
      this.scene.add(pt);
      this.brazierLights.push(pt);
    }

    // 8. Gameplay Warden Rig, Pooled Instanced Sparks & 3D Sunder Nova Super Dome
    this.wardenRig = createWardenRig(this.rigMats);
    this.scene.add(this.wardenRig.root);

    this.projGeo = new THREE.SphereGeometry(0.22, 10, 8);
    this.hazardGeo = new THREE.RingGeometry(0.1, 1.0, 28);
    this.spawnGeo = new THREE.RingGeometry(0.32, 0.56, 24);

    const sparkGeo = new THREE.OctahedronGeometry(0.1, 0);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleInstanced = new THREE.InstancedMesh(sparkGeo, sparkMat, 180);
    this.particleInstanced.frustumCulled = false;
    this.scene.add(this.particleInstanced);

    this.superNovaDome = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshBasicMaterial({
        color: 0xe0b46a,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.superNovaDome.visible = false;
    this.scene.add(this.superNovaDome);

    this.superNovaRing = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 1.0, 36),
      new THREE.MeshBasicMaterial({
        color: 0xf2994a,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.superNovaRing.rotation.x = -Math.PI / 2;
    this.superNovaRing.position.y = 0.08;
    this.superNovaRing.visible = false;
    this.scene.add(this.superNovaRing);

    // 9. Cinematic Dark-Fantasy Title Cathedral Sanctuary (zero foreground obstacles!)
    const titleBuilt = this.buildTitleSanctuary();
    this.titleGroup = titleBuilt.group;
    this.titleWarden = titleBuilt.warden;
    this.titleOuterRing = titleBuilt.outerRing;
    this.titleInnerRing = titleBuilt.innerRing;
    this.titleFireGroups = titleBuilt.fireGroups;
    this.titleMotes = titleBuilt.motes;
    this.scene.add(this.titleGroup);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private buildTitleSanctuary(): {
    group: THREE.Group;
    warden: WardenRig;
    outerRing: THREE.Mesh;
    innerRing: THREE.Mesh;
    fireGroups: Array<{ group: THREE.Group; x: number; y: number; z: number }>;
    motes: THREE.InstancedMesh;
  } {
    const group = new THREE.Group();

    const floorTex = this.textures.floorAlbedo.clone();
    floorTex.repeat.set(6, 6);
    floorTex.needsUpdate = true;
    const floorBump = this.textures.floorBump.clone();
    floorBump.repeat.set(6, 6);
    floorBump.needsUpdate = true;

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 16.5, 0.5, 28),
      new THREE.MeshStandardMaterial({
        color: 0x8f887e,
        map: floorTex,
        bumpMap: floorBump,
        bumpScale: 0.07,
        roughness: 0.68,
        metalness: 0.14,
      }),
    );
    floor.position.y = -0.25;
    floor.receiveShadow = true;
    group.add(floor);

    const sigil = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, 7.2),
      new THREE.MeshBasicMaterial({
        map: this.textures.sigilStart,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    );
    sigil.rotation.x = -Math.PI / 2;
    sigil.position.set(0.7, 0.025, 0.2);
    group.add(sigil);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x8a8076,
      map: this.textures.wallAlbedo,
      bumpMap: this.textures.wallBump,
      bumpScale: 0.09,
      roughness: 0.82,
      metalness: 0.14,
    });

    // Cathedral perimeter columns behind the Warden
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.35;
      const px = Math.cos(a) * 9.2;
      const pz = Math.sin(a) * 9.2;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.66, 8.6, 8), wallMat);
      col.position.set(px, 4.3, pz);
      col.castShadow = true;
      col.receiveShadow = true;
      group.add(col);
    }

    // 3 Back/Flank Standing Forged-Iron Braziers with Organic Volumetric Fire (NONE blocking camera!)
    const brazierCoords: Array<[number, number]> = [
      [-1.7, -2.2],
      [3.4, -1.9],
      [4.5, 1.8],
    ];
    const fireGroups: Array<{ group: THREE.Group; x: number; y: number; z: number }> = [];
    for (const [bx, bz] of brazierCoords) {
      const bGrp = new THREE.Group();
      bGrp.position.set(bx, 0, bz);
      for (let legIdx = 0; legIdx < 3; legIdx++) {
        const a = (legIdx / 3) * Math.PI * 2;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.0, 6), this.rigMats.forgedIron);
        leg.position.set(Math.cos(a) * 0.24, 0.5, Math.sin(a) * 0.24);
        bGrp.add(leg);
      }
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.24, 0.34, 8), this.rigMats.blackenedSteel);
      bowl.position.y = 1.05;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.042, 6, 12), this.rigMats.antiqueGold);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 1.22;
      const fire = createOrganicFireCluster(this.rigMats, false, 1.15);
      fire.position.y = 1.18;
      bGrp.add(bowl, rim, fire);
      group.add(bGrp);
      fireGroups.push({ group: fire, x: bx, y: 1.9, z: bz });
    }

    // Monumental Antique-Bronze & Ember Loom Astrolabe Rings behind the Warden
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(3.35, 0.1, 10, 48), this.rigMats.blackenedSteel);
    outerRing.position.set(0.85, 2.75, -3.5);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(2.65, 0.055, 8, 40), this.rigMats.antiqueGold);
    innerRing.position.set(0.85, 2.75, -3.5);
    const emberArc = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.032, 6, 36), this.rigMats.emberGlow);
    emberArc.position.set(0.85, 2.75, -3.5);
    group.add(outerRing, innerRing, emberArc);

    // Sculpted Gothic Unbound Warden posed heroically in right-third focal zone
    const warden = createWardenRig(this.rigMats);
    warden.root.position.set(0.95, 0, 0.45);
    warden.root.rotation.y = -0.52;
    warden.swordArm.rotation.x = -0.3;
    warden.swordArm.rotation.z = -0.16;
    group.add(warden.root);

    // Drifting warm forge embers (no neon cyan/green cubes!)
    const motes = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.045, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      42,
    );
    motes.frustumCulled = false;
    group.add(motes);

    return { group, warden, outerRing, innerRing, fireGroups, motes };
  }

  private computePixelRatio(): number {
    if (this.isSoftwareGl) return 1;
    const cap =
      this.settings.graphicsQuality === 'Ultra'
        ? 2
        : this.settings.graphicsQuality === 'High'
          ? 1.5
          : 1;
    return Math.min(window.devicePixelRatio || 1, cap);
  }

  public applySettings(next: GameSettings): void {
    this.settings = { ...next };
    this.camera.fov = next.fov;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.computePixelRatio());
    const allowShadows = !this.isSoftwareGl && next.shadowsEnabled && next.graphicsQuality !== 'Performance';
    this.renderer.shadowMap.enabled = allowShadows;
    this.keyLight.castShadow = allowShadows;
    if (this.bloomPass) {
      this.bloomPass.strength = next.graphicsQuality === 'Ultra' ? 0.3 : 0.2;
    }
  }

  public orbitYawBy(deltaRadians: number): void {
    this.cameraYaw = normalizeAngle(this.cameraYaw + deltaRadians);
    this.manualOrbitCooldown = 2.4;
  }

  public resize(width: number, height: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setSize(w, h);
    }
    this.overlayCanvas.width = w;
    this.overlayCanvas.height = h;
  }

  /**
   * Projects screen mouse coordinates onto the 3D ground plane and returns exact UE5 centimeter aim target.
   */
  public screenToWorldCm(screenX: number, screenY: number): { x: number; y: number } | null {
    const w = this.overlayCanvas.width || 1;
    const h = this.overlayCanvas.height || 1;
    _ndc.set((screenX / w) * 2 - 1, -(screenY / h) * 2 + 1);
    this.raycaster.setFromCamera(_ndc, this.camera);
    if (this.raycaster.ray.intersectPlane(_aimPlane, _rayHit)) {
      return { x: _rayHit.x / CM_TO_M, y: _rayHit.z / CM_TO_M };
    }
    return null;
  }

  private ensureDungeonBuilt(engine: SunderloomEngine): void {
    const key = `${engine.dungeon.seed}_${engine.dungeon.floor}_${engine.dungeon.rooms.length}`;
    if (key === this.builtDungeonKey && this.builtDungeon) return;

    if (this.builtDungeon) {
      this.scene.remove(this.builtDungeon.group);
      this.builtDungeon.dispose();
    }
    for (const rig of this.enemyRigs.values()) this.scene.remove(rig.root);
    this.enemyRigs.clear();
    for (const ped of this.pedestalRigs.values()) this.scene.remove(ped.root);
    this.pedestalRigs.clear();
    if (this.portalRig) {
      this.scene.remove(this.portalRig.root);
      this.portalRig = null;
    }

    this.builtDungeon = buildThreeDungeon(engine.dungeon, this.textures, this.rigMats);
    this.scene.add(this.builtDungeon.group);
    this.builtDungeonKey = key;

    const px = engine.playerX * CM_TO_M;
    const pz = engine.playerY * CM_TO_M;
    this.cameraYaw = 0;
    this.camLook.set(px, 1.1, pz);
    this.camPos.set(px, 8.5, pz + 9.2);
  }

  public renderFrame(engine: SunderloomEngine, dt: number, isTitleScreen: boolean): void {
    const safeDt = Math.min(0.05, Math.max(0.001, dt));
    const t = engine.ambientTime;

    this.titleGroup.visible = isTitleScreen;
    this.wardenRig.root.visible = !isTitleScreen;
    this.particleInstanced.visible = !isTitleScreen;
    if (this.builtDungeon) this.builtDungeon.group.visible = !isTitleScreen;

    if (isTitleScreen) {
      this.superNovaDome.visible = false;
      this.superNovaRing.visible = false;
      this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
      this.updateTitleScene(t);
    } else {
      this.ensureDungeonBuilt(engine);
      this.syncGameplayScene(engine, safeDt, t);
    }

    const useBloom =
      !this.isSoftwareGl &&
      this.composer !== null &&
      this.settings.bloomEnabled &&
      this.settings.graphicsQuality !== 'Performance';

    if (useBloom && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    if (!isTitleScreen) {
      this.renderProjectedOverlay(engine);
    }
  }

  private updateTitleScene(t: number): void {
    const sway = Math.sin(t * 0.32) * 0.38;
    this.camera.position.set(-2.15 + sway, 2.85, 7.2);
    this.camera.lookAt(-0.45, 1.55, -0.35);

    this.titleWarden.bodyPivot.position.y = Math.sin(t * 2.0) * 0.025;
    this.titleWarden.cloak.rotation.x = 0.22 + Math.sin(t * 2.9) * 0.07;
    this.titleOuterRing.rotation.z = t * 0.18;
    this.titleInnerRing.rotation.z = -t * 0.28;
    this.titleInnerRing.rotation.x = Math.sin(t * 0.4) * 0.24;

    this.keyLight.position.set(6, 12, 7);
    this.keyLight.target.position.set(0.8, 1.2, 0);
    this.wardenRimLight.position.set(1.6, 2.2, 2.0);
    this.wardenRimLight.intensity = 6.5 + Math.sin(t * 3) * 1.1;

    this.titleFireGroups.forEach((entry, idx) => {
      const f = 0.88 + Math.sin(t * 8.2 + idx * 1.9) * 0.14;
      entry.group.scale.set(f, 0.86 + Math.sin(t * 11 + idx) * 0.2, f);
      const pt = this.brazierLights[idx];
      if (pt) {
        pt.position.set(entry.x, entry.y, entry.z);
        pt.color.setHex(0xff7e26);
        pt.intensity = 15 * f;
      }
    });

    // Floating warm ember ashes
    for (let i = 0; i < 42; i++) {
      const a = i * 1.618 + t * 0.2;
      const rad = 1.6 + ((i * 0.41) % 4.6);
      const y = ((i * 0.23 + t * 0.42) % 4.8) + 0.15;
      _vec3.set(0.6 + Math.cos(a) * rad, y, Math.sin(a) * rad);
      _quat.setFromEuler(new THREE.Euler(t + i, t * 0.7, 0));
      const s = 0.55 + (i % 3) * 0.3;
      _scale.set(s, s, s);
      _mat4.compose(_vec3, _quat, _scale);
      this.titleMotes.setMatrixAt(i, _mat4);
      _color.setHex(i % 3 === 0 ? 0xf2994a : 0xc89b54);
      this.titleMotes.setColorAt(i, _color);
    }
    this.titleMotes.instanceMatrix.needsUpdate = true;
    if (this.titleMotes.instanceColor) this.titleMotes.instanceColor.needsUpdate = true;
  }

  private syncGameplayScene(engine: SunderloomEngine, dt: number, t: number): void {
    const px = engine.playerX * CM_TO_M;
    const pz = engine.playerY * CM_TO_M;

    // 0. Keyboard smooth orbit (Z / C) + Automatic Direction-of-Travel Camera Follow!
    if (engine.keysHeld.has('KeyZ')) this.orbitYawBy(-2.1 * dt);
    if (engine.keysHeld.has('KeyC')) this.orbitYawBy(2.1 * dt);

    if (this.manualOrbitCooldown > 0) {
      this.manualOrbitCooldown = Math.max(0, this.manualOrbitCooldown - dt);
    }

    const speed = Math.hypot(engine.playerVx, engine.playerVy);
    if (this.settings.autoFollowCamera && this.manualOrbitCooldown <= 0 && speed > 80) {
      // Gently steer camera behind the Warden's direction of movement (like Unreal SpringArm auto-align)
      // For movement direction (vx, vy) in engine space (vx = +X, vy = +Z), camera forward (-sin(yaw), -cos(yaw))
      // matches (vx, vy) when desiredYaw = atan2(-vx, -vy)
      const desiredYaw = Math.atan2(-engine.playerVx, -engine.playerVy);
      const diff = normalizeAngle(desiredYaw - this.cameraYaw);
      // Only follow gently if player isn't walking straight backward toward camera
      if (Math.abs(diff) < Math.PI * 0.78) {
        const followRate = this.settings.cameraPreset === 'ThirdPerson' ? 1.55 : 0.95;
        this.cameraYaw = normalizeAngle(this.cameraYaw + diff * (1 - Math.exp(-followRate * dt)));
      }
    }
    engine.setCameraYaw(this.cameraYaw);

    // 1. Update Unbound Warden 3D Rig & Procedural Combat Kinematics
    this.wardenRig.root.position.set(px, 0, pz);
    this.wardenRig.root.rotation.y = Math.PI / 2 - engine.playerFacing;

    const moving = speed > 18;
    const stride = moving ? Math.sin(engine.walkCycle * 1.45) : 0;
    this.wardenRig.leftLeg.rotation.x = stride * 0.62;
    this.wardenRig.rightLeg.rotation.x = -stride * 0.62;
    this.wardenRig.bodyPivot.position.y = moving ? Math.abs(stride) * 0.08 : Math.sin(t * 2.4) * 0.025;
    this.wardenRig.bodyPivot.rotation.x = engine.dodgeTimer > 0 ? 0.36 : moving ? 0.12 : 0;
    this.wardenRig.cloak.rotation.x = 0.24 + (moving ? 0.42 : 0.05) + Math.sin(t * 6.5) * 0.08;

    if (engine.combatState === 'Windup') {
      this.wardenRig.swordArm.rotation.x = -1.35;
      this.wardenRig.swordArm.rotation.y = -0.85;
      this.wardenRig.slashArc.visible = false;
    } else if (engine.combatState === 'Active') {
      const swingDir = engine.comboStep % 2 === 1 ? 1 : -1;
      this.wardenRig.swordArm.rotation.x = -0.35;
      this.wardenRig.swordArm.rotation.y = swingDir * 1.35;
      this.wardenRig.slashArc.visible = true;
      this.wardenRig.slashMat.color.setHex(engine.currentAttackHeavy ? 0xf2994a : 0xe0b46a);
      const scaleMul = engine.currentAttackHeavy ? 1.26 : 1.0;
      this.wardenRig.slashArc.scale.set(scaleMul, scaleMul, 1);
    } else {
      this.wardenRig.swordArm.rotation.x = THREE.MathUtils.damp(
        this.wardenRig.swordArm.rotation.x,
        -0.28 + stride * 0.22,
        12,
        dt,
      );
      this.wardenRig.swordArm.rotation.y = THREE.MathUtils.damp(this.wardenRig.swordArm.rotation.y, 0, 12, dt);
      this.wardenRig.slashArc.visible = false;
    }
    this.wardenRig.offArm.rotation.x = -stride * 0.45;
    this.wardenRig.iFrameAura.visible = engine.playerHealth.isInvulnerable;
    if (engine.playerHealth.isInvulnerable) {
      this.wardenRig.iFrameAura.rotation.y = t * 6;
    }

    const wardenFlash = engine.playerHitFlash > 0.08;
    this.wardenRig.armorMaterials.forEach((m, idx) => {
      m.emissive.setHex(wardenFlash ? 0xd93829 : 0x000000);
      m.emissiveIntensity = wardenFlash ? 1.15 : 0;
      m.color.copy(this.wardenRig.baseArmorColors[idx]);
    });

    // 2. Dynamic Orbiting 3D SpringArm Camera with 3 View Presets + Look-Ahead + Hit Trauma Shake
    const presetConfig = {
      ThirdPerson: { dist: 7.8, height: 5.4, lookAhead: 1.8, lookY: 1.35 },
      Cinematic: { dist: 10.6, height: 10.2, lookAhead: 0.9, lookY: 1.0 },
      Tactical: { dist: 12.2, height: 16.4, lookAhead: 0.3, lookY: 0.6 },
    }[this.settings.cameraPreset];

    const sinY = Math.sin(this.cameraYaw);
    const cosY = Math.cos(this.cameraYaw);
    const targetX = engine.camX * CM_TO_M;
    const targetZ = engine.camY * CM_TO_M;

    const desiredLookX = targetX - sinY * presetConfig.lookAhead;
    const desiredLookZ = targetZ - cosY * presetConfig.lookAhead;
    const desiredCamX = targetX + sinY * presetConfig.dist;
    const desiredCamZ = targetZ + cosY * presetConfig.dist;

    this.camLook.x = THREE.MathUtils.damp(this.camLook.x, desiredLookX, 10, dt);
    this.camLook.y = THREE.MathUtils.damp(this.camLook.y, presetConfig.lookY, 8, dt);
    this.camLook.z = THREE.MathUtils.damp(this.camLook.z, desiredLookZ, 10, dt);

    this.camPos.x = THREE.MathUtils.damp(this.camPos.x, desiredCamX, 9, dt);
    this.camPos.y = THREE.MathUtils.damp(this.camPos.y, presetConfig.height, 8, dt);
    this.camPos.z = THREE.MathUtils.damp(this.camPos.z, desiredCamZ, 9, dt);

    const shakeMag =
      this.settings.screenShake && engine.trauma > 0.02 ? engine.trauma * engine.trauma * 0.42 : 0;
    const sx = shakeMag > 0 ? (Math.random() - 0.5) * 2 * shakeMag : 0;
    const sy = shakeMag > 0 ? (Math.random() - 0.5) * 2 * shakeMag : 0;

    this.camera.position.set(this.camPos.x + sx, this.camPos.y + sy, this.camPos.z);
    this.camera.lookAt(this.camLook);

    // 3. Smart Real-Time Wall Cutaway (foreground walls between camera and Warden lower cleanly!)
    if (this.builtDungeon) {
      // Camera-to-target vector on XZ plane: camera sits toward (+sinY, +cosY) from player
      const camDirX = sinY;
      const camDirZ = cosY;
      const activeRoom = engine.findRoomContaining(engine.playerX, engine.playerY);
      const activeRoomId = activeRoom?.id ?? -1;

      for (const wg of this.builtDungeon.wallGroups) {
        // Outward normal of each room wall side (dir 0=+X, 1=+Z, 2=-X, 3=-Z)
        const nx = wg.dir === 0 ? 1 : wg.dir === 2 ? -1 : 0;
        const nz = wg.dir === 1 ? 1 : wg.dir === 3 ? -1 : 0;
        const facesCamera = nx * camDirX + nz * camDirZ > 0.25;
        // Cut down walls on the camera-facing side of the active room (or any room when in Cinematic/Tactical)
        const shouldCut =
          facesCamera &&
          (wg.roomId === activeRoomId || this.settings.cameraPreset !== 'ThirdPerson');
        const targetScaleY = shouldCut ? 0.16 : 1.0;
        wg.currentScaleY = THREE.MathUtils.damp(wg.currentScaleY, targetScaleY, 10, dt);
        wg.group.scale.y = wg.currentScaleY;
      }

      // Update Runic Gate energy curtains
      const roomLockMap = new Map<number, boolean>();
      for (const r of engine.dungeon.rooms) roomLockMap.set(r.id, r.runicGatesLocked);
      for (const g of this.builtDungeon.runicGates) {
        g.mesh.visible = roomLockMap.get(g.roomId) ?? false;
      }

      // Animate standing volumetric brazier fires & bind 4 pooled PointLights to closest braziers
      const sorted = this.builtDungeon.braziers
        .map((b) => ({ b, distSq: (b.x - px) * (b.x - px) + (b.z - pz) * (b.z - pz) }))
        .sort((a, b) => a.distSq - b.distSq);

      for (let i = 0; i < sorted.length; i++) {
        const { b } = sorted[i];
        const flick = 0.88 + Math.sin(t * 8.4 + b.phase) * 0.14;
        b.fireGroup.scale.set(flick, 0.85 + Math.sin(t * 12 + b.phase) * 0.22, flick);

        if (i < this.brazierLights.length) {
          const light = this.brazierLights[i];
          light.position.set(b.x, b.y, b.z);
          light.color.setHex(b.isBoss ? 0xe6452e : 0xff7e26);
          light.intensity = (b.isBoss ? 18 : 15) * flick;
        }
      }
    }

    // 4. Follow Lighting Rig
    this.keyLight.position.set(px + 9, 19, pz + 7);
    this.keyLight.target.position.set(px, 0, pz);
    this.wardenRimLight.position.set(px, 2.3, pz);
    this.wardenRimLight.intensity = engine.combatState === 'Active' ? 10.5 : 5.4;

    // 5. Sunder Nova 3D Super Shockwave VFX
    if (engine.superNovaTimer > 0) {
      const p = 1 - engine.superNovaTimer / 0.72;
      const rad = 1.0 + p * 7.5;
      this.superNovaDome.visible = true;
      this.superNovaDome.position.set(engine.superNovaX * CM_TO_M, 0, engine.superNovaY * CM_TO_M);
      this.superNovaDome.scale.set(rad, rad * 0.55, rad);
      (this.superNovaDome.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - p) * 0.45);

      this.superNovaRing.visible = true;
      this.superNovaRing.position.set(engine.superNovaX * CM_TO_M, 0.1, engine.superNovaY * CM_TO_M);
      this.superNovaRing.scale.set(rad, rad, 1);
      (this.superNovaRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - p) * 0.9);
    } else {
      this.superNovaDome.visible = false;
      this.superNovaRing.visible = false;
    }

    // 6. Sync 3D Loomborn Enemies
    const activeEnemyIds = new Set<number>();
    for (const e of engine.enemies) {
      activeEnemyIds.add(e.id);
      let rig = this.enemyRigs.get(e.id);
      if (!rig) {
        rig = createEnemyRig(e.archetype, this.rigMats);
        this.enemyRigs.set(e.id, rig);
        this.scene.add(rig.root);
      }
      rig.root.position.set(e.x * CM_TO_M, 0, e.y * CM_TO_M);
      rig.root.rotation.y = Math.PI / 2 - e.facingAngle;

      if (e.health.isDead) {
        const fall = 1 - Math.max(0, e.koTimer / 0.42);
        rig.bodyPivot.rotation.x = fall * (Math.PI / 2);
        rig.bodyPivot.position.y = -fall * 0.35;
        rig.telegraphRing.visible = false;
      } else {
        rig.bodyPivot.rotation.x = 0;
        const eSpeed = Math.hypot(e.vx, e.vy);
        const gait = Math.sin(t * 10 + e.id * 1.7) * (eSpeed > 12 ? 0.55 : 0.08);
        rig.limbA.rotation.x = gait;
        rig.limbB.rotation.x = -gait;

        if (e.archetype === 'SpireArcanist') {
          rig.bodyPivot.position.y = Math.sin(t * 3.5 + e.id) * 0.16;
          rig.weaponPivot.rotation.y = t * 2.4;
        } else {
          rig.bodyPivot.position.y = Math.abs(gait) * 0.06;
          if (e.combatState === 'Windup') {
            rig.weaponPivot.rotation.x = -1.25;
          } else if (e.combatState === 'Active') {
            rig.weaponPivot.rotation.x = 0.85;
          } else {
            rig.weaponPivot.rotation.x = 0;
          }
        }

        if (e.combatState === 'Windup') {
          const p = 1 - Math.max(0, e.stateTimer / Math.max(0.05, e.telegraphDuration));
          const rad = Math.max(0.9, e.preferredRange * CM_TO_M);
          rig.telegraphRing.visible = true;
          rig.telegraphRing.scale.set(rad * (0.45 + p * 0.55), rad * (0.45 + p * 0.55), 1);
          rig.telegraphMat.opacity = 0.25 + p * 0.5;
        } else {
          rig.telegraphRing.visible = false;
        }
      }

      const flash = e.hitFlash > 0.1;
      for (const m of rig.armorMaterials) {
        if (flash) {
          m.emissive.setHex(0xffffff);
          m.emissiveIntensity = 1.0;
        } else if (e.archetype === 'WeaverWardenBoss' && e.bossPhase >= 2) {
          m.emissive.setHex(0xb8241d);
          m.emissiveIntensity = 0.55 + Math.sin(t * 7) * 0.25;
        } else {
          m.emissive.setHex(0x000000);
          m.emissiveIntensity = 0;
        }
      }
    }
    for (const [id, rig] of this.enemyRigs.entries()) {
      if (!activeEnemyIds.has(id)) {
        this.scene.remove(rig.root);
        this.enemyRigs.delete(id);
      }
    }

    // 7. Sync 3D Upgrade Pedestals
    const activePedIds = new Set<number>();
    for (const ped of engine.pedestals) {
      if (ped.consumed) continue;
      activePedIds.add(ped.id);
      let rig = this.pedestalRigs.get(ped.id);
      if (!rig) {
        rig = createPedestalRig(ped.relic.rarity, this.rigMats);
        this.pedestalRigs.set(ped.id, rig);
        this.scene.add(rig.root);
      }
      rig.root.position.set(ped.x * CM_TO_M, 0, ped.y * CM_TO_M);
      rig.crystal.position.y = 1.56 + Math.sin(t * 3.2 + ped.id) * 0.14;
      rig.crystal.rotation.y = t * 1.8 + ped.id;
      rig.halo.rotation.z = -t * 1.4;
    }
    for (const [id, rig] of this.pedestalRigs.entries()) {
      if (!activePedIds.has(id)) {
        this.scene.remove(rig.root);
        this.pedestalRigs.delete(id);
      }
    }

    // 8. Sync 3D Boss Descent Portal
    if (engine.portal && engine.portal.active) {
      if (!this.portalRig) {
        this.portalRig = createPortalRig(this.rigMats);
        this.scene.add(this.portalRig.root);
      }
      this.portalRig.root.position.set(engine.portal.x * CM_TO_M, 0, engine.portal.y * CM_TO_M);
      this.portalRig.innerRing.rotation.z = -t * 1.8;
      this.portalRig.innerRing.rotation.x = Math.sin(t * 1.1) * 0.3;
      this.portalRig.vortex.rotation.z = t * 2.5;
    } else if (this.portalRig) {
      this.scene.remove(this.portalRig.root);
      this.portalRig = null;
    }

    // 9. Sync 3D Projectiles (Forged Ember Bolts, Gold Spears, Crimson Enemy Orbs)
    const activeProjIds = new Set<number>();
    for (const p of engine.projectiles) {
      activeProjIds.add(p.id);
      let mesh = this.projectileMeshes.get(p.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          this.projGeo,
          p.faction === 'Player' ? this.rigMats.emberGlow : this.rigMats.crimsonGlow,
        );
        mesh.scale.set(0.7, 0.7, 2.4);
        this.projectileMeshes.set(p.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(p.x * CM_TO_M, 1.18, p.y * CM_TO_M);
      mesh.rotation.y = Math.PI / 2 - Math.atan2(p.vy, p.vx);
    }
    for (const [id, mesh] of this.projectileMeshes.entries()) {
      if (!activeProjIds.has(id)) {
        this.scene.remove(mesh);
        this.projectileMeshes.delete(id);
      }
    }

    // 10. Sync 3D Floor Hazards & Enemy Spawn Portals
    this.syncRingMeshes(
      this.hazardMeshes,
      engine.hazards.map((h) => ({
        x: h.x * CM_TO_M,
        z: h.y * CM_TO_M,
        radius: h.radius * CM_TO_M,
        color: h.detonated ? 0xf2994a : 0xc4342d,
        opacity: h.detonated ? 0.65 * (h.fadeTimer / 0.35) : 0.25 + (1 - h.telegraphTimer / h.maxTelegraph) * 0.55,
      })),
      this.hazardGeo,
    );

    this.syncRingMeshes(
      this.spawnMeshes,
      engine.spawnTelegraphs.map((st) => ({
        x: st.x * CM_TO_M,
        z: st.y * CM_TO_M,
        radius: 0.7 + (1 - st.timer / st.maxTimer) * 0.7,
        color: 0xd96b27,
        opacity: 0.4 + (1 - st.timer / st.maxTimer) * 0.45,
      })),
      this.spawnGeo,
    );

    // 11. Sync Pooled 3D Spark & Ember Particles
    for (let i = 0; i < engine.particles.length; i++) {
      const pt = engine.particles[i];
      if (!pt.active) {
        _scale.set(0, 0, 0);
        _mat4.compose(_vec3.set(0, -10, 0), _quat.identity(), _scale);
      } else {
        const lifeRatio = Math.max(0.05, pt.life / pt.maxLife);
        const s = (pt.size / 14) * lifeRatio;
        _vec3.set(pt.x * CM_TO_M, 0.9 + (1 - lifeRatio) * 0.75, pt.y * CM_TO_M);
        _quat.setFromEuler(new THREE.Euler(t * 5 + i, t * 4, 0));
        _scale.set(s, s, s);
        _mat4.compose(_vec3, _quat, _scale);
        _color.set(pt.color);
        this.particleInstanced.setColorAt(i, _color);
      }
      this.particleInstanced.setMatrixAt(i, _mat4);
    }
    this.particleInstanced.instanceMatrix.needsUpdate = true;
    if (this.particleInstanced.instanceColor) this.particleInstanced.instanceColor.needsUpdate = true;
  }

  private syncRingMeshes(
    pool: THREE.Mesh[],
    items: Array<{ x: number; z: number; radius: number; color: number; opacity: number }>,
    geo: THREE.RingGeometry,
  ): void {
    while (pool.length < items.length) {
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: 0xc4342d,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.06;
      this.scene.add(m);
      pool.push(m);
    }
    for (let i = 0; i < pool.length; i++) {
      const mesh = pool[i];
      if (i < items.length) {
        const item = items[i];
        mesh.visible = true;
        mesh.position.set(item.x, 0.06, item.z);
        mesh.scale.set(item.radius, item.radius, 1);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.setHex(item.color);
        mat.opacity = Math.max(0, Math.min(1, item.opacity));
      } else {
        mesh.visible = false;
      }
    }
  }

  private renderProjectedOverlay(engine: SunderloomEngine): void {
    const ctx = this.overlayCtx;
    const w = this.overlayCanvas.width;
    const h = this.overlayCanvas.height;
    ctx.clearRect(0, 0, w, h);

    for (const e of engine.enemies) {
      if (e.health.isDead || e.archetype === 'WeaverWardenBoss') continue;
      if (e.health.currentHealth >= e.health.maxHealth) continue;

      const barHeightY = e.archetype === 'IroncladLoomguard' ? 2.65 : 2.15;
      _vec3b.set(e.x * CM_TO_M, barHeightY, e.y * CM_TO_M).project(this.camera);
      if (_vec3b.z > 1) continue;
      const sx = (_vec3b.x * 0.5 + 0.5) * w;
      const sy = (-_vec3b.y * 0.5 + 0.5) * h;

      const bw = 56;
      const bh = 6;
      ctx.fillStyle = 'rgba(14, 11, 10, 0.9)';
      ctx.fillRect(sx - bw / 2, sy - bh / 2, bw, bh);
      ctx.fillStyle = '#B82C26';
      ctx.fillRect(
        sx - bw / 2 + 1,
        sy - bh / 2 + 1,
        (bw - 2) * Math.max(0, e.health.currentHealth / e.health.maxHealth),
        bh - 2,
      );
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of engine.floatingDamages) {
      if (!f.active) continue;
      const rise = (1 - f.life / f.maxLife) * 1.45;
      _vec3b.set(f.x * CM_TO_M, 1.9 + rise, f.y * CM_TO_M).project(this.camera);
      if (_vec3b.z > 1) continue;
      const sx = (_vec3b.x * 0.5 + 0.5) * w;
      const sy = (-_vec3b.y * 0.5 + 0.5) * h;

      const alpha = Math.min(1, (f.life / f.maxLife) * 1.7);
      ctx.globalAlpha = alpha;
      ctx.font = f.crit ? '700 22px "JetBrains Mono", monospace' : '600 16px "JetBrains Mono", monospace';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0C0A09';
      const label = f.crit ? `${f.value}!` : `${f.value}`;
      ctx.strokeText(label, sx, sy);
      ctx.fillStyle = f.color;
      ctx.fillText(label, sx, sy);
    }
    ctx.globalAlpha = 1;
  }

  public dispose(): void {
    if (this.builtDungeon) {
      this.builtDungeon.dispose();
    }
    this.textures.dispose();
    this.rigMats.dispose();
    this.projGeo.dispose();
    this.hazardGeo.dispose();
    this.spawnGeo.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.overlayCanvas.remove();
  }
}
