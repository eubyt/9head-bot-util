import { ChannelType, CommandInteraction } from 'discord.js';
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
            type: 3, // Tipo STRING para o campo de escolha (add ou remove)
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
            type: 7, // Tipo CHANNEL para selecionar categorias
            name: 'categoria',
            description: Config.getLang(
                'commands.setautovoicechannel.select_channel.description',
            ),
            required: false,
            channel_types: [4], // Categoria de canal
        },
        {
            type: 3, // Tipo STRING para permitir um nome customizado
            name: 'nome',
            description: Config.getLang(
                'commands.setautovoicechannel.select_channel.description',
            ),
            required: false,
        },
    ];

    async execute(intr: CommandInteraction): Promise<void> {
        Logger.info(
            'SetAutoVoiceChannelCommand',
            `Comando setautovoicechannel iniciado pelo usuário ${intr.user.id}`,
        );

        if (!(await this.validatePermissions(intr))) return;

        // Verificar se guildId é válido
        if (!intr.guildId) {
            await this.sendErrorReply(
                intr,
                'commands.setautovoicechannel.error_messages.general_error',
            );
            return;
        }

        const subcommand = intr.options.get('comando', true);
        const categoria = intr.options.get('categoria');
        const customName = intr.options.get('nome')?.value as string; // Nome customizado

        if (subcommand.value === 'clear') {
            await this.clearAutoVoiceChannels(intr);
            return;
        }

        if (!categoria) {
            await this.sendErrorReply(
                intr,
                'commands.setautovoicechannel.error_messages.invalid_input',
            );
            return;
        }

        const categoryId = categoria.channel?.id;

        if (!categoryId) {
            await this.sendErrorReply(
                intr,
                'commands.setautovoicechannel.error_messages.category_not_found',
            );
            return;
        }

        const db = Config.getGuildCollection(intr.guildId);
        const doc = await db.get();
        const data = doc.data() as ConfigData;

        // Verificar se a categoria existe
        const category = intr.guild?.channels.cache.get(categoryId);

        if (!category || category.type !== ChannelType.GuildCategory) {
            await this.sendErrorReply(
                intr,
                'commands.setautovoicechannel.error_messages.category_not_found',
            );
            return;
        }

        // Processar comando add ou remove
        switch (subcommand.value) {
            case 'add': {
                // Verificar se a categoria já está na lista
                const categoryExists = data.AutoVoiceChannel.some(
                    (item) => item.categoryId === categoryId,
                );

                if (categoryExists) {
                    await this.sendErrorReply(
                        intr,
                        'commands.setautovoicechannel.error_messages.category_already_exists',
                    );
                    return;
                }

                // Adicionar a categoria ao AutoVoiceChannel
                const newAutoVoiceChannel = {
                    name: customName || '🔊│Sala ─ #{number}',
                    categoryId: categoryId,
                };

                // Atualizar o Firebase
                await db.update({
                    AutoVoiceChannel: [
                        ...data.AutoVoiceChannel,
                        newAutoVoiceChannel,
                    ],
                });

                Config.configCache.delete(intr.guildId);

                await intr.reply({
                    content: Config.getLang(
                        'commands.setautovoicechannel.success_messages.category_added',
                    ).replace('{{categoryName}}', category.name),
                    ephemeral: true,
                });
                break;
            }

            case 'remove': {
                // Remover a categoria do AutoVoiceChannel
                const updatedAutoVoiceChannel = data.AutoVoiceChannel.filter(
                    (item) => item.categoryId !== categoryId,
                );

                if (
                    updatedAutoVoiceChannel.length ===
                    data.AutoVoiceChannel.length
                ) {
                    await this.sendErrorReply(
                        intr,
                        'commands.setautovoicechannel.error_messages.category_not_found',
                    );
                    return;
                }

                // Atualizar o Firebase
                await db.update({
                    AutoVoiceChannel: updatedAutoVoiceChannel,
                });

                Config.configCache.delete(intr.guildId);

                await intr.reply({
                    content: Config.getLang(
                        'commands.setautovoicechannel.success_messages.category_removed',
                    ).replace('{{categoryName}}', category.name),
                    ephemeral: true,
                });
                break;
            }
        }
    }

    private async validatePermissions(
        intr: CommandInteraction,
    ): Promise<boolean> {
        const member = await intr.guild?.members.fetch(intr.user.id);
        if (!member?.permissions.has('ManageChannels')) {
            await this.sendErrorReply(
                intr,
                'commands.setautovoicechannel.error_messages.no_permission',
            );
            return false;
        }
        return true;
    }

    private async sendErrorReply(
        intr: CommandInteraction,
        langKey: string,
    ): Promise<void> {
        await intr.reply({
            content: Config.getLang(langKey),
            ephemeral: true,
        });
    }

    private async clearAutoVoiceChannels(
        intr: CommandInteraction,
    ): Promise<void> {
        // Verifica se guildId é válido
        if (!intr.guildId) {
            await this.sendErrorReply(
                intr,
                'commands.setautovoicechannel.error_messages.general_error',
            );
            return;
        }

        const db = Config.getGuildCollection(intr.guildId);
        await db.update({
            AutoVoiceChannel: [],
        });
        Config.configCache.delete(intr.guildId);

        await intr.reply({
            content: Config.getLang(
                'commands.setautovoicechannel.success_messages.channels_cleared',
            ),
            ephemeral: true,
        });
    }
}
