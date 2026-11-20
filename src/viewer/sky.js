// Bitropolis — ciel des shaders « Fou » : un dôme dessiné derrière tout le reste, calculé pixel par pixel.
// De jour : dégradé de l'horizon au zénith, disque du soleil et son halo. La nuit : lune, étoiles qui scintillent,
// aurore boréale qui ondule. Par mauvais temps : une couche de nuages sombres qui avance, éclairée par les éclairs.
// Les couleurs viennent du moteur de rendu (mêmes teintes que le brouillard, pour que l'horizon se raccorde).
export class FxSky {
  constructor(scene) {
    this.u = {
      uTop: { value: new THREE.Color('#4a90e2') }, uHorizon: { value: new THREE.Color('#bfe3f7') },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color('#fff1d6') },
      uNight: { value: 0 }, uCover: { value: 0 }, uFlash: { value: 0 }, uTime: { value: 0 }
    };
    const material = new THREE.ShaderMaterial({
      uniforms: this.u, side: THREE.BackSide, depthTest: false, depthWrite: false, fog: false,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = position;
          // le dôme suit la caméra (rotation seule) et reste au fond
          gl_Position = (projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0)).xyww;
        }`,
      fragmentShader: `
        uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSunCol;
        uniform float uNight; uniform float uCover; uniform float uFlash; uniform float uTime;
        varying vec3 vDir;
        float hash3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
        void main() {
          vec3 d = normalize(vDir);
          vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.04, 0.8, d.y), 0.6));
          float clear = 1.0 - uCover;

          // soleil (ou lune) : disque net, halo serré, lueur large
          float s = max(dot(d, uSunDir), 0.0);
          col += uSunCol * (smoothstep(0.99925, 0.9997, s) * 7.0 + pow(s, 500.0) * 2.2 + pow(s, 20.0) * 0.32) * (0.12 + 0.88 * clear);

          if (uNight > 0.02) {
            // étoiles : une par case de la sphère, plus ou moins brillante, qui scintille à son rythme
            vec3 g = d * 190.0, cell = floor(g);
            float r = hash3(cell), twinkle = 0.55 + 0.45 * sin(uTime * (1.2 + 3.5 * hash3(cell + 9.0)) + r * 40.0);
            float star = step(0.982, r) * smoothstep(0.42, 0.0, length(fract(g) - 0.5));
            col += vec3(0.85, 0.92, 1.0) * star * twinkle * (0.6 + 2.0 * fract(r * 57.0)) * uNight * clear * smoothstep(0.0, 0.25, d.y);

            // aurore boréale : un ruban qui serpente au-dessus de l'horizon, strié de rayons verticaux
            float a = atan(d.z, d.x);
            float y = d.y - 0.3 - sin(a * 3.0 + uTime * 0.11) * 0.11 - sin(a * 7.0 - uTime * 0.19) * 0.045;
            float ribbon = exp(-y * y * 46.0) + 0.5 * exp(-(y - 0.12) * (y - 0.12) * 20.0);
            float streaks = 0.5 + 0.5 * sin(a * 84.0 + fbm(vec2(a * 5.0, uTime * 0.28)) * 7.0);
            float drift = 0.45 + 0.55 * fbm(vec2(a * 2.2 + uTime * 0.05, uTime * 0.06));
            vec3 aurora = mix(vec3(0.1, 1.0, 0.55), vec3(0.62, 0.25, 1.0), smoothstep(-0.06, 0.2, y));
            col += aurora * ribbon * (0.35 + 0.65 * streaks) * drift * uNight * clear * 0.6;
          }

          // mauvais temps : nuages sombres qui avancent, plus clairs là où ils sont minces
          if (uCover > 0.01) {
            vec2 q = d.xz / max(d.y + 0.3, 0.12);
            float cl = fbm(q * 1.4 + vec2(uTime * 0.025, uTime * 0.012));
            vec3 cloud = mix(uHorizon, vec3(0.16, 0.18, 0.22), 0.55) * (0.55 + 0.6 * cl);
            col = mix(col, cloud, uCover * smoothstep(-0.06, 0.25, d.y) * 0.92);
            col += vec3(0.75, 0.82, 1.0) * uFlash * (0.35 + 0.9 * cl);
          }
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -100; // avant tout le reste
    this.mesh.visible = false;
    scene.add(this.mesh);
  }
}
