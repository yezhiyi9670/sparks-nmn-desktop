import { findWithKey } from "../../../../util/array"
import { Frac, Fraction } from "../../../../util/frac"

/**
 * 场宽统计行
 */
type FieldRow = {
	sections: {[colHash: string]: FieldColumn}[]
}
/**
 * 场宽统计列
 */
type FieldColumn = {
	/**
	 * 占据排版空间的场宽
	 */
	field: [number, number]
	/**
	 * 不占据排版空间的场宽
	 */
	requiredField: [number, number]
	/**
	 * 分数位置
	 */
	fraction: Fraction
}

/**
 * 场宽统计列
 */
type FieldResultColumn = FieldColumn & {
	hash: string
}

type SectionFields = [Fraction, Fraction][]

/**
 * 统计列的宽度需求
 * 
 * - 占据排版空间的场宽默认为 0，不占据排版空间的场宽默认为 -Infinity。requiredField 总是对 field 取 max
 * - 对于每一行取前后之和，然后取 Max，统一放置到后置 field 中（第一个除外）。数值至少为 0。
 */
export class FieldStatBuilder {
	sectionCount: number = 0
	sectionFields: SectionFields = []
	ignoreRowHash: boolean = false
	constructor(sectionCount: number, sectionFields: SectionFields, ignoreRowHash: boolean) {
		this.sectionCount = sectionCount
		this.columnChecker = Array(this.sectionCount).fill(0).map(() => ({}))
		this.result = Array(this.sectionCount).fill(0).map(() => ([]))
		this.sectionFields = sectionFields
		this.ignoreRowHash = ignoreRowHash
	}

	rows: {[_: string]: FieldRow} = {}

	columnChecker: {[_: string]: boolean}[] = []
	result: FieldResultColumn[][] = []

	/**
	 * 寻找统计行，若不存在则创建
	 */
	getRow(hash: string) {
		const currRow = this.rows[hash]
		if(currRow) {
			return currRow
		}
		this.rows[hash] = {
			sections: Array(this.sectionCount).fill(0).map(() => ({}))
		}
		return this.rows[hash]
	}

	/**
	 * 在结果中创建统计列
	 */
	markColumn(pos: Fraction, sectionIndex: number) {
		const hash = Frac.repr(pos)
		if(this.columnChecker[sectionIndex][hash]) {
			return
		}
		this.columnChecker[sectionIndex][hash] = true
		this.result[sectionIndex].push({
			hash: hash,
			fraction: pos,
			field: [0, 0],
			requiredField: [0, 0]
		})
	}

	/**
	 * 写入宽度需求数据
	 */
	writeConstraint(rowHash: string, pos: Fraction, sectionIndex: number, field: [number, number], occupiesSpace: boolean) {
		if(this.ignoreRowHash) {
			rowHash = 'ignored'
		}
		
		this.markColumn(pos, sectionIndex)
		const row = this.getRow(rowHash)
		const colHash = Frac.repr(pos)

		const currSection = row.sections[sectionIndex]
		if(!currSection[colHash]) {
			currSection[colHash] = {
				fraction: pos,
				field: [0, 0],
				requiredField: [0, 0], // 使用 -Infinity 目前会有问题，暂时不采用
			}
		}
		const column = currSection[colHash]
		if(occupiesSpace) {
			column.field = [
				Math.max(column.field[0], field[0]),
				Math.max(column.field[1], field[1])
			]
		}
		// 一旦有东西就要记录
		column.requiredField = [
			Math.max(column.requiredField[0], field[0]),
			Math.max(column.requiredField[1], field[1])
		]
	}

	/**
	 * 计算最终数据
	 */
	compute(): FieldResultColumn[][] {
		const ret: FieldResultColumn[][] = []
		for(let i = 0; i < this.sectionCount; i++) {
			ret.push(this.computeSection(i))
		}
		return ret
	}

	/**
	 * 计算一个小节
	 */
	computeSection(sectionIndex: number): FieldResultColumn[] {
		const resultArr = this.result[sectionIndex]
		if(resultArr.length == 0) {  // 没有列会导致渲染阶段出现问题
			this.markColumn(this.sectionFields[sectionIndex][0], sectionIndex)
		}
		resultArr.sort((x, y) => {
			return Frac.compare(x.fraction, y.fraction)
		})

		for(let prevColIndex = -1; prevColIndex < resultArr.length; prevColIndex++) {
			const nextColIndex = prevColIndex + 1
			let maxField = 0
			let maxRequiredField = 0
			for(let rowHash in this.rows) {
				const row = this.rows[rowHash]
				maxField = Math.max(maxField, this.getMarkedData(
					resultArr, sectionIndex, prevColIndex, row, 'field', 1
				) + this.getMarkedData(
					resultArr, sectionIndex, nextColIndex, row, 'field', 0
				))
				maxRequiredField = Math.max(maxRequiredField, this.getMarkedData(
					resultArr, sectionIndex, prevColIndex, row, 'requiredField', 1
				) + this.getMarkedData(
					resultArr, sectionIndex, nextColIndex, row, 'requiredField', 0
				))
			}
			maxRequiredField = Math.max(maxField, maxRequiredField)
			if(prevColIndex == -1) {
				resultArr[0].field[0] = maxField
				resultArr[0].requiredField[0] = maxRequiredField
			} else {
				resultArr[prevColIndex].field[1] = maxField
				resultArr[prevColIndex].requiredField[1] = maxRequiredField
			}
		}

		return resultArr
	}
	
	/**
	 * 根据结果列，列下标和统计行获取已标记的数据
	 * 
	 * columnIndex 允许越界，将返回 0
	 */
	getMarkedData(resultArr: FieldResultColumn[], sectionIndex: number, columnIndex: number, row: FieldRow, type: 'field' | 'requiredField', position: 0 | 1) {
		if(columnIndex < 0 || columnIndex >= resultArr.length) {
			return 0
		}
		const fracHash = resultArr[columnIndex].hash

		const data = row.sections[sectionIndex][fracHash]
		if(!data) {
			return {
				field: 0,
				requiredField: 0, // 这里设为 -Infinity 会有一些问题，暂时不这样处理。
			}[type]
		}
		return data[type][position]
	}
}
