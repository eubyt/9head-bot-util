"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandCreator = void 0;
const discord_js_1 = require("discord.js");
const Config_1 = require("../model/Config");
class CommandCreator {
    BasicEmbed(user) {
        return new discord_js_1.EmbedBuilder()
            .setTimestamp()
            .setFooter({
            text: user.id,
            iconURL: user.avatarURL()?.toString(),
        })
            .setColor(Config_1.Config.getConfig('Embed').default);
    }
    getJSON() {
        let json = {
            name: this.name,
            type: 1,
            description: this.description,
            options: this.options,
        };
        if (this.name_localizations) {
            json = { name_localizations: this.name_localizations, ...json };
        }
        if (this.description_localizations) {
            json = {
                description_localizations: this.description_localizations,
                ...json,
            };
        }
        return json;
    }
}
exports.CommandCreator = CommandCreator;
//# sourceMappingURL=CommandBot.js.map