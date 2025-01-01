interface LogPayload {
    content: string;
    username?: string;
    avatar_url?: string;
}

export class Logger {
    private static webhookUrl: string;

    // Construtor da classe Logger, recebe o URL do webhook como parâmetro
    public static init(webhookUrl: string): void {
        if (!webhookUrl || !Logger.isValidUrl(webhookUrl)) {
            throw new Error('Invalid webhook URL');
        }
        Logger.webhookUrl = webhookUrl;
    }

    // Método para validar se a URL é válida
    private static isValidUrl(url: string): boolean {
        const regex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
        return regex.test(url);
    }

    // Método para enviar o log via webhook
    // private static async sendLog(payload: LogPayload): Promise<void> {
    //     try {
    //         // Envia o payload para o webhook
    //         await axios.post(Logger.webhookUrl, payload);
    //     } catch (error) {
    //         console.error(
    //             'Erro ao enviar log para o webhook. Talvez limite atingido',
    //         );
    //     }
    // }

    // Método comum para gerar a mensagem de log
    private static createLogMessage(
        level: string,
        event: string,
        description: string,
    ): string {
        const timestamp = new Date().toISOString();
        return `[${level}] [${timestamp}] ${event}: ${description}`;
    }

    // Método para exibir o log no console
    private static logToConsole(level: string, message: string): void {
        switch (level) {
            case 'INFO':
                console.log(message);
                break;
            case 'WARN':
                console.warn(message);
                break;
            case 'ERROR':
                console.error(message);
                break;
            default:
                console.log(message);
                break;
        }
    }

    // Função para logar com nível 'info'
    public static info(event: string, description: string): void {
        const message = Logger.createLogMessage('INFO', event, description);

        // Exibe no console
        Logger.logToConsole('INFO', message);

        // await Logger.sendLog({ content: message });
    }

    // Função para logar com nível 'warn'
    public static warn(event: string, description: string): void {
        const message = Logger.createLogMessage('WARN', event, description);

        // Exibe no console
        Logger.logToConsole('WARN', message);

        // Envia para o webhook
        // Logger.sendLog({ content: message });
    }

    // Função para logar com nível 'error'
    public static error(event: string, description: string): void {
        const message = Logger.createLogMessage('ERROR', event, description);

        // Exibe no console
        Logger.logToConsole('ERROR', message);

        // Envia para o webhook
        // await Logger.sendLog({ content: message });
    }

    // Função adicional para enviar logs personalizados com nome de usuário e avatar
    public static customLog(
        event: string,
        description: string,
        username: string,
        avatarUrl: string,
    ): void {
        const message = Logger.createLogMessage('CUSTOM', event, description);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const payload: LogPayload = {
            content: message,
            username,
            avatar_url: avatarUrl,
        };

        // Exibe no console
        Logger.logToConsole('CUSTOM', message);

        // Envia para o webhook
        // await Logger.sendLog(payload);
    }
}
