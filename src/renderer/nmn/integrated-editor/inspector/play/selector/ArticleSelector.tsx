import React, { memo, useContext } from 'react'
import { NMNI18n, NMNResult } from '../../../..'
import { Linked2Article } from '../../../../parser/des2cols/types'
import { SequenceArticle, SequenceData, SequencedScoreData } from '../../../../parser/sequence/types'
import { Button, ButtonGroup, ButtonMargin, ButtonSelect, ButtonSpacer } from '../../component/button'
import * as Icons from 'react-icons/vsc'
import { IntegratedEditorContext } from '../../../IntegratedEditor'

const i18nPrefix = 'inspector.play.selector.'
// eslint-disable-next-line react/display-name
export const ArticleSelector = memo((props: {
	articles: Linked2Article[],
	sequence: SequenceData,
	value: number,
	onChange: (val: number) => void,
	pickingSections: boolean,
	onTogglePicker: () => void,
	playing: boolean
}) => {
	const { colorScheme, language } = useContext(IntegratedEditorContext)

	const musicArticles = props.articles.filter(item => item.type == 'music')

	return musicArticles.length > 0 ? (
		<ButtonGroup style={{padding: '0 12px', paddingBottom: '12px'}}>
			<Button
				title={NMNI18n.editorText(language, `${i18nPrefix}visual_pick`)}
				selected={props.pickingSections}
				onClick={props.onTogglePicker}
				disabled={props.playing}
			>
				<Icons.VscInspect style={{transform: 'translateY(0.13em)'}} />
			</Button>
			<ButtonMargin />
			<ButtonSelect
				value={'' + props.value}
				onChange={(val) => props.onChange(+val)}
				style={{fontSize: '15px', padding: '0 0.4em'}}
				items={props.articles.map((article, index) => {
					const articleTitle = article.title?.text
					let title = ''
					if(articleTitle !== undefined) {
						title = NMNI18n.editorText(language, `${i18nPrefix}article.titled`, articleTitle)
					} else {
						title = NMNI18n.editorText(language, `${i18nPrefix}article.untitled`, '' + (index + 1))
					}
					return {
						value: '' + index,
						disabled: article.type != 'music',
						label: title
					}
				})}
				itemFontSize='15px'
				disabled={props.playing}
			/>
		</ButtonGroup>
	) : (
		<div style={{padding: '0 12px', paddingBottom: '12px'}}>
			{NMNI18n.editorText(language, `${i18nPrefix}no_articles`)}
		</div>
	)
})
