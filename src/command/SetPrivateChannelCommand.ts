import {
    ChannelType,
    CommandInteraction,
    CommandInteractionOption,
} from 'discord.js';
import { CommandCreator } from './CommandBot';
import { Config } from '../model';
import { Logger } from '../model/Logger';
import { ConfigData } from '../model/Config';

export class SetPrivateChannelCommand extends CommandCreator {
    public name = 'config-server-privatevoice';
    public name_localizations = null;

    public description = Config.getLang(
        'commands.setprivatevoicechannel.actions.description',
    );
    public description_localizations = null;

    public options = [
        {
            type: 3, // Tipo STRING para o campo de escolha (add, remove, clear)
            name: 'comando',
            description: Config.getLang(
                'commands.setprivatevoicechannel.actions.description',
            ),
            required: true,
            choices: [
                {
                    name: Config.getLang(
                        'commands.setprivatevoicechannel.actions.options.add',
                    ),
                    value: 'add',
                },
                {
                    name: Config.getLang(
                        'commands.setprivatevoicechannel.actions.options.remove',
                    ),
                    value: 'remove',
                },
                {
                    name: Config.getLang(
                        'commands.setprivatevoicechannel.actions.options.clear',
                    ),
                    value: 'clear',
                },
            ],
        },
        {
            type: 7, // Tipo CHANNEL para selecionar categorias
            name: 'categoria',
            description: Config.getLang(
                'commands.setprivatevoicechannel.select_channel.description',
            ),
            required: false,
            channel_types: [4], // Categoria de canal
        },
        {
            type: 7, // Tipo CHANNEL para selecionar canal de voz
            name: 'canal',
            description: Config.getLang(
                'commands.setprivatevoicechannel.select_channel.description',
            ),
            required: false,
            channel_types: [2], // Canal de voz
        },
    ];

    async execute(intr: CommandInteraction): Promise<void> {
        const userId = intr.user.id;

        Logger.info(
            'SetPrivateChannelCommand',
            `Comando setprivatevoicechannel iniciado pelo usuário ${intr.user.id}`,
        );

        await intr.deferReply({ ephemeral: true });

        if (!(await this.validatePermissions(intr))) return;

        // Verificar se guildId é válido
        if (!intr.guildId) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.setprivatevoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setprivatevoicechannel.error_messages.general_error',
                ),
                userId,
            );
            return;
        }

        const subcommand = intr.options.get('comando', true);
        const canal = intr.options.get('canal');
        const categoria = intr.options.get('categoria');

        // Se o comando for "clear", não precisamos das opções 'categoria' e 'canal'
        if (subcommand.value === 'clear') {
            await this.clearPrivateChannels(intr);
            return;
        }

        if (!canal || !categoria) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.setprivatevoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setprivatevoicechannel.error_messages.invalid_input',
                ),
                userId,
            );
            return;
        }

        if (!(await this.validateCategory(intr, categoria.channel?.id))) return;

        // Processar comando add ou remove
        switch (subcommand.value) {
            case 'add':
                await this.addPrivateChannel(intr, categoria, canal);
                break;
            case 'remove':
                await this.removePrivateChannel(intr, categoria, canal);
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
                    'commands.setprivatevoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setprivatevoicechannel.error_messages.no_permission',
                ),
                intr.user.id,
            );
            return false;
        }
        return true;
    }

    private async validateCategory(
        intr: CommandInteraction,
        categoryId: string | undefined,
    ): Promise<boolean> {
        if (!categoryId) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.setprivatevoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setprivatevoicechannel.error_messages.category_not_found',
                ),
                intr.user.id,
            );
            return false;
        }

        const category = intr.guild?.channels.cache.get(categoryId);
        if (!category || category.type !== ChannelType.GuildCategory) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.setprivatevoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setprivatevoicechannel.error_messages.category_not_found',
                ),
                intr.user.id,
            );
            return false;
        }

        return true;
    }

    private async clearPrivateChannels(
        intr: CommandInteraction,
    ): Promise<void> {
        // Verifica se guildId é válido
        if (!intr.guildId) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.setprivatevoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setprivatevoicechannel.error_messages.general_error',
                ),
                intr.user.id,
            );
            return;
        }

        const db = Config.getGuildCollection(intr.guildId);
        await db.update({
            PrivateVoiceChannel: [],
        });
        Config.configCache.delete(intr.guildId);

        await this.sendEmbed(
            intr,
            Config.getLang(
                'commands.setprivatevoicechannel.error_messages.erro_title',
            ),
            Config.getLang(
                'commands.setprivatevoicechannel.success_messages.channels_cleared',
            ),
            intr.user.id,
        );
    }

    private async addPrivateChannel(
        intr: CommandInteraction,
        categoria: CommandInteractionOption,
        canal: CommandInteractionOption,
    ): Promise<void> {
        // Verifica se guildId é válido
        if (!intr.guildId) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.setprivatevoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setprivatevoicechannel.error_messages.general_error',
                ),
                intr.user.id,
            );
            return;
        }

        const categoryId = categoria.channel?.id;
        const db = Config.getGuildCollection(intr.guildId);

        const doc = await db.get();
        const data = doc.data() as ConfigData;

        const channelExists = data.PrivateVoiceChannel.some(
            (item) =>
                item.channelId === canal.channel?.id &&
                item.categoryId === categoryId,
        );

        if (channelExists) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.setprivatevoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setprivatevoicechannel.error_messages.channel_already_exists',
                ),
                intr.user.id,
            );
            return;
        }

        const newPrivateVoiceChannel = {
            channelId: canal.channel?.id,
            categoryId: categoryId,
        };

        await db.update({
            PrivateVoiceChannel: [
                ...data.PrivateVoiceChannel,
                newPrivateVoiceChannel,
            ],
        });

        Config.configCache.delete(intr.guildId);

        await this.sendEmbed(
            intr,
            Config.getLang(
                'commands.setprivatevoicechannel.success_messages.sucess_title',
            ),
            Config.getLang(
                'commands.setprivatevoicechannel.success_messages.channel_added',
            ).replace('{{channelName}}', categoria.name),
            intr.user.id,
        );
    }

    private async removePrivateChannel(
        intr: CommandInteraction,
        categoria: CommandInteractionOption,
        canal: CommandInteractionOption,
    ): Promise<void> {
        if (!intr.guildId) return;

        const categoryId = categoria.channel?.id;
        const db = Config.getGuildCollection(intr.guildId);

        const doc = await db.get();
        const data = doc.data() as ConfigData;

        const updatedPrivateVoiceChannel = data.PrivateVoiceChannel.filter(
            (item) =>
                item.channelId !== canal.channel?.id ||
                item.categoryId !== categoryId,
        );

        if (
            updatedPrivateVoiceChannel.length ===
            data.PrivateVoiceChannel.length
        ) {
            await this.sendEmbed(
                intr,
                Config.getLang(
                    'commands.setprivatevoicechannel.error_messages.erro_title',
                ),
                Config.getLang(
                    'commands.setprivatevoicechannel.error_messages.channel_not_found',
                ),
                intr.user.id,
            );

            return;
        }

        await db.update({
            PrivateVoiceChannel: updatedPrivateVoiceChannel,
        });

        Config.configCache.delete(intr.guildId);

        await this.sendEmbed(
            intr,
            Config.getLang(
                'commands.setprivatevoicechannel.error_messages.erro_title',
            ),
            Config.getLang(
                'commands.setprivatevoicechannel.success_messages.channel_removed',
            ),
            intr.user.id,
        );
    }
}
