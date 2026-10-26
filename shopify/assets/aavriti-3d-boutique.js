/**
 * Aavriti 3D Boutique - Standalone Three.js Liquid Section Script
 * Compatible with Shopify OS 2.0 (Dawn, Impulse, Prestige, etc.)
 */

(function () {
  'use strict';

  // Cloth Vertex Shader with dynamic aerodynamic wind & trailing billow
  const clothVertexShader = `
    uniform float uTime;
    uniform float uWindStrength;
    uniform float uVelocity;
    uniform float uPhase;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    float getClothDisplacement(vec2 pos, float flex, float time, float phase, float wind, float vel) {
      // 1. Subtle, continuous ambient breathing breeze in the room
      float ambient = sin(time * 1.5 + pos.y * 2.2 + pos.x * 1.7) * 0.022
                    + cos(time * 2.3 - pos.y * 3.3 + pos.x * 2.5) * 0.012;

      // 2. Trailing aerodynamic billow as rack turns (lagging drag force)
      float clampedVel = clamp(vel * 0.08, -0.45, 0.45);
      float billow = -clampedVel * 0.32 * pow(flex, 1.25);

      // 3. Dynamic traveling wind waves stimulated by slide motion
      float normWind = clamp(wind * 0.18, 0.0, 1.2);
      float dynamicWave = (
        sin(phase * 3.6 - pos.y * 4.2 + pos.x * 2.4) * 1.0 +
        sin(phase * 5.4 - pos.y * 6.5 - pos.x * 3.6) * 0.45 +
        cos(phase * 2.2 + pos.x * 4.0) * 0.28
      ) * (0.015 + normWind * 0.085);

      // 4. Delicate flutter at the lower hem
      float weight = clamp(1.0 - (pos.y + 1.65) / 3.3, 0.0, 1.0);
      float hemFlutter = sin(phase * 7.5 + pos.x * 5.5) * pow(weight, 2.2) * normWind * 0.038;

      return flex * (ambient + billow + dynamicWave) + hemFlutter;
    }

    void main() {
      vUv = uv;

      // Top ~14% is pinned firmly to wooden hanger bar, smoothly increasing flexibility toward hem
      float weight = clamp(1.0 - uv.y, 0.0, 1.0);
      float flex = smoothstep(0.12, 0.96, weight) * pow(weight, 1.35);

      vec3 pos = position;

      // Displacement at current vertex
      float disp = getClothDisplacement(pos.xy, flex, uTime, uPhase, uWindStrength, uVelocity);
      pos.z += disp;

      // Subtle lateral contraction when cloth folds into waves
      pos.x -= sin(disp * 10.0) * flex * (0.012 + uWindStrength * 0.018);

      // Surface normal calculation for realistic fold lighting
      float eps = 0.025;
      float dispX = getClothDisplacement(pos.xy + vec2(eps, 0.0), flex, uTime, uPhase, uWindStrength, uVelocity);
      float dispY = getClothDisplacement(pos.xy + vec2(0.0, eps), flex, uTime, uPhase, uWindStrength, uVelocity);

      vec3 tangentX = vec3(eps, 0.0, dispX - disp);
      vec3 tangentY = vec3(0.0, eps, dispY - disp);
      vec3 deformedNormal = normalize(cross(tangentX, tangentY));

      vNormal = normalize(normalMatrix * deformedNormal);

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  // Cloth Fragment Shader with soft studio lighting & fold sheen
  const clothFragmentShader = `
    uniform sampler2D uMap;
    uniform float uWindStrength;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vec4 texColor = texture2D(uMap, vUv);

      // Cutout transparent background of garment png
      if (texColor.a < 0.08) {
        discard;
      }

      vec3 normal = normalize(vNormal);
      if (!gl_FrontFacing) {
        normal = -normal;
      }

      // High-end fashion editorial lighting:
      // Retain 100% of the original photo brightness and enhance fold definition
      vec3 sunDir = normalize(vec3(-0.35, 0.75, 0.65));
      float diff = dot(normal, sunDir);

      // Subtle luminous fold modulation: never crushes shadows, adds gentle depth
      float foldLighting = 1.0 + diff * 0.12;

      // Silk / fabric specular sheen along wave crests
      vec3 viewDir = normalize(vViewPosition);
      vec3 halfVec = normalize(sunDir + viewDir);
      float spec = pow(max(dot(normal, halfVec), 0.0), 14.0) * 0.16 * (0.35 + clamp(uWindStrength * 0.12, 0.0, 0.65));

      vec3 rgb = texColor.rgb * foldLighting + vec3(spec);

      // Color vibrancy & tone enhancement: brings out ruby reds, glowing yellows, crisp embroidery
      float luminance = dot(rgb, vec3(0.299, 0.587, 0.114));
      rgb = mix(vec3(luminance), rgb, 1.10); // +10% vibrance
      rgb = pow(rgb, vec3(0.95)); // lifts midtones so fabric is luminous and radiant

      gl_FragColor = vec4(rgb, texColor.a);
    }
  `;

  // Ensure Three.js is loaded
  function loadThree(callback) {
    if (window.THREE) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => {
      callback();
    };
    document.head.appendChild(script);
  }

  // Math damp utility (identical to Three.js MathUtils.damp)
  function damp(current, target, lambda, dt) {
    return current + (target - current) * (1 - Math.exp(-lambda * dt));
  }

  // Main Section Instance Class
  class Aavriti3DBoutique {
    constructor(container) {
      this.container = container;
      this.sectionId = container.dataset.sectionId || 'default';
      this.dataScript = document.getElementById(`AavritiData-${this.sectionId}`);
      
      this.products = [];
      try {
        if (this.dataScript) {
          this.products = JSON.parse(this.dataScript.textContent);
        }
      } catch (e) {
        console.error('Error parsing boutique products data', e);
      }

      if (!this.products || this.products.length === 0) {
        this.products = [
          { category: "JACKET", title: "RAINS", fabric: "Waterproof Polyurethane", price: "₹ 2,499", description: "The classic long rain jacket modeled on the M-51 parka silhouette.", image: "/shopify/assets/garment-rains.png", variantId: "" },
          { category: "KURTI", title: "SUNFLOWER YELLOW", fabric: "Pure Linen Cotton", price: "₹ 1,899", description: "Vibrant mustard yellow handcrafted tunic featuring fine threadwork.", image: "/shopify/assets/garment-yellow.png", variantId: "" },
          { category: "ANARKALI", title: "CRIMSON RED", fabric: "Royal Chanderi Silk", price: "₹ 3,299", description: "Rich crimson red traditional flared gown crafted with metallic embroidery.", image: "/shopify/assets/garment-red.png", variantId: "" },
          { category: "KURTA", title: "MIDNIGHT BLACK", fabric: "Premium Raw Silk", price: "₹ 2,199", description: "Sleek obsidian black silhouette featuring structured tailored fit.", image: "/shopify/assets/garment-black.png", variantId: "" }
        ];
      }

      this.targetRotationY = 0;
      this.currentRotationY = 0;
      this.activeIndex = 0;
      this.isMobile = window.innerWidth <= 768;

      // Wind State
      this.windState = {
        velocity: 0,
        strength: 0,
        phase: 0,
      };

      this.garmentItems = [];
      this.initDom();
      this.initThree();
      this.initEvents();
      const initialIdx = (((Math.round(-this.targetRotationY / (Math.PI / 2))) % 4) + 6) % 4;
      this.activeIndex = initialIdx;
      this.updateActiveProductInfo(initialIdx);
    }

    initDom() {
      this.canvasWrapper = this.container.querySelector('.aavriti-canvas-container');
      this.categoryEl = this.container.querySelector('.aavriti-editorial-category');
      this.titleEl = this.container.querySelector('.aavriti-editorial-title');
      this.descEl = this.container.querySelector('.aavriti-editorial-description');
      this.priceEl = this.container.querySelector('.aavriti-editorial-price-val');
      this.sliderFillEl = this.container.querySelector('.aavriti-slider-fill');
      this.arrowLeft = this.container.querySelector('.aavriti-slider-arrow.left');
      this.arrowRight = this.container.querySelector('.aavriti-slider-arrow.right');
      this.addCartBtn = this.container.querySelector('.aavriti-add-cart-btn');
      this.cartPill = this.container.querySelector('.aavriti-cart-pill');
      this.toastEl = this.container.querySelector('.aavriti-toast');
    }

    initThree() {
      const THREE = window.THREE;
      const width = this.canvasWrapper.clientWidth || window.innerWidth;
      const height = this.canvasWrapper.clientHeight || window.innerHeight;

      // Scene
      this.scene = new THREE.Scene();

      // Camera
      this.camera = new THREE.PerspectiveCamera(
        this.isMobile ? 48 : 45,
        width / height,
        0.1,
        100
      );
      this.updateCameraPosition();

      // Renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      if (THREE.SRGBColorSpace) {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      } else if (THREE.sRGBEncoding) {
        this.renderer.outputEncoding = THREE.sRGBEncoding;
      }
      this.canvasWrapper.appendChild(this.renderer.domElement);

      // Lights
      const ambientLight = new THREE.AmbientLight(0xfffcf5, 1.1);
      this.scene.add(ambientLight);

      const dirLight1 = new THREE.DirectionalLight(0xfffaf0, 1.6);
      dirLight1.position.set(-7, 10, 5);
      this.scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
      dirLight2.position.set(6, 4, 3);
      this.scene.add(dirLight2);

      // Build Stand & Garments
      this.buildStand();

      this.clock = new THREE.Clock();
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    updateCameraPosition() {
      if (this.isMobile) {
        this.camera.position.set(0, 0.9, 6.0);
        this.camera.fov = 48;
      } else {
        this.camera.position.set(0, 1.4, 5.0);
        this.camera.fov = 45;
      }
      this.camera.updateProjectionMatrix();
    }

    buildStand() {
      const THREE = window.THREE;
      this.standGroup = new THREE.Group();
      this.standGroup.position.set(0, this.isMobile ? -0.32 : -0.58, 0);
      const s = this.isMobile ? 0.76 : 1.0;
      this.standGroup.scale.set(s, s, s);
      this.scene.add(this.standGroup);

      const apexY = 1.1;
      const legHeight = 3.4;
      const baseBottomY = apexY - legHeight; // -2.3

      // Materials
      const baseMat1 = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.7 });
      const baseMat2 = new THREE.MeshStandardMaterial({ color: 0x1f1f1f, roughness: 0.3, metalness: 0.8 });
      const columnMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.25, metalness: 0.85 });
      const jointMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.9 });
      const hubMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.8 });

      // Weighted Base
      const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.72, 0.12, 32), baseMat1);
      base1.position.set(0, baseBottomY, 0);
      this.standGroup.add(base1);

      const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.65, 0.09, 32), baseMat2);
      base2.position.set(0, baseBottomY + 0.08, 0);
      this.standGroup.add(base2);

      // Central Column
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.052, legHeight, 32), columnMat);
      column.position.set(0, apexY - legHeight / 2, 0);
      this.standGroup.add(column);

      // Top Joint Hub
      const apexCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.114, 0.076, 0.22, 32), jointMat);
      apexCyl.position.set(0, apexY, 0);
      this.standGroup.add(apexCyl);

      const apexSphere = new THREE.Mesh(new THREE.SphereGeometry(0.095, 32, 16), hubMat);
      apexSphere.position.set(0, apexY + 0.12, 0);
      this.standGroup.add(apexSphere);

      // 4 Wings
      const wingAngles = [Math.PI / 2, Math.PI, (3 * Math.PI) / 2, 2 * Math.PI];
      const flareUpAngle = 0.45;
      const textureLoader = new THREE.TextureLoader();

      this.wingGroups = [];
      this.garmentItems = [];

      wingAngles.forEach((angle, index) => {
        const wingGroup = new THREE.Group();
        wingGroup.position.set(0, apexY + 0.1, 0);
        wingGroup.rotation.set(0, angle, 0);
        this.standGroup.add(wingGroup);
        this.wingGroups.push(wingGroup);

        // Arm tilted upwards
        const armGroup = new THREE.Group();
        armGroup.rotation.set(0, 0, flareUpAngle);
        wingGroup.add(armGroup);

        // Connector
        const conn = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.03), jointMat);
        conn.position.set(0.18, 0, 0);
        armGroup.add(conn);

        // Blade
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.08), columnMat);
        blade.position.set(0.74, 0, 0);
        blade.rotation.x = 0.08;
        armGroup.add(blade);

        // Tip
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.08), hubMat);
        tip.position.set(1.23, 0, 0);
        tip.rotation.x = 0.08;
        armGroup.add(tip);

        // Hanging Garment Group
        const garmentGroup = new THREE.Group();
        garmentGroup.position.set(
          0.8 * Math.cos(flareUpAngle),
          0.8 * Math.sin(flareUpAngle) + 0.03,
          0
        );
        garmentGroup.rotation.set(0, Math.PI / 2, 0);
        wingGroup.add(garmentGroup);

        // Inner Swing Group
        const swingGroup = new THREE.Group();
        garmentGroup.add(swingGroup);

        // Hanger Hook
        const hookMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 16, 32, Math.PI * 1.3), hookMat);
        hook.rotation.z = Math.PI / 2;
        swingGroup.add(hook);

        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.1, 16), hookMat);
        stem.position.set(0, -0.06, 0);
        swingGroup.add(stem);

        const barMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.4, metalness: 0.2 });
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.04), barMat);
        bar.position.set(0, -0.12, 0);
        swingGroup.add(bar);

        // Load Garment Texture
        const product = this.products[index % this.products.length];
        const texture = textureLoader.load(product.image);
        if (THREE.SRGBColorSpace) {
          texture.colorSpace = THREE.SRGBColorSpace;
        } else if (THREE.sRGBEncoding) {
          texture.encoding = THREE.sRGBEncoding;
        }

        // Custom Shader Material for Cloth Wave
        const clothMat = new THREE.ShaderMaterial({
          uniforms: {
            uMap: { value: texture },
            uTime: { value: 0 },
            uWindStrength: { value: 0 },
            uVelocity: { value: 0 },
            uPhase: { value: 0 },
          },
          vertexShader: clothVertexShader,
          fragmentShader: clothFragmentShader,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: true,
        });

        // 36x54 subdivided mesh for fluid cloth ripples
        const clothGeo = new THREE.PlaneGeometry(2.2, 3.3, 36, 54);
        const clothMesh = new THREE.Mesh(clothGeo, clothMat);
        clothMesh.position.set(0, -1.73, 0);
        swingGroup.add(clothMesh);

        this.garmentItems.push({
          index,
          swingGroup,
          clothMat,
          currentScale: 0.86,
        });
      });
    }

    animate() {
      requestAnimationFrame(this.animate);
      const delta = Math.min(this.clock.getDelta(), 0.1);
      const time = this.clock.getElapsedTime();

      // Smooth damp stand rotation towards targetRotationY
      const prevY = this.currentRotationY;
      this.currentRotationY = damp(prevY, this.targetRotationY, 7.5, delta);
      this.standGroup.rotation.y = this.currentRotationY;

      // Calculate instantaneous rotational velocity
      const rawVelocity = delta > 0 ? (this.currentRotationY - prevY) / delta : 0;
      this.windState.velocity = damp(this.windState.velocity, rawVelocity, 9, delta);

      // Wind strength spikes on motion and gracefully decays
      const targetStrength = Math.abs(rawVelocity);
      const decaySpeed = targetStrength > this.windState.strength ? 14 : 4.0;
      this.windState.strength = damp(this.windState.strength, targetStrength, decaySpeed, delta);
      this.windState.phase += (1.4 + this.windState.strength * 2.8) * delta;

      // Determine active index
      const activeIdx = (((Math.round(-this.targetRotationY / (Math.PI / 2))) % 4) + 6) % 4;

      // Update Garment Items
      this.garmentItems.forEach((item) => {
        const isPresented = activeIdx === item.index;

        // Inertial swing + pendulum sway
        const inertiaTilt = -this.windState.velocity * 0.08;
        item.swingGroup.rotation.z = Math.sin(time * 1.5 + item.index * 1.2) * 0.016 + inertiaTilt;

        // Dynamic scale
        const targetScale = this.isMobile ? 0.70 : (isPresented ? 0.86 : (1.4 / 2.2));
        item.currentScale = damp(item.currentScale, targetScale, 6, delta);
        item.swingGroup.scale.set(item.currentScale, item.currentScale, item.currentScale);

        // Uniforms
        item.clothMat.uniforms.uTime.value = time;
        item.clothMat.uniforms.uWindStrength.value = this.windState.strength;
        item.clothMat.uniforms.uVelocity.value = this.windState.velocity;
        item.clothMat.uniforms.uPhase.value = this.windState.phase;
      });

      this.renderer.render(this.scene, this.camera);
    }

    rotateLeft() {
      this.targetRotationY += Math.PI / 2;
      this.onSlideChange();
    }

    rotateRight() {
      this.targetRotationY -= Math.PI / 2;
      this.onSlideChange();
    }

    onSlideChange() {
      const activeIdx = (((Math.round(-this.targetRotationY / (Math.PI / 2))) % 4) + 6) % 4;
      if (activeIdx !== this.activeIndex) {
        this.activeIndex = activeIdx;
        this.updateActiveProductInfo(activeIdx);
      }
    }

    updateActiveProductInfo(idx) {
      const product = this.products[idx % this.products.length];
      if (!product) return;

      if (this.categoryEl) this.categoryEl.textContent = product.category;
      if (this.titleEl) this.titleEl.textContent = product.title;
      if (this.descEl) this.descEl.textContent = product.description;
      if (this.priceEl) this.priceEl.textContent = product.price;

      if (this.sliderFillEl) {
        const progress = ((idx + 1) / this.products.length) * 100;
        this.sliderFillEl.style.width = `${progress}%`;
      }
    }

    initEvents() {
      // Arrow Buttons
      if (this.arrowLeft) {
        this.arrowLeft.addEventListener('click', () => this.rotateLeft());
      }
      if (this.arrowRight) {
        this.arrowRight.addEventListener('click', () => this.rotateRight());
      }

      // Keyboard Controls
      window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') this.rotateLeft();
        if (e.key === 'ArrowRight') this.rotateRight();
      });

      // Pointer Drag / Swipe Gesture
      let startX = null;
      let isMoved = false;

      this.container.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button, a, input, select')) return;
        startX = e.clientX;
        isMoved = false;
      });

      this.container.addEventListener('pointermove', (e) => {
        if (startX === null) return;
        if (Math.abs(e.clientX - startX) > 8) {
          isMoved = true;
        }
      });

      const handlePointerEnd = (e) => {
        if (startX !== null && isMoved) {
          const diff = startX - e.clientX;
          if (Math.abs(diff) > 35) {
            if (diff > 0) this.rotateRight();
            else this.rotateLeft();
          }
        }
        startX = null;
        isMoved = false;
      };

      this.container.addEventListener('pointerup', handlePointerEnd);
      this.container.addEventListener('pointercancel', handlePointerEnd);

      // Add to Cart
      if (this.addCartBtn) {
        this.addCartBtn.addEventListener('click', () => this.addToShopifyCart());
      }

      // Responsive Resize
      window.addEventListener('resize', () => {
        this.isMobile = window.innerWidth <= 768;
        const width = this.canvasWrapper.clientWidth || window.innerWidth;
        const height = this.canvasWrapper.clientHeight || window.innerHeight;
        this.camera.aspect = width / height;
        this.updateCameraPosition();
        this.renderer.setSize(width, height);

        const s = this.isMobile ? 0.76 : 1.0;
        this.standGroup.scale.set(s, s, s);
        this.standGroup.position.set(0, this.isMobile ? -0.32 : -0.58, 0);
      });
    }

    addToShopifyCart() {
      const product = this.products[this.activeIndex % this.products.length];
      const variantId = product.variantId;

      // Update UI Pill locally
      if (this.cartPill) {
        const count = (parseInt(this.cartPill.textContent, 10) || 0) + 1;
        this.cartPill.textContent = count;
        this.cartPill.style.transform = 'scale(1.25)';
        setTimeout(() => {
          this.cartPill.style.transform = 'scale(1)';
        }, 200);
      }

      this.showToast(`Added ${product.title} to cart`);

      // Real Shopify AJAX Cart Add if variant ID exists
      if (variantId) {
        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [{ id: variantId, quantity: 1 }] })
        })
        .then(res => res.json())
        .then(cart => {
          document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
          document.dispatchEvent(new CustomEvent('cart:refresh'));
        })
        .catch(err => {
          console.warn('Shopify cart add completed locally', err);
        });
      }
    }

    showToast(message) {
      if (!this.toastEl) return;
      this.toastEl.textContent = message;
      this.toastEl.classList.add('visible');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toastEl.classList.remove('visible');
      }, 2400);
    }
  }

  // Auto-init on page load and inside Shopify Theme Editor
  function initAavritiSections() {
    loadThree(() => {
      document.querySelectorAll('.aavriti-boutique-section').forEach(container => {
        if (!container.dataset.initialized) {
          container.dataset.initialized = 'true';
          new Aavriti3DBoutique(container);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAavritiSections);
  } else {
    initAavritiSections();
  }

  // Support Shopify Theme Editor dynamic section reloads
  document.addEventListener('shopify:section:load', initAavritiSections);
})();
