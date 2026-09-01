import * as THREE from 'https://cdn.skypack.dev/three@0.129.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'https://cdn.skypack.dev/gsap'

const camera = new THREE.PerspectiveCamera(
    10,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 13;

const scene = new THREE.Scene();
let dress1;
const loader = new GLTFLoader();
loader.load('/dress.glb',
    function (gltf) {
        dress1 = gltf.scene;
        scene.add(dress1);
        modelMove();
    },
    function (xhr) {},
    function (error) {}
);
const renderer = new THREE.WebGLRenderer({alpha: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('container3D').appendChild(renderer.domElement);

//light
const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
scene.add(ambientLight);

const topLight = new THREE.DirectionalLight(0xffffff, 1);
topLight.position.set(0, 0, 0);
scene.add(topLight);

const reRender3D = () => {
    requestAnimationFrame(reRender3D);
    renderer.render(scene, camera);
};
reRender3D();

let arrPositionModel = [
    {
        id: 'banner',
        position: {x: 1.7, y: -0.9, z: -5},
        rotation: {x: 0, y: 3, z: 0.5}
    },
    {
        id: 'intro',
        position: {x: -1.7, y: -1, z: 0},
        rotation: {x: 0, y: -4, z: 0}
    },
    {
        id: 'description',
        position: {x: 12, y: -6, z: -5},
        rotation: {x: 0, y: 12, z: 0}
    },
    {
        id: 'contact',
        position: {x: -1.7, y: -1, z: 0},
        rotation: {x: 0, y: 7.5, z: 0}
    },
];
const modelMove = () => {
    const sections = document.querySelectorAll('.section');
    let currentSection;
    sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top<= window.innerHeight /3){
            currentSection = section.id;
        }
    });
    let position_active = arrPositionModel.findIndex(
        (val) => val.id ==currentSection
    );
    if (position_active >= 0) {
        let new_coordinates = arrPositionModel[position_active];
        gsap.to(dress1.position, {
            x: new_coordinates.position.x,
            y: new_coordinates.position.y,
            z: new_coordinates.position.z,
            duration: 3,
            ease: "power1.out"
        });
        gsap.to(dress1.rotation, {
            x: new_coordinates.rotation.x,
            y: new_coordinates.rotation.y,
            z: new_coordinates.rotation.z,
            duration: 3,
            ease: "power1.out"
        })
    }
}
window.addEventListener('scroll', () => {
    if (dress1) {
        modelMove();
    }
});