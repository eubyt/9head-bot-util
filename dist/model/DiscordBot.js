"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordBot = void 0;
const discord_js_1 = require("discord.js");
const Config_1 = require("./Config");
class DiscordBot {
    constructor(data_bot) {
        this.data_bot = data_bot;
    }
    async start() {
        this.registerListeners();
        await this.login();
    }
    // Registro de eventos
    registerListeners() {
        const { client } = this.data_bot;
        client.on(discord_js_1.Events.ClientReady, () => {
            this.onReady();
        });
        client.on(discord_js_1.Events.InteractionCreate, (intr) => {
            this.onInteraction(intr);
        });
        client.on(discord_js_1.Events.VoiceStateUpdate, (oldState, newState) => {
            void this.onVoiceStateUpdate(oldState, newState);
        });
    }
    // Logar o bot
    async login() {
        const { token, client } = this.data_bot;
        try {
            await client.login(token ?? Config_1.Config.getConfig('Config_Discord_BOT').token);
        }
        catch (err) {
            console.log(err);
        }
    }
    onInteraction(intr) {
        const { commandHandle } = this.data_bot;
        if (intr instanceof discord_js_1.CommandInteraction ||
            intr instanceof discord_js_1.AutocompleteInteraction) {
            commandHandle.execute(intr).catch((err) => {
                console.log(err);
            });
        }
    }
    async onVoiceStateUpdate(oldState, newState) {
        const { autoVoiceChannel, privateVoiceChannel } = this.data_bot;
        await privateVoiceChannel.execute(oldState, newState);
        await autoVoiceChannel.execute(oldState, newState);
    }
    onReady() {
        console.log('Client carregado');
    }
}
exports.DiscordBot = DiscordBot;
//# sourceMappingURL=DiscordBot.js.map