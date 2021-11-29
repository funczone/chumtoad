const { query } = require("gamedig");
const { MessageEmbed } = require("discord.js");
const CommandBlock = require("../../modules/CommandBlock");

const autofill = {
  "ttt": { ip: "ttt.func.zone", port: 27015, protocol: "garrysmod" },
  "tf2": { ip: "tf2.func.zone", port: 27015, protocol: "tf2" },
  "tftober": { ip: "tf2.func.zone", port: 27016, protocol: "tf2" }
}

let description = "Querys source engine servers.\`\`\`markdown\n# AUTOFILL OPTIONS\nUse one of the strings in turquoise to quickly query one of our servers.\n";
for(const key in autofill) {
  let i = autofill[key];
  description += `* [ ${key} ][ ${i.ip}${i.port ? ":" + i.port : ""} ]\n`;
}
description += "```";

module.exports = new CommandBlock({
    identity: ["query", "q"],
    description: description,
    usage: "ip:port",
    scope: ["dm", "text", "news"],
    nsfw: false,
    locked: false,
    clientPermissions: ["VIEW_CHANNEL", "SEND_MESSAGES"],
    userPermissions: null,
  }, async function(client, message, content, [ip, port]) {
    const online = client.config.get("metadata.reactions.online").value();
    const offline = client.config.get("metadata.reactions.offline").value();
    const negative = client.config.get("metadata.reactions.negative").value();

    if(!ip) return message.channel.send(`<:_:${negative}> You must input a server IP or an autofill server. Perform \`help ${this.firstName}\` for more information.`);
    ip = ip.toLowerCase();

    let qi = autofill[ip];
    if(qi) {
      ip = qi.ip;
      port = qi.port;
    } else if(ip.match(/:/g)) {
      let split = ip.split(":");
      ip = split[0];
      port = split[split.length - 1];
    }

    const vanity = ip + (port ? `:${port}` : "");
    const embed = new MessageEmbed();

    let info;
    try {
      info = await query({
        type: qi.protocol || "protocol-valve",
        host: ip,
        port: port || "27015"
      });
    } catch(e) { 
      embed.setTitle(vanity);
      embed.setColor("#F04747")
      embed.setFooter("This server is offline.", `https://cdn.discordapp.com/emojis/${offline}.png`);
      return message.channel.send(embed);
    }

    embed.setColor("#43B581")
    embed.setFooter("This server is online!", `https://cdn.discordapp.com/emojis/${online}.png`);

    embed.setTitle(info.name);
    embed.addField(`Basic Info`, `IP: \`${vanity}\`\nConnect: steam://connect/${vanity}`);

    let players = "";
    info.players.sort((a, b) => (a.score < b.score) ? 1 : -1);
    for(i = 0; i < info.players.length; i++) {
      let ply = info.players[i];
      players += `${i + 1}. ${ply.name ? `${ply.name} (${ply.score})` : "Joining in..."}\n`;
    }
    if(!players) {
      players = "Dead server. :(";
    }
    embed.addField(`Current Players (${info.players.length} / ${info.maxplayers}${info.players.length >= info.maxplayers ? " - full!" : ``})`, players);
    embed.addField(`Current Map`, `\`${info.map}\``);

    if(qi && qi.protocol === "garrysmod") {
        embed.setImage(`http://func.site.nfoservers.com/assets/mp/${info.map}.jpg`);
    }

    return message.channel.send(embed);
  }
);
