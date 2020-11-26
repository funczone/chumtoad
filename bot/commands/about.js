const CommandBlock = require("../../modules/CommandBlock");
const Discord = require("discord.js");
const moment = require("moment");

const description = `Hey! I'm a bot that manages func.zone. I hold the essential commands that are necessary for the server.
This bot is owned and operated by **<@183740622484668416>**, powered by **[node.js](https://nodejs.org/en/) v${process.versions["node"]}**, **[discord.js](https://discord.js.org) v${Discord.version}**, and **[sandplate](https://github.com/06000208/sandplate)**.`;

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
    .addField("Statistics", `• **Uptime:** ${moment.duration(client.uptime).humanize()}\n• **Guilds:** ${client.guilds.cache.size}\n• **Users:** ${client.users.cache.size}`);
  return message.channel.send(embed);
});
