const CommandBlock = require("../../modules/CommandBlock");
const { gitinfo } = require("../../modules/miscellaneous");
const { MessageEmbed } = require("discord.js");
const djsver = require("discord.js").version;
const { DateTime } = require("luxon");

module.exports = new CommandBlock({
    identity: ["about"],
    description: "Prints information about the bot.",
    clientPermissions: ["ATTACH_FILES"],
}, async function(client, message, content, args) {
    const embed = new MessageEmbed()
        .setTitle(`Hello, I am ${client.user.username}.`)
        .setColor(client.config.get("metadata.color").value())
        .setDescription([
            `Hello! I'm a bot that manages the [func.zone](https://func.zone) Discord server and related servers. I hold the commands that are necessary for the servers functioning. If you have any questions, comments, or otherwise, contact my owner, **<@183740622484668416>**.\n`,
            `This bot is powered by **[node.js](https://nodejs.org/en/) v${process.versions["node"]}**, **[discord.js](https://discord.js.org) v${djsver}**, and **[sandplate](https://github.com/06000208/sandplate)**.`
        ].join("\n"))
        .setThumbnail("attachment://chumtoad.png")
        .addField("Statistics", [
            `• **Uptime:** ${getUptime(client.uptime)}`,
            `• **Guilds:** ${client.guilds.cache.size}`,
            `• **Users:** ${client.users.cache.size}`,
        ].join("\n"))
        .setFooter({ text: `Commit ${gitinfo("%h")} @ ${DateTime.fromMillis(parseInt(gitinfo("%ct")) * 1000).toLocaleString(DateTime.DATETIME_SHORT)}` });
    return message.reply({ embeds: [embed], files: ["assets/chumtoad.png"], allowedMentions: { repliedUser: false } });
});

/**
 * Luxons Duration class doesn't format uptimes very well (or at all?) above 24 hours, so this function does that.
 * @param {number} millis - Taken from client.uptime.
 */
const getUptime = (millis) => {
    const periods = [
        ["year",   60 * 60 * 24 * 365 * 1000],
        ["month",  60 * 60 * 24 * 30 * 1000],
        ["day",    60 * 60 * 24 * 1000],
        ["hour",   60 * 60 * 1000],
        ["minute", 60 * 1000],
        ["second", 1000]
    ];
    const strings = []
    for(const period of periods) {
        if(millis > period[1]) {
            let value = Math.floor(millis / period[1])
            strings.push(`${value} ${period[0]}${value >= 1 ? "s" : ""}`);
            millis = millis - (value * period[1])
        }
    }
    return strings.join(", ");
};