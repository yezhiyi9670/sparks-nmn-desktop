import React from 'react'
import { useI18n } from '../i18n/i18n'
import { Dialog, OutLink } from './dialog'

export function AboutDialog(props: {
	open: boolean
	onClose: () => void
}) {
	const LNG = useI18n()

	return <Dialog
		open={props.open}
		onEscape={props.onClose}
		title={LNG('about.title')}
		buttons={[
			{
				color: 'positive',
				text: LNG('about.close'),
				focus: true,
				onClick: props.onClose
			}
		]}
	>
		<p>{LNG('about.text')}</p>
		<p>{LNG('about.text.core')}</p>
		<p>{LNG('about.author')}</p>
		<p>
			{LNG('about.version', window.Versions.app)}
			{" · "}
			<OutLink href='https://example.com/'>{LNG('about.website')}</OutLink>
			{" · "}
			<OutLink href='https://github.com/yezhiyi9670/sparks-nmn-desktop'>{LNG('about.github')}</OutLink>
		</p>
	</Dialog>
}
