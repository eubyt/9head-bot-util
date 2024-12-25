/* eslint-disable @typescript-eslint/no-misused-promises */
import { Client, Guild, ThreadChannel, ChannelType } from 'discord.js';
import { Logger } from '../model/Logger';
import { logDeletedMessage } from './LogDeletedMessage';
import { logEditedMessage } from './LogEditedMessage';

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
        const channelId = '1317428190087479306';
        // Evento de mensagem deletada
        this.client.on('messageDelete', async (message) => {
            if (!message.guild) {
                return;
            }

            const thread = await this.getThreadLogger(
                message.guild,
                channelId,
                '[Logger] Mensagens Deletadas',
            );

            if (thread) {
                void logDeletedMessage(thread, message);
            }
        });

        // Evento de mensagem editada
        this.client.on('messageUpdate', async (oldMessage, newMessage) => {
            if (
                !oldMessage.guild ||
                !oldMessage.content ||
                !newMessage.content
            ) {
                console.log(
                    'Mensagem não é de um servidor ou não tem conteúdo',
                );
                return;
            }

            const thread = await this.getThreadLogger(
                oldMessage.guild,
                channelId,
                '[Logger] Mensagens Editadas',
            );

            if (thread) {
                void logEditedMessage(thread, oldMessage, newMessage);
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
