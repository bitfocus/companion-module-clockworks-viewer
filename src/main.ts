import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import dgram from 'node:dgram'
import { GetConfigFields, MAX_DECKS, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { decodeOscPacket, type OscArg, type OscMessage } from './osc.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

/** Upfaders A–F (decks 1–6) then the crossfader, as Viewer's /clockworks/control carries them. */
export const FADERS = ['a', 'b', 'c', 'd', 'e', 'f', 'x'] as const
export type FaderId = (typeof FADERS)[number]

export interface ViewerState {
	// Viewer doesn't report these back, so they are what Companion last sent:
	// null until then, and stale if they're changed in Viewer itself.
	liveDeck: number | null
	deckB: number | null
	live: boolean | null

	// From Viewer's OSC output, indexed by deck - 1.
	title: string[]
	artist: string[]
	album: string[]
	/** 0–1, keyed by fader. */
	faders: Record<FaderId, number>
	beat: number
	bpm: number
}

function emptyState(): ViewerState {
	return {
		liveDeck: null,
		deckB: null,
		live: null,
		title: Array<string>(MAX_DECKS).fill(''),
		artist: Array<string>(MAX_DECKS).fill(''),
		album: Array<string>(MAX_DECKS).fill(''),
		faders: { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, x: 0 },
		beat: 0,
		bpm: 0,
	}
}

function str(arg: OscArg | undefined): string {
	return typeof arg === 'string' ? arg : ''
}

function num(arg: OscArg | undefined): number {
	return typeof arg === 'number' && Number.isFinite(arg) ? arg : 0
}

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig // Setup in init()
	state: ViewerState = emptyState()
	#socket: dgram.Socket | null = null

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updatePresets() // export Presets
		this.updateVariableDefinitions() // export variable definitions
		this.publishState()

		this.startListener()
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		this.stopListener()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		const decksChanged = config.decks !== this.config.decks
		const listenerChanged = config.listen !== this.config.listen || config.listen_port !== this.config.listen_port
		this.config = config

		// The label may have changed too, and the presets name it in their variables.
		this.updatePresets()
		if (decksChanged) {
			this.updateActions()
			this.updateFeedbacks()
			this.updateVariableDefinitions()
			this.publishState()
		}
		if (listenerChanged || !this.config.listen) {
			this.startListener()
		} else {
			this.updateSendStatus()
		}
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	/** Decks in use, 1-based. */
	get decks(): number[] {
		const count = Math.min(Math.max(Math.round(this.config.decks || 4), 1), MAX_DECKS)
		return Array.from({ length: count }, (_, i) => i + 1)
	}

	/** Sends one Viewer command: every input Viewer has takes a single int argument. */
	send(path: string, value: number): void {
		if (!this.config.host || !this.config.port) {
			this.log('warn', `Not sending ${path}: Viewer IP or port is not set`)
			return
		}
		this.log('debug', `-> ${this.config.host}:${this.config.port} ${path} ${value}`)
		this.oscSend(this.config.host, this.config.port, path, [{ type: 'i', value }])
	}

	updateSendStatus(): void {
		if (this.config.listen && this.#socket) return // the listener owns the status while it runs
		if (!this.config.host) {
			this.updateStatus(InstanceStatus.BadConfig, 'Viewer IP is not set')
		} else {
			// UDP has no connection to check, and nothing comes back to show Viewer is there.
			this.updateStatus(InstanceStatus.Ok, 'Sending only')
		}
	}

	startListener(): void {
		this.stopListener()
		if (!this.config.listen) {
			this.updateSendStatus()
			return
		}

		const port = this.config.listen_port
		// No reuseAddr: a second listener on the port should fail loudly, not
		// silently take half the packets.
		const socket = dgram.createSocket('udp4')
		this.#socket = socket
		this.updateStatus(InstanceStatus.Connecting, `Opening feedback port ${port}`)

		socket.on('error', (err) => {
			this.log('error', `Feedback port ${port}: ${err.message}`)
			this.updateStatus(InstanceStatus.ConnectionFailure, `Feedback port ${port}: ${err.message}`)
			if (this.#socket === socket) this.stopListener()
		})
		socket.on('listening', () => {
			this.log('info', `Listening for Viewer OSC on UDP ${port}`)
			if (!this.config.host) {
				this.updateStatus(InstanceStatus.BadConfig, 'Viewer IP is not set')
			} else {
				this.updateStatus(InstanceStatus.Ok)
			}
		})
		socket.on('message', (buf, rinfo) => {
			let messages: OscMessage[]
			try {
				messages = decodeOscPacket(buf)
			} catch (e) {
				this.log('debug', `Ignoring bad OSC packet from ${rinfo.address}: ${(e as Error).message}`)
				return
			}
			for (const msg of messages) this.handleMessage(msg)
		})
		socket.bind(port)
	}

	stopListener(): void {
		const socket = this.#socket
		this.#socket = null
		if (socket) {
			socket.removeAllListeners()
			socket.on('error', () => {}) // a late error must not crash the module
			try {
				socket.close()
			} catch {
				// already closed
			}
		}
	}

	/** Applies one message from Viewer's OSC output. Anything else (script traffic) is ignored. */
	handleMessage(msg: OscMessage): void {
		const { address, args } = msg

		// /clockworks/meta/<deck>  title, artist, album
		// Viewer repeats this every few seconds while a track is loaded.
		const meta = /^\/clockworks\/meta\/(\d+)$/.exec(address)
		if (meta) {
			const deck = Number(meta[1])
			if (deck < 1 || deck > MAX_DECKS) return
			const i = deck - 1
			const title = str(args[0])
			const artist = str(args[1])
			const album = str(args[2])
			if (this.state.title[i] === title && this.state.artist[i] === artist && this.state.album[i] === album) return
			this.state.title[i] = title
			this.state.artist[i] = artist
			this.state.album[i] = album
			this.publishState()
			this.checkFeedbacks('deck_loaded')
			return
		}

		switch (address) {
			// Upfaders A–D, crossfader, then upfaders E and F (appended later, so may be absent).
			case '/clockworks/control': {
				const order: FaderId[] = ['a', 'b', 'c', 'd', 'x', 'e', 'f']
				let changed = false
				order.forEach((fader, n) => {
					if (n >= args.length) return
					const value = num(args[n])
					if (this.state.faders[fader] !== value) {
						this.state.faders[fader] = value
						changed = true
					}
				})
				if (changed) {
					this.publishState()
					this.checkFeedbacks('fader_above')
				}
				return
			}
			// beat (from the live deck's sender), BPM — once per beat while the live deck plays.
			case '/clockworks/beat':
				this.state.beat = Math.round(num(args[0]))
				this.state.bpm = num(args[1])
				this.publishState()
				this.checkFeedbacks('beat')
				return
		}
	}

	/** Pushes the whole state into the variables. */
	publishState(): void {
		const s = this.state
		const values: Partial<VariablesSchema> = {
			live_deck: s.liveDeck === null ? '' : s.liveDeck === 0 ? 'None' : s.liveDeck,
			timecode_b_deck: s.deckB === null ? '' : s.deckB === 0 ? 'Off' : s.deckB,
			live: s.live === null ? '' : s.live ? 'On' : 'Off',
			live_title: s.liveDeck ? s.title[s.liveDeck - 1] : '',
			live_artist: s.liveDeck ? s.artist[s.liveDeck - 1] : '',
			beat: s.beat,
			bpm: s.bpm ? s.bpm.toFixed(1) : '',
			crossfader: Math.round(s.faders.x * 100),
		}
		for (const deck of this.decks) {
			const d = deck as DeckNumber
			values[`deck_${d}_title`] = s.title[deck - 1]
			values[`deck_${d}_artist`] = s.artist[deck - 1]
			values[`deck_${d}_album`] = s.album[deck - 1]
			values[`fader_${d}`] = Math.round(s.faders[FADERS[deck - 1]] * 100)
		}
		this.setVariableValues(values)
	}
}

export type DeckNumber = 1 | 2 | 3 | 4 | 5 | 6
