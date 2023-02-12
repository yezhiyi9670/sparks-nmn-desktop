Electron, Parcel and Typescript Boilerplate
====

This is a minimalistic demo about the way mixing [Electron](https://electronjs.org/), [Parcel](https://parceljs.org/) and [Typescript](https://typescriptlang.org/). And also [React](https://reactjs.org/)!

## Features

- Automated building
- Whether it's the main or render process, the code is transpiled using Parcel, so it should be very fast.
- Render process auto reload / hot reload, brought by Parcel.
- Fully typed, even with a hack that types the contextBridge.

## How it works

During development, when running `yarn start`,

- Launch Parcel development server, loading `public/template.html`, which further loads `src/renderer/index.tsx`.
- Transpile `src/main/index.ts` and `src/preload/index.ts`, using the automation script in `config`, also with Parcel.
- Launch electron on `dist/main/index.js`.

when building (`yarn build`),

- Call `npm run clean`, which removes the `dist/public` directory to avoid redundant files.
- Build `public/template.html` using Parcel.
- Transpile `src/main/index.ts` and `src/preload/index.ts`, using the automation script in `config`, also with Parcel.
- Build the `dist` directory into the package, with nothing else.
