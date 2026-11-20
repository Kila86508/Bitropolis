// Bitropolis — « beaux shaders » : la scène est d'abord dessinée dans une image à grande dynamique, puis on lui
// ajoute un halo lumineux (les lampes, les néons, les fenêtres la nuit et les reflets du soleil débordent un peu
// autour d'eux) et un léger assombrissement des coins, avant de la passer à l'écran. Sans dépendance : trois petits
// shaders plein écran. Si la carte graphique ne sait pas dessiner dans une image à virgule flottante, `ok` vaut
// false et la visionneuse garde son rendu simple.
export class FxPost {
  constructor(renderer) {
    this.renderer = renderer;
    const ext = renderer.extensions;
    this.ok = !!renderer.capabilities.isWebGL2 && !!(ext.get('EXT_color_buffer_float') || ext.get('EXT_color_buffer_half_float'));
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
    // image finale : scène + halos, coins assombris, puis mise à l'écran (ton et couleurs comme le rendu simple)
    this.mMix = pass({ tScene: { value: null }, tNear: { value: null }, tFar: { value: null }, uStrength: { value: 0.9 }, uVignette: { value: 0.22 } }, `
      uniform sampler2D tScene; uniform sampler2D tNear; uniform sampler2D tFar; uniform float uStrength; uniform float uVignette; varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tScene, vUv).rgb;
        c += (texture2D(tNear, vUv).rgb * 0.55 + texture2D(tFar, vUv).rgb * 0.8) * uStrength;
        vec2 d = vUv - 0.5;
        c *= 1.0 - uVignette * smoothstep(0.3, 0.95, dot(d, d) * 2.0);
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
  }

  dispose() {
    for (const t of [this.rtScene, ...(this.rtNear || []), ...(this.rtFar || [])]) if (t) t.dispose();
    this.rtScene = null; this.rtNear = null; this.rtFar = null; this.w = 0; this.h = 0;
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

  // night : 0 (jour) … 1 (nuit). La nuit, le seuil baisse pour que les fenêtres éclairées aient aussi leur halo.
  render(scene, camera, night = 0) {
    const r = this.renderer, size = r.getDrawingBufferSize(new THREE.Vector2());
    this.setSize(size.x, size.y);
    r.setRenderTarget(this.rtScene);
    r.render(scene, camera);
    this.mBright.uniforms.tMap.value = this.rtScene.texture;
    this.mBright.uniforms.uThreshold.value = 1.05 - 0.77 * night;
    this._pass(this.mBright, this.rtNear[0]);
    this._blur(this.rtNear[0], this.rtNear, 1.0);
    this._blur(this.rtNear[0], this.rtFar, 1.6);
    this.mMix.uniforms.tScene.value = this.rtScene.texture;
    this.mMix.uniforms.tNear.value = this.rtNear[0].texture;
    this.mMix.uniforms.tFar.value = this.rtFar[0].texture;
    this._pass(this.mMix, null);
  }
}
