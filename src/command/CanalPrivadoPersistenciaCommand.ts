import { CommandInteraction } from 'discord.js';
import { CommandCreator } from './CommandBot';
import { Firestore } from 'firebase-admin/firestore';
import { Config } from '../model';
import { Logger } from '../model/Logger';

export class CanalPrivadoPersistenciaCommand extends CommandCreator {
    public name = 'canalprivado-persistencia';
    public name_localizations = null;

    // Mensagem da descrição usando o arquivo de configurações
    public description = Config.getLang(
        'commands.canalprivado_persistencia.description',
    );
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
                content: Config.getLang(
                    'commands.canalprivado_persistencia.error_messages.no_private_channel',
                ),
                ephemeral: true,
            });
            void Logger.warn(
                'CanalPrivadoPersistenciaCommand',
                `Usuário ${userId} não tem um canal privado.`,
            );
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

            const status = newPersistenteValue
                ? Config.getLang(
                      'commands.canalprivado_persistencia.status_messages.persistencia_ativada',
                  )
                : Config.getLang(
                      'commands.canalprivado_persistencia.status_messages.persistencia_desativada',
                  );

            await intr.reply({
                content: Config.getLang(
                    'commands.canalprivado_persistencia.status_messages.persistencia_toggled',
                )
                    .replace('{{channelName}}', privateChannelName)
                    .replace('{{status}}', String(status)), // Garantir que status seja uma string
                ephemeral: true,
            });

            // Logando a alteração
            Logger.info(
                'CanalPrivadoPersistenciaCommand',
                `Persistência do canal ${privateChannelName} alterada para: ${String(newPersistenteValue ? 'Ativada' : 'Desativada')}`,
            ); // Garantir que o valor de persistente seja string
        } catch (error) {
            await intr.reply({
                content: Config.getLang(
                    'commands.canalprivado_persistencia.error_messages.persistencia_error',
                ),
                ephemeral: true,
            });
            void Logger.error(
                'CanalPrivadoPersistenciaCommand',
                `Erro ao alternar persistência para o usuário ${userId}: ${String(error)}`,
            );
        }
    }
}
