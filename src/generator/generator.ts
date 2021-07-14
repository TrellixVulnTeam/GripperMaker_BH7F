import * as THREE from 'three';
import {
    AnimationUtils,
    BoxGeometry,
    Camera,
    Color,
    CylinderGeometry,
    Group,
    Mesh,
    MeshLambertMaterial,
    PerspectiveCamera,
    Renderer,
    Scene
} from "three";

import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {ThreeMFLoader} from "three/examples/jsm/loaders/3MFLoader";

export class Generator {

    scene: Scene;
    camera: PerspectiveCamera;
    renderer: Renderer;

    geometryBox: BoxGeometry = new THREE.BoxGeometry();
    geometryRect: CylinderGeometry = new THREE.CylinderGeometry()
    material: MeshLambertMaterial = new THREE.MeshLambertMaterial( { color: 0x363636 });
    spacing: number = 0.2;

    spacingX: HTMLElement = document.getElementById("spacingX");
    spacingY:HTMLElement = document.getElementById("spacingY");
    
    suctionX: HTMLElement = document.getElementById("suctionX");
    suctionY:HTMLElement = document.getElementById("suctionY");

    //Models
    suctionModel: THREE.Scene;
    jointModel: THREE.Scene;
    connectionModel: THREE.Scene;
    plateModel: THREE.Scene;
    topModel: THREE.Group;

    objectGroup: Group = new THREE.Group();

    maxDistance: number = 265;
    minDistance: number = 35;

    constructor() {

        //Bindings
        this.didResize = this.didResize.bind(this);
        this.render = this.render.bind(this);

        window.addEventListener("resize", this.didResize);
    }

    async run(bWidth: number, bHeight: number, bAmount: number, bWeight: number) {

        await this.createScene();
        const result: GeneratorResult = this.generate(bWidth, bHeight, bAmount, bWeight);

        this.suctionX.innerHTML = "Suction X:  " + String(result.xCups);
        this.suctionY.innerHTML = "Suction Y: " + String(result.yCups);

        this.spacingX.innerHTML = "Spacing X " + String(result.distanceX);
        this.spacingY.innerHTML = "Spacing Y " + String(result.distanceY);

        console.log(result);

        this.display3DPattern([result.xCups, result.yCups], [result.distanceX, result.distanceY]);
    }

    async loadModels() {
        this.suctionModel = await this.loadModel('./resources/suction.dae');
        this.jointModel = await this.loadModel('./resources/joint.dae');
        this.connectionModel = await this.loadModel('./resources/connection.dae');
        this.plateModel = await this.loadModel('./resources/plate.dae');
    }

    loadModel(file):Promise<THREE.Scene> {
        return new Promise((resolve, reject) => {
            const loader = new ColladaLoader();
            loader.load(file, function (collada) {
                const obj = collada.scene;
                resolve(obj);
            });
        })
    }

    async createScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.scene.background = new THREE.Color(0xe6e6e6);
        this.renderer = new THREE.WebGLRenderer();

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        const controls = new OrbitControls(this.camera, this.renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xcfc8be);
        this.scene.add(ambientLight);

        const light = new THREE.PointLight(0xf2efe9, 1, 100);
        light.position.set(-15 , 15, -10);
        this.scene.add(light);

        this.camera.position.set(1, 1, 1);
        controls.update();

        await this.loadModels();
        this.didResize();
        this.render();

