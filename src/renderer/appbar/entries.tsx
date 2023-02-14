import React from 'react'
import * as AntIcons from 'react-icons/ai'

export default {
	i18nPrefix: 'navbar.button.',
	entries: [
		{
			key: 'new',
			icon: <AntIcons.AiOutlineFile />
		},
		{
			key: 'open',
			icon: <AntIcons.AiOutlineFolderOpen />
		},
		{
			key: 'save',
			icon: <AntIcons.AiOutlineSave />
		},
		{
			key: 'save_as',
			icon: <AntIcons.AiOutlineCopy />
		},
		{
			key: 'export',
			icon: <AntIcons.AiOutlineExport />
		},
		{
			key: 'print',
			icon: <AntIcons.AiOutlinePrinter />
		}
	],
	bottomEntries: [
		{
			key: 'settings',
			icon: <AntIcons.AiOutlineSetting />
		},
		{
			key: 'about',
			icon: <AntIcons.AiOutlineInfoCircle />
		}
	]
}
