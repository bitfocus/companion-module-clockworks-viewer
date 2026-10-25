import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	host: string
	port: number
	listen: boolean
	listen_port: number
	decks: number
}

/** Viewer supports up to six decks; its default is four. */
export const MAX_DECKS = 6

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			label: 'Viewer setup',
			width: 12,
			value:
				'In Viewer, open Settings and turn OSC on. Set its OSC listen address to an interface this Companion can reach ' +
				'(127.0.0.1 only works when both run on the same machine), and its OSC send address and port to this ' +
				'Companion machine and the feedback port below.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Viewer IP',
			width: 8,
			regex: Regex.IP,
			default: '127.0.0.1',
		},
		{
			type: 'number',
			id: 'port',
			label: 'Viewer OSC listen port',
			width: 4,
			min: 1,
			max: 65535,
			default: 8000,
		},
		{
			type: 'checkbox',
			id: 'listen',
			label: 'Receive feedback from Viewer',
			tooltip: 'Track names, fader levels and the beat, which Viewer sends to its OSC send address',
			width: 4,
			default: true,
		},
		{
			type: 'number',
			id: 'listen_port',
			label: 'Feedback port (Viewer OSC send port)',
			width: 4,
			min: 1,
			max: 65535,
			default: 9000,
			isVisibleExpression: '$(options:listen)',
		},
		{
			type: 'number',
			id: 'decks',
			label: 'Decks',
			tooltip: 'How many decks Viewer is set to use. Sets the deck choices, variables and presets.',
			width: 4,
			min: 1,
			max: MAX_DECKS,
			default: 4,
		},
	]
}
