import { CookedLine } from "../commands/priLine";
import { LinedIssue, addIssue } from "../parser";
import { LineLevels, lineLevelNames, lineDelimiters, getCommandDef, getCommandNearestLevel, commandDefs } from "../commands";

export interface LineTree<LineType> {
	/**
	 * 起始位置的行号
	 */
	lineNumber: number
	/**
	 * 头部包含的行
	 */
	lines: LineType[]
	/**
	 * 唯一行的值（已提取）
	 */
	uniqueLines: {[_: string]: LineType}
	/**
	 * 当前级别的名称
	 */
	levelName: string
	/**
	 * 下属
	 */
	children: LineTree<LineType>[]
	/**
	 * 是否已添加子树（辅助变量）
	 *
	 * 已添加子树后，应当不再添加头部行
	 *
	 * 鉴于实际上添加的子树可能因为无效被丢弃，故维护此变量。
	 */
	finalized?: boolean
}
type CookedLineTree = LineTree<CookedLine & {type: 'command'}>

/**
 * 处理内容行
 */
export function mapTreeLines<I, O>(input: LineTree<I>, func: (line: I, levelName: string) => O): LineTree<O> {
	const newTree: LineTree<O> = Object.assign({}, input, {
		lines: [],
		children: [],
		uniqueLines: {} as {[_: string]: O}
	})

	for(let line of input.lines) {
		newTree.lines.push(func(line, input.levelName))
	}

	for(let key in input.uniqueLines) {
		newTree.uniqueLines[key] = func(input.uniqueLines[key], input.levelName)
	}

	for(let child of input.children) {
		newTree.children.push(mapTreeLines<I, O>(child, func))
	}

	return newTree
}

/**
 * LineTree 构造
 * 
 * ~~除了自动布局以外，这大概是整个系统最复杂的地方~~
 * 
 * 这里将对唯一行的重复和必须行的缺失进行警告。另外，必须行缺失的部分将会被丢弃。
 */
export class LineTreeBuilder {
	/**
	 * 输入数据
	 */
	input: CookedLine[] = []
	/**
	 * 当前位置指针
	 */
	currentPtr: number = 0

	/**
	 * 获取当前指针上的行
	 */
	peek(): CookedLine | undefined {
		return this.input[this.currentPtr]
	}
	/**
	 * 指针移动到下一行
	 */
	pass(): CookedLine | undefined {
		return this.input[this.currentPtr++]
	}
	
	constructor(input: CookedLine[]) {
		this.input = input
	}

	/**
	 * 执行解析
	 */
	parse(issues: LinedIssue[]): CookedLineTree {
		this.currentPtr = 0
		let rcevList: CookedLineTree[] = []
		this.handleLevel(0, rcevList, issues)
		if(rcevList.length == 0) {
			addIssue(issues,
				0, 0, 'warning', 'empty_document',
				'The document appears to be empty.'
			)
			return {
				lineNumber: 0,
				levelName: 'document',
				lines: [],
				uniqueLines: {},
				children: []
			}
		}
		return rcevList[0]
	}

