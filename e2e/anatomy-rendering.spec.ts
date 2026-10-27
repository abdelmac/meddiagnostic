import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { chooseAtlasSource, closeAtlasPanel, openAtlasPanel, selectAtlasStructure, waitForAtlasSteady } from "./anatomy-helpers";
import manifest from "../src/data/bodyparts3d-complete-manifest.json";
import { localizeAnatomyName } from "../src/data/anatomy-nomenclature";

const settledModes = ["active", "mobile-unmeasured", "gpu-budget", "cpu-budget", "geometry-budget"];

test("depth rendering changes genuine anatomy pixels while preserving the background and safe fallbacks", async ({ page }, info) => {
  test.setTimeout(150000);
  const graphicsErrors: string[] = [];
  page.on("console", message => {
    if (message.type() === "error" && /WebGL|Shader Error|VALIDATE_STATUS|framebuffer|GL_INVALID/.test(message.text())) graphicsErrors.push(message.text());
  });
  page.on("pageerror", error => graphicsErrors.push(error.message));
  await page.goto("/anatomy?lang=fr");
  await chooseAtlasSource(page, "detailed");
  const canvas = page.getByTestId("anatomy-webgl-canvas");
  await expect(page.getByTestId("anatomy-3d-scene")).toHaveAttribute("data-ready", "true", { timeout: 60000 });
  await closeAtlasPanel(page);
  if (info.project.name === "desktop") {
    await selectAtlasStructure(page, localizeAnatomyName(manifest.meshes.find(entry => entry.id === "FMA34682")!.name, "fr"), "FMA34682");
    await page.getByRole("button", { name: "Centrer la structure", exact: true }).click();
  }
  await waitForAtlasSteady(canvas);
  await expect.poll(() => canvas.getAttribute("data-occlusion-mode"), { timeout: 10000 }).toMatch(/^(active|mobile-unmeasured|gpu-budget|cpu-budget|geometry-budget)$/);
  const initialMode = await canvas.getAttribute("data-occlusion-mode");
  expect(settledModes).toContain(initialMode);
  const setDepth = async (enabled: boolean) => {
    const panel = await openAtlasPanel(page, "layers");
    const action = panel.getByRole("button", { name: "Ombres de profondeur", exact: true });
    if (await action.getAttribute("aria-pressed") !== String(enabled)) await action.click();
    await expect(action).toHaveAttribute("aria-pressed", String(enabled));
    await closeAtlasPanel(page);
    const box = (await canvas.boundingBox())!;
    // Remove incidental hover colour without disturbing camera, DPR or LOD.
    await page.mouse.move(box.x + box.width * 0.02, box.y + box.height * 0.5);
    await waitForAtlasSteady(canvas);
  };
  await setDepth(false);
  await expect(canvas).toHaveAttribute("data-occlusion-mode", "disabled");
  const camera = await canvas.getAttribute("data-camera");
  const ids = await canvas.getAttribute("data-lod-ids");
  const directPixels = await canvas.getAttribute("data-buffer-pixels");
  const direct = await canvas.screenshot({ path: `artifacts/ippomed-depth-direct-${info.project.name}.png` });
  await setDepth(true);
  await expect.poll(() => canvas.getAttribute("data-occlusion-mode"), { timeout: 10000 }).toMatch(/^(active|mobile-unmeasured|gpu-budget|cpu-budget|geometry-budget)$/);
  let comparison: unknown = { compared: false, reason: await canvas.getAttribute("data-occlusion-mode") };
  if (await canvas.getAttribute("data-occlusion-mode") === "active") {
      await expect(canvas).toHaveAttribute("data-camera", camera!);
      await expect(canvas).toHaveAttribute("data-lod-ids", ids!);
      await expect(canvas).toHaveAttribute("data-buffer-pixels", directPixels!);
      const shaded = await canvas.screenshot({ path: `artifacts/ippomed-depth-contact-${info.project.name}.png` });
      const pixels = await page.evaluate(async ({ a, b }) => {
        const decode = async (value: string) => {
          const image = new Image();
          await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Unable to read render screenshot")); image.src = `data:image/png;base64,${value}`; });
          const output = document.createElement("canvas"); output.width = image.naturalWidth; output.height = image.naturalHeight;
          const context = output.getContext("2d")!; context.drawImage(image, 0, 0);
          return { data: context.getImageData(0, 0, output.width, output.height).data, width: output.width, height: output.height };
        };
        const before = await decode(a), after = await decode(b);
        if (before.width !== after.width || before.height !== after.height) throw new Error("Render comparison size changed");
        let changed = 0;
        for (let index = 0; index < before.data.length; index += 4) if (Math.abs(before.data[index]! - after.data[index]!) + Math.abs(before.data[index + 1]! - after.data[index + 1]!) + Math.abs(before.data[index + 2]! - after.data[index + 2]!) > 3) changed++;
        const background = [0.45, 0.75].map(y => {
          const offset = (Math.floor(before.height * y) * before.width + Math.floor(before.width * 0.02)) * 4;
          return [0, 1, 2, 3].reduce((sum, channel) => sum + Math.abs(before.data[offset + channel]! - after.data[offset + channel]!), 0);
        });
        return { compared: true, changed, backgroundDeltas: background, width: before.width, height: before.height };
      }, { a: direct.toString("base64"), b: shaded.toString("base64") });
      expect(pixels.changed, "Depth must change actual rendered pixels at the same camera and LOD").toBeGreaterThan(50);
      expect(pixels.backgroundDeltas.every(delta => delta <= 3), "Depth must preserve the transparent canvas background").toBe(true);
      comparison = pixels;
      const width = Number(await canvas.getAttribute("data-occlusion-width")), height = Number(await canvas.getAttribute("data-occlusion-height"));
      expect(width * height).toBeLessThanOrEqual(info.project.name === "desktop" ? 500000 : 147456);
  }
  await page.getByRole("button", { name: "Transparence", exact: true }).click();
  await expect.poll(() => canvas.getAttribute("data-occlusion-mode")).not.toBe("active");
  await page.getByRole("button", { name: "Transparence", exact: true }).click();
  const panel = await openAtlasPanel(page, "layers");
  await panel.getByRole("button", { name: "Coupe anatomique", exact: true }).click();
  await closeAtlasPanel(page);
  await expect(canvas).not.toHaveAttribute("data-section-axis", "off");
  await expect.poll(() => canvas.getAttribute("data-occlusion-mode"), { timeout: 10000 }).toMatch(/^(active|mobile-unmeasured|gpu-budget|cpu-budget|geometry-budget)$/);
  expect(graphicsErrors).toEqual([]);
  const result = { project: info.project.name, initialMode, finalMode: await canvas.getAttribute("data-occlusion-mode"), gpuMilliseconds: await canvas.getAttribute("data-occlusion-gpu-ms"), comparison, graphicsErrors };
  writeFileSync(`artifacts/ippomed-depth-metrics-${info.project.name}.json`, JSON.stringify(result, null, 2));
  console.log("Anatomy depth render:", JSON.stringify(result));
});
