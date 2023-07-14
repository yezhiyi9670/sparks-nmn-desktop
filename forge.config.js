module.exports = {
	packagerConfig: {
		name: "sparks-nmn-desktop",
		asar: {
			unpackDir: 'dist/public/nmn/resource/font'  // Preview HTML need to load fonts from here
		},
		icon: "./public/static/logo/logo",
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
		},
		win32metadata: {
			CompanyName: 'yezhiyi9670',
			FileDescription: 'Sparks NMN Desktop',
			ProductName: 'Sparks NMN Desktop'
		}
	},
	rebuildConfig: {},
	makers: [
		// {
		// 	name: '@electron-forge/maker-squirrel',
		// 	config: {}
		// },
		{
			name: '@electron-forge/maker-zip',
		},
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
