#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const seasons = ["spring", "summer", "autumn", "winter"];
const homes = ["classic", ...seasons.flatMap(season => [
  `classic_${season}`, `classic_${season}_night`,
])];
const eras = ["classic", "qin", "han", "sanguo", "weijin", "nanbei", "sui",
  "tang", "wudai", "song", "yuan", "ming", "qing"];
const required = [
  ...homes.flatMap(home => ["", "_pano_l", "_pano_r"].map(side =>
    `homemap/home_${home}${side}.webp`)),
  "homemap/home_p34.webp",
  "homemap/home_l1610.webp",
  ...eras.flatMap(era => [
    `icons/${era}/feedback.webp`, `icons/${era}/p_story.webp`,
    `icons/${era}/e_mute.webp`, `canying/${era}.webp`,
  ]),
];

function bundleHomeAssets(art, publicDir) {
  // Interface icons are requested by era on multiple screens, even while offline.
  const icons = eras.flatMap(era => fs.readdirSync(path.join(art, "icons", era))
    .filter(file => file.endsWith(".webp")).map(file => `icons/${era}/${file}`));
  const files = [...new Set([...required, ...icons])].sort();
  const sources = files.map(file => {
    const bytes = fs.readFileSync(path.join(art, file));
    if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
      throw new Error(`Invalid homepage WebP: ${file}`);
    }
    return [file, bytes];
  });
  let addedFiles = 0;
  let addedBytes = 0;
  for (const [file, bytes] of sources) {
    const target = path.join(publicDir, "data", file);
    if (fs.existsSync(target) && fs.readFileSync(target).equals(bytes)) continue;
    if (fs.existsSync(target)) {
      throw new Error(`Homepage asset differs from the staged release: ${file}`);
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
    addedFiles++;
    addedBytes += bytes.length;
  }
  return { required: required.length, bundled: files.length, addedFiles, addedBytes };
}

module.exports = { bundleHomeAssets, required };

if (require.main === module) {
  const [art, publicDir] = process.argv.slice(2);
  if (!art || !publicDir) throw new Error("Usage: node bundle-home-assets.js <art> <public>");
  console.log(JSON.stringify(bundleHomeAssets(art, publicDir)));
}
