# Exercise media pipeline

Gymmin keeps editable exercise image sources separate from production runtime assets.

## Layout

- `media-source/exercises/<exercise-id>/start.png` and/or `end.png` are non-bundled editable sources.
- `apps/mobile/assets/exercises/<exercise-id>/start.webp` and/or `end.webp` are production runtime assets.
- exercise media is static-only; video and animated image formats are not supported.
- achievement media is a separate asset family and is not handled by this pipeline.

The logical keys remain `<exercise-id>/start` and `<exercise-id>/end`. `exerciseImageAssets.ts` therefore remains independent of the physical image format. Metro receives a generated, static `require()` map in `exerciseImageSources.ts`; dynamic requires are not used.

## Production profile

- WebP, quality 90;
- maximum 900 x 1140 pixels;
- aspect ratio preserved;
- no crop;
- no upscale;
- metadata stripped;
- identical algorithm for every image, whether an exercise has one image or a START/END pair.

## Commands

After generating or importing PNG sources:

```powershell
npm run exercise:media:optimize
npm run exercise:media:validate
```

The optimizer performs a complete preflight before writing output, converts into staging, validates every result, copies approved WebP assets into the runtime directory, regenerates the static maps, and writes before/after reports under `.artifacts/exercise-media-optimization/`.

The validation command is also part of the mobile pretest gate. It rejects:

- runtime exercise PNG files;
- image sets without either a START or END image;
- mismatched pair dimensions;
- missing static require targets;
- orphan production images;
- dimensions above 900 x 1140;
- WebP files above 192 KiB;
- animated exercise media (`gif`, `m4v`, `mov`, `mp4`, `webm`).

Do not run `sync-exercise-image-assets.mjs` as a substitute for optimization after adding PNG sources. Synchronization only reflects already optimized runtime WebP files; the mandatory source-to-runtime step is `exercise:media:optimize`.
