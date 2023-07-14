class MetaCommentWriterClass {

	__linify(code: string) {
		return code.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
	}
	__recreate(lines: string[]) {
		return lines.join('\n')
	}
	__isMetaCommentHead(line: string, name: string) {
		if(line.substring(0, 2) != '//') {
			return false
		}
		line = line.substring(2).trim()
		if(line.startsWith(`[${name}]`)) {
			return true
		}
		return false
	}
	__isMetaCommentTail(line: string, name: string) {
		if(line.substring(0, 2) != '//') {
			return false
		}
		line = line.substring(2).trim()
		if(line.startsWith(`[/${name}]`)) {
			return true
		}
		return false
	}
	__findMetaComment(lines: string[], name: string) {
		let startLine = -1
		for(let i = 0; i < lines.length; i++) {
			const line = lines[i]
			if(this.__isMetaCommentHead(line, name)) {
				startLine = i
				break
			}
		}
		if(startLine == -1) {
			return undefined
		}
		let endLine = -1
		for(let i = startLine + 1; i < lines.length; i++) {
			const line = lines[i]
			if(this.__isMetaCommentTail(line, name)) {
				endLine = i
				break
			}
		}
		if(endLine == -1) {
			return undefined
		}
		return {
			start: startLine,
			end: endLine
		}
	}
	/**
	 * 写入元数据信息
	 */
	writeMeta(code: string, name: string, contentLines: string[], remark: string = '') {
		let lines = this.__linify(code)
		const pos = this.__findMetaComment(lines, name)
		const writtenLines = [
			`// [${name}]` + (remark != '' ? ' #' : '') + remark,
			...contentLines.map(line => '//   ' + line),
			`// [/${name}]`
		]
		if(pos) {
			lines = [
				...lines.slice(0, pos.start),
				...writtenLines,
				...lines.slice(pos.end + 1)
			]
		} else {
			lines = [
				...lines,
				...writtenLines,
				''
			]
		}
		return this.__recreate(lines)
	}
	/**
	 * 元数据是否存在
	 */
	hasMeta(code: string, name: string) {
		let lines = this.__linify(code)
		return !!this.__findMetaComment(lines, name)
	}
	/**
	 * 读取元数据
	 */
	readMeta(code: string, name: string) {
		let lines = this.__linify(code)
		const pos = this.__findMetaComment(lines, name)
		if(!pos) {
			return undefined
		}
		return lines.slice(pos.start + 1, pos.end).filter(line => line.startsWith('//')).map(line => {
			return line.substring(2).trim()
		})
	}

}

/**
 * 用于以注释的形式向代码内写入无关元数据，或者读出已经写入的数据
 */
export const MetaCommentWriter = new MetaCommentWriterClass()
