import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// Custom Cloth Wave & Wind Shader
const clothVertexShader = `
  uniform float uTime;
  uniform float uWindStrength;
  uniform float uVelocity;
  uniform float uPhase;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  // Calculates natural fabric displacement in local Z
  float getClothDisplacement(vec2 pos, float flex, float time, float phase, float wind, float vel) {
    // 1. Subtle, continuous ambient breathing breeze in the boutique room
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

    // Top ~14% is pinned firmly to the wooden hanger bar, smoothly increasing flexibility toward the hem
    // uv.y is 1.0 at the neck/hanger, 0.0 at the bottom hem
    float weight = clamp(1.0 - uv.y, 0.0, 1.0);
    float flex = smoothstep(0.12, 0.96, weight) * pow(weight, 1.35);

    vec3 pos = position;

    // Calculate displacement at current vertex
    float disp = getClothDisplacement(pos.xy, flex, uTime, uPhase, uWindStrength, uVelocity);
    pos.z += disp;

    // Subtle lateral contraction when cloth folds into waves
    pos.x -= sin(disp * 10.0) * flex * (0.012 + uWindStrength * 0.018);

    // Compute perturbed surface normal for realistic light interaction on the folds
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

const clothFragmentShader = `
  uniform sampler2D uMap;
  uniform float uWindStrength;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec4 texColor = texture2D(uMap, vUv);

    // Respect transparency / cutout of transparent garments
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

interface HangingGarmentProps {
  textureUrl: string;
  index: number;
  isPresented: boolean;
  isMobile?: boolean;
  windState: React.RefObject<{
    velocity: number;
    strength: number;
    phase: number;
  }>;
}

const GarmentItem: React.FC<HangingGarmentProps> = ({ 
  textureUrl, 
  index, 
  isPresented, 
  isMobile,
  windState
}) => {
  const texture = useTexture(textureUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  const swingRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Create custom shader material for waving cloth
  const clothMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
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
  }, [texture]);

  // Subtle natural hanging sway motion, inertial tilt from sliding, and scale animation
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const currentVel = windState.current?.velocity || 0;
    const currentStrength = windState.current?.strength || 0;
    const currentPhase = windState.current?.phase || 0;

    if (swingRef.current) {
      // Natural pendulum sway + inertial tilt opposing rotation
      const inertiaTilt = -currentVel * 0.08;
      swingRef.current.rotation.z = Math.sin(time * 1.5 + index * 1.2) * 0.016 + inertiaTilt;

      // In mobile view, keep all 4 images at equal size (0.70). On desktop, scale presented image larger.
      const targetScale = isMobile ? 0.70 : (isPresented ? 0.86 : (1.4 / 2.2));
      const currentScale = swingRef.current.scale.x;
      const newScale = THREE.MathUtils.damp(currentScale, targetScale, 6, delta);
      swingRef.current.scale.set(newScale, newScale, newScale);
    }

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
      materialRef.current.uniforms.uWindStrength.value = currentStrength;
      materialRef.current.uniforms.uVelocity.value = currentVel;
      materialRef.current.uniforms.uPhase.value = currentPhase;
    }
  });

  return (
    <group ref={swingRef}>
      {/* Metallic Hanger Hook over Wing Arm (Origin at 0) */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.045, 0.008, 16, 32, Math.PI * 1.3]} />
        <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Vertical Hook Stem */}
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.1, 16]} />
        <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Wooden Hanger Top Bar */}
      <mesh position={[0, -0.12, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.6, 0.03, 0.04]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Garment Image Mesh with Dynamic Cloth Wind Wave */}
      <mesh position={[0, -1.73, 0]}>
        <planeGeometry args={[2.2, 3.3, 36, 54]} />
        <primitive object={clothMaterial} ref={materialRef} attach="material" />
      </mesh>
    </group>
  );
};

interface StandProps {
  targetRotationY: number;
  isMobile?: boolean;
}

