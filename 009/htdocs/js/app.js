(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = "// 現在の位置情報を決定する\n#define delta (1.0 / 60.0)\n\nvoid main() {\n  vec2 uv = gl_FragCoord.xy / resolution.xy;\n  vec4 tmpPos = texture2D(texturePosition, uv);\n  vec3 pos = tmpPos.xyz;\n  vec4 tmpVel = texture2D(textureVelocity, uv);\n  // velが移動する方向(もう一つ下のcomputeShaderVelocityを参照)\n  vec3 vel = tmpVel.xyz;\n  // 移動する方向に速度を掛け合わせた数値を現在地に加える。\n  pos += vel * delta;\n  gl_FragColor = vec4(pos, 1.0);\n}\n";

},{}],2:[function(require,module,exports){
module.exports = "// 移動方向についていろいろ計算できるシェーダー。\n// 今回はなにもしてない。\n// ここでVelのx y zについて情報を上書きすると、それに応じて移動方向が変わる\n// #include <common>\n\nvoid main() {\n  vec2 uv = gl_FragCoord.xy / resolution.xy;\n  float idParticle = uv.y * resolution.x + uv.x;\n  vec4 tmpVel = texture2D(textureVelocity, uv);\n  vec3 vel = tmpVel.xyz;\n  gl_FragColor = vec4(vel.xyz, 1.0);\n}\n";

},{}],3:[function(require,module,exports){
module.exports = "// VertexShaderから受け取った色を格納するだけ。\nvarying vec4 vColor;\n\nvoid main() {\n  // 丸い形に色をぬるための計算\n  float f = length(gl_PointCoord - vec2(0.5, 0.5));\n  if (f > 0.1) {\n    discard;\n  }\n  gl_FragColor = vColor;\n}\n";

},{}],4:[function(require,module,exports){
module.exports = "// #include <common>\n\nuniform sampler2D texturePosition;\nuniform float cameraConstant;\nuniform float density;\nvarying vec4 vColor;\nvarying vec2 vUv;\nuniform float radius;\n\nvoid main() {\n  vec4 posTemp = texture2D(texturePosition, uv);\n  vec3 pos = posTemp.xyz;\n  vColor = vec4(1.0, 0.0, 1.0, 1.0);\n  // ポイントのサイズを決定\n  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);\n  gl_PointSize = 0.5 * cameraConstant / (- mvPosition.z);\n  // uv情報の引き渡し\n  vUv = uv;\n  // 変換して格納\n  gl_Position = projectionMatrix * mvPosition;\n}\n";

},{}],5:[function(require,module,exports){
'use strict';

(function () {

  // ==================================================
  // 　　MAIN
  // ==================================================

  window.addEventListener('load', function () {

    // ==================================================
    // 　　CLASS
    // ==================================================

    var computeVert = require('./../_shader/compute.vert');
    var computeFrag = require('./../_shader/compute.frag');
    var perticleVert = require('./../_shader/perticle.vert');
    var perticleFrag = require('./../_shader/perticle.frag');

    var w = 500;
    var perticles = w * w;

    // メモリ負荷確認用
    var stats = void 0;

    // 基本セット
    var container = void 0,
        camera = void 0,
        scene = void 0,
        renderer = void 0,
        geometry = void 0,
        controls = void 0;

    // gpgpuをするために必要なオブジェクト達
    var gpuCompute = void 0;
    var velocityVariable = void 0;
    var positionVariable = void 0;
    var positionUniforms = void 0;
    var velocityUniforms = void 0;
    var particleUniforms = void 0;
    var effectController = void 0;

    var init = function init() {

      // 一般的なThree.jsにおける定義部分
      container = document.createElement('div');
      document.body.appendChild(container);
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 5, 15000);
      camera.position.y = 120;
      camera.position.z = 200;
      scene = new THREE.Scene();
      renderer = new THREE.WebGLRenderer();
      renderer.setClearColor(0x000000);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      container.appendChild(renderer.domElement);
      controls = new THREE.OrbitControls(camera, renderer.domElement);

      stats = new Stats();
      // container.appendChild(stats.dom);
      stats.setMode(0);
      stats.domElement.style.position = 'absolute';
      stats.domElement.style.left = '0px';
      stats.domElement.style.top = '0px';
      container.appendChild(stats.domElement);

      window.addEventListener('resize', onWindowResize, false);

      // ***** このコメントアウトについては後述 ***** //
      //        effectController = {
      //            time: 0.0,
      //        };

      // ①gpuCopute用のRenderを作る
      initComputeRenderer();

      // ②particle 初期化
      initPosition();
    };

    // ①gpuCopute用のRenderを作る
    var initComputeRenderer = function initComputeRenderer() {

      // gpgpuオブジェクトのインスタンスを格納
      gpuCompute = new GPUComputationRenderer(w, w, renderer);

      // 今回はパーティクルの位置情報と、移動方向を保存するテクスチャを2つ用意します
      var dtPosition = gpuCompute.createTexture();
      var dtVelocity = gpuCompute.createTexture();

      // テクスチャにGPUで計算するために初期情報を埋めていく
      fillTextures(dtPosition, dtVelocity);

      // shaderプログラムのアタッチ
      velocityVariable = gpuCompute.addVariable("textureVelocity", computeVert, dtVelocity);
      positionVariable = gpuCompute.addVariable("texturePosition", computeFrag, dtPosition);

      // 一連の関係性を構築するためのおまじない
      gpuCompute.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable]);
      gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);

      // uniform変数を登録したい場合は以下のように作る
      /*
      positionUniforms = positionVariable.material.uniforms;
      velocityUniforms = velocityVariable.material.uniforms;
       velocityUniforms.time = { value: 0.0 };
      positionUniforms.time = { ValueB: 0.0 };
      ***********************************
      たとえば、上でコメントアウトしているeffectControllerオブジェクトのtimeを
      わたしてあげれば、effectController.timeを更新すればuniform変数も変わったり、ということができる
      velocityUniforms.time = { value: effectController.time };
      ************************************
      */

      // error処理
      var error = gpuCompute.init();
      if (error !== null) {
        console.error(error);
      }
    };

    // restart用関数 今回は使わない
    var restartSimulation = function restartSimulation() {
      var dtPosition = gpuCompute.createTexture();
      var dtVelocity = gpuCompute.createTexture();
      fillTextures(dtPosition, dtVelocity);
      gpuCompute.renderTexture(dtPosition, positionVariable.renderTargets[0]);
      gpuCompute.renderTexture(dtPosition, positionVariable.renderTargets[1]);
      gpuCompute.renderTexture(dtVelocity, velocityVariable.renderTargets[0]);
      gpuCompute.renderTexture(dtVelocity, velocityVariable.renderTargets[1]);
    };

    // ②パーティクルそのものの情報を決めていく。
    var initPosition = function initPosition() {

      // 最終的に計算された結果を反映するためのオブジェクト。
      // 位置情報はShader側(texturePosition, textureVelocity)
      // で決定されるので、以下のように適当にうめちゃってOK

      geometry = new THREE.BufferGeometry();
      var positions = new Float32Array(perticles * 3);
      var p = 0;
      for (var i = 0; i < perticles; i++) {
        positions[p++] = 0;
        positions[p++] = 0;
        positions[p++] = 0;
      }

      // uv情報の決定。テクスチャから情報を取り出すときに必要
      var uvs = new Float32Array(perticles * 2);
      p = 0;
      for (var j = 0; j < w; j++) {
        for (var _i = 0; _i < w; _i++) {
          uvs[p++] = _i / (w - 1);
          uvs[p++] = j / (w - 1);
        }
      }

      // attributeをgeometryに登録する
      geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.addAttribute('uv', new THREE.BufferAttribute(uvs, 2));

      // uniform変数をオブジェクトで定義
      // 今回はカメラをマウスでいじれるように、計算に必要な情報もわたす。
      particleUniforms = {
        texturePosition: {
          value: null
        },
        textureVelocity: {
          value: null
        },
        cameraConstant: {
          value: getCameraConstant(camera)
        }
      };

      // Shaderマテリアル これはパーティクルそのものの描写に必要なシェーダー
      var material = new THREE.ShaderMaterial({
        uniforms: particleUniforms,
        vertexShader: perticleVert,
        fragmentShader: perticleFrag
      });
      material.extensions.drawBuffers = true;
      var particles = new THREE.Points(geometry, material);
      particles.matrixAutoUpdate = false;
      particles.updateMatrix();

      // パーティクルをシーンに追加
      scene.add(particles);
    };

    var fillTextures = function fillTextures(texturePosition, textureVelocity) {

      // textureのイメージデータをいったん取り出す
      var posArray = texturePosition.image.data;
      var velArray = textureVelocity.image.data;

      // パーティクルの初期の位置は、ランダムなXZに平面おく。
      // 板状の正方形が描かれる

      for (var k = 0, kl = posArray.length; k < kl; k += 4) {
        // Position
        var x = void 0,
            y = void 0,
            z = void 0;
        x = Math.random() * 500 - 250;
        z = Math.random() * 500 - 250;
        y = 0;
        // posArrayの実態は一次元配列なので
        // x,y,z,wの順番に埋めていく。
        // wは今回は使用しないが、配列の順番などを埋めておくといろいろ使えて便利
        posArray[k + 0] = x;
        posArray[k + 1] = y;
        posArray[k + 2] = z;
        posArray[k + 3] = 0;

        // 移動する方向はとりあえずランダムに決めてみる。
        // これでランダムな方向にとぶパーティクルが出来上がるはず。
        velArray[k + 0] = Math.random() * 2 - 1;
        velArray[k + 1] = Math.random() * 2 - 1;
        velArray[k + 2] = Math.random() * 2 - 1;
        velArray[k + 3] = Math.random() * 2 - 1;
      }
    };

    // カメラオブジェクトからシェーダーに渡したい情報を引っ張ってくる関数
    // カメラからパーティクルがどれだけ離れてるかを計算し、パーティクルの大きさを決定するため。
    var getCameraConstant = function getCameraConstant(camera) {
      return window.innerHeight / (Math.tan(THREE.Math.DEG2RAD * 0.5 * camera.fov) / camera.zoom);
    };

    // 画面がリサイズされたときの処理
    // ここでもシェーダー側に情報を渡す。
    var onWindowResize = function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      particleUniforms.cameraConstant.value = getCameraConstant(camera);
    };

    var animate = function animate() {
      requestAnimationFrame(animate);
      render();
      stats.update();
    };

    var render = function render() {

      // 計算用のテクスチャを更新
      gpuCompute.compute();

      // 計算した結果が格納されたテクスチャをレンダリング用のシェーダーに渡す
      particleUniforms.texturePosition.value = gpuCompute.getCurrentRenderTarget(positionVariable).texture;
      particleUniforms.textureVelocity.value = gpuCompute.getCurrentRenderTarget(velocityVariable).texture;
      renderer.render(scene, camera);
    };

    init();
    animate();
  }, false);
})();

},{"./../_shader/compute.frag":1,"./../_shader/compute.vert":2,"./../_shader/perticle.frag":3,"./../_shader/perticle.vert":4}]},{},[5]);
