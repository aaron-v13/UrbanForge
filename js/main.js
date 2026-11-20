import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { assets } from './assetList.js';

// assetList.js paths start with /models/..., the files live in UrbanForge/assets/models/...
const MODEL_ROOT = '/assets';

// ==========================================
// BACKEND API PERSISTENCE (MONGODB / JSON)
// ==========================================
function getApiBase() {
    if (typeof window !== 'undefined' && window.location && window.location.port === '3000') {
        return '';
    }
    return 'http://localhost:3000';
}

function getCurrentUserId() {
    try {
        const u = window.UrbanForgeAuth?.getUser() || 
                  JSON.parse(localStorage.getItem('urbanforge_user') || 'null') ||
                  JSON.parse(sessionStorage.getItem('urbanforge_user') || 'null');
        return u?.id || u?.email || 'guest';
    } catch {
        return 'guest';
    }
}

async function apiSaveBuilding(buildingData) {
    try {
        const endpoint = getApiBase() + '/api/city/buildings';
        const payload = { ...buildingData, userId: getCurrentUserId() };
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            console.log('Saved to DB:', buildingData.buildingId);
            setStatus(`Saved to ${data.storage || 'Database'}! (${buildingData.assetName})`);
        }
    } catch (err) {
        console.warn('Could not save building to DB:', err);
        setStatus('Placed locally. (Start server via start-server.bat to save to MongoDB).');
    }
}

async function apiDeleteBuilding(buildingId) {
    try {
        const endpoint = getApiBase() + `/api/city/buildings/${encodeURIComponent(buildingId)}?userId=${encodeURIComponent(getCurrentUserId())}`;
        const res = await fetch(endpoint, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            console.log('Deleted from DB:', buildingId);
            setStatus(`Deleted from ${data.storage || 'Database'}.`);
        }
    } catch (err) {
        console.warn('Could not delete building from DB:', err);
    }
}

async function loadSavedBuildings() {
    try {
        const endpoint = getApiBase() + `/api/city/buildings?userId=${encodeURIComponent(getCurrentUserId())}`;
        const res = await fetch(endpoint, { credentials: 'include' });
        const data = await res.json();
        if (data.success && Array.isArray(data.buildings) && data.buildings.length > 0) {
            setStatus(`Loaded ${data.buildings.length} building(s) from ${data.storage || 'Database'}.`);
            for (const b of data.buildings) {
                loader.load(
                    MODEL_ROOT + b.modelPath,
                    gltf => {
                        const model = gltf.scene;
                        prepareModel(model, b.scale ?? 1);
                        model.position.set(b.position.x, b.position.y, b.position.z);
                        if (b.rotation) {
                            model.rotation.set(b.rotation.x, b.rotation.y, b.rotation.z);
                        }
                        model.userData = {
                            buildingId: b.buildingId,
                            assetId: b.assetId,
                            assetName: b.assetName,
                            modelPath: b.modelPath,
                            scale: b.scale
                        };
                        scene.add(model);
                        placedObjects.push(model);
                    },
                    undefined,
                    err => console.warn('Could not load saved model:', b.modelPath, err)
                );
            }
        } else if (data.success) {
            setStatus(`Connected to ${data.storage || 'Backend'}. Click Build to add buildings.`);
        }
    } catch (err) {
        console.warn('Could not fetch saved buildings:', err);
        setStatus('Ready. Tip: Run start-server.bat for live MongoDB saving.');
    }
}

// Load buildings on page load
loadSavedBuildings();

// ==========================================
// SCENE, CAMERA, RENDERER
// ==========================================
const viewport = document.getElementById('viewport');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x061b39);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
camera.position.set(8, 8, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
viewport.appendChild(renderer.domElement);

function resize() {
    const w = viewport.clientWidth, h = viewport.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}
new ResizeObserver(resize).observe(viewport);
resize();

// ==========================================
// LIGHTS, GROUND, GRID
// ==========================================
scene.add(new THREE.AmbientLight(0xffffff, 2));

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(10, 20, 10);
sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50 });
scene.add(sun);

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

scene.add(new THREE.GridHelper(100, 100));

// ==========================================
// CONTROLS
// ==========================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const transformControls = new TransformControls(camera, renderer.domElement);
scene.add(transformControls.getHelper());
transformControls.setMode('translate');
transformControls.setTranslationSnap(1);
transformControls.setRotationSnap(THREE.MathUtils.degToRad(90));
transformControls.setScaleSnap(0.1);
transformControls.addEventListener('dragging-changed', e => { controls.enabled = !e.value; });

