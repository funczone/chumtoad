const CommandBlock = require("../../modules/CommandBlock");
const { WebhookClient } = require("discord.js");

/** @todo May want to look into how the bot reacts when it cant `message.delete()` or `message.react()` */
module.exports = [
    new CommandBlock({
        names: ["ping", "latency"],
        summary: "Simple connection test.",
        description: "Provides the time it took to recieve the message. Generally used to check if the bot is responsive.",
    }, async function(client, message, content, args) {
        const msg = await message.reply({ content: "<a:_:597509670210633729>", allowedMentions: { repliedUser: false } });
        msg.edit({ content: `\uD83C\uDFD3 Pong!\nResponse time is \`${msg.createdTimestamp - message.createdTimestamp}ms\`.`, allowedMentions: { repliedUser: false } });
    }),
    new CommandBlock({
        names: ["echo", "e"],
        description: "Echoes text.",
        usage: "(...text)",
        clientChannelPermissions: ["MANAGE_MESSAGES"],
    }, async function(client, message, content, args) {
        await message.channel.send({ content: content || "** **", allowedMentions: { parse: [] } });
        return message.delete();
    })
];
