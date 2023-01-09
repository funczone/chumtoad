const CommandBlock = require("../../modules/CommandBlock");
const { gitinfo, humanizeDuration } = require("../../modules/miscellaneous");
const package = require("../../package.json");
const { MessageEmbed } = require("discord.js");
const djsver = require("discord.js").version;
const { DateTime } = require("luxon");

module.exports = [
    new CommandBlock({
        names: ["about"],
        description: "Displays information about the bot.",
        clientPermissions: ["ATTACH_FILES"],
    }, async function(client, message, content, args) {
        const embed = new MessageEmbed()
            .setTitle(`Hello, I am ${client.user.username}.`)
            .setColor(client.config.get("metadata.color"))
            .setDescription([
                `<:_:1027246168259952641> Hello! I'm a bot that manages various functions and features on the [func.zone](https://func.zone) Discord server. If you have any questions, comments or concerns, please contact my owner, **<@183740622484668416>**.\n`,
                `\u26A1 Powered by **[node.js](https://nodejs.org/en/) v${process.versions["node"]}**, **[discord.js](https://discord.js.org) v${djsver}**, and **${package.name} v${package.version}**.\n`
            ].join("\n"))
            .setThumbnail("attachment://chumtoad.png")
            .addFields([
                {
                    name: "Statistics",
                    value: [
                        `• **Uptime:** ${humanizeDuration(client.uptime)}`,
                        `• **Cached guilds:** ${client.guilds.cache.size}`,
                        `• **Cached users:** ${client.users.cache.size}`,
                    ].join("\n")
                }
            ])
            .setFooter({ text: `Commit ${gitinfo("%h")} @ ${DateTime.fromMillis(parseInt(gitinfo("%ct")) * 1000).toLocaleString(DateTime.DATETIME_SHORT)}` });
        return message.reply({ embeds: [embed], files: ["assets/chumtoad.png"], allowedMentions: { repliedUser: false } });
    })
];
