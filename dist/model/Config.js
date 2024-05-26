"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const Loader_1 = require("../util/Loader");
const ALLOWED_NODE_ENV = ['development', 'production'];
class Config {
    constructor(NODE_ENV = process.env.NODE_ENV) {
        this.NODE_ENV = NODE_ENV;
        this.validateEnv();
        this.loadConfig();
    }
    validateEnv() {
        if (!ALLOWED_NODE_ENV.includes(this.NODE_ENV)) {
            throw new Error(`Invalid NODE_ENV value: ${this.NODE_ENV}. It must be either 'development' or 'production'.`);
        }
    }
    loadConfig() {
        console.log(`Loading ${this.NODE_ENV} config....`);
        try {
            const configLoader = Loader_1.Loader.JSON(`../config/${this.NODE_ENV}.json`);
            Config.setConfig(configLoader);
        }
        catch (err) {
            throw new Error(`The ${this.NODE_ENV} configuration file is missing....`);
        }
    }
    static getConfig(opt) {
        if (opt)
            return this._config[opt];
        return this._config;
    }
    static setConfig(config) {
        this._config = config;
    }
    static getLang(prop, lang = 'pt_BR') {
        if (Object.keys(this._language[lang]).length === 0) {
            const langData = Loader_1.Loader.JSON(`../lang/${lang}.json`);
            this._language[lang] = langData;
        }
        const data = this._language[lang];
        const result = prop
            .split('.')
            .reduce((v, c) => {
            if (v && typeof v === 'object' && v[c] !== undefined) {
                return v[c];
            }
            return undefined;
        }, data);
        if (typeof result === 'string' || typeof result === 'number') {
            return result.toString();
        }
        throw new Error(`"${prop}" must be a string or number`);
    }
}
exports.Config = Config;
Config._language = {
    pt_BR: {},
};
//# sourceMappingURL=Config.js.map