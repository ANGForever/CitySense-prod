import {
  BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, RingGeometry, SphereGeometry, TorusGeometry
} from "three";
import type { BufferGeometry, Material } from "three";

/** Stylized demo landmarks. Local XY is ground and Z is up; dimensions are normalized. */
export function createLandmarkLibrary() {
  const geometries = {
    box: new BoxGeometry(1, 1, 1),
    cylinder: new CylinderGeometry(0.5, 0.5, 1, 32).rotateX(Math.PI / 2),
    crystal: new CylinderGeometry(0.14, 0.42, 1, 5).rotateX(Math.PI / 2),
    cone: new ConeGeometry(0.5, 1, 5).rotateX(Math.PI / 2),
    sphere: new SphereGeometry(0.5, 16, 12),
    ring: new RingGeometry(0.44, 0.5, 48),
    torus: new TorusGeometry(0.4, 0.055, 8, 40),
  };
  const standard = (color: string, roughness = 0.4) => new MeshStandardMaterial({
    color, roughness, metalness: 0.06
  });
  // Opaque ice with contrasting facets is stable on the shared WebGL1 context.
  // Transmission / transparent overlapping shells require an offscreen render pipeline.
  const materials = {
    ice: standard("#a8ddeb", 0.22),
    blue: standard("#6bbacc", 0.28),
    snow: standard("#f3f9f6", 0.75),
    teal: standard("#187f80"),
    gold: standard("#d3ae68", 0.35),
    red: standard("#bd6652"),
    wood: standard("#8a7762", 0.8),
    water: standard("#9dcfd0", 0.3),
    shadow: new MeshBasicMaterial({ color: "#35575c", transparent: true, opacity: 0.1, depthWrite: false }),
    selection: new MeshBasicMaterial({ color: "#8e2b26", transparent: true, opacity: 0.9, depthWrite: false }),
  };
  type GeometryName = keyof typeof geometries;
  type MaterialName = keyof typeof materials;
  function part(group: Group, geometry: GeometryName, material: MaterialName,
    scale: [number, number, number], position: [number, number, number]) {
    const mesh = new Mesh(geometries[geometry], materials[material]);
    mesh.scale.set(...scale);
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  }

  function build(kind: string, id: string): Group {
    const group = new Group();
    const shadow = part(group, "cylinder", "shadow", [1.25, 1.05, 0.003], [0.07, 0.04, 0.008]);
    shadow.userData.decoration = true;
    part(group, "cylinder", "snow", [1.06, 1.02, 0.045], [0, 0, 0.025]);
    if (id === "CT-CORE-01") {
      // A horizontal drum on an ice plinth, with a gold rim and surrounding ice fins.
      part(group, "cylinder", "blue", [0.85, 0.85, 0.12], [0, 0, 0.1]);
      part(group, "box", "ice", [0.57, 0.42, 0.24], [0, 0, 0.23]);
      const drum = part(group, "cylinder", "ice", [0.8, 0.8, 0.48], [0, 0, 0.6]);
      drum.rotation.x = Math.PI / 2;
      for (const y of [-0.25, 0.25]) {
        const rim = part(group, "torus", "gold", [1, 1, 1], [0, y, 0.6]);
        rim.rotation.x = Math.PI / 2;
        const center = part(group, "cylinder", "snow", [0.66, 0.66, 0.018], [0, y, 0.6]);
        center.rotation.x = Math.PI / 2;
        const medallion = part(group, "torus", "teal", [0.4, 0.4, 0.32], [0, y * 1.06, 0.6]);
        medallion.rotation.x = Math.PI / 2;
      }
      for (const x of [-0.44, 0.44]) part(group, "crystal", "blue", [0.17, 0.24, 0.45], [x, 0.18, 0.28]);
    } else if (kind === "gate") {
      for (const x of [-0.36, 0.36]) {
        part(group, "box", "ice", [0.2, 0.4, 0.73], [x, 0, 0.42]);
        part(group, "box", "blue", [0.28, 0.5, 0.12], [x, 0, 0.11]);
        part(group, "box", "gold", [0.23, 0.44, 0.045], [x, 0, 0.7]);
      }
      part(group, "box", "teal", [1, 0.44, 0.14], [0, 0, 0.83]);
      part(group, "box", "snow", [1.1, 0.5, 0.07], [0, 0, 0.94]);
      part(group, "box", "gold", [0.38, 0.46, 0.1], [0, 0, 0.8]);
    } else if (kind === "lake") {
      // A low lantern installation marker, not a fabricated lake boundary.
      part(group, "cylinder", "water", [0.94, 0.94, 0.035], [0, 0, 0.06]);
      for (let i = 0; i < 7; i++) {
        const a = i * Math.PI * 2 / 7;
        const petal = part(group, "sphere", i % 2 ? "ice" : "gold", [0.2, 0.48, 0.34], [Math.cos(a) * 0.21, Math.sin(a) * 0.21, 0.22]);
        petal.rotation.z = a - Math.PI / 2;
      }
      part(group, "sphere", "snow", [0.25, 0.25, 0.58], [0, 0, 0.37]);
    } else if (kind === "lantern" || kind === "prayer") {
      for (const [x, z] of [[-0.28, 0.55], [0, 0.78], [0.28, 0.55]]) {
        part(group, "cylinder", "wood", [0.028, 0.028, z], [x, 0, z / 2]);
        part(group, "sphere", kind === "prayer" ? "red" : "gold", [0.3, 0.35, 0.32], [x, 0, z]);
        part(group, "cylinder", "gold", [0.12, 0.12, 0.05], [x, 0, z + 0.16]);
        part(group, "box", "red", [0.025, 0.025, 0.14], [x, 0, z - 0.23]);
      }
    } else if (kind === "slope") {
      part(group, "box", "blue", [0.84, 0.82, 0.17], [0, 0, 0.14]);
      for (const x of [-0.29, 0, 0.29]) {
        const slide = part(group, "box", "snow", [0.23, 0.87, 0.08], [x, 0, 0.46]);
        slide.rotation.x = -0.45;
      }
      part(group, "box", "teal", [0.91, 0.16, 0.07], [0, -0.37, 0.69]);
    } else if (kind === "camp") {
      for (const x of [-0.28, 0.28]) {
        const tent = part(group, "cone", "teal", [0.52, 0.65, 0.74], [x, 0, 0.43]);
        tent.rotation.z = Math.PI / 4;
        part(group, "box", "wood", [0.16, 0.025, 0.27], [x, -0.22, 0.2]);
      }
    } else {
      // Faceted ice silhouette; two sizes avoid repeating a single block everywhere.
      part(group, "crystal", "ice", [0.48, 0.65, 0.88], [0, 0.12, 0.53]);
      part(group, "crystal", "blue", [0.4, 0.5, 0.57], [-0.28, -0.06, 0.37]);
      part(group, "crystal", "snow", [0.3, 0.44, 0.43], [0.29, -0.12, 0.29]);
      part(group, "box", "gold", [0.22, 0.08, 0.09], [0, -0.39, 0.1]);
    }
    group.traverse((child) => { child.userData.spotId = id; });
    return group;
  }
  return {
    build,
    selection() { return new Mesh(geometries.ring, materials.selection); },
    dispose() {
      Object.values(geometries).forEach((g: BufferGeometry) => g.dispose());
      Object.values(materials).forEach((m: Material) => m.dispose());
    }
  };
}
