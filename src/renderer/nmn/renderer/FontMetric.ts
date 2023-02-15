import { multiReplace } from "../util/string"

export class FontMetric {
	fontFamily: string
	fontWeight: number
	fontScale: number
	fontSize: number

	constructor(descriptor: string, fontSize: number) {
		const tokens = descriptor.split('/')
		this.fontFamily = multiReplace(tokens[0], [['_', ' '], ['__', '_']])
		this.fontWeight = 400
		this.fontScale = 1
		if(tokens[1]) {
			let val = +tokens[1]
			if(val == val && 100 <= val && val <= 1000) {
				this.fontWeight = val
			}
		}
		if(tokens[2]) {
			let val = +tokens[2]
			if(val == val && 0 <= val && val < 128) {
				this.fontScale = val
			}
		}
		this.fontSize = fontSize
	}

	
}
