/* eslint-disable @typescript-eslint/no-misused-promises */
import {
    Client,
    Guild,
    ThreadChannel,
    ChannelType,
    VoiceState,
    GuildBan,
} from 'discord.js';
import { Logger } from '../model/Logger';
import { logDeletedMessage } from './LogDeletedMessage';
import { logEditedMessage } from './LogEditedMessage';
import { logJoinLeave } from './LogJoinLeave';
import { logMemberUpdate } from './LogMemberUpdate';
import { logUserUpdate } from './LogUserUpdate';
import { logVoice } from './LogVoice';
import { Config } from '../model';
import { LogBanMessage, logKickMessage, LogTimeoutMessage } from './LogPunish';

export async function sendLogMessage(
    mensagem: string,
    thread: ThreadChannel,
    header: string,
    details: string,
): Promise<void> {
    const maxMessageLength = 1600;

    if (mensagem.length > maxMessageLength) {
        const chunks = [];
        for (let i = 0; i < mensagem.length; i += maxMessageLength) {
            chunks.push(mensagem.slice(i, i + maxMessageLength));
        }

        for (const chunk of chunks) {
            const newMessage = chunk.replace(/```/g, '"');

            if (chunks.indexOf(chunk) === 0) {
                await thread.send(
                    `${header}\n${details}\`\`\`${newMessage}\n\`\`\``,
                );
            } else {
                await thread.send(`\`\`\`${newMessage}\n\`\`\``);
            }
        }
    } else {
        await thread.send(
            `${header}\n${details}${mensagem.length > 0 ? `\`\`\`${mensagem}\n\`\`\`` : ''}`,
        );
    }
}

export class ServerLogger {
    constructor(private client: Client) {
        this.registerLogger();
    }

    private registerLogger(): void {
        this.client.on('messageDelete', async (message) => {
            if (!message.guild) {
                return;
            }

            const config = await Config.getConfig(message.guild.id);
            if (config === undefined) return;

            const thread = await this.getThreadLogger(
                message.guild,
                config.LoggerChannel,
                '[Logger] Mensagens Deletadas',
            );

            if (thread) {
                void logDeletedMessage(thread, message);
            }
        });

        // Evento de mensagem editada
        this.client.on('messageUpdate', async (oldMessage, newMessage) => {
            let partial = false;

            if (oldMessage.partial || newMessage.partial) {
                oldMessage = await oldMessage.fetch();
                newMessage = await newMessage.fetch();
                partial = true;
            }

            if (!oldMessage.guild || !newMessage.guild) return;

            const config = await Config.getConfig(newMessage.guild.id);
            if (config === undefined) return;

            const thread = await this.getThreadLogger(
                oldMessage.guild,
                config.LoggerChannel,
                '[Logger] Mensagens Editadas',
            );

            if (thread) {
                void logEditedMessage(thread, oldMessage, newMessage, partial);
            }
        });

        // Evento de entrar e sair do servidor
        this.client.on('guildMemberAdd', async (member) => {
            const config = await Config.getConfig(member.guild.id);
            if (config === undefined) return;

            const thread = await this.getThreadLogger(
                member.guild,
                config.LoggerChannel,
                '[Logger] Entrada/Saída de Membros',
            );

            if (thread) {
                void logJoinLeave(thread, member, true);
            }
        });

        this.client.on('guildMemberRemove', async (member) => {
            const config = await Config.getConfig(member.guild.id);
            if (config === undefined) return;

            const thread = await this.getThreadLogger(
                member.guild,
                config.LoggerChannel,
                '[Logger] Entrada/Saída de Membros',
            );

            if (member.partial) {
                member = await member.fetch();
            }

            if (thread) {
                void logJoinLeave(thread, member, false);
            }

            if (config.BanLoggerChannel) {
                const channel = this.client.channels.cache.get(
                    config.BanLoggerChannel,
                );

                if (
                    channel?.type === ChannelType.GuildText ||
                    channel?.isThread()
                ) {
                    void logKickMessage(channel, member);
                }
            }
        });

        this.client.on('guildMemberUpdate', async (oldMember, newMember) => {
            const config = await Config.getConfig(newMember.guild.id);
            if (config === undefined) return;

            const thread = await this.getThreadLogger(
                newMember.guild,
                config.LoggerChannel,
                '[Logger] Atualização de perfil',
            );

            if (oldMember.partial) {
                oldMember = await oldMember.fetch();
            }

            if (thread) {
                void logMemberUpdate(thread, oldMember, newMember);
            }

            if (config.BanLoggerChannel) {
                const channel = this.client.channels.cache.get(
                    config.BanLoggerChannel,
                );

                if (
                    channel?.type === ChannelType.GuildText ||
                    channel?.isThread()
                ) {
                    void LogTimeoutMessage(channel, oldMember, newMember);
                }
            }
        });

        this.client.on('userUpdate', (oldUser, newUser) => {
            logUserUpdate(
                oldUser,
                newUser,
                '[Logger] Atualização de perfil',
                this.client,
            );
        });

        this.client.on(
            'voiceStateUpdate',
            async (oldState: VoiceState, newState: VoiceState) => {
                const config = await Config.getConfig(newState.guild.id);
                if (config === undefined) return;

                const thread = await this.getThreadLogger(
                    newState.guild,
                    config.LoggerChannel,
                    '[Logger] Usuário em canais de voz',
                );

                if (thread) {
                    void logVoice(thread, oldState, newState);
                }
            },
        );

        /// Punish
        this.client.on('guildBanAdd', async (ban: GuildBan) => {
            const config = await Config.getConfig(ban.guild.id);
            if (config === undefined) return;

            const channel = this.client.channels.cache.get(
                config.BanLoggerChannel,
            );

            if (
                channel?.type === ChannelType.GuildText ||
                channel?.isThread()
            ) {
                void LogBanMessage(channel, ban, false);
            }
        });

        this.client.on('guildBanRemove', async (ban: GuildBan) => {
            const config = await Config.getConfig(ban.guild.id);
            if (config === undefined) return;

            const channel = this.client.channels.cache.get(
                config.BanLoggerChannel,
            );

            if (
                channel?.type === ChannelType.GuildText ||
                channel?.isThread()
            ) {
                void LogBanMessage(channel, ban, true);
            }
        });
    }

    private async getThreadLogger(
        guild: Guild,
        channelId: string,
        name: string,
    ): Promise<ThreadChannel | null> {
        const channel = guild.channels.cache.get(channelId);

        if (!channel || channel.type !== ChannelType.GuildText) {
            console.log(channel?.type);
            return null;
        }

        let thread = channel.threads.cache.find((t) => t.name === name);

        if (!thread) {
            try {
                thread = await channel.threads.create({
                    name,
                    autoArchiveDuration: 60 * 24 * 7,
                    reason: 'Thread criada para logs de mensagens deletadas.',
                });
            } catch (error) {
                void Logger.error(
                    'Server Log',
                    `Erro ao criar thread de log: ${String(error)}`,
                );
                return null;
            }
        }

        return thread;
    }
}
