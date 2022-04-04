/* eslint-disable no-unused-vars */
const Client = require("./modules/Client");
const Handler = require("./modules/Handler");
const log = require("./modules/log");
const fse = require("fs-extra");
const { Intents, SnowflakeUtil } = require("discord.js");

// Discord token regex
const tokenRegex = RegExp(/^[\w]{24}\.[\w-]{6}\.[\w-]{27}$/);

// Instantiate client
const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
});

// Token validation (config)
if (client.config.get("client.token").value() !== null) {
    if (tokenRegex.test(client.config.get("client.token").value())) {
        log.info("Token stored at client.token successfully matched token pattern");
    } else {
        const id = SnowflakeUtil.generate();
        log.warn("Token stored at config.bot.token didn't match pattern!");
        fse.ensureFileSync("./data/config.json");
        fse.copySync("./data/config.json", `./data/config.backup.${id}.json`);
        client.config.set("client.token", null).write();
        log.warn(`client.token in config.json reset to null and invalid token backed up to config.backup.${id}.json`);
    }
}

// Token parsing (command line arguments)
const argv = process.argv.slice(2);
if (argv.length !== 0) {
    if (argv.length > 1) log.warn("Regarding command line arguments, the bot only supports using the first argument to pass in a token");
    if (tokenRegex.test(argv[0])) {
        log.info("Command line argument matched token pattern, will attempt to login with it");
        client.cookies["token"] = argv[0];
    } else {
        log.warn("Command line argument didn't match token pattern, the bot won't try to use it");
    }
}

// Initialize bot
const init = async function() {
    log.debug("init");
    const commandLoadResult = await Handler.requireDirectory(client.commands, client.config.get("commands.directory").value());
    const eventLoadResult = await Handler.requireDirectory(client.events, client.config.get("events.directory").value());
    log.info(commandLoadResult.message);
    log.info(eventLoadResult.message);
    // Ground control to major tom
    if (client.cookies["token"] || client.config.get("client.token").value() !== null) {
        client.login(client.cookies["token"] ? client.cookies["token"] : client.config.get("client.token").value());
    } else {
        log.warn("No token available to login with! Please set one in config.json or pass one in as an argument");
        process.exit(0);
    }
};

init();
