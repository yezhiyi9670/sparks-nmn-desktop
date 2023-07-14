import React, { createRef, useEffect } from 'react'
import { createUseStyles } from 'react-jss'
import { iterateMap } from '../../util/array'
import { PrefRendererInfo } from '../../util/prefs/PrefRenderer'
import { getAvailableLanguages, useI18n } from '../i18n/i18n'
import { SettingsFormUpdateHandler, SettingsFormValues } from './SettingsForm'
import { useCheckboxClass } from '../style/checkbox'
import { ReactSelect } from './react-select'

type Value = string | number | boolean
type Validate = 'pass' | 'less' | 'more' | 'invalid'

const useStyles = createUseStyles({
	title: {
		marginBlockEnd: '0.38em'
	},
	desc: {
		marginBlockStart: '0.5em',
		whiteSpace: 'pre-wrap',
		color: '#666',
		marginBlockEnd: '0.5em'
	},
	fieldLine: {},
	field: {
		padding: '0 8px',
		height: '32px',
		display: 'block',
		width: '100%',
		maxWidth: '400px',
		borderRadius: 0,
		border: 'none',
		background: '#0001',
		outline: 'none',
		'&:focus': {
			background: '#0002'
		},
		boxSizing: 'border-box'
	},
	checkbox: {
		width: '15px',
		height: '15px',
		transform: 'translateY(2px)',
		borderRadius: 0
	},
	errorText: {
		color: '#E00'
	}
})

export function SettingsFormItem(props: {
	i18nPrefix: string
	entry: PrefRendererInfo[0]['entries'][0]
	values: SettingsFormValues
	onUpdate?: SettingsFormUpdateHandler
}) {
	const LNG = useI18n()
	const entry = props.entry
	const classes = useStyles()

	return <>
		<h3 className={classes.title}>{LNG(`${props.i18nPrefix}item.${entry.key}.title`)}</h3>
		<p className={classes.desc}>
			{LNG(`${props.i18nPrefix}item.${entry.key}.desc`)}
		</p>
		<SettingsFormField
			i18nPrefix={props.i18nPrefix}
			entry={props.entry}
			value={props.values[props.entry.key].value}
			validate={props.values[props.entry.key].validate}
			onUpdate={(value, validate) => {
				if(props.onUpdate) {
					props.onUpdate(props.entry.key, value, validate)
				}
			}}
		/>
	</>
}

function SettingsFormField(props: {
	i18nPrefix: string
	entry: PrefRendererInfo[0]['entries'][0]
	value: Value
	validate: Validate
	onUpdate?: (value: Value, validate: Validate) => void
}) {
	const LNG = useI18n()
	const classes = useStyles()
	const entry = props.entry
	const value = props.value
	const checkboxClass = useCheckboxClass()

	const inputRef = createRef<HTMLInputElement>()

	// 这一部分用于取消鼠标滚轮效果，避免用户滚动时意外更改数值
	useEffect(() => {
		const input = inputRef.current
		if(!input) {
			return
		}
		input.onwheel = (evt) => evt.preventDefault()
	})

	return <div className={classes.fieldLine}>
		{/* 开关 */}
		{entry.type == 'boolean' && typeof(value) == 'boolean' && <>
			<label style={{userSelect: 'none'}} className={checkboxClass.label + ' ' + (value ? checkboxClass.checked : '')}>
				<input
					type='checkbox'
					className={classes.checkbox}
					checked={value}
					onChange={(evt) => {
						if(props.onUpdate) {
							props.onUpdate(evt.target.checked, 'pass')
						}
					}}
				/>
				{' '}
				{LNG(`${props.i18nPrefix}system.enable`)}
			</label>
		</>}
		{/* 输入框 */}
		{(entry.type == 'string' || entry.type == 'number') &&
		(typeof(value) == 'string') && <>
			<input
				className={classes.field}
				type={entry.type == 'string' ? 'text' : 'number'}
				value={value}
				ref={inputRef}
				spellCheck={false}
				onChange={(evt) => {
					if(props.onUpdate) {
						let validate: Validate = 'pass'
						if(entry.type == 'number') {
							let num = +evt.target.value
							if(num != num) {
								validate = 'invalid'
							} else if(num < entry.range[0]) {
								validate = 'less'
							} else if(num > entry.range[1]) {
								validate = 'more'
							}
						}
						props.onUpdate(evt.target.value, validate)
					}
				}}
				aria-label={LNG(`${props.i18nPrefix}item.${entry.key}.title`)}
			/>
			{props.validate != 'pass' && entry.type == 'number' && <div className={classes.errorText}>
				{props.validate == 'invalid' && LNG(`${props.i18nPrefix}error.number_invalid`)}
				{props.validate == 'less' && LNG(`${props.i18nPrefix}error.number_less`, entry.range[0])}
				{props.validate == 'more' && LNG(`${props.i18nPrefix}error.number_more`, entry.range[1])}
			</div>}
		</>}
		{/* 选择框 */}
		{(entry.type == 'select' || entry.type == 'language') && typeof(value) == 'string' && (() => {
			let choices: {item: string, text: string}[] = []
			if(entry.type == 'language') {
				choices = iterateMap(getAvailableLanguages(), (text, item) => ({ item, text }))
			} else {
				choices = entry.choices.map((choice) => {
					const text = LNG(`${props.i18nPrefix}item.${entry.key}.choice.${choice}`)
					return {
						item: choice,
						text: text
					}
				})
			}
			return <>
				<ReactSelect
					className={classes.field}
					label={LNG(`${props.i18nPrefix}item.${entry.key}.title`)}
					value={value}
					style={{display: 'flex'}}
					onChange={(val) => {
						if(props.onUpdate) {
							props.onUpdate(val, 'pass')
						}
					}}
					items={choices.map((choice) => ({
						value: choice.item,
						label: choice.text
					}))}
					itemFontSize={'14px'}
				/>
			</>
		})()}
	</div>
}
