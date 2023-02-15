export type LyricToken = {
	charIndex: number
	lastPlaceholder?: string
} & ({
	type: 'char'
	char: string
} | {
	type: 'grouped' | 'role'
	char: string
} | {
	type: 'symbol'
	slot: 'before' | 'after'
	char: string
} | {
	type: 'divide' | 'placeholder'
	char: string
})
