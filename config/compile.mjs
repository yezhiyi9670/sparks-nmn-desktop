import { Parcel } from "@parcel/core"

await new Parcel({
	entries: ["./src/main/index.ts", "./src/preload/index.ts"],
	defaultConfig: "@parcel/config-default",
	targets: {
		main: {
			distDir: "dist",
			context: "electron-main"
		},
	},
}).run()
