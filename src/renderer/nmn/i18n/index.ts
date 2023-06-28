import { getCommandDef, lineLevelNames } from "../parser/commands"
import { Issue } from "../parser/issue/issue"
import { iterateMap } from "../util/array"
import { getLanguageValue } from "../util/template"
import languageArray_zh_cn from './zh_cn'

type FlattenedI18nData = {[_: string]: string}

export type LanguageArray = {
	levelNameKeys: {[_: string]: number[]}
	levelNames: FlattenedI18nData
	issues: FlattenedI18nData
	notices: FlattenedI18nData
	commands: FlattenedI18nData
	updown: FlattenedI18nData
	metrics: FlattenedI18nData
	render: FlattenedI18nData
	render_props: FlattenedI18nData
	efLabels: FlattenedI18nData
	editor: FlattenedI18nData
}

class I18nClass {
	languages: {[_: string]: LanguageArray} = {
		'zh_cn': languageArray_zh_cn
	}
	/**
	 * 获取命令头的描述
	 */
	commandDescription(context: LanguageArray, head: string) {
		let commandDef = getCommandDef(head)
		if(!commandDef) {
			return 'ERROR'
		}
		const levelNamesDesc = commandDef.levels.map((level) => {
			return context.levelNames[lineLevelNames[level]] ?? ''
		}).join('/')
		const star = (commandDef.unique !== undefined && commandDef.required !== undefined) ? '★' : ''
		const commandDesc = context.commands[commandDef.head] ?? ''
		return `${star}[${levelNamesDesc}] ${commandDesc}`
	}
	/**
	 * 获取渲染属性的描述
	 */
	renderPropsDesc(context: LanguageArray, key: string) {
		return context.render_props[key] ?? ''
	}
	/**
	 * 获取问题说明
	 */
	issueDescription(context: LanguageArray, issue: Issue) {
		const issueText = context.issues[issue.key] ?? issue.defaultTranslation
		const indices = context.levelNameKeys[issue.key] ?? []
		const args = issue.args?.map((val, index) => {
			if(indices.indexOf(index) != -1) {
				return context.levelNames[val] ?? 'ERROR'
			}
			return val
		}) ?? []
		return getLanguageValue(issueText, ...args)
	}
	/**
	 * 获取渲染字段
	 */
	renderToken(context: LanguageArray, key: string, ...args: string[]) {
		return getLanguageValue(context.render[key] ?? key, ...args)
	}
	/**
	 * 单位
	 */
	metricText(context: LanguageArray, key: string, ...args: string[]) {
		return getLanguageValue(context.metrics[key] ?? key, ...args)
	}
	/**
	 * 升/降
	 */
	upDownText(context: LanguageArray, key: 'up' | 'down') {
		return context.updown[key]
	}
	/**
	 * Equifield 分节标签
	 */
	efLabel(context: LanguageArray, key: string, ...args: string[]) {
		return {
			label: [key, ...args].join('-'),
			localeLabel: getLanguageValue(context.efLabels[key] ?? key, ...args)
		}
	}
	/**
	 * 编辑器文本
	 */
	editorText(context: LanguageArray, key: string, ...args: string[]) {
		return getLanguageValue(context.editor[key], ...args)
	}
}

export const I18n = new I18nClass()
