export type LyricToken = {
	charIndex: number
	lastPlaceholder?: string
} & ({
	type: 'char' | 'grouped'
	char: string
	isCharBased: boolean
} | {
	type: 'role'
	char: string
} | {
	type: 'symbol'
	slot: 'before' | 'after'
	char: string
} | {
	type: 'divide' | 'placeholder'
	char: string
})
