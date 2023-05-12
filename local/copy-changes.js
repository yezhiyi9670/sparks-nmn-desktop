const fs = require('fs')
const path = require('path')

if(!fs.existsSync("package.json")) {
	console.log("This is not the right directory");
	process.exit(3);
}

const installDir = 'D:/Program Files (portable)/sparks-nmn-desktop/'
if(fs.existsSync(installDir)) {
	fs.copyFileSync('out/sparks-nmn-desktop-win32-x64/sparks-nmn-desktop.exe', installDir + 'sparks-nmn-desktop.exe')
	fs.copyFileSync('out/sparks-nmn-desktop-win32-x64/resources/app.asar', installDir + 'resources/app.asar')
}
