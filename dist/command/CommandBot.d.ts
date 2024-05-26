import { CommandInteraction, EmbedBuilder, LocalizationMap, User } from 'discord.js';
export interface CommandName {
    name: string;
    locale: keyof LocalizationMap;
}
export interface CommandDescription {
    description: string;
    locale: keyof LocalizationMap;
}
export interface CommandBot {
    name: string;
    name_localizations?: LocalizationMap | null;
    description: string;
    description_localizations: LocalizationMap | null;
    options: unknown[];
    execute(intr: CommandInteraction): Promise<void>;
}
export declare abstract class CommandCreator implements CommandBot {
    abstract name: string;
    abstract name_localizations: LocalizationMap | null;
    abstract options: unknown[];
    abstract description: string;
    abstract description_localizations: LocalizationMap | null;
    abstract execute(intr: CommandInteraction): Promise<void>;
    BasicEmbed(user: User): EmbedBuilder;
    getJSON(): Record<string, unknown>;
}
//# sourceMappingURL=CommandBot.d.ts.map