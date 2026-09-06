export type GameMessageCreatedEvent = {
  gameId: string
  messageId: string
}

export type StreamMessageEvent = GameMessageCreatedEvent & {
  streamId: string
}

export interface GameMessageEventBus {
  publish(event: GameMessageCreatedEvent): Promise<void>
  subscribe(input: {
    gameId: string
    afterStreamId: string | null
    signal: AbortSignal
    onEvent: (event: StreamMessageEvent) => Promise<void>
  }): Promise<void>
}
