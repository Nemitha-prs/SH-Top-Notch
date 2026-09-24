// One-off script: masks the supplied favicon into a circular favicon (PNG + ICO).
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SRC = path.resolve("images/favicon.ico");
const SIZES = [16, 32, 48, 64, 128, 256];

const circleMask = (size) => Buffer.from(
  `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
);

async function makeCircularPng(size) {
  const resized = await sharp(SRC).resize(size, size, { fit: "cover" }).toBuffer();
  return sharp(resized)
    .composite([{ input: circleMask(size), blend: "dest-in" }])
    .png()
    .toBuffer();
}

// Minimal ICO container embedding PNG frames (supported by modern browsers/OS).
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + dirEntrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  pngBuffers.forEach(({ size, buffer }) => {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset of image data
    offset += buffer.length;
    dirEntries.push(entry);
  });

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map((p) => p.buffer)]);
}

const icoSizes = [16, 32, 48];
const ico = await readFile(SRC);
const imageOffset = ico.readUInt32LE(18);
const dibSize = ico.readUInt32LE(imageOffset);
const width = ico.readInt32LE(imageOffset + 4);
const height = ico.readInt32LE(imageOffset + 8) / 2;
const pixelOffset = imageOffset + dibSize;
const pixels = Buffer.alloc(width * height * 4);

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const sourceOffset = pixelOffset + ((height - y - 1) * width + x) * 4;
    const targetOffset = (y * width + x) * 4;
    pixels[targetOffset] = ico[sourceOffset + 2];
    pixels[targetOffset + 1] = ico[sourceOffset + 1];
    pixels[targetOffset + 2] = ico[sourceOffset];
    pixels[targetOffset + 3] = ico[sourceOffset + 3];
  }
}

const source = sharp(pixels, { raw: { width, height, channels: 4 } });
const icoFrames = [];
for (const size of icoSizes) {
  const resized = await source.resize(size, size, { fit: "cover" }).png().toBuffer();
  const buffer = await sharp(resized)
    .composite([{ input: circleMask(size), blend: "dest-in" }])
    .png()
    .toBuffer();
  icoFrames.push({ size, buffer });
}

const icoBuffer = buildIco(icoFrames);
await writeFile(path.resolve("images/favicon.ico"), icoBuffer);

const png256 = await source.resize(256, 256, { fit: "cover" }).composite([{ input: circleMask(256), blend: "dest-in" }]).png().toBuffer();
await writeFile(path.resolve("images/favicon.png"), png256);

console.log("Generated images/favicon.ico and images/favicon.png");
