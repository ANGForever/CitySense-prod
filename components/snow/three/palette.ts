import { DirectionalLight, HemisphereLight } from "three";

export const FIXED_GATE_SIZE = { widthMeters: 15, depthMeters: 9, heightMeters: 12 };
/** A lantern installation marker, not a claim about the lake's shape or boundary. */
export const FIXED_LAKE_SIZE = { widthMeters: 28, depthMeters: 28, heightMeters: 8 };

/** Daylight: all light positions follow AMap's Z-up coordinates. */
export function addLights(scene: { add: (object: HemisphereLight | DirectionalLight) => void }) {
  const sky = new HemisphereLight(0xffffff, 0x9caeae, 1.65);
  sky.position.set(0, 0, 500);
  scene.add(sky);
  const key = new DirectionalLight(0xfff4e6, 0.85);
  key.position.set(-260, -180, 450);
  scene.add(key);
  const rim = new DirectionalLight(0xdcecff, 0.45);
  rim.position.set(240, 140, 280);
  scene.add(rim);
}
