import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { assets } from './data/assetList.js';

import './style.css';


// ==========================================
// 1. SCENE
// ==========================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x87ceeb);


// ==========================================
// 2. CAMERA
// ==========================================

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.set(8, 8, 8);


// ==========================================
// 3. RENDERER
// ==========================================

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

renderer.shadowMap.enabled = true;

document.body.appendChild(renderer.domElement);


// ==========================================
// 4. LIGHTING
// ==========================================

const ambientLight = new THREE.AmbientLight(
    0xffffff,
    2
);

scene.add(ambientLight);


const directionalLight = new THREE.DirectionalLight(
    0xffffff,
    3
);

directionalLight.position.set(10, 20, 10);

directionalLight.castShadow = true;

scene.add(directionalLight);


// ==========================================
// 5. GROUND
// ==========================================

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({
        color: 0x555555
    })
);

ground.rotation.x = -Math.PI / 2;

ground.receiveShadow = true;

scene.add(ground);



// ==========================================
// 6. GRID
// ==========================================

const grid = new THREE.GridHelper(
    100,
    100
);

scene.add(grid);


// ==========================================
// 7. CAMERA CONTROLS
// ==========================================

const controls = new OrbitControls(
    camera,
    renderer.domElement
);

// ==========================================
// TRANSFORM CONTROLS
// ==========================================

const transformControls = new TransformControls(
    camera,
    renderer.domElement
);

scene.add(transformControls.getHelper());

transformControls.setMode('translate');

// ==========================================
// GRID SNAPPING
// ==========================================

transformControls.setTranslationSnap(1);

transformControls.setRotationSnap(
    THREE.MathUtils.degToRad(90)
);

transformControls.setScaleSnap(0.1);

transformControls.addEventListener(
    'dragging-changed',
    function (event) {

        controls.enabled = !event.value;

    }
);

controls.enableDamping = true;

controls.target.set(0, 0, 0);


// ==========================================
// 8. MODEL LOADER
// ==========================================

const loader = new GLTFLoader();


// ==========================================
// 9. RAYCASTING
// ==========================================

const raycaster = new THREE.Raycaster();

const mouse = new THREE.Vector2();


// ==========================================
// 10. PLACEMENT VARIABLES
// ==========================================

let placementModel = null;

let placementMode = false;

// Objects that have been placed in the city
const placedObjects = [];

// Currently selected object
let selectedObject = null;


// ==========================================
// 11. PREPARE MODEL
// ==========================================

function prepareModel(model) {

    model.traverse(function (object) {

        if (object.isMesh) {

            object.castShadow = true;
            object.receiveShadow = true;

        }

    });


    // Find model size
    const box = new THREE.Box3().setFromObject(model);


    // Find center
    const center = box.getCenter(
        new THREE.Vector3()
    );


    // Center model horizontally
    model.position.x -= center.x;

    model.position.z -= center.z;


    // Put bottom of model on ground
    const newBox = new THREE.Box3().setFromObject(model);

    model.position.y -= newBox.min.y;

}


// ==========================================
// 12. START PLACEMENT
// ==========================================

function startPlacement(asset) {

    // Prevent multiple placement models
    if (placementModel) {

        scene.remove(placementModel);

        placementModel = null;

    }


    loader.load(

        asset.model,

        function (gltf) {

            placementModel = gltf.scene;

            prepareModel(placementModel);

            scene.add(placementModel);

            placementMode = true;

            controls.enabled = false;

            document.getElementById(
                'buildingButton'
            ).textContent = 'Click Ground to Place';

            console.log(
                'Placement mode started:',
                asset.name
            );

        },

        function (progress) {

            console.log(
                'Loading:',
                (
                    progress.loaded /
                    progress.total *
                    100
                ).toFixed(0) + '%'
            );

        },

        function (error) {

            console.error(
                'MODEL LOADING ERROR:',
                error
            );

        }

    );

}


// ==========================================
// 13. MOUSE MOVE
// ==========================================

renderer.domElement.addEventListener(
    'pointermove',
    function (event) {

        if (!placementMode || !placementModel) {
            return;
        }


        // Get canvas position
        const rect =
            renderer.domElement.getBoundingClientRect();


        // Convert mouse position to Three.js coordinates
        mouse.x =
            ((event.clientX - rect.left) / rect.width)
            * 2 - 1;

        mouse.y =
            -((event.clientY - rect.top) / rect.height)
            * 2 + 1;


        // Shoot ray from camera
        raycaster.setFromCamera(
            mouse,
            camera
        );


        // Find where ray hits ground
        const intersections =
            raycaster.intersectObject(ground);


        if (intersections.length > 0) {

            const point =
                intersections[0].point;


            placementModel.position.x =
                point.x;

            placementModel.position.z =
                point.z;

        }

    }
);


// ==========================================
// 14. CLICK GROUND TO PLACE
// ==========================================

