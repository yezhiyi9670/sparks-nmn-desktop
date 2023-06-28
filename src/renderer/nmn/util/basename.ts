export function basename(p: string) {
	p = p.replace(/\\/g, '/')
	let idx = p.lastIndexOf('/')
	if(idx != -1) {
		return p.substring(idx + 1)
	}
	return p
}
export function basenameName(p: string) {
	p = basename(p)
	let idx = p.lastIndexOf('.')
	if(idx != -1) {
		return p.substring(0, idx)
	}
	return p
}
