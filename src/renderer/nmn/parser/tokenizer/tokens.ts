import { BracketPair } from "../lnt2sparse/SparseBuilder";
import { CodeToken, TokenType } from "./tokenizer";

/**
 * 单词筛选器
 */
export class TokenFilter {
	type: TokenType = 'eof'
	content: string[] | string | RegExp | null = null

	constructor(type: TokenType, content: string[] | string | RegExp | null) {
		this.type = type
		this.content = content
	}

	/**
	 * 测试是否符合
	 */
	test(token: CodeToken | CodeToken[] | BracketToken) {
		if('bracket' in token) {
			return false
		}
		if('length' in token) {
			return Tokens.consistsOnly(token, this)
		} else {
			return Tokens.matchesFilter(token, this)
		}
	}
	
	/**
	 * 查找
	 */
	findIn(tokens: BracketTokenList, startIndex: number = 0) {
		return Tokens.indexOf(tokens, this, startIndex)
	}

	/**
	 * 查找括号外层
	 */
	findInLayered(tokens: BracketTokenList, parens: [string, string][], startIndex: number = 0) {
		return Tokens.indexOfLayered(tokens, this, parens, startIndex)
	}
}

/**
 * 括号筛选器
 */
export class BracketFilter {
	bracket: string = ''

	constructor(bracket: string) {
		this.bracket = bracket
	}

	/**
	 * 测试是否符合
	 */
	test(brp: BracketPair | CodeToken) {
		if(!('bracket' in brp)) {
			return false
		}
		return brp.bracket == this.bracket
	}
}

export type BracketToken = CodeToken | BracketPair
export type BracketTokenList = BracketToken[]
export type BracketFiltersResult = (BracketTokenList[] | string)[] | undefined
/**
 * 括号对筛选器序列
 * 
 * 大类正则也（bushi
 */
export class BracketPairFilters {
	filters: (TokenFilter | BracketFilter)[]

	constructor(...filters: (TokenFilter | BracketFilter)[]) {
		this.filters = filters.slice()
	}

	/**
	 * 测试是否符合，并给出匹配结果对象
	 */
	test(tokens: BracketTokenList): BracketFiltersResult {
		const ret: (BracketTokenList[] | string)[] = []
		if(tokens.length != this.filters.length) {
			return undefined
		}
		for(let index = 0; index < tokens.length; index++) {
			const token = tokens[index]
			const filter = this.filters[index]
			if(+('bracket' in token) ^ +('bracket' in filter)) {
				return undefined
			}
			if(!filter.test(token as any)) {
				return undefined
			}
			if('bracket' in token) {
				ret.push(token.tokens)
			} else {
				ret.push(token.content)
			}
		}
		return ret
	}
	testThen<R>(tokens: BracketTokenList, func: (it: (string | BracketTokenList[])[]) => (R | undefined)): R | undefined {
		let result0 = this.test(tokens)
		if(result0 !== undefined) {
			return func(result0)
		}
		return undefined
	}
}

class TokensClass {
	/**
	 * EOF
	 */
	eof: CodeToken = {
		range: [0, 0],
		content: '',
		type: 'eof',
		lineHead: false
	}
	/**
	 * 单词是否符合筛选器
	 */
	matchesFilter(token: CodeToken, filter: TokenFilter) {
		if(token.type != filter.type) {
			return false
		}
		if(filter.content === null) {
			return true
		}
		if(typeof filter.content == 'string') {
			return filter.content == token.content
		}
		if(typeof filter.content == 'object' && 'flags' in filter.content) {
			return filter.content.test(token.content)
		}
		return filter.content.indexOf(token.content) != -1
	}
	/**
	 * 单词列表是否全部符合筛选器（忽略 EOF）
	 */
	consistsOnly(tokenList: CodeToken[], filter: TokenFilter) {
		return tokenList.filter((token) => {
			if(token.type == 'eof') {
				return false
			}
			return !this.matchesFilter(token, filter)
		}).length == 0
	}
	/**
	 * 查找括号外层
	 */
	indexOfLayered(tokenList: BracketTokenList, filter: TokenFilter, parens: [string, string][], startIndex: number = 0) {
		let parenChecker = Array(parens.length).fill(0) as number[]
		function checkParen(symbolContent: string) {
			for(let i = 0; i < parens.length; i++) {
				if(parens[i][0] == symbolContent) {
					parenChecker[i] += 1
				}
				if(parens[i][1] == symbolContent) {
					parenChecker[i] -= 1
				}
			}
		}
		function isAllZero() {
			return parenChecker.filter((val) => !!val).length == 0
		}
		for(let i = startIndex; i < tokenList.length; i++) {
			const curr = tokenList[i]
			if(!('bracket' in curr)) {
				if(curr.type == 'symbol') {
					checkParen(curr.content)
				}
				if(this.matchesFilter(curr, filter)) {
					if(isAllZero()) {
						return i
					}
				}
			}
		}
		return -1
	}
	/**
	 * 查找
	 */
	indexOf(tokenList: BracketTokenList, filter: TokenFilter, startIndex: number = 0) {
		return this.indexOfLayered(tokenList, filter, [], startIndex)
	}
	/**
	 * 将令牌列表重新变为字符串
	 * 
	 * 此操作忽略 EOL
	 */
	stringify(tokenList: BracketTokenList, spacer: string = ' ', comma: string = ', ') {
		let ret = ''
		let first = true
		for(let token of tokenList) {
			if(first) first = false
			else ret += spacer
			if('bracket' in token) {
				ret += token.bracket
				let first = true
				for(let nextList of token.tokens) {
					if(first) first = false
					else ret += comma
					ret += Tokens.stringify(nextList)
				}
				ret += token.rightBracket
			} else {
				if(token.type == 'word') {
					ret += token.content
				}
				if(token.type == 'symbol') {
					ret += token.content
				}
				if(token.type == 'stringLiteral') {
					ret += JSON.stringify(token.content)
				}
			}
		}
		return ret
	}
	rangeSafe(tokens: BracketTokenList, index: number, i: 0 | 1) {
		if(index < 0) {
			return 0
		}
		if(index >= tokens.length) {
			if(tokens.length == 0) {
				return 0
			}
			return tokens[tokens.length - 1].range[1]
		}
		return tokens[index].range[i]
	}
	/**
	 * 使用一组符号分割 Token 列表
	 */
	split(tokens: BracketTokenList, splitMatches: TokenFilter[]): BracketTokenList[] {
		let current: BracketTokenList = []
		let ret: BracketTokenList[] = [current]
		for(let token of tokens) {
			let hasMatch = false
			if(!('bracket' in token)) {
				for(let filter of splitMatches) {
					if(filter.test(token)) {
						hasMatch = true
						break
					}
				}
			}
			if(hasMatch) {
				current = []
				ret.push(current)
			} else {
				current.push(token)
			}
		}
		return ret
	}
	/**
	 * 列表缩合
	 */
	join(lists: BracketTokenList[], glue: CodeToken) {
		const ret: BracketTokenList = []
		let lastRange: number | undefined = undefined
		for(let list of lists) {
			if(lastRange !== undefined) {
				ret.push(Object.assign({}, glue, {
					range: [lastRange, lastRange + glue.content.length]
				}))
				lastRange += glue.content.length
			}
			lastRange = 0
			for(let item of list) {
				ret.push(item)
				lastRange = item.range[1]
			}
		}
		return ret
	}
}

export const Tokens = new TokensClass()
