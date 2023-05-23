import Color from "color"

const systemColor = window.AppMain.getSystemColor()

export default {
	system: Color(systemColor).hex(),
	link: Color(systemColor).darken(0.1).hex(),
	positive: Color(systemColor).hex(),
	positiveHover: Color(systemColor).darken(0.1).hex(),
	positiveActive: Color(systemColor).darken(0.25).hex(),
	negative: '#EC407A',
	negativeHover: '#E91E63',
	negativeActive: '#D81B60',
	voidary: Color(systemColor).desaturate(0.35).lightness(97).hex(),
	voidaryHover: Color(systemColor).desaturate(0.4).lightness(91).hex(),
	voidarySelected: Color(systemColor).desaturate(0.44).lightness(88).hex(),
	voidaryActive: Color(systemColor).desaturate(0.5).lightness(85).hex(),
	selection: Color(systemColor).alpha(0.37).toString(),
}
