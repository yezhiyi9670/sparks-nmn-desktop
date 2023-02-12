import fs from 'fs'

fs.rm('dist/public', { recursive: true, force: true }, (err) => {
	if(err) {
		console.log('Cannot remove the public directory')
	} else {
		console.log('Removed public directory')
	}
})

// fs.rm('dist/public-dev', { recursive: true, force: true }, (err) => {
// 	if(err) {
// 		console.log('Cannot remove the public-dev directory')
// 	} else {
// 		console.log('Removed public-dev directory')
// 	}
// })
