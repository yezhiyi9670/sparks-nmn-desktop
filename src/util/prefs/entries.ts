import { PrefRendererInfo } from "./PrefRenderer"

const entries: PrefRendererInfo = [
	{
		group: 'general',
		entries: [
			{
				key: 'language',
				defaultValue: ['string', 'zh_cn'],
				type: 'language'
			}
		]
	},
	{
		group: 'editor',
		entries: [
			{
				key: 'fontSize',
				defaultValue: ['number', 15],
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
				key: 'previewRefresh',
				defaultValue: ['string', 'delay500'],
				type: 'select',
				choices: [
					'realtime',
					'delay200', 'delay500', 'delay1000',
					'delay3000', 'delay5000', 'delay10000',
					'save'
				]
			},
			{
				key: 'showFileSize',
				defaultValue: ['string', 'source'],
				type: 'select',
				choices: ['off', 'source', 'all']
			},
			{
				key: 'previewMaxWidth',
				defaultValue: ['number', 1000],
				type: 'number',
				range: [8, 65536]
			},
			{
				key: 'previewAlign',
				defaultValue: ['string', 'center'],
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
			}
		]
	}
]

export default entries
