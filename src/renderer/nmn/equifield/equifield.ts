import jquery from 'jquery'

export type EquifieldSection = {
	element: HTMLElement
	height: number
	breakAfter?: 'always' | 'avoid'
	isMargin?: boolean
	label?: string
	localeLabel?: string
}

export class Equifield {
	element: HTMLDivElement
	field: number = 124
	padding: number = 12
	listener: () => void

	constructor(element: HTMLDivElement) {
		this.element = element
		jquery(this.element)
			.addClass('wcl-equifield-root')
			.css('padding', `0 ${this.padding}em`)
		this.listener = () => {
			this.resize()
		}
		addEventListener('resize', this.listener)
		this.resize()
	}

	resize() {
		const $element = jquery(this.element)
		let width = $element[0].clientWidth
		if(width > 0) {
			$element.css('font-size', `${width / (this.field - 0 * this.padding)}px`)
		}
	}
	
	destroy() {
		removeEventListener('resize', this.listener)
		jquery(this.element).removeClass('wcl-equifield-root')
	}

	render(sections: EquifieldSection[]) {
		const $element = jquery(this.element)
		$element.children().each(function(index) {
			if(!jquery(this).hasClass('wcl-equifield-preserve')) {
				jquery(this).remove()
			}
		})
		
		let totalHeight = 0
		sections.forEach((section, index) => {
			const $content = jquery('<div></div>').addClass('wcl-equifield-content')
			const targetElement = section.element
			$content[0].appendChild(targetElement)
			const $field = jquery('<div></div>').addClass('wcl-equifield-field').css({'height': `${section.height}em`})
				.append(
					$content
				)
			if(section.label) {
				$field.attr('data-label', section.label)
			}
			if(section.breakAfter == 'avoid') {
				$field.css('page-break-after', 'avoid')
			} else if(section.breakAfter == 'always') {
				$field.css('page-break-after', 'always')
			}
			$element.append(
				$field
			)
			totalHeight += section.height
		})
	}
}
