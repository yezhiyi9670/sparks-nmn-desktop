export type SplitLine = {
	text: string
	lineNumber: number
}

export module Linifier {
	export function linify(text: string): SplitLine[] {
		text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
		const lines = text.split("\n")

		const ret: SplitLine[] = []
		let lineNumber = 0
		let connectState = false
		let lastLine: SplitLine | undefined = undefined as any

		for(let line of lines) {
			lineNumber += 1
			let nextConnect = false
			if(line != '' && line[line.length - 1] == "\\") {
				line = line.substring(0, line.length - 1)
				nextConnect = true
			}
			if(connectState) {
				lastLine!.text += line
			} else {
				ret.push(lastLine = {
					text: line,
					lineNumber: lineNumber
				})
			}
			connectState = nextConnect
		}
		return ret
	}
}