        this.camera.position.z = 5;
        document.body.appendChild(this.renderer.domElement);
    }

    render() {
        requestAnimationFrame(this.render);
        this.renderer.render(this.scene, this.camera);
    }

    checkBoxDimensions(numBoxes: number, bWidth: number, bHeight: number) {
        if (numBoxes > 8) {
            return false
        }
        const minHeight = Math.ceil((this.minDistance * (numBoxes + 1)) / (numBoxes - 1));
        const minWidth = this.minDistance;

        return (bWidth > minWidth) && (bHeight > minHeight);
    }

    createHelperBox(width, height) {
        const box = new THREE.BoxGeometry(width, height);
        const treeDBox = new THREE.Mesh(box, this.material);
        const helperBox = new THREE.Box3().setFromObject(treeDBox);
        console.log("Helperbox: ", helperBox);
    }

    calculateNumNodesHeight(numBoxes: number, boxHeight: number) {
        const dividend = ((numBoxes - 1) * boxHeight);
        const divisor = ((numBoxes + 1) * this.maxDistance);
        console.log(dividend, divisor, dividend / divisor);
        return numBoxes + Math.floor(dividend / divisor);
    }

    calculateNumNodesWidth(boxWidth: number) {
        const dividend = (boxWidth);
        const divisor = (this.maxDistance);
        return 2 + Math.floor(dividend / divisor);
    }

    generate(bWidth: number, bHeight: number, bAmount, bWeight): GeneratorResult {
        if (bWidth < this.minDistance) {
            alert("Width ist grösser als minDistance");
            return;
        }

        const boxLimitX = this.calculateNumNodesWidth(bWidth);
        const weightLimitX = Math.max(2, Math.ceil(bWeight / 1.5));

        let xCupsPerBox = Math.max(boxLimitX, weightLimitX);
        const yCupsPerBox = this.calculateNumNodesHeight(bAmount, bHeight);

        let distanceX = bWidth / xCupsPerBox;
        let distanceY = ((bAmount - 1) * bHeight) / (bAmount);

        if (distanceX < this.minDistance) {
            alert("Too much weight!");
            return;
        }

        return {
            xCups: xCupsPerBox,
            yCups: yCupsPerBox,
            distanceX: distanceX,
            distanceY: distanceY
        };
    }

    calculateDistance(length: number, cups: number): number {
        for (let distance = this.minDistance; distance <= this.maxDistance; distance++) {

            if (length / distance == cups) {
                return distance;
            }
        }
        return this.minDistance;
    }

    getXAmount(x) {
        if (x > this.maxDistance) {
            return Math.ceil(x/this.maxDistance) + 1;
        } else {
            return 2;
        }
    }

    display3DPattern(pattern: number[], spacing: number[]) {
        let width = pattern[0];
        let height = pattern[1];
        let spacingX = spacing[0] * 0.01; // Scale by 10^-2 to convert mm to m.
        let spacingY = spacing[1] * 0.01;

        for (let i = 0; i < width*height; i ++)  {
            const x = i % width;
            const y = Math.floor(i / width);
            
            const joint = this.jointModel.clone();
            const connectionVert = this.connectionModel.clone();
            const piGrip = this.suctionModel.clone();
            const connectionHoriz = this.connectionModel.clone();

            joint.position.set(x * (1 + spacingX), y * (1 +spacingY), 0);
            joint.scale.set(15, 15, 15);
            joint.rotation.set(Math.PI, 0, 0);

            if (x > 0) {
                connectionHoriz.scale.set((1 + spacingX) * 18, 15, 15);
                connectionHoriz.position.set(x * (1 + spacingX), y * (1 + spacingY), 0);
                connectionHoriz.rotation.set(0, 0, Math.PI);

                this.objectGroup.add(connectionHoriz);
            }


            piGrip.scale.set(0.3, 0.3, 0.3);
            piGrip.position.set(x * (1 + spacingX), y * (1 + spacingY), 0.2);
            piGrip.rotation.set(Math.PI, 0, 0 );

            this.objectGroup.add(joint);
            this.objectGroup.add(piGrip);

            if (y > 0) {
                connectionVert.scale.set( (1 + spacingY) * 20, 15, 15);
                connectionVert.position.set(x * (1 + spacingX), y-1 + ((y-1)*spacingY), 0);
                connectionVert.rotation.set(0, 0 , Math.PI/2);
                this.objectGroup.add(connectionVert);
            }

            if (i === width*height - 1) {
                const plate = this.plateModel.clone();

                const posTemp = [(x * (1 + spacingX))/2, (y * (1 + spacingY))/2, -0.5]
                plate.scale.set(15, 15, 15);
                plate.position.set(posTemp[0],posTemp[1], posTemp[2]);
                plate.rotation.set(Math.PI, 0, (width % 2 == 0) ? 0 : (Math.PI / 2));
                this.objectGroup.add(plate);

                if (height % 2 == 0) {
                    const stick = this.connectionModel.clone();
                    const stickWidth = (1 + spacingX) * 18;
                    stick.scale.set(stickWidth, 15, 15);
                    stick.position.set(x * (1 + spacingX),posTemp[1], posTemp[2]);
                    stick.rotation.set(0, 0, Math.PI);
                    this.objectGroup.add(stick);
                }
            }

        }
        this.scene.add(this.objectGroup);
    }

    isSquare(num) {
        return num > 0 && Math.sqrt(num) % 1 == 0;
    }

    isDevisable(num) {
        let devisableNums = [];
        for (let i = 0; i < num; i++) {
            if (num % i == 0 && i != 1) {
                devisableNums.push(i);
            }
        }
        return devisableNums;
    }

    generatePattern(num: number): number[] {
        let pattern: number[] = [];

        if (this.isSquare(num)) {
            pattern = [Math.sqrt(num) , Math.sqrt(num)];
            return pattern;
        } else {
            let tempArr = this.isDevisable(num);
            if (tempArr.length == 0) { return [1, num]; }
            let res, min;
            for (let i = 0; i < tempArr.length; i++) {
                for (let j = 0; j < tempArr.length; j++) {
                    if (tempArr[i] * tempArr[j] == num) {
                        const sum = tempArr[i] + tempArr[j];
                        if (!min || sum < min) {
                            min = sum;
                            res = [tempArr[i], tempArr[j]];
                        }
                    }
                }
            }
            return res;
        }
    }

    didResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.renderer.setSize(2 * width, 2 * height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        const canvas = this.renderer.domElement;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
    }
}

interface GeneratorResult {
    xCups: number;
    yCups: number;
    distanceX: number;
    distanceY: number;
}

