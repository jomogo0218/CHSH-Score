const fs = require("fs");
const path = require("path");

const dir = path.join("public", "icons");
fs.mkdirSync(dir, { recursive: true });

function svg(size) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="100%" height="100%" rx="${Math.round(size / 5)}" fill="#2a6b58"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-size="${Math.round(size * 0.28)}" fill="white" font-family="Arial" font-weight="700">清</text>
    </svg>`,
  );
}

async function main() {
  try {
    const sharp = require("sharp");
    await sharp(svg(192)).png().toFile(path.join(dir, "icon-192.png"));
    await sharp(svg(512)).png().toFile(path.join(dir, "icon-512.png"));
    console.log("png ok");
  } catch (e) {
    console.log("sharp fail", e.message);
    fs.writeFileSync(
      path.join(dir, "icon.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <rect width="512" height="512" rx="96" fill="#2a6b58"/>
        <text x="256" y="300" text-anchor="middle" font-size="180" fill="white" font-family="Arial" font-weight="700">清</text>
      </svg>`,
    );
  }
}

main();
