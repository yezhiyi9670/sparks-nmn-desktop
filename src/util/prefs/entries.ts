import { PrefRendererInfo } from "./PrefRenderer"

const entries: PrefRendererInfo = [
	{
		group: 'general',
		entries: [
			{
				key: 'language',
				defaultValue: ['string', 'zh_cn'],
				type: 'language'
			},
			{
				key: 'uiFontFamily',
				defaultValue: ['string', "system-ui"],
				type: 'string'
			},
		]
	},
	{
		group: 'editor',
		entries: [
			{
				key: 'fontFamily',
				defaultValue: ['string', "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', system-ui"],
				type: 'string'
			},
			{
				key: 'fontSize',
				defaultValue: ['number', 14.5],
				type: 'number',
				range: [4, 256]
			},
			{
				key: 'autoSave',
				defaultValue: ['string', 'off'],
				type: 'select',
				choices: ['off', 'overwrite']
			},
			{
				key: 'inspectorOpen',
				defaultValue: ['string', 'off'],
				type: 'select',
				choices: ['off', 'on']
			},
			{
				key: 'previewRefresh',
				defaultValue: ['string', 'delay1000'],
				type: 'select',
				choices: [
					'realtime',
					'delay200', 'delay500', 'delay1000', 'delay2000',
					'delay3000', 'delay5000', 'delay10000',
					'none'
				]
			},
			{
				key: 'showFileSize',
				defaultValue: ['string', 'source'],
				type: 'select',
				choices: ['off', 'source', 'all']
			},
			{
				key: 'fileSizeUnit',
				defaultValue: ['string', 'kb'],
				type: 'select',
				choices: ['b', 'kunb', 'kb', 'kkunb', 'mb', 'mkunb']
			},
			{
				key: 'showProcessTime',
				defaultValue: ['string', 'off'],
				type: 'select',
				choices: ['off', 'on']
			},
			{
				key: 'previewMaxWidth',
				defaultValue: ['number', 1000],
				type: 'number',
				range: [8, 65536]
			},
			{
				key: 'previewAlign',
				defaultValue: ['string', 'left'],
				type: 'select',
				choices: ['center', 'left']
			},
			{
				key: 'displayMode',
				defaultValue: ['string', 'split'],
				type: 'select',
				choices: ['split', 'preview']
			},
		]
	},
	{
		group: 'export',
		entries: [
			// {
			// 	key: 'paperSize',
			// 	defaultValue: ['string', 'A4'],
			// 	type: 'select',
			// 	choices: ['A4', 'B5', 'A5']
			// },
			// {
			// 	key: 'imageResolution',
			// 	defaultValue: ['number', 800],
			// 	type: 'number',
			// 	range: [8, 4096]
			// },
			{
				key: 'browser',
				defaultValue: ['string', ''],
				type: 'string'
			},
			{
				key: 'tempHtmlLocation',
				defaultValue: ['string', 'temp'],
				type: 'select',
				choices: ['temp', 'source']
			}
		]
	},
	{
		group: 'hints',
		hasDescription: true,
		entries: [
			{
				key: 'hintWelcome',
				defaultValue: ['boolean', true],
				type: 'boolean'
			},
			{
				key: 'hintLargeHtml',
				defaultValue: ['boolean', true],
				type: 'boolean'
			},
			{
				key: 'hintJsonUsage',
				defaultValue: ['boolean', true],
				type: 'boolean'
			},
			// {
			// 	key: 'hintExportEssence',
			// 	defaultValue: ['boolean', true],
			// 	type: 'boolean'
			// },
			{
				key: 'hintPrintEssence',
				defaultValue: ['boolean', true],
				type: 'boolean'
			},
			{
				key: 'hintRate',
				defaultValue: ['boolean', true],
				type: 'boolean'
			},
			{
				key: 'hintUnsavedChanges',
				defaultValue: ['boolean', true],
				type: 'boolean'
			}
		]
	},
	{
		group: 'stats',
		hasDescription: true,
		entries: [
			{
				key: 'openTimes',
				defaultValue: ['number', 0],
				type: 'number',
				range: [0, Infinity]
			}
		]
	}
]

export default entries