renderer.domElement.addEventListener(
    'click',
    function () {

        if (!placementMode || !placementModel) {
            return;
        }


        console.log(
            'BUILDING PLACED!',
            placementModel.position
        );


       // Save the building permanently
placedObjects.push(placementModel);

// Remember the object
selectedObject = placementModel;

// Select it immediately
transformControls.attach(selectedObject);

placementModel = null;

placementMode = false;

controls.enabled = true;


        document.getElementById(
            'buildingButton'
        ).textContent = '🏢 Building';

    }
);

// ==========================================
// SELECT EXISTING OBJECT
// ==========================================

renderer.domElement.addEventListener(
    'pointerdown',
    function (event) {

        // Don't select objects while placing a new one
        if (placementMode) {
            return;
        }

        const rect =
            renderer.domElement.getBoundingClientRect();

        mouse.x =
            ((event.clientX - rect.left) / rect.width)
            * 2 - 1;

        mouse.y =
            -((event.clientY - rect.top) / rect.height)
            * 2 + 1;

        raycaster.setFromCamera(
            mouse,
            camera
        );

        const intersections =
            raycaster.intersectObjects(
                placedObjects,
                true
            );

        if (intersections.length > 0) {

            let object =
                intersections[0].object;

            // Find the top-level placed model
            while (
                object.parent &&
                !placedObjects.includes(object)
            ) {
                object = object.parent;
            }

            if (placedObjects.includes(object)) {

                selectedObject = object;

                transformControls.attach(
                    selectedObject
                );

                console.log(
                    'SELECTED:',
                    selectedObject
                );

            }

        } else {

            // Clicked empty ground
            transformControls.detach();

            selectedObject = null;

        }

    }
);

// ==========================================
// KEYBOARD CONTROLS
// ==========================================

window.addEventListener(
    'keydown',
    function (event) {

        if (!selectedObject) {
            return;
        }

        // W = Move
        if (event.key.toLowerCase() === 'w') {
            transformControls.setMode('translate');
        }

        // E = Rotate
        if (event.key.toLowerCase() === 'e') {
            transformControls.setMode('rotate');
        }

        // R = Scale
        if (event.key.toLowerCase() === 'r') {
            transformControls.setMode('scale');
        }

        // Delete = Delete object
        if (event.key === 'Delete') {

            scene.remove(selectedObject);

            const index =
                placedObjects.indexOf(selectedObject);

            if (index !== -1) {
                placedObjects.splice(index, 1);
            }

            transformControls.detach();

            selectedObject = null;

            console.log(
                'OBJECT DELETED'
            );

        }

    }
);

// ==========================================
// CITY BUILDER UI
// ==========================================

const sidebar = document.createElement('div');

sidebar.id = 'sidebar';

sidebar.innerHTML = `
    <h2>🏙️ City Builder</h2>

    <div id="assetLibrary"></div>
`;

document.body.appendChild(sidebar);

// ==========================================
// ASSET LIBRARY
// ==========================================

const assetLibrary =
    document.getElementById('assetLibrary');


// Get all unique categories
const categories = [
    ...new Set(
        assets.map(
            asset => asset.category
        )
    )
];


// Create each category
categories.forEach(function (category) {

    // Category container
    const categorySection =
        document.createElement('div');

    categorySection.className =
        'categorySection';


    // Category header
    const categoryHeader =
        document.createElement('button');

    categoryHeader.className =
        'categoryHeader';

    categoryHeader.textContent =
        '▼ ' + category;


    // Container for assets
    const categoryItems =
        document.createElement('div');

    categoryItems.className =
        'categoryItems';


    // Add header
    categorySection.appendChild(
        categoryHeader
    );


    // Add assets container
    categorySection.appendChild(
        categoryItems
    );


    // Get assets in this category
    const categoryAssets =
        assets.filter(
            asset =>
                asset.category === category
        );


    // Create buttons
    categoryAssets.forEach(
        function (asset) {

            const button =
                document.createElement('button');

            button.className =
                'assetButton';

            button.textContent =
                '🏢 ' + asset.name;


            button.addEventListener(
                'click',
                function () {

                    startPlacement(
                        asset
                    );

                }
            );


            categoryItems.appendChild(
                button
            );

        }
    );


    // Open / close category
    categoryHeader.addEventListener(
        'click',
        function () {

            const isOpen =
                categoryItems.style.display !== 'none';


            if (isOpen) {

                categoryItems.style.display =
                    'none';

                categoryHeader.textContent =
                    '▶ ' + category;

            } else {

                categoryItems.style.display =
                    'block';

                categoryHeader.textContent =
                    '▼ ' + category;

            }

        }
    );


    assetLibrary.appendChild(
        categorySection
    );

});

// ==========================================
// 16. WINDOW RESIZE
// ==========================================

window.addEventListener(
    'resize',
    function () {

        camera.aspect =
            window.innerWidth /
            window.innerHeight;


        camera.updateProjectionMatrix();


        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

    }
);


// ==========================================
// 17. ANIMATION LOOP
// ==========================================

function animate() {

    controls.update();

    renderer.render(
        scene,
        camera
    );

}

renderer.setAnimationLoop(
    animate
);
