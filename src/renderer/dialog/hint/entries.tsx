/**
 * 提示弹窗条目
 * 
 * i18n 条目规则：
 * - 标题：`${prefix}${key}.title`
 * - 内容：`${prefix}${key}.line.${indexFromOne}`
 * - 链接文本：`${prefix}${key}.link.${id}`
 * - 链接地址：`link.${id}`
 * - 确认按钮：`${prefix}${key}.confirm`
 */
export type HintEntries = {
	key: string,
	lines: number,
	links?: string[],
	prefKey: string,
	dismiss?: boolean,
	confirm?: boolean,
	focusButton: boolean,
}[]

const entries: HintEntries = [
	{
		key: 'welcome',
		lines: 4,
		links: ['official', 'github'],
		prefKey: 'hintWelcome',
		dismiss: true,
		focusButton: true
	},
	{
		key: 'largeHtml',
		lines: 4,
		prefKey: 'hintLargeHtml',
		dismiss: false,
		confirm: true,
		focusButton: true
	},
	{
		key: 'printEssence',
		lines: 3,
		prefKey: 'hintPrintEssence',
		dismiss: true,
		confirm: true,
		focusButton: true
	},
	{
		key: 'rate',
		lines: 2,
		links: ['github', 'github_core', 'donate'],
		prefKey: 'hintRate',
		dismiss: false,
		focusButton: false
	},
	{
		key: 'unsavedChanges',
		lines: 1,
		prefKey: 'hintUnsavedChanges',
		dismiss: false,
		focusButton: false,
		confirm: true
	}
]

export default entries