// ==========================================
// STATE
// ==========================================
const loader = new GLTFLoader();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let placementModel = null;
let placementMode = false;
const placedObjects = [];
let selectedObject = null;

function aimRay(event) {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = -((event.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
}

// ==========================================
// PLACING BUILDINGS
// ==========================================
function prepareModel(model, scale = 1) {
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

    const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= new THREE.Box3().setFromObject(model).min.y;
}

function startPlacement(asset) {
    if (placementModel) { scene.remove(placementModel); placementModel = null; }
    transformControls.detach();
    selectedObject = null;

    loader.load(
        MODEL_ROOT + asset.model,
        gltf => {
            placementModel = gltf.scene;
            prepareModel(placementModel, asset.scale ?? 1);
            placementModel.userData = {
                buildingId: 'bld_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                assetId: asset.id,
                assetName: asset.name,
                modelPath: asset.model,
                scale: asset.scale ?? 1
            };
            scene.add(placementModel);
            placementMode = true;
            controls.enabled = false;
            setStatus('Click the ground to place ' + asset.name + '. Esc to cancel.');
        },
        undefined,
        err => {
            console.error('MODEL LOADING ERROR:', err);
            setStatus('Could not load ' + asset.name + '. Check the model path.');
        }
    );
}

renderer.domElement.addEventListener('pointermove', e => {
    if (!placementMode || !placementModel) return;
    aimRay(e);
    const hit = raycaster.intersectObject(ground)[0];
    if (hit) {
        placementModel.position.x = Math.round(hit.point.x);
        placementModel.position.z = Math.round(hit.point.z);
    }
});

renderer.domElement.addEventListener('click', () => {
    if (!placementMode || !placementModel) return;
    placedObjects.push(placementModel);
    selectedObject = placementModel;
    transformControls.attach(selectedObject);

    // Save to Database
    if (selectedObject.userData && selectedObject.userData.buildingId) {
        apiSaveBuilding({
            buildingId: selectedObject.userData.buildingId,
            assetId: selectedObject.userData.assetId,
            assetName: selectedObject.userData.assetName,
            modelPath: selectedObject.userData.modelPath,
            scale: selectedObject.userData.scale,
            position: {
                x: selectedObject.position.x,
                y: selectedObject.position.y,
                z: selectedObject.position.z
            },
            rotation: {
                x: selectedObject.rotation.x,
                y: selectedObject.rotation.y,
                z: selectedObject.rotation.z
            }
        });
    }

    placementModel = null;
    placementMode = false;
    controls.enabled = true;
    setStatus('Placed & Saved to Database! Arrow keys move it, Delete removes it.');
});

// ==========================================
// SELECTING PLACED BUILDINGS
// ==========================================
renderer.domElement.addEventListener('pointerdown', e => {
    if (placementMode || transformControls.axis) return; // placing, or grabbing a gizmo handle

    aimRay(e);
    const hit = raycaster.intersectObjects(placedObjects, true)[0];

    if (hit) {
        let obj = hit.object;
        while (obj.parent && !placedObjects.includes(obj)) obj = obj.parent;
        if (placedObjects.includes(obj)) {
            selectedObject = obj;
            transformControls.attach(obj);
        }
    } else {
        transformControls.detach();
        selectedObject = null;
    }
});

// ==========================================
// HUD
// ==========================================
const drawer = document.getElementById('drawer');
const hintBox = document.getElementById('hintBox');

function setStatus(text) {
    const el = document.getElementById('status');
    if (el) el.textContent = text;
}
setStatus('Click Build to add a building. Press H for controls.');

const closeDrawer = () => drawer.classList.remove('open');
const toggleDrawer = () => drawer.classList.toggle('open');

document.getElementById('buildBtn')?.addEventListener('click', toggleDrawer);
document.getElementById('closeDrawer')?.addEventListener('click', closeDrawer);
document.getElementById('hintBtn')?.addEventListener('click', () => hintBox.classList.toggle('show'));
document.getElementById('deleteBtn')?.addEventListener('click', deleteSelected);

function pickAsset(asset) {
    closeDrawer();
    startPlacement(asset);
}

function deleteSelected() {
    if (!selectedObject) return;
    const bId = selectedObject.userData?.buildingId;
    if (bId) {
        apiDeleteBuilding(bId);
    }
    scene.remove(selectedObject);
    const i = placedObjects.indexOf(selectedObject);
    if (i !== -1) placedObjects.splice(i, 1);
    transformControls.detach();
    selectedObject = null;
    setStatus('Building deleted from Database.');
}

function cancelPlacement() {
    if (!placementMode) return false;
    scene.remove(placementModel);
    placementModel = null;
    placementMode = false;
    controls.enabled = true;
    setStatus('');
    return true;
}

// ---- Building list (grouped by category) ----
const assetLibrary = document.getElementById('assetLibrary');

if (assetLibrary) {
    [...new Set(assets.map(a => a.category))].forEach(category => {
        const section = document.createElement('div');
        section.className = 'categorySection';

        const header = document.createElement('button');
        header.className = 'categoryHeader';
        header.textContent = '▼ ' + category;

        const items = document.createElement('div');
        items.className = 'categoryItems';

        assets.filter(a => a.category === category).forEach(asset => {
            const btn = document.createElement('button');
            btn.className = 'assetButton';
            btn.textContent = asset.name;
            btn.addEventListener('click', () => pickAsset(asset));
            items.appendChild(btn);
        });

        header.addEventListener('click', () => {
            const open = items.style.display !== 'none';
            items.style.display = open ? 'none' : 'block';
            header.textContent = (open ? '▶ ' : '▼ ') + category;
        });

        section.append(header, items);
        assetLibrary.appendChild(section);
    });
}

// ---- Search ----
document.getElementById('search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.categorySection').forEach(section => {
        let any = false;
        section.querySelectorAll('.assetButton').forEach(b => {
            const match = b.textContent.toLowerCase().includes(q);
            b.style.display = match ? '' : 'none';
            any = any || match;
        });
        section.style.display = any ? '' : 'none';
    });
});

