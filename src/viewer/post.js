// Bitropolis — shaders « Beaux » et « Fou » : la scène est d'abord dessinée dans une image à grande dynamique,
// puis retravaillée par quelques shaders plein écran avant d'aller à l'écran. Sans dépendance.
//  - Beaux : halo lumineux (les lampes, les néons, les fenêtres la nuit et les reflets du soleil débordent un peu
//    autour d'eux) et léger assombrissement des coins.
//  - Fou (`ultra`) : en plus, des rayons de lumière qui partent du soleil, un flou « maquette » en haut et en bas
//    de l'image (la ville ressemble à une miniature), une légère frange colorée sur les bords, des couleurs plus
//    denses et un grain très fin.
// Si la carte graphique ne sait pas dessiner dans une image à virgule flottante, `ok` vaut false et la visionneuse
// garde son rendu simple.
export class FxPost {
  constructor(renderer) {
    this.renderer = renderer;
    const ext = renderer.extensions;
    this.ok = !!renderer.capabilities.isWebGL2 && !!(ext.get('EXT_color_buffer_float') || ext.get('EXT_color_buffer_half_float'));
    this.ultra = false;
    this.w = 0; this.h = 0;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.stage = new THREE.Scene();
    this.stage.add(this.quad);
    const vertexShader = 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
    const pass = (uniforms, fragmentShader, toneMapped = false) => new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, depthTest: false, depthWrite: false, toneMapped });
    // ce qui dépasse le seuil de luminosité (avec une entrée progressive)
    this.mBright = pass({ tMap: { value: null }, uThreshold: { value: 1 } }, `
      uniform sampler2D tMap; uniform float uThreshold; varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tMap, vUv).rgb;
        float l = max(c.r, max(c.g, c.b));
        c *= max(l - uThreshold, 0.0) / max(l, 1e-4);
        gl_FragColor = vec4(min(c, vec3(6.0)), 1.0);
      }`);
    // flou gaussien dans une direction
    this.mBlur = pass({ tMap: { value: null }, uDir: { value: new THREE.Vector2() } }, `
      uniform sampler2D tMap; uniform vec2 uDir; varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tMap, vUv).rgb * 0.227;
        c += (texture2D(tMap, vUv + uDir * 1.385).rgb + texture2D(tMap, vUv - uDir * 1.385).rgb) * 0.316;
        c += (texture2D(tMap, vUv + uDir * 3.231).rgb + texture2D(tMap, vUv - uDir * 3.231).rgb) * 0.070;
        gl_FragColor = vec4(c, 1.0);
      }`);
    // rayons de lumière : ce qui brille est étiré vers la position du soleil à l'écran
    this.mRays = pass({ tMap: { value: null }, uSun: { value: new THREE.Vector2(0.5, 0.5) }, uAmount: { value: 0 } }, `
      uniform sampler2D tMap; uniform vec2 uSun; uniform float uAmount; varying vec2 vUv;
      void main() {
        vec2 stepUv = (uSun - vUv) / 30.0 * 0.92, p = vUv;
        vec3 c = vec3(0.0); float w = 1.0;
        for (int i = 0; i < 30; i++) { c += texture2D(tMap, p).rgb * w; w *= 0.95; p += stepUv; }
        gl_FragColor = vec4(c * uAmount / 14.0, 1.0);
      }`);
    // image finale : scène + halos (+ effets « Fou »), coins assombris, puis mise à l'écran (ton et couleurs comme le rendu simple)
    this.mMix = pass({
      tScene: { value: null }, tNear: { value: null }, tFar: { value: null }, tSoft: { value: null }, tRays: { value: null },
      uStrength: { value: 0.9 }, uVignette: { value: 0.22 }, uUltra: { value: 0 }, uTime: { value: 0 }
    }, `
      uniform sampler2D tScene; uniform sampler2D tNear; uniform sampler2D tFar; uniform sampler2D tSoft; uniform sampler2D tRays;
      uniform float uStrength; uniform float uVignette; uniform float uUltra; uniform float uTime; varying vec2 vUv;
      void main() {
        vec2 d = vUv - 0.5;
        float r2 = dot(d, d);
        vec3 c = texture2D(tScene, vUv).rgb;
        if (uUltra > 0.5) {
          // frange colorée vers les bords, comme un objectif
          vec2 off = d * r2 * 0.012;
          c.r = texture2D(tScene, vUv + off).r;
          c.b = texture2D(tScene, vUv - off).b;
          // flou « maquette » : net au milieu de l'image, de plus en plus flou vers le haut et le bas
          // (moins fort en haut : c'est là que sont le ciel et ses étoiles)
          c = mix(c, texture2D(tSoft, vUv).rgb, smoothstep(0.17, 0.47, abs(vUv.y - 0.5)) * (vUv.y > 0.5 ? 0.5 : 0.92));
          c += texture2D(tRays, vUv).rgb;
        }
        c += (texture2D(tNear, vUv).rgb * 0.55 + texture2D(tFar, vUv).rgb * 0.8) * uStrength;
        if (uUltra > 0.5) {
          // couleurs plus denses, grain très fin
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = max(mix(vec3(l), c, 1.16), 0.0);
          c *= 1.0 + (fract(sin(dot(vUv * 913.0 + uTime, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.035;
        }
        c *= 1.0 - uVignette * smoothstep(0.3, 0.95, r2 * 2.0);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`, true);
  }

  setSize(w, h) {
    w = Math.max(2, Math.floor(w)); h = Math.max(2, Math.floor(h));
    if (w === this.w && h === this.h) return;
    this.dispose();
    this.w = w; this.h = h;
    const rt = (W, H, extra = {}) => new THREE.WebGLRenderTarget(Math.max(1, W), Math.max(1, H), { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, ...extra });
    this.rtScene = rt(w, h, { depthBuffer: true, samples: 4 });
    this.rtNear = [rt(w >> 1, h >> 1), rt(w >> 1, h >> 1)];
    this.rtFar = [rt(w >> 2, h >> 2), rt(w >> 2, h >> 2)];
    this.rtSoft = [rt(w >> 1, h >> 1), rt(w >> 1, h >> 1)]; // scène floutée (flou « maquette »)
    this.rtRays = rt(w >> 2, h >> 2);
  }

  dispose() {
    for (const t of [this.rtScene, ...(this.rtNear || []), ...(this.rtFar || []), ...(this.rtSoft || []), this.rtRays]) if (t) t.dispose();
    this.rtScene = null; this.rtNear = null; this.rtFar = null; this.rtSoft = null; this.rtRays = null; this.w = 0; this.h = 0;
  }

  _pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.stage, this.cam);
  }
  _blur(src, pair, spread) {
    this.mBlur.uniforms.tMap.value = src.texture;
    this.mBlur.uniforms.uDir.value.set(spread / pair[0].width, 0);
    this._pass(this.mBlur, pair[1]);
    this.mBlur.uniforms.tMap.value = pair[1].texture;
    this.mBlur.uniforms.uDir.value.set(0, spread / pair[0].height);
    this._pass(this.mBlur, pair[0]);
  }

  // night : 0 (jour) … 1 (nuit) — la nuit, le seuil baisse pour que les fenêtres éclairées aient aussi leur halo.
  // sun : { x, y, amount } position du soleil à l'écran (0 … 1) et force des rayons ; time : horloge (grain).
  render(scene, camera, night = 0, sun = null, time = 0) {
    const r = this.renderer, size = r.getDrawingBufferSize(new THREE.Vector2());
    this.setSize(size.x, size.y);
    r.setRenderTarget(this.rtScene);
    r.render(scene, camera);
    const U = this.mMix.uniforms;
    this.mBright.uniforms.tMap.value = this.rtScene.texture;
    this.mBright.uniforms.uThreshold.value = 1.05 - 0.77 * night;
    this._pass(this.mBright, this.rtNear[0]);
    if (this.ultra) {
      this.mRays.uniforms.tMap.value = this.rtNear[0].texture;
      this.mRays.uniforms.uSun.value.set(sun ? sun.x : 0.5, sun ? sun.y : 0.5);
      this.mRays.uniforms.uAmount.value = sun ? sun.amount : 0;
      this._pass(this.mRays, this.rtRays);
      this._blur(this.rtScene, this.rtSoft, 1.6);
      this._blur(this.rtSoft[0], this.rtSoft, 2.6);
    }
    this._blur(this.rtNear[0], this.rtNear, 1.0);
    this._blur(this.rtNear[0], this.rtFar, 1.6);
    U.tScene.value = this.rtScene.texture;
    U.tNear.value = this.rtNear[0].texture;
    U.tFar.value = this.rtFar[0].texture;
    U.tSoft.value = this.ultra ? this.rtSoft[0].texture : this.rtScene.texture;
    U.tRays.value = this.ultra ? this.rtRays.texture : this.rtNear[0].texture;
    U.uUltra.value = this.ultra ? 1 : 0;
    U.uTime.value = time % 97;
    this._pass(this.mMix, null);
  }
}
