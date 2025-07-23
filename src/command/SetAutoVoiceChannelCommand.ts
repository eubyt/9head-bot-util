import {
    ChannelType,
    ChatInputCommandInteraction,
    CommandInteraction,
    GuildBasedChannel,
} from 'discord.js';
import { CommandCreator } from './CommandBot';
import { Config } from '../model';
import { Logger } from '../model/Logger';
import { ConfigData } from '../model/Config';

export class SetAutoVoiceChannelCommand extends CommandCreator {
    public name = 'config-server-autovoice';
    public name_localizations = null;

    public description = Config.getLang(
        'commands.setautovoicechannel.actions.description',
    );
    public description_localizations = null;

    public options = [
        {
            type: 3,
            name: 'comando',
            description: Config.getLang(
                'commands.setautovoicechannel.actions.description',
            ),
            required: true,
            choices: [
                {
                    name: Config.getLang(
                        'commands.setautovoicechannel.actions.options.add',
                    ),
                    value: 'add',
                },
                {
                    name: Config.getLang(
                        'commands.setautovoicechannel.actions.options.remove',
                    ),
                    value: 'remove',
                },
                {
                    name: Config.getLang(
                        'commands.setautovoicechannel.actions.options.clear',
                    ),
                    value: 'clear',
                },
            ],
        },
        {
            type: 7,
            name: 'categoria',
            description: Config.getLang(
                'commands.setautovoicechannel.select_channel.description',
            ),
            required: false,
            channel_types: [4],
        },
        {
            type: 3,
            name: 'nome',
            description: Config.getLang(
                'commands.setautovoicechannel.select_channel.description',
            ),
            required: false,
        },
    ];

    async execute(intr: ChatInputCommandInteraction): Promise<void> {
        const userId = intr.user.id;

        Logger.info(
            'SetAutoVoiceChannelCommand',
            `Comando iniciado pelo usuário ${userId}`,
        );

        await intr.deferReply({ ephemeral: true });

        if (!(await this.validatePermissions(intr))) return;

        if (!intr.guildId) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.general_error',
                ),
                userId,
            );
            return;
        }

        const guildId = intr.guildId;

        const subcommand = intr.options.get('comando', true).value as string;
        const categoria = intr.options.get('categoria')
            ?.channel as GuildBasedChannel;
        let customName = intr.options.get('nome')?.value as string;

        //Verificar se o customName possui "#{number} se não tiver, adicionar"
        if (customName && !customName.includes('#{number}')) {
            customName += ' #{number}';
        }

        switch (subcommand) {
            case 'clear':
                await this.clearAutoVoiceChannels(intr, guildId);
                break;
            case 'add':
                await this.addAutoVoiceChannel(
                    intr,
                    guildId,
                    categoria,
                    customName,
                );
                break;
            case 'remove':
                await this.removeAutoVoiceChannel(intr, guildId, categoria);
                break;
            default:
                await this.sendEmbed(
                    intr,
                    Config.getLang(
                        'commands.setautovoicechannel.error_messages.erro_title',
                    ),
                    Config.getLang(
                        'commands.setautovoicechannel.error_messages.invalid_command',
                    ),
                    userId,
                );
                break;
        }
    }

    private async validatePermissions(
        intr: CommandInteraction,
    ): Promise<boolean> {
        const member = await intr.guild?.members.fetch(intr.user.id);
        if (!member?.permissions.has('ManageChannels')) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.no_permission',
                ),
                member?.id ?? 'N/A',
            );
            return false;
        }
        return true;
    }

    private async clearAutoVoiceChannels(
        intr: CommandInteraction,
        guildId: string,
    ): Promise<void> {
        const db = Config.getGuildCollection(guildId);
        await db.update({ AutoVoiceChannel: [] });
        Config.configCache.delete(guildId);

        await this.sendEmbed(
            intr,
            Config.getLang(
                'commands.setautovoicechannel.success_messages.sucess_title',
            ),
            Config.getLang(
                'commands.setautovoicechannel.success_messages.channels_cleared',
            ),
            intr.user.id,
        );
    }

    private async addAutoVoiceChannel(
        intr: CommandInteraction,
        guildId: string,
        categoria: GuildBasedChannel | undefined,
        customName: string | undefined,
    ): Promise<void> {
        if (!categoria) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.invalid_input',
                ),
                intr.user.id,
            );
            return;
        }

        const categoryId = categoria.id;

        if (!categoryId) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.category_not_found',
                ),
                intr.user.id,
            );
            return;
        }

        const db = Config.getGuildCollection(guildId);
        const doc = await db.get();
        const data = doc.data() as ConfigData;

        const category = intr.guild?.channels.cache.get(categoryId);

        if (!category || category.type !== ChannelType.GuildCategory) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.category_not_found',
                ),
                intr.user.id,
            );
            return;
        }

        const categoryExists = data.AutoVoiceChannel.some(
            (item) => item.categoryId === categoryId,
        );

        if (categoryExists) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.category_already_exists',
                ),
                intr.user.id,
            );
            return;
        }

        const newAutoVoiceChannel = {
            name: customName ?? '🔊│Sala ─ #{number}',
            categoryId,
        };

        await db.update({
            AutoVoiceChannel: [...data.AutoVoiceChannel, newAutoVoiceChannel],
        });

        Config.configCache.delete(guildId);

        await this.sendEmbed(
            intr,
            Config.getLang(
                'commands.setautovoicechannel.success_messages.sucess_title',
            ),
            Config.getLang(
                'commands.setautovoicechannel.success_messages.category_added',
            ).replace('{{categoryName}}', category.name),
            intr.user.id,
        );
    }

    private async removeAutoVoiceChannel(
        intr: CommandInteraction,
        guildId: string,
        categoria: GuildBasedChannel | undefined,
    ): Promise<void> {
        if (!categoria) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.invalid_input',
                ),
                intr.user.id,
            );
            return;
        }

        const categoryId = categoria.id;

        if (!categoryId) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.category_not_found',
                ),
                intr.user.id,
            );
            return;
        }

        const db = Config.getGuildCollection(guildId);
        const doc = await db.get();
        const data = doc.data() as ConfigData;

        const updatedAutoVoiceChannel = data.AutoVoiceChannel.filter(
            (item) => item.categoryId !== categoryId,
        );

        if (updatedAutoVoiceChannel.length === data.AutoVoiceChannel.length) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setautovoicechannel.error_messages.category_not_found',
                ),
                intr.user.id,
            );
            return;
        }

        await db.update({ AutoVoiceChannel: updatedAutoVoiceChannel });
        Config.configCache.delete(guildId);

        const category = intr.guild?.channels.cache.get(categoryId);

        await this.sendEmbed(
            intr,
            Config.getLang(
                'commands.setautovoicechannel.success_messages.sucess_title',
            ),
            Config.getLang(
                'commands.setautovoicechannel.success_messages.category_removed',
            ).replace('{{categoryName}}', category?.name ?? 'Unknown'),
            intr.user.id,
        );
    }
}
