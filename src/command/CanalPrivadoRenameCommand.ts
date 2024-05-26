import { CommandInteraction, ChannelType, VoiceChannel } from 'discord.js';
import { CommandCreator } from './CommandBot';
import { Firestore } from 'firebase-admin/firestore';

export class CanalPrivadoRenameCommand extends CommandCreator {
    public name = 'canalprivado-rename';
    public name_localizations = null;

    public description = 'Trocar o nome do seu canal privado.';
    public description_localizations = null;

    public options = [
        {
            type: 3,
            name: 'nome',
            description: 'Digite o nome do seu canal',
            required: true,
        },
    ];

    constructor(public db: Firestore) {
        super();
    }

    async execute(intr: CommandInteraction) {
        const newName = intr.options.get('nome', true).value as string;

        if (newName.length > 12) {
            await intr.reply({
                content: 'O nome do canal não pode exceder 12 caracteres.',
                ephemeral: true,
            });
            return;
        }

        const docRef = this.db
            .collection('privateVoiceChannels')
            .doc(intr.user.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            await intr.reply({
                content: 'Você não tem um canal privado.',
                ephemeral: true,
            });
            return;
        }

        const data = doc.data() as {
            channelName: string;
            permissions: string[];
        };

        const privateChannelName = data.channelName;

        const channel = intr.guild?.channels.cache.find(
            (ch) =>
                ch.name === privateChannelName &&
                ch.type === ChannelType.GuildVoice,
        ) as VoiceChannel | undefined;

        // Verificar se já existe um canal com o mesmo nome no Firestore
        const existingChannelQuery = await this.db
            .collection('privateVoiceChannels')
            .where('channelName', '==', newName)
            .get();

        if (!existingChannelQuery.empty) {
            await intr.reply({
                content:
                    'Já existe um canal com este nome. Escolha um nome diferente.',
                ephemeral: true,
            });
            return;
        }

        try {
            if (channel) {
                await channel.setName(newName);
            }

            // Atualizar o nome do canal no Firestore
            await docRef.update({
                channelName: newName,
            });

            await intr.reply({
                content: `O nome do canal foi alterado para "${newName}".`,
                ephemeral: true,
            });
        } catch (error) {
            await intr.reply({
                content: 'Não foi possível alterar o nome do canal.',
                ephemeral: true,
            });
            console.error('Erro ao alterar o nome do canal:', error);
        }
    }
}