// ---- Keyboard ----
const snapToAxis = v => Math.abs(v.x) > Math.abs(v.z)
    ? new THREE.Vector3(Math.sign(v.x), 0, 0)
    : new THREE.Vector3(0, 0, Math.sign(v.z));

window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (cancelPlacement()) return;
        if (drawer && drawer.classList.contains('open')) return closeDrawer();
        transformControls.detach();
        selectedObject = null;
        return;
    }
    if (e.target.tagName === 'INPUT') return; // typing in the search box

    const k = e.key.toLowerCase();
    if (k === 'b') toggleDrawer();
    if (k === 'h' && hintBox) hintBox.classList.toggle('show');
    if (selectedObject) {
        if (k === 'w') transformControls.setMode('translate');
        if (k === 'e') transformControls.setMode('rotate');
        if (k === 'r') transformControls.setMode('scale');
        if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
    }

    if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
        const dir = {
            ArrowUp: forward,
            ArrowDown: forward.clone().negate(),
            ArrowRight: right,
            ArrowLeft: right.clone().negate()
        }[e.key];

        if (selectedObject && !placementMode) {
            selectedObject.position.add(snapToAxis(dir));
        } else {
            const pan = dir.multiplyScalar(2);
            camera.position.add(pan);
            controls.target.add(pan);
        }
    }
});

// ---- Stats update ----
let lastCount = -1;

function setStat(id, text, pct) {
    const el = document.getElementById(id);
    if (!el) return;
    const b = el.querySelector('b');
    const bar = el.querySelector('.bar i');
    if (b) b.textContent = text;
    if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
}

function updateStats() {
    const n = placedObjects.length;
    if (n === lastCount) return;
    lastCount = n;

    const budget = 100000 - n * 5000;
    setStat('stHappiness', Math.max(0, 80 - n * 2) + '%', 80 - n * 2);
    setStat('stCitizens', (n * 120).toLocaleString(), n * 5);
    setStat('stPollution', Math.min(100, n * 4) + '%', n * 4);
    setStat('stWater', Math.max(0, 100 - n * 3) + '%', 100 - n * 3);
    setStat('stElectricity', Math.max(0, 100 - n * 3) + '%', 100 - n * 3);
    setStat('stBudget', '$' + budget.toLocaleString(), budget / 1000);
}

// ==========================================
// ANIMATION LOOP
// ==========================================
renderer.setAnimationLoop(() => {
    updateStats();
    controls.update();
    renderer.render(scene, camera);
});
