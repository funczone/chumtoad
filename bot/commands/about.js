const CommandBlock = require("../../modules/CommandBlock");
const Discord = require("discord.js");
const { DateTime, Duration } = require("luxon");
const { gitinfo } = require("../../modules/miscellaneous");

const description = [
  `Hey! I'm a bot that manages [func.zone](https://func.zone). I hold the commands that are necessary for the servers functioning. If you have any questions or requests about/for it, contact my owner.\n`,
  `This bot is owned and operated by **<@183740622484668416>**, powered by **[node.js](https://nodejs.org/en/) v${process.versions["node"]}**, **[discord.js](https://discord.js.org) v${Discord.version}**, and **[sandplate](https://github.com/06000208/sandplate)**.`
].join("\n");

module.exports = new CommandBlock({
  identity: ["about"],
  description: "Prints information about the bot.",
}, async function(client, message, content, args) {
  const embed = new Discord.MessageEmbed()
    .setTitle(`Hello, I am ${client.user.username}.`)
    .setColor(client.config.get("metadata.color").value())
    .setDescription(description)
    .attachFiles(["assets/chumtoad.png"])
    .setThumbnail("attachment://chumtoad.png")
    .addField("Statistics", `• **Uptime:** ${Duration.fromMillis(client.uptime).toISOTime()}\n• **Guilds:** ${client.guilds.cache.size}\n• **Users:** ${client.users.cache.size}`)
    .setFooter(`Commit ${gitinfo("%h")} @ ${DateTime.fromMillis(parseInt(gitinfo("%ct")) * 1000).toLocaleString(DateTime.DATETIME_SHORT)}`);
  return message.channel.send(embed);
});
