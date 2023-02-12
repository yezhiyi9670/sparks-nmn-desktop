module.exports = {
	packagerConfig: {
		name: "electron-parcel-ts-demo",
		asar: true,
		ignore: (path) => {
			if(['', '/package.json'].includes(path)) {
				return false
			}
			if(path == '/dist' || path.startsWith('/dist/')) {
				if(path == '/dist/public-dev' || path.startsWith('/dist/public-dev/')) {
					return true
				}
				return false
			}
			return true
		}
	},
	rebuildConfig: {},
	makers: [
		{
			name: '@electron-forge/maker-squirrel',
			config: {},
		},
		// {
		// 	name: '@electron-forge/maker-zip',
		// 	platforms: ['darwin'],
		// },
		// {
		// 	name: '@electron-forge/maker-deb',
		// 	config: {},
		// },
		// {
		// 	name: '@electron-forge/maker-rpm',
		// 	config: {},
		// },
	],
};
