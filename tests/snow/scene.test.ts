import assert from "node:assert/strict";
import test from "node:test";
import { Box3, Mesh, Vector3 } from "three";
import { calibrate, toWorldPosition, toWorldScale } from "../../components/snow/three/park-scene";
import { createLandmarkLibrary } from "../../components/snow/three/landmarks";
import type { AMapCustomCoords } from "../../components/snow/amap/types";

test("AMap XY ground coordinates keep north separate from Z altitude", () => {
  const cc = {
    lngLatsToCoords: (points: number[][]) => points.map(([lng, lat]) => [lng * 100000, lat * 110540]),
  } satisfies Pick<AMapCustomCoords, "lngLatsToCoords">;
  const calibration = calibrate(cc, [0, 36.7]);
  assert.equal(calibration.northAxis, 1);
  assert.equal(calibration.upAxis, 2);
  const position = toWorldPosition(calibration, [120, -300], 16);
  assert.equal(position[0], 120);
  assert.equal(position[1], -300);
  assert.equal(position[2], 8 * calibration.unitsPerMeter);
  const scale = toWorldScale(calibration, 10, 20, 30);
  assert.deepEqual(scale, [10, 20, 30].map(n => n * calibration.unitsPerMeter));
});

test("landmarks have finite 3D bounds, rest on the XY plane, and retain picking IDs", () => {
  const library = createLandmarkLibrary();
  try {
    for (const [kind, id] of [["ice-block", "CT-CORE-01"], ["gate", "west"], ["lake", "lake-3"], ["lantern", "lamp"], ["slope", "slide"], ["camp", "camp"], ["ice-block", "ice"]]) {
      const model = library.build(kind, id);
      model.updateMatrixWorld(true);
      const bounds = new Box3().setFromObject(model);
      const size = bounds.getSize(new Vector3());
      assert.ok([size.x, size.y, size.z].every(n => Number.isFinite(n) && n > 0.1), kind);
      assert.ok(bounds.min.z >= -0.01, `${kind} must not extend underground`);
      model.traverse(child => { if (child instanceof Mesh) assert.equal(child.userData.spotId, id); });
    }
  } finally { library.dispose(); }
});
