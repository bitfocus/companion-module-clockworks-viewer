// A minimal OSC 1.0 decoder for what Viewer sends: messages and bundles with
// int, float, string, double and int64 arguments. Sending goes through
// Companion's own OSC sender (InstanceBase.oscSend), so there is no encoder here.

export type OscArg = number | string | boolean | null | Buffer

export interface OscMessage {
	address: string
	args: OscArg[]
}

/** Reads a null-terminated string padded to a 4-byte boundary. */
function readString(buf: Buffer, offset: number): [string, number] {
	const end = buf.indexOf(0, offset)
	if (end < 0) throw new Error('unterminated OSC string')
	const str = buf.toString('utf8', offset, end)
	return [str, (end + 4) & ~3]
}

function decodeMessage(buf: Buffer): OscMessage {
	const [address, afterAddress] = readString(buf, 0)
	if (!address.startsWith('/')) throw new Error(`bad OSC address ${JSON.stringify(address)}`)

	// A message with no type tag string is legal (OSC 1.0) and has no arguments.
	if (afterAddress >= buf.length || buf[afterAddress] !== 0x2c /* , */) {
		return { address, args: [] }
	}

	const [tags, afterTags] = readString(buf, afterAddress)
	let offset = afterTags
	const args: OscArg[] = []
	for (const tag of tags.slice(1)) {
		switch (tag) {
			case 'i':
				args.push(buf.readInt32BE(offset))
				offset += 4
				break
			case 'f':
				args.push(buf.readFloatBE(offset))
				offset += 4
				break
			case 'd':
				args.push(buf.readDoubleBE(offset))
				offset += 8
				break
			case 'h':
				args.push(Number(buf.readBigInt64BE(offset)))
				offset += 8
				break
			case 's':
			case 'S': {
				let str: string
				;[str, offset] = readString(buf, offset)
				args.push(str)
				break
			}
			case 'b': {
				const len = buf.readInt32BE(offset)
				args.push(buf.subarray(offset + 4, offset + 4 + len))
				offset = (offset + 4 + len + 3) & ~3
				break
			}
			case 'T':
				args.push(true)
				break
			case 'F':
				args.push(false)
				break
			case 'N':
			case 'I':
				args.push(null)
				break
			default:
				// Unknown tags have unknown sizes, so nothing after them can be read.
				throw new Error(`unsupported OSC type tag '${tag}' in ${address}`)
		}
	}
	return { address, args }
}

/** Decodes one UDP datagram into its messages, flattening any bundles. */
export function decodeOscPacket(buf: Buffer): OscMessage[] {
	if (buf.length >= 16 && buf.toString('ascii', 0, 8) === '#bundle\0') {
		const messages: OscMessage[] = []
		// Skip the 8-byte bundle tag and the 8-byte time tag.
		let offset = 16
		while (offset + 4 <= buf.length) {
			const size = buf.readInt32BE(offset)
			offset += 4
			if (size <= 0 || offset + size > buf.length) throw new Error('truncated OSC bundle element')
			messages.push(...decodeOscPacket(buf.subarray(offset, offset + size)))
			offset += size
		}
		return messages
	}
	return [decodeMessage(buf)]
}
