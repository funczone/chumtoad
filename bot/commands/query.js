const query = require("../../modules/source-server-query") // hacky fix
const { MessageEmbed } = require("discord.js");
const CommandBlock = require("../../modules/CommandBlock");

const preview = {
    location: "http://func.site.nfoservers.com/assets/mp",
    extension: "jpg"
};

const autofill = {
    "ttt": { vanity: "ttt.func.zone", ip: "74.91.124.160", port: 27015, game: "garrysmod" },
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

    const vanity = (qi ? qi.vanity : ip) + (port ? `:${port}` : "");
    const embed = new MessageEmbed();

    try {
        const info = await query.info(ip, port, 2000);
        const players = await query.players(ip, port, 2000);
        query.close();

        console.log(info);

        embed.setTitle(info.name);
        embed.setColor("#43B581")
        embed.addField(`Basic Info`, `IP: \`${vanity}\`\nConnect: steam://connect/${vanity}`);
        embed.setFooter("This server is online!", `https://cdn.discordapp.com/emojis/${online}.png`);
        
        let _players = "";
        if(players.length == 0) {
            _players = "Dead server. :(";
        } else {
            players.sort((a, b) => (a.score < b.score) ? 1 : -1);
            for(i = 0; i < players.length; i++) {
                let ply = players[i];
                _players += `${i + 1}. ${ply.name ? `${ply.name} (${ply.score})` : "Joining in..."}\n`;
            }
        }

        embed.addField(`Current Players (${players.length} / ${info.maxplayers}${players.length >= info.maxplayers ? " - full!" : ``})`, _players);
        embed.addField(`Current Map`, `\`${info.map}\``);

        if(qi && qi.game === "garrysmod") {
            embed.setImage(`${preview.location}/${info.map}.${preview.extension}`);
        }

        return message.channel.send(embed);
    } catch(e) {
        console.error(e);
        embed.setTitle(vanity);
        embed.setColor("#F04747")
        embed.setFooter("This server is offline.", `https://cdn.discordapp.com/emojis/${offline}.png`);
        return message.channel.send(embed);
    }
});
