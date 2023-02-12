/**
 * 按字符集生成指定长度的字符串
 * @param length 长度
 * @param charset 可用字符集 ~~(这个默认值长度 32，是夹带私货的)~~
 */
export function randomToken(length: number, charset: string = '0123456789abcdfghijkmopqrstuvxyz') {
	let str = ''
	for(let i = 0; i < length; i++) {
		let randChar = charset[Math.floor(Math.random() * charset.length)]
		str += randChar
	}
	return str
}