	/**
	 * 处理级别
	 */
	handleLevel(level: number, currentList: CookedLineTree[], issues: LinedIssue[]): void {
		let currentTreeNullable: CookedLineTree | null = null
		let iterCount = 0

		// 当前树的收尾工作
		function finalizeCurrent() {
			if(currentTreeNullable === null) {
				return
			}
			const currentTree = currentTreeNullable
			/* 此处执行对象的收尾工作，required 项的校验 */
			/* 并且保证非 Special 和 Special 不同时出现（否则发出警告且丢弃 Special 部分） */
			/* 若树为空（没有头部行且没有子树），则应当警告并丢弃 */
			let shouldDiscard = (() => {
				// 若树为空，则丢弃
				if(currentTree.lines.length == 0 && currentTree.children.length == 0) {
					if(!currentTree.finalized) {
						// 并非下一级树为空，导致这一级被丢弃。一定有别的问题。
						addIssue(issues,
							currentTree.lineNumber, 0, 'warning', 'empty_tree',
							'The ${0} is discarded due to containing nothing',
							currentTree.levelName
						)
					}
					return true
				}
				// 验证 Speciality
				let speciality: 'none' | 'true' | 'false' = 'none'
				let wrongSpeciality = false
				for(let line of currentTree.lines) {
					const commandDef = getCommandDef(line.head)!
					if(commandDef.special == 'none') {
						continue
					}
					if(commandDef.special) {
						if(speciality == 'false') {
							wrongSpeciality = true
							break
						}
						speciality = 'true'
					} else {
						if(speciality == 'true') {
							wrongSpeciality = true
							break
						}
						speciality = 'false'
					}
				}
				if(wrongSpeciality) {
					addIssue(issues,
						currentTree.lineNumber, 0, 'error', 'wrong_speciality',
						'The ${0} contains inconsistent commmands.',
						currentTree.levelName
					)
					return true
				}
				// Special 的树不应该有子树
				if(speciality == 'true') {
					if(currentTree.children.length != 0) {
						addIssue(issues,
							currentTree.children[0].lineNumber, 0, 'error', 'special_children',
							'The ${0} should contain no ${1}.',
							currentTree.levelName, currentTree.children[0].levelName
						)
						currentTree.children = []
					}
				}
				// 验证 required
				let requiredMap: {[_: number]: true} = {}
				for(let line of currentTree.lines) {
					const commandDef = getCommandDef(line.head)!
					if(commandDef.required !== undefined) {
						requiredMap[commandDef.required] = true
					}
				}
				for(let commandDef of commandDefs) {
					if(commandDef.levels.indexOf(level) != -1 && commandDef.required !== undefined) {
						if(!(commandDef.required in requiredMap)) {
							// 要求未满足
							addIssue(issues,
								currentTree.lineNumber, 0, 'error', 'lack_required',
								'The ${0} requires a ${1} (${2}) but it is not present.',
								currentTree.levelName, commandDef.head, commandDef.headFull
							)
							return true
						}
					}
				}
				return false
			})()
			// 丢弃
			if(shouldDiscard) {
				currentList.pop()
				if(currentList.length > 0) {
					currentTreeNullable = currentList[currentList.length - 1]
				} else {
					currentTreeNullable = null
				}
			}
		}

		while(true) {
			iterCount += 1

			const lineNullable = this.peek()
			// 已达到文档末尾
			if(lineNullable === undefined) {
				break
			}
			const line = lineNullable!
			/**
			 * 新建一个树并使得当前指针指向
			 */
			function createTree() {
				const newTree: CookedLineTree = {
					lineNumber: line.lineNumber,
					levelName: lineLevelNames[level],
					lines: [],
					uniqueLines: {},
					children: [],
					finalized: false
				}
				currentList.push(newTree)
				currentTreeNullable = newTree
				return newTree
			}
			/**
			 * 若没有当前树，新建
			 */
			function ensureCurrent() {
				if(currentTreeNullable === null) {
					createTree()
				}
			}
			// 分隔线
			if(line.type == 'delimiter') {
				// 确定分隔线的等级
				const delimiterLevel = lineDelimiters.indexOf(line.char)
				// 无效分隔线
				if(delimiterLevel == -1) {
					// 一般来说是不会发生这种事的，除非 Parser 写错，所以这里没有 issue
					this.pass()
					continue
				}
				// 分隔线在上级
				if(delimiterLevel < level) {
					// 退出本级别
					break
				}
				// 分隔线在下级
				if(delimiterLevel > level) {
					// 交由下级处理，添加到当前树中
					ensureCurrent()
					const currentTree = currentTreeNullable!
					currentTree.finalized = true
					this.handleLevel(level + 1, currentTree.children, issues)
					continue  // 回到开头，读取后面的行
				}
				// 分隔线在本级，本级新建新的树
				finalizeCurrent()
				createTree()
				this.pass()
				continue
			}
			// 不是分隔线，则先确定可能的级别
			const commandDef = getCommandDef(line.head)
			if(commandDef === undefined) {
				// 无效命令
				addIssue(issues,
					line.lineNumber, 0, 'error', 'unknown_command',
					'Unknown command head ${0}',
					line.head
				)
				this.pass()
				continue
			}
			const commandLevel = getCommandNearestLevel(commandDef, level)
			// 命令在上级
			if(commandLevel < level) {
				break
			}
			// 命令在下级
			if(commandLevel > level) {
				ensureCurrent()
				const currentTree = currentTreeNullable!
				currentTree.finalized = true
				this.handleLevel(level + 1, currentTree.children, issues)
				continue
			}
			// 命令在本级，同时具有 unique 和 required 属性，且该 unique 出现过，则创建新的树
			if(commandDef.unique !== undefined && commandDef.required !== undefined) {
				if(currentTreeNullable !== null) {
					const currentTree = currentTreeNullable as CookedLineTree
					if((commandDef.unique in currentTree.uniqueLines)) {
						if(level > 0) {
							finalizeCurrent()
							createTree()
						} else {
							addIssue(issues,
								line.lineNumber, 0, 'error', 'second_root',
								'Are you trying to start another ${0}?',
								currentTree.levelName
							)
						}
					}
				}
			}
			// 若没有树，创建新的树
			ensureCurrent()
			// 即将插入。如果当前树已经添加过子树，那应该是不太对的。
			const currentTree = currentTreeNullable!
			if(currentTree.finalized && !commandDef.allowTail) {
				addIssue(issues,
					line.lineNumber, 0, 'warning', 'post_header',
					'As a header of a ${0}, ${1} should come first.',
					currentTree.levelName, line.head
				)
			}
			// 检查重复，并将命令插入树中
			if(undefined === commandDef.unique || !(commandDef.unique in currentTree.uniqueLines)) {
				currentTree.lines.push(Object.assign(line, {head: commandDef.head}))
				if(commandDef.unique !== undefined) {
					currentTree.uniqueLines[commandDef.unique] = line
				}
				// 检查 Props 的存在性是否符合要求
				if(commandDef.hasProps == 'none' && line.props !== null) {
					addIssue(issues,
						line.lineNumber, 0, 'warning', 'redundant_props',
						'Command ${0} should have no bracket props',
						line.head
					)
				} else if(commandDef.hasProps == 'required' && line.props === null) {
					addIssue(issues,
						line.lineNumber, 0, 'warning', 'lack_props',
						'Command ${0} requires props in a bracket.',
						line.head
					)
				}
			} else {
				const separator = lineDelimiters[level]
				if(separator !== undefined) {
					addIssue(issues,
						line.lineNumber, 0, 'error', 'duplicate_unique_del',
						'${1} should be unique in a ${0}. Did you forget delimiter "${2}"?',
						currentTree.levelName, line.head, separator.repeat(3)
					)
				} else {
					addIssue(issues,
						line.lineNumber, 0, 'error', 'duplicate_unique',
						'${1} should be unique in a ${0}',
						currentTree.levelName, line.head
					)
				}
				
			}
			this.pass()
		}

		finalizeCurrent()
	}
}
