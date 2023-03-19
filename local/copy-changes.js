const fs = require('fs')
const path = require('path')

if(!fs.existsSync("package.json")) {
	console.log("This is not the right directory");
	process.exit(3);
}

const installDir = 'D:/Program Files (portable)/sparks-nmn-desktop/'
if(fs.existsSync(installDir)) {
	fs.copyFileSync('out/sparks-nmn-desktop-win32-ia32/resources/app.asar', installDir + 'resources/app.asar')
}
