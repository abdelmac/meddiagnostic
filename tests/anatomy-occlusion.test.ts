import test from "node:test";
import assert from "node:assert/strict";
import { anatomyOcclusionReason, anatomyOcclusionSize } from "../src/ui/anatomy-occlusion.web";

test("desktop occlusion uses a separate half-resolution target bounded to 500k pixels", () => {
  const standard = anatomyOcclusionSize(1200, 800, false);
  assert.deepEqual(standard, { width: 600, height: 400, samples: 12 });
  const large = anatomyOcclusionSize(7680, 4320, false);
  assert.ok(large.width * large.height <= 500_000);
  assert.ok(large.width / large.height > 1.77 && large.width / large.height < 1.79);
});

test("phone occlusion stays within 384 pixels per side even at high device DPR", () => {
  for (const [width, height] of [[1170, 2532], [2532, 1170], [4096, 4096]]) {
    const result = anatomyOcclusionSize(width!, height!, true);
    assert.ok(result.width <= 384 && result.height <= 384);
    assert.ok(result.width * result.height <= 147_456);
    assert.equal(result.samples, 8);
  }
  assert.deepEqual(anatomyOcclusionSize(NaN, -3, true), { width: 1, height: 1, samples: 8 });
});

test("mobile keeps the direct renderer unless the GPU cost can be measured", () => {
  const state = { lowPower: true, measuredGpu: false, moving: false, opacity: 1, triangles: 2_500_000 };
  assert.equal(anatomyOcclusionReason(state), "mobile-unmeasured");
  assert.equal(anatomyOcclusionReason({ ...state, measuredGpu: true }), "active");
});

test("the user depth-shading switch is explicit and takes priority over mobile and performance eligibility", () => {
  const state = { lowPower: true, measuredGpu: false, moving: true, opacity: 0.5, triangles: 10_000_000 };
  assert.equal(anatomyOcclusionReason({ ...state, depthShading: false }), "disabled");
  assert.equal(anatomyOcclusionReason({ ...state, depthShading: true }), "mobile-unmeasured");
  assert.equal(anatomyOcclusionReason({ lowPower: false, measuredGpu: false, moving: false, opacity: 1, triangles: 2000 }), "active");
});

test("motion and translucent dissection bypass depth occlusion instead of creating ghost surfaces", () => {
  const state = { lowPower: false, measuredGpu: true, moving: false, opacity: 1, triangles: 2_500_000 };
  assert.equal(anatomyOcclusionReason({ ...state, moving: true }), "moving");
  assert.equal(anatomyOcclusionReason({ ...state, opacity: 0.65 }), "transparent");
  assert.equal(anatomyOcclusionReason({ ...state, opacity: NaN }), "transparent");
  assert.equal(anatomyOcclusionReason({ ...state, triangles: 0 }), "empty");
});

test("large source selections retain their geometry while the optional extra pass declines the work", () => {
  const state = { lowPower: true, measuredGpu: true, moving: false, opacity: 1, triangles: 3_800_001 };
  assert.equal(anatomyOcclusionReason(state), "geometry-budget");
  assert.equal(anatomyOcclusionReason({ ...state, lowPower: false }), "active");
  assert.equal(anatomyOcclusionReason({ ...state, lowPower: false, triangles: 6_000_001 }), "geometry-budget");
});
