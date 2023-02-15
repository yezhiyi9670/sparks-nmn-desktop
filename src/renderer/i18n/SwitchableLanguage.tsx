import React from 'react'
import { I18nProvider } from './i18n'

const LanguageSetterContext = React.createContext<[
	string,
	(_: string) => void
]>(['void', (_: string) => void(0) as void])

export function SwitchableLanguageProvider({ defaultValue, children }: {defaultValue: string, children: React.ReactNode}) {
	const [ language, setLanguage ] = React.useState(defaultValue)

	function handleLanguageSet(key: string) {
		setLanguage(key)
	}

	return (
		<I18nProvider languageKey={language}>
			<LanguageSetterContext.Provider value={[language, handleLanguageSet]}>
				{children}
			</LanguageSetterContext.Provider>
		</I18nProvider>
	)
}

/**
 * 获取修改语言的方法
 */
export function useLanguageSetter() {
	return React.useContext(LanguageSetterContext)[1]
}

/**
 * 获取语言键名
 */
export function useLanguage() {
	return React.useContext(LanguageSetterContext)[0]
}
