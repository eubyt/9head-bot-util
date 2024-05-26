import {
    AutocompleteInteraction,
    ButtonInteraction,
    CommandInteraction,
    Message,
    VoiceState,
} from 'discord.js';

type EventHandlerType = 'Command' | 'Button' | 'Message' | 'VoiceState';

export interface EventHandler<T extends EventHandlerType> {
    execute(
        ...args: T extends 'Command'
            ? [CommandInteraction | AutocompleteInteraction]
            : T extends 'Button'
              ? [ButtonInteraction]
              : T extends 'Message'
                ? [Message]
                : [VoiceState, VoiceState]
    ): Promise<void> | void;
}
