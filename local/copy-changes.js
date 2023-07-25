const fs = require('fs')
const path = require('path')

if(!fs.existsSync("package.json")) {
	console.log("This is not the right directory");
	process.exit(3);
}

const copy = (sd, td, reject = []) => {
	if(!fs.existsSync(td)) {
		fs.mkdirSync(td)
	}
	// 读取目录下的文件，返回文件名及文件类型{name: 'xxx.txt, [Symbol(type)]: 1 }
	const sourceFile = fs.readdirSync(sd, { withFileTypes: true });
	for (const file of sourceFile) {
		if(reject.indexOf(file.name) != -1) {
			continue
		}
		// 源文件 地址+文件名
		const srcFile = path.resolve(sd, file.name);
		// 目标文件
		const tagFile = path.resolve(td, file.name);
		// 文件是目录且未创建
		if (file.isDirectory() && !fs.existsSync(tagFile)) {
			fs.mkdirSync(tagFile, (err) => console.log(err));
			copy(srcFile, tagFile);
		} else if (file.isDirectory() && fs.existsSync(tagFile)) {
			// 文件时目录且已存在
			copy(srcFile, tagFile);
		}
		!file.isDirectory() &&
			fs.copyFileSync(srcFile, tagFile, fs.constants.COPYFILE_FICLONE);
	}
};

const installDir = 'D:/Program Files (portable)/sparks-nmn-desktop/'
if(fs.existsSync(installDir)) {
	fs.copyFileSync('out/sparks-nmn-desktop-win32-x64/sparks-nmn-desktop.exe', installDir + 'sparks-nmn-desktop.exe')
	if(fs.existsSync(installDir + 'resources')) {
		fs.rmSync(installDir + 'resources', {
			recursive: true
		})
	}
	fs.mkdirSync(installDir + 'resources')
	copy('out/sparks-nmn-desktop-win32-x64/resources', installDir + 'resources')
}
