import { CommandInteraction } from 'discord.js';
import { CommandCreator } from './CommandBot';
import { Firestore } from 'firebase-admin/firestore';

export class CanalPrivadoPersistenciaCommand extends CommandCreator {
    public name = 'canalprivado-persistencia';
    public name_localizations = null;

    public description =
        '「Canal Privado」 Alterna a persistência do seu canal privado (liga/desliga).';
    public description_localizations = null;

    public options = [];

    constructor(public db: Firestore) {
        super();
    }

    async execute(intr: CommandInteraction) {
        const userId = intr.user.id;

        // Verifica se o usuário tem um canal privado
        const docRef = this.db.collection('privateVoiceChannels').doc(userId);
        const doc = await docRef.get();

        if (!doc.exists) {
            await intr.reply({
                content: 'Você não possui um canal privado.',
                ephemeral: true,
            });
            return;
        }

        const data = doc.data() as {
            channelName: string;
            permissions: string[];
            persistente: boolean;
        };
        const privateChannelName = data.channelName;

        // Toggling a persistência do canal
        try {
            const isPersistente = data.persistente || false; // Se não tiver, assume false

            // Alterna o valor de persistente
            const newPersistenteValue = !isPersistente;

            // Atualizando a persistência no Firestore
            await docRef.update({
                persistente: newPersistenteValue,
            });

            const status = newPersistenteValue ? 'ativado' : 'desativado';
            await intr.reply({
                content: `A persistência do canal \`${privateChannelName}\` foi ${status}.`,
                ephemeral: true,
            });
        } catch (error) {
            await intr.reply({
                content:
                    'Não foi possível alternar a persistência para o canal.',
                ephemeral: true,
            });
            console.error('Erro ao alternar persistência:', error);
        }
    }
}
