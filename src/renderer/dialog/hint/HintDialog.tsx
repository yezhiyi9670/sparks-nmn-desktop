import React, { Fragment } from 'react'
import { useI18n } from '../../i18n/i18n'
import { Dialog, OutLink } from '../dialog'
import { HintEntries } from './entries'

const i18nPrefix = 'hint.'

export function HintDialog(props: {
	open: boolean
	onClose?: (dismiss: boolean) => void
	onConfirm?: (dismiss: boolean) => void
	entry: HintEntries[0]
	loading?: boolean
}) {
	const entry = props.entry
	const LNG = useI18n()

	function handleEscape(dismiss: boolean) {
		if(props.onClose) {
			props.onClose(dismiss)
		}
	}
	function handleClose(dismiss: boolean) {
		handleEscape(dismiss)
	}
	function handleConfirm(dismiss: boolean) {
		if(props.onConfirm) {
			props.onConfirm(dismiss)
		}
	}

	return <Dialog
		open={props.open}
		onEscape={handleEscape}
		title={LNG(`${i18nPrefix}${entry.key}.title`)}
		defaultCheck={entry.dismiss}
		checkbox={LNG(`${i18nPrefix}system.dismiss`)}
		buttons={entry.confirm ? [
			{
				color: 'neutral',
				text: LNG(`${i18nPrefix}system.cancel`),
				onClick: handleClose,
				disabled: props.loading
			},
			{
				color: 'positive',
				text: LNG(`${i18nPrefix}${entry.key}.confirm`),
				onClick: handleConfirm,
				disabled: props.loading,
				focus: entry.focusButton
			}
		] : [
			{
				color: 'positive',
				text: LNG(`${i18nPrefix}system.close`),
				onClick: handleClose,
				disabled: props.loading,
				focus: entry.focusButton
			}
		]}
	>
		{Array(entry.lines).fill(1).map((val, idx) => {
			const index = val + idx
			return <p key={idx}>{LNG(`${i18nPrefix}${entry.key}.line.${index}`)}</p>
		})}
		{entry.links && entry.links.map((linkId, index) => {
			return <Fragment key={linkId}>
				{index > 0 && ' · '}
				<OutLink href={LNG(`link.${linkId}`)}>{LNG(`${i18nPrefix}${entry.key}.link.${linkId}`)}</OutLink>
			</Fragment>
		})}
	</Dialog>
}
