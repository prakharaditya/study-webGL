const THREE = require('three/build/three.js');
const OBJLoader = require('three-obj-loader')(THREE);
const SVGLoader = require('./SVGLoader.js')(THREE);
const OrbitControls = require('three-orbit-controls')(THREE);

const Mesh = require('./Mesh').default;
const Post = require('./Post').default;

export default class Model {
  constructor() {
    this.ua;
    this.renderer;
    this.scene;
    this.camera;

    this.directional;
    this.ambient;

    this.mesh;
    this.cubeTexture;

    this.rendererPost;
    this.scenePost;
    this.cameraPost;
    this.post;

    this.controls;

    this.winWidth = window.innerWidth;
    this.winHeight = window.innerHeight;
    this.targetDOM = document.getElementById('canvas');
    this.parameterCamera = {
      fovy: 60,
      aspect: this.winWidth / this.winHeight,
      near: 0.01,
      far: 5000.0,
      x: 0.0,
      y: 0.0,
      z: 10.0,
      lookAt: new THREE.Vector3(0.0, 0.0, 0.0)
    };
    this.count = null;
  }
  onLoad() {

    this.targetDOM.width *= devicePixelRatio;
    this.targetDOM.height *= devicePixelRatio;
    this.targetDOM.style.width = String(this.targetDOM.width / devicePixelRatio) + 'px';

    // ===== scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000000, 0.01, 1000);

    // ===== camera
    this.camera = new THREE.PerspectiveCamera(
      this.parameterCamera.fovy,
      this.parameterCamera.aspect,
      this.parameterCamera.near,
      this.parameterCamera.far
    );
    this.camera.position.x = this.parameterCamera.x;
    this.camera.position.y = this.parameterCamera.y;
    this.camera.position.z = this.parameterCamera.z;
    this.camera.lookAt(this.parameterCamera.lookAt);

    // ===== renderer
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(this.winWidth, this.winHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ===== append
    this.targetDOM.appendChild(this.renderer.domElement);

    this.createMesh();
    this.createLight();
    this.createPost();

    this.loop();
    this.animation();

    this.controls = new OrbitControls(this.camera);

    // this.mesh.uniforms.resolution.value.x = this.renderer.domElement.width;
    // this.mesh.uniforms.resolution.value.y = this.renderer.domElement.height;
    // this.post.uniforms.resolution.value.x = this.renderer.domElement.width;
    // this.post.uniforms.resolution.value.y = this.renderer.domElement.height;

  }
  onResize() {
    this.winWidth = window.innerWidth;
    this.winHeight = window.innerHeight;
    this.camera.aspect = this.winWidth / this.winHeight;
    this.camera.updateProjectionMatrix();
    this.cameraPost.aspect = this.winWidth / this.winHeight;
    this.cameraPost.updateProjectionMatrix();
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(this.winWidth, this.winHeight);
    this.rendererPost.setSize(this.winWidth, this.winHeight);
    this.rendererPost.setSize(this.winWidth * window.devicePixelRatio || 1, this.winHeight * window.devicePixelRatio || 1);

    // this.mesh.uniforms.resolution.value.x = this.renderer.domElement.width;
    // this.mesh.uniforms.resolution.value.y = this.renderer.domElement.height;
    // this.post.uniforms.resolution.value.x = this.renderer.domElement.width;
    // this.post.uniforms.resolution.value.y = this.renderer.domElement.height;
  }
  onMousemove(e) {
    let x = e.clientX * 2.0 - this.winWidth;
    let y = e.clientY * 2.0 - this.winHeight;
    x /= this.winWidth;
    y /= this.winHeight;

    // this.mesh.object.rotation.x = Math.PI * (y * 0.1);
    // this.mesh.object.rotation.y = -Math.PI * 0.5 + Math.PI * (x * 0.1);
    // this.mesh.object.position.x = -x * 0.1;
    // this.mesh.object.position.y =  y * 0.1;

    // this.mesh.uniforms.mouse.value.x = e.pageX;
    // this.mesh.uniforms.mouse.value.y = e.pageY;
    // this.post.uniforms.mouse.value.x = e.pageX;
    // this.post.uniforms.mouse.value.y = e.pageY;
  }
  loop() {
    this.count++;
    this.renderer.setClearColor(new THREE.Color(0xffffff));
    this.renderer.render(this.scene, this.camera, this.rendererPost);
    this.renderer.setClearColor(new THREE.Color(0xffffff));
    this.renderer.render(this.scenePost, this.cameraPost);
    requestAnimationFrame(this.loop.bind(this));
  }
  animation() {
    // this.mesh.uniforms.time.value += 0.05;
    // this.post.uniforms.time.value += 0.05;

    this.scene.rotation.y = - this.count * 0.02;

    requestAnimationFrame(this.animation.bind(this));
  }
  createMesh() {

    this.mesh = new Mesh;
    this.mesh.createObject();
    setTimeout(() => {
      this.scene.add(this.mesh.object);
    }, 1000);

  }
  createLight() {
    this.ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambient);
    this.directional = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directional.position.set(10.0, 10.0, 10.0);
    this.directional.castShadow = true;
    this.directional.shadow.mapSize.width = 1024;
    this.directional.shadow.mapSize.height = 1024;
    this.directional.shadow.camera.near = 0.01;
    this.directional.shadow.camera.far = 500;
    this.scene.add(this.directional);
  }
  createPost() {
    this.scenePost = new THREE.Scene();
    this.cameraPost = new THREE.PerspectiveCamera(
      this.parameterCamera.fovy,
      this.parameterCamera.aspect,
      this.parameterCamera.near,
      this.parameterCamera.far
    );
    this.cameraPost.position.x = this.parameterCamera.x;
    this.cameraPost.position.y = this.parameterCamera.y;
    this.cameraPost.position.z = 0.0;
    this.cameraPost.lookAt(this.parameterCamera.lookAt);
    this.rendererPost = new THREE.WebGLRenderTarget(
      this.winWidth,
      this.winHeight, {
      magFilter: THREE.NearestFilter,
      minFilter: THREE.NearestFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping
    });
    this.rendererPost.setSize(this.winWidth * window.devicePixelRatio || 1, this.winHeight * window.devicePixelRatio || 1);
    this.post = new Post(this.rendererPost.texture);
    this.scenePost.add(this.post.object);
  }
  init() {
    window.addEventListener('load', this.onLoad.bind(this), false);
    window.addEventListener('resize', this.onResize.bind(this), false);
    window.addEventListener('mousemove', this.onMousemove.bind(this), false);
  }
}
