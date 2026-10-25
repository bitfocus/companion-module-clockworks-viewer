import type { CompanionVariableDefinitions } from '@companion-module/base'
import type ModuleInstance from './main.js'
import type { DeckNumber } from './main.js'

type PerDeck = `deck_${DeckNumber}_${'title' | 'artist' | 'album'}`

export type VariablesSchema = {
	live_deck: number | string
	timecode_b_deck: number | string
	live: string
	live_title: string
	live_artist: string
	beat: number
	bpm: string
	crossfader: number
} & { [K in PerDeck]?: string } & { [K in `fader_${DeckNumber}`]?: number }

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const defs: CompanionVariableDefinitions<VariablesSchema> = {
		live_deck: { name: 'Live deck (as last set from Companion; None = cleared)' },
		timecode_b_deck: { name: 'Timecode B deck (as last set from Companion; Off = none)' },
		live: { name: 'Live (as last set from Companion): On / Off' },
		live_title: { name: 'Live deck: track title' },
		live_artist: { name: 'Live deck: artist' },
		beat: { name: 'Beat of the live deck' },
		bpm: { name: 'BPM of the live deck' },
		crossfader: { name: 'Crossfader (0–100)' },
	}
	for (const deck of self.decks) {
		const d = deck as DeckNumber
		defs[`deck_${d}_title`] = { name: `Deck ${deck}: track title` }
		defs[`deck_${d}_artist`] = { name: `Deck ${deck}: artist` }
		defs[`deck_${d}_album`] = { name: `Deck ${deck}: album` }
		defs[`fader_${d}`] = { name: `Deck ${deck}: upfader (0–100)` }
	}
	self.setVariableDefinitions(defs)
}
