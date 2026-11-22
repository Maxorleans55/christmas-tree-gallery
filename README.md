# Christmas Tree Gallery 🎄

An interactive 3D Christmas tree that hangs photos and videos as polaroids. Spin it, zoom into a memory, add your own, and download a snapshot. Built as a personal Christmas gift, and part of a pair with the [3D snow globe greeting](https://github.com/Maxorleans55/christmas-3d), which links to this tree.

## Features

- **Photos and videos on the tree.** Videos play muted and looping on their polaroid and are center-cropped to fit.
- **Default memories.** Ships with a set of photos and videos defined in `defaultMedia.ts`.
- **Add, edit, delete.** Add single or bulk photos and videos (videos over 50 MB are skipped), edit captions, and delete polaroids in Edit mode.
- **Your changes are saved** in the browser (IndexedDB), so the tree is still yours after a refresh.
- **Custom title.** The heading defaults to the value of `DEFAULT_USER_NAME` in `constants.ts` and can be edited in the app.
- **Mouse or hand-gesture control** (MediaPipe hand tracking via webcam).
- **Presentation mode** to hide the UI, music, and PNG / video recording of the scene.

## Tech stack

React 18 · TypeScript · Vite 6 · React Three Fiber · drei · three.js · MediaPipe · idb-keyval · Tailwind CSS (CDN) · lucide-react

## Getting started

```bash
npm install
npm run dev
```

Open the URL Vite prints (default http://localhost:5173). To pick a port:

```bash
npm run dev -- --port 5174 --strictPort
```

Production build:

```bash
npm run build
npm run preview
```

## Customize the default media

1. Put your files in `public/media/` (use H.264 `.mp4` for videos so every browser can play them).
2. List them in `defaultMedia.ts`:

```ts
export const DEFAULT_MEDIA = [
  { src: '/media/my-video.mp4', type: 'video', caption: 'A caption' },
  { src: '/media/my-photo.jpg', type: 'image', caption: 'Another caption' },
];
```

3. Media fills every second slot of the tree, starting from the first (see `App.tsx`). Other slots show placeholders that visitors can replace.
4. Change the title in `constants.ts` (`DEFAULT_USER_NAME`).

**Already opened the app before changing the media?** The tree is saved in your browser. Bump `STORE_KEY` in `App.tsx` (for example `lumiere-tree-v4`) or clear the site data to reload the defaults.

## Project structure

```
App.tsx              app state, saving, uploads
defaultMedia.ts      default photos and videos
constants.ts         colors, tree config, default title
types.ts             shared types
components/          Scene, TreeMesh, Polaroid, Overlay, Star, Snow, ...
hooks/               tree interaction, audio, recording, hand control
utils/math.ts        spiral placement of polaroids
public/media/        your photos and videos
```

## Deploy (Vercel)

1. Push the repo to GitHub.
2. Import it on [vercel.com](https://vercel.com). Framework: Vite, build command `npm run build`, output directory `dist`.
3. Copy the deployed URL into the `TREE_URL` constant of the snow globe app so its button opens this tree.

## Privacy

The default media is personal. Keep the repository **private** and share only the deployed link with the person it is for.

## Credits

Based on [gracetyy/christmas-tree](https://github.com/gracetyy/christmas-tree) (MIT License), customized by Maxorleans. See [LICENSE](LICENSE).
