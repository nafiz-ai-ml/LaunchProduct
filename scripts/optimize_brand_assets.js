const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT_BRAND = path.resolve(__dirname, '../public/brand');
const FRONTEND_BRAND = path.resolve(__dirname, '../frontend/public/brand');
const BACKUP_BRAND = path.resolve(__dirname, '../public/brand_original');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_BRAND)) {
  fs.cpSync(ROOT_BRAND, BACKUP_BRAND, { recursive: true });
  console.log('Backed up original brand assets to:', BACKUP_BRAND);
}

/**
 * Remove background by color distance with smooth edge feathering and de-fringing
 */
async function removeBackground(inputBuffer, options = {}) {
  const { data, info } = await sharp(inputBuffer).raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  // Sample corner pixel as background color if not provided
  const bgR = options.bgR !== undefined ? options.bgR : data[0];
  const bgG = options.bgG !== undefined ? options.bgG : data[1];
  const bgB = options.bgB !== undefined ? options.bgB : data[2];

  const low = options.low || 12;
  const high = options.high || 55;

  const out = Buffer.alloc(w * h * 4);

  for (let i = 0; i < w * h; i++) {
    const srcIdx = i * 4;
    const r = data[srcIdx];
    const g = data[srcIdx + 1];
    const b = data[srcIdx + 2];

    const diff = Math.max(Math.abs(r - bgR), Math.abs(g - bgG), Math.abs(b - bgB));

    let alpha = 255;
    if (diff <= low) {
      alpha = 0;
    } else if (diff < high) {
      alpha = Math.round(255 * ((diff - low) / (high - low)));
    }

    if (alpha === 0) {
      out[srcIdx] = 0;
      out[srcIdx + 1] = 0;
      out[srcIdx + 2] = 0;
      out[srcIdx + 3] = 0;
    } else {
      const aNorm = alpha / 255;
      const unR = Math.min(255, Math.max(0, Math.round((r - (1 - aNorm) * bgR) / aNorm)));
      const unG = Math.min(255, Math.max(0, Math.round((g - (1 - aNorm) * bgG) / aNorm)));
      const unB = Math.min(255, Math.max(0, Math.round((b - (1 - aNorm) * bgB) / aNorm)));
      out[srcIdx] = unR;
      out[srcIdx + 1] = unG;
      out[srcIdx + 2] = unB;
      out[srcIdx + 3] = alpha;
    }
  }

  return await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/**
 * Generate large, crisp, transparent-backed square favicons
 */
async function generateFavicons(transparentIconBuffer) {
  const { data, info } = await sharp(transparentIconBuffer).raw().toBuffer({ resolveWithObject: true });

  // Find bounding box of icon
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * 4;
      if (data[idx + 3] > 15) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const cropped = await sharp(transparentIconBuffer)
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .toBuffer();

  const createSquare = async (size, paddingRatio = 0.88) => {
    const innerSize = Math.round(size * paddingRatio);
    const resized = await sharp(cropped)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    return await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toBuffer();
  };

  const fav512 = await createSquare(512);
  const fav192 = await createSquare(192);
  const fav180 = await createSquare(180);
  const fav32 = await createSquare(32);
  const fav16 = await createSquare(16);

  return { fav512, fav192, fav180, fav32, fav16 };
}

async function run() {
  console.log('Starting studio-grade brand asset optimization...');

  // 1. Process Icon
  const iconRaw = fs.readFileSync(path.join(BACKUP_BRAND, 'icon/icon.png'));
  const transparentIcon = await removeBackground(iconRaw, { low: 12, high: 50 });

  // 2. Generate Favicons (512x512, 192x192, 32x32)
  const { fav512, fav192, fav180, fav32, fav16 } = await generateFavicons(transparentIcon);

  // 3. Process Primary Horizontal Logo
  const primaryRaw = fs.readFileSync(path.join(BACKUP_BRAND, 'logo/primary-horizontal.png'));
  const transparentPrimary = await removeBackground(primaryRaw, { low: 12, high: 55 });

  // 4. Process Wordmark
  const wordmarkRaw = fs.readFileSync(path.join(BACKUP_BRAND, 'logo/wordmark.png'));
  const transparentWordmark = await removeBackground(wordmarkRaw, { low: 12, high: 55 });

  // 5. Process Light Background Logo
  const lightLogoRaw = fs.readFileSync(path.join(BACKUP_BRAND, 'logo/logo-light.png'));
  const transparentLightLogo = await removeBackground(lightLogoRaw, { low: 12, high: 50 });

  // 6. Process Monochrome Black Logo
  const monoBlackRaw = fs.readFileSync(path.join(BACKUP_BRAND, 'logo/logo-monochrome-black.png'));
  const transparentMonoBlack = await removeBackground(monoBlackRaw, { low: 12, high: 50 });

  // 7. Process Monochrome White Logo (Dark BG removal)
  const monoWhiteRaw = fs.readFileSync(path.join(BACKUP_BRAND, 'logo/logo-monochrome-white.png'));
  const transparentMonoWhite = await removeBackground(monoWhiteRaw, { bgR: 17, bgG: 20, bgB: 21, low: 15, high: 65 });

  // 8. Process App Icon
  const appIconRaw = fs.readFileSync(path.join(BACKUP_BRAND, 'icon/app-icon.png'));
  const transparentAppIcon = await removeBackground(appIconRaw, { low: 10, high: 45 });

  // 9. Process Dark Background Logo (Blue icon + crisp white text on transparent background)
  const { data: primaryData, info: primaryInfo } = await sharp(transparentPrimary).raw().toBuffer({ resolveWithObject: true });
  const darkLogoBuf = Buffer.alloc(primaryInfo.width * primaryInfo.height * 4);
  for (let i = 0; i < primaryInfo.width * primaryInfo.height; i++) {
    const src = i * 4;
    const r = primaryData[src], g = primaryData[src + 1], b = primaryData[src + 2], a = primaryData[src + 3];
    if (a === 0) {
      darkLogoBuf[src] = 0;
      darkLogoBuf[src + 1] = 0;
      darkLogoBuf[src + 2] = 0;
      darkLogoBuf[src + 3] = 0;
      continue;
    }
    const x = i % primaryInfo.width;
    const isBlueIcon = x < 190 && (b > 180 && r < 100);
    if (isBlueIcon) {
      darkLogoBuf[src] = r;
      darkLogoBuf[src + 1] = g;
      darkLogoBuf[src + 2] = b;
      darkLogoBuf[src + 3] = a;
    } else {
      darkLogoBuf[src] = 255;
      darkLogoBuf[src + 1] = 255;
      darkLogoBuf[src + 2] = 255;
      darkLogoBuf[src + 3] = a;
    }
  }
  const transparentLogoDark = await sharp(darkLogoBuf, {
    raw: { width: primaryInfo.width, height: primaryInfo.height, channels: 4 }
  }).png().toBuffer();

  // Write all processed assets to both public/brand and frontend/public/brand
  const targets = [ROOT_BRAND, FRONTEND_BRAND];

  for (const dir of targets) {
    // Favicons
    fs.writeFileSync(path.join(dir, 'favicon/favicon.png'), fav512);
    fs.writeFileSync(path.join(dir, 'favicon/05_favicon.png'), fav512);
    fs.writeFileSync(path.join(dir, 'favicon/favicon-512x512.png'), fav512);
    fs.writeFileSync(path.join(dir, 'favicon/favicon-192x192.png'), fav192);
    fs.writeFileSync(path.join(dir, 'favicon/apple-touch-icon.png'), fav180);
    fs.writeFileSync(path.join(dir, 'favicon/favicon-32x32.png'), fav32);
    fs.writeFileSync(path.join(dir, 'favicon/favicon-16x16.png'), fav16);

    // Icons
    fs.writeFileSync(path.join(dir, 'icon/icon.png'), transparentIcon);
    fs.writeFileSync(path.join(dir, 'icon/02_icon_only.png'), transparentIcon);
    fs.writeFileSync(path.join(dir, 'icon/app-icon.png'), transparentAppIcon);
    fs.writeFileSync(path.join(dir, 'icon/04_app_icon.png'), transparentAppIcon);

    // Logos
    fs.writeFileSync(path.join(dir, 'logo/primary-horizontal.png'), transparentPrimary);
    fs.writeFileSync(path.join(dir, 'logo/01_primary_horizontal.png'), transparentPrimary);
    fs.writeFileSync(path.join(dir, 'logo/wordmark.png'), transparentWordmark);
    fs.writeFileSync(path.join(dir, 'logo/03_wordmark_only.png'), transparentWordmark);
    fs.writeFileSync(path.join(dir, 'logo/logo-light.png'), transparentLightLogo);
    fs.writeFileSync(path.join(dir, 'logo/06_light_background.png'), transparentLightLogo);
    fs.writeFileSync(path.join(dir, 'logo/logo-dark.png'), transparentLogoDark);
    fs.writeFileSync(path.join(dir, 'logo/07_dark_background.png'), transparentLogoDark);
    fs.writeFileSync(path.join(dir, 'logo/logo-monochrome-black.png'), transparentMonoBlack);
    fs.writeFileSync(path.join(dir, 'logo/08_monochrome_black.png'), transparentMonoBlack);
    fs.writeFileSync(path.join(dir, 'logo/logo-monochrome-white.png'), transparentMonoWhite);
    fs.writeFileSync(path.join(dir, 'logo/09_monochrome_white.png'), transparentMonoWhite);
  }

  console.log('✅ All brand assets successfully optimized with transparent backgrounds and high-res favicons!');
}

run().catch(err => {
  console.error('Error optimizing brand assets:', err);
  process.exit(1);
});