const StandWithFlaredWings: React.FC<StandProps> = ({ targetRotationY, isMobile }) => {
  const groupRef = useRef<THREE.Group>(null);
  const apexY = 1.1;
  const legHeight = 3.4;

  // Track rotational velocity, wind impulse, and wave phase for cloth simulation
  const windState = useRef({
    velocity: 0,
    strength: 0,
    phase: 0,
  });

  // 4 Wing base angles offset by PI/2 so Wing 0 points directly towards the camera at rotation 0
  const wingAngles = [
    Math.PI / 2, 
    Math.PI, 
    (3 * Math.PI) / 2, 
    2 * Math.PI
  ];

  // Flare angle pointing upwards (~25 degrees)
  const flareUpAngle = 0.45; 
  const baseBottomY = apexY - legHeight; // -2.3
  
  // Calculate the currently presented wing index based on the Y rotation
  const activeIndex = (((Math.round(-targetRotationY / (Math.PI / 2))) % 4) + 6) % 4;

  // Smoothly damp rotation towards targetRotationY on every frame & compute realistic aerodynamic wind
  useFrame((_, delta) => {
    if (groupRef.current) {
      const prevY = groupRef.current.rotation.y;
      groupRef.current.rotation.y = THREE.MathUtils.damp(
        prevY,
        targetRotationY,
        7.5, // Damp speed
        delta
      );
      const newY = groupRef.current.rotation.y;
      const rawVelocity = delta > 0 ? (newY - prevY) / delta : 0;

      // Filter velocity smoothly
      windState.current.velocity = THREE.MathUtils.damp(
        windState.current.velocity,
        rawVelocity,
        9,
        delta
      );

      // Wind strength responds sharply to sliding and decays like fluttering fabric coming to rest
      const targetStrength = Math.abs(rawVelocity);
      const decaySpeed = targetStrength > windState.current.strength ? 14 : 4.0;
      windState.current.strength = THREE.MathUtils.damp(
        windState.current.strength,
        targetStrength,
        decaySpeed,
        delta
      );

      // Wave phase travels faster when sliding quickly through the air
      windState.current.phase += (1.4 + windState.current.strength * 2.8) * delta;
    }
  });

  return (
    <group 
      ref={groupRef} 
      position={isMobile ? [0, -0.32, 0] : [0, -0.58, 0]}
      scale={isMobile ? [0.76, 0.76, 0.76] : [1, 1, 1]}
    >
      {/* Weighted Base at bottom */}
      <mesh position={[0, baseBottomY, 0]}>
        <cylinderGeometry args={[0.65, 0.72, 0.12, 32]} />
        <meshStandardMaterial color="#111111" roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0, baseBottomY + 0.08, 0]}>
        <cylinderGeometry args={[0.32, 0.65, 0.09, 32]} />
        <meshStandardMaterial color="#1f1f1f" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* 1 Central Leg / Column */}
      <mesh position={[0, apexY - legHeight / 2, 0]}>
        <cylinderGeometry args={[0.04275, 0.05225, legHeight, 32]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.25} metalness={0.85} />
      </mesh>

      {/* Top Joint Hub at Apex */}
      <mesh position={[0, apexY, 0]}>
        <cylinderGeometry args={[0.114, 0.076, 0.22, 32]} />
        <meshStandardMaterial color="#111111" roughness={0.2} metalness={0.9} />
      </mesh>
      <mesh position={[0, apexY + 0.12, 0]}>
        <sphereGeometry args={[0.095, 32, 16]} />
        <meshStandardMaterial color="#222222" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* 4 Wings flared upwards with hanging garments */}
      {wingAngles.map((angle, index) => {
        const isPresented = activeIndex === index;
        return (
          <group 
            key={`wing-${index}`} 
            position={[0, apexY + 0.1, 0]} 
            rotation={[0, angle, 0]}
            renderOrder={isPresented ? 10 : index}
          >
          {/* Group tilted upwards (flare angle) */}
          <group rotation={[0, 0, flareUpAngle]}>
            {/* Wing connector arm */}
            <mesh position={[0.18, 0, 0]}>
              <boxGeometry args={[0.22, 0.03, 0.03]} />
              <meshStandardMaterial color="#111111" roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Main Perforated Wing Blade */}
            <mesh position={[0.74, 0, 0]} rotation={[0.08, 0, 0]}>
              <boxGeometry args={[0.9, 0.02, 0.08]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.9} />
            </mesh>
            {/* Wing Tip Accent */}
            <mesh position={[1.23, 0, 0]} rotation={[0.08, 0, 0]}>
              <boxGeometry args={[0.08, 0.025, 0.08]} />
              <meshStandardMaterial color="#333333" roughness={0.2} metalness={0.9} />
            </mesh>
          </group>
          
          {/* Garment hanging vertically from the wing */}
          {/* Positioned along the flared arm without inheriting its rotation */}
          <group 
            position={[0.8 * Math.cos(flareUpAngle), 0.8 * Math.sin(flareUpAngle) + 0.03, 0]} 
            rotation={[0, Math.PI / 2, 0]}
          >
            <React.Suspense fallback={null}>
              <GarmentItem 
                textureUrl={['/garment.png', '/yellow.png', '/red.png', '/black.png'][index]} 
                index={index} 
                isPresented={activeIndex === index}
                isMobile={isMobile}
                windState={windState}
              />
            </React.Suspense>
          </group>
        </group>
      );
    })}
    </group>
  );
};

interface SceneProps {
  targetRotationY: number;
}

export const Scene: React.FC<SceneProps> = ({ targetRotationY }) => {
  const [isMobile, setIsMobile] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="canvas-container">
      <Canvas
        camera={{ 
          position: isMobile ? [0, 0.9, 6.0] : [0, 1.4, 5.0], 
          fov: isMobile ? 48 : 45 
        }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.1} color="#fffcf5" />
        <directionalLight position={[-7, 10, 5]} intensity={1.6} color="#fffaf0" />
        <directionalLight position={[6, 4, 3]} intensity={0.6} color="#ffffff" />

        {/* 1 Central Stand with 4 Flared Wings & Hanging Garments */}
        <StandWithFlaredWings targetRotationY={targetRotationY} isMobile={isMobile} />

        {/* Soft floor contact shadow to anchor rack to boutique floor */}
        <ContactShadows 
          position={[0, isMobile ? -2.6 : -2.88, 0]} 
          opacity={0.35} 
          scale={5} 
          blur={2.0} 
          far={4} 
        />

        {/* Orbit Controls with Zoom Disabled */}
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          autoRotate={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2 + 0.1}
        />
      </Canvas>
    </div>
  );
};
