import {
    ChannelType,
    ChatInputCommandInteraction,
    Guild,
    OverwriteResolvable,
    VoiceChannel,
} from 'discord.js';
import { CommandCreator } from './CommandBot';
import { Config } from '../model';
import { Logger } from '../model/Logger';
import { buildPrivateChannelPermissions } from '../event/PrivateVoiceChannel';

export class CanalPrivadoCommand extends CommandCreator {
    public name = 'canalprivado';
    public name_localizations = null;
    public description = Config.getLang('commands.canalprivado.description');
    public description_localizations = null;

    public options = [
        {
            type: 3,
            name: 'comando',
            description: Config.getLang(
                'commands.canalprivado.actions.description',
            ),
            required: true,
            choices: [
                {
                    name: Config.getLang(
                        'commands.canalprivado.actions.options.add',
                    ),
                    value: 'add',
                },
                {
                    name: Config.getLang(
                        'commands.canalprivado.actions.options.remove',
                    ),
                    value: 'remove',
                },
            ],
        },
        {
            type: 6,
            name: 'usuario',
            description: Config.getLang(
                'commands.canalprivado.add_user.description',
            ),
            required: true,
        },
    ];

    private async updateChannelPermissions(
        guild: Guild | null,
        channelName: string,
        permissions: string[],
        hidden: boolean,
        persistente: boolean,
        docRef: FirebaseFirestore.DocumentReference,
    ): Promise<void> {
        if (!guild) return;

        const channel = guild.channels.cache.find(
            (ch) =>
                ch.name === channelName && ch.type === ChannelType.GuildVoice,
        );

        if (channel) {
            const permissionOverwrites: OverwriteResolvable[] =
                buildPrivateChannelPermissions(guild, permissions, hidden);

            await (channel as VoiceChannel).permissionOverwrites.set(
                permissionOverwrites,
            );
        }

        await docRef.set({ channelName, permissions, hidden, persistente });

        Config.configCache.delete(guild.id);

        Logger.info(
            'CanalPrivadoCommand',
            `Canal ${channelName} atualizado com permissões: ${permissions.join(', ')}`,
        );
    }

    private async getPrivateChannelData(guildId: string, userId: string) {
        const db = Config.getGuildCollection(guildId);
        const docRef = db.collection('privateVoiceChannels').doc(userId);
        const doc = await docRef.get();

        if (!doc.exists) return null;

        return doc.data() as {
            permissions: string[];
            channelName: string;
            persistente: boolean;
            hidden: boolean;
        };
    }

    async execute(intr: ChatInputCommandInteraction): Promise<void> {
        const subcommand = intr.options.get('comando', true).value;
        const user = intr.options.get('usuario', true).user;

        await intr.deferReply({ ephemeral: true });

        if (!intr.guild || !intr.guildId) {
            await this.sendEmbed(
                intr,
                Config.getLang('commands.canalprivado.error_messages.title'),
                Config.getLang('commands.canalprivado.error_messages.no_guild'),
                intr.user.id,
            );
            return;
        }

        if (!user || user.bot || intr.user.id === user.id) {
            const errorKey = user?.bot
                ? 'commands.canalprivado.error_messages.bot_invalid'
                : intr.user.id === user?.id
                  ? 'commands.canalprivado.error_messages.self_invalid'
                  : 'commands.canalprivado.error_messages.user_invalid';

            await this.sendEmbed(
                intr,
                Config.getLang('commands.canalprivado.error_messages.title'),
                Config.getLang(errorKey),
                user?.id ?? 'N/A',
            );
            return;
        }

        const privateChannelData = await this.getPrivateChannelData(
            intr.guildId,
            intr.user.id,
        );

        if (!privateChannelData) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.canalprivado.error_messages.no_channel_title',
                ),
                Config.getLang(
                    'commands.canalprivado.error_messages.no_channel',
                ),
                intr.user.id,
            );
            Logger.warn(
                'CanalPrivadoCommand',
                `Nenhum canal privado encontrado para o ${intr.user.id}`,
            );
            return;
        }

        const { permissions, channelName, hidden, persistente } =
            privateChannelData;

        switch (subcommand) {
            case 'add':
                if (!permissions.includes(user.id)) {
                    permissions.push(user.id);
                    await this.updateChannelPermissions(
                        intr.guild,
                        channelName,
                        permissions,
                        hidden,
                        persistente,
                        Config.getGuildCollection(intr.guildId)
                            .collection('privateVoiceChannels')
                            .doc(intr.user.id),
                    );

                    await this.sendEmbed(
                        intr,
                        Config.getLang(
                            'commands.canalprivado.success_messages.sucess_title',
                        ),
                        Config.getLang(
                            'commands.canalprivado.success_messages.user_added',
                        ).replace('{{userId}}', user.id),
                        channelName,
                    );

                    Logger.info(
                        'CanalPrivadoCommand',
                        `Usuário ${user.id} adicionado ao canal privado: ${channelName}`,
                    );
                } else {
                    await this.sendEmbed(
                        intr,
                        Config.getLang(
                            'commands.canalprivado.error_messages.erro_title',
                        ),
                        Config.getLang(
                            'commands.canalprivado.error_messages.user_already_added',
                        ).replace('{{userId}}', user.id),
                        channelName,
                    );
                    Logger.warn(
                        'CanalPrivadoCommand',
                        `Usuário ${user.id} já estava no canal privado: ${channelName}`,
                    );
                }
                break;
            case 'remove':
                if (permissions.includes(user.id)) {
                    const updatedPermissions = permissions.filter(
                        (id) => id !== user.id,
                    );
                    await this.updateChannelPermissions(
                        intr.guild,
                        channelName,
                        updatedPermissions,
                        hidden,
                        persistente,
                        Config.getGuildCollection(intr.guildId)
                            .collection('privateVoiceChannels')
                            .doc(intr.user.id),
                    );

                    await this.sendEmbed(
                        intr,
                        Config.getLang(
                            'commands.canalprivado.success_messages.sucess_title',
                        ),
                        Config.getLang(
                            'commands.canalprivado.success_messages.user_removed',
                        ).replace('{{userId}}', user.id),
                        channelName,
                    );

                    Logger.info(
                        'CanalPrivadoCommand',
                        `Usuário ${user.id} removido do canal privado: ${channelName}`,
                    );
                } else {
                    await this.sendEmbed(
                        intr,
                        Config.getLang(
                            'commands.canalprivado.error_messages.erro_title',
                        ),
                        Config.getLang(
                            'commands.canalprivado.error_messages.user_not_authorized',
                        ).replace('{{userId}}', user.id),
                        channelName,
                    );
                    Logger.warn(
                        'CanalPrivadoCommand',
                        `Usuário ${user.id} não autorizado a acessar o canal privado: ${channelName}`,
                    );
                }
                break;
            default: {
                await this.sendEmbed(
                    intr,
                    Config.getLang(
                        'commands.canalprivado.error_messages.erro_title',
                    ),
                    Config.getLang(
                        'commands.canalprivado.error_messages.invalid_command',
                    ),
                    `Comando: ${subcommand as string}`,
                );
                Logger.warn(
                    'CanalPrivadoCommand',
                    `Comando inválido recebido: ${subcommand as string}`,
                );
            }
        }
    }
}
