const dns = require("dns").promises;
const { MessageEmbed, Util } = require("discord.js");
const query = require("source-server-query");
const CommandBlock = require("../../modules/CommandBlock");

const preview = {
    location: "http://func.site.nfoservers.com/assets/mp",
    extension: "jpg"
};

const autofill = {};

let description = "Querys source engine servers.\`\`\`markdown\n# AUTOFILL OPTIONS\nUse one of the strings in turquoise to quickly query one of our servers.\n";
for(const key in autofill) {
    let i = autofill[key];
    description += `* [ ${key} ][ ${i.ip}${i.port ? ":" + i.port : ""} ]\n`;
}
description += "```";

const ipv4 = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)(\.(?!$)|$)){4}$/; // https://stackoverflow.com/a/36760050/17188891

module.exports = new CommandBlock({
    names: ["query", "q", "srcds"],
    description: description,
    usage: "ip:port",
    locked: "hosts",
}, async function(client, message, content, [ip, port]) {
    if(!ip) return message.reply(`${client.reactions.negative.emote} You must input a server IP or an autofill server. Perform \`help ${this.firstName}\` for more information.`);
    ip = ip.toLowerCase();

    let qi = autofill[ip];
    if(qi) {
        ip = qi.ip;
        port = qi.port;
    } else if(ip.match(/:/g)) {
        const split = ip.split(":");
        ip = split[0];
        port = split[split.length - 1];

        let parsed = parseInt(port);
        if(!parsed || (parsed < 0 || parsed > 65535)) {
            port = 27015;
        } else {
            port = parsed;
        }
    } else {
        port = 27015;
    }

    const vanity = (qi && qi.vanity) ? qi.vanity : (ip + (port == 27015 ? "" : `:${port}`));

    if(!ipv4.test(ip)) {
        try {
            ip = await resolveHostname(ip);
        } catch(e) {
            return message.reply(`${client.reactions.negative.emote} An error occured;\`\`\`\n${e.message}\`\`\``)
        }
    }

    const embed = new MessageEmbed();
    let info, players;
    try {
        info = await query.info(ip, port);
        players = await query.players(ip, port);
    } catch(e) {
        embed.setTitle(vanity)
            .setColor("#F04747")
            .setFooter({ text: "This server is offline.", iconURL: `https://cdn.discordapp.com/emojis/${client.reactions.offline.id}.png` });
        return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
    }

    embed.setTitle(info.name)
        .setColor("#43B581")
        .addField(`Basic Info`, `IP: \`${vanity}\`\nConnect: steam://connect/${vanity}`)
        .setFooter({ text: "This server is online!", iconURL: `https://cdn.discordapp.com/emojis/${client.reactions.online.id}.png` });

    let plys = "";
    players.sort((a, b) => (a.score < b.score) ? 1 : -1);
    for(let i = 0; i < players.length; i++) {
        const ply = players[i];
        plys += `${i + 1}. ${ply.name ? `${ply.name} (${ply.score})` : "Joining in..."}\n`;
    }
    if(!plys) plys = "Dead server. :(";
    plys = Util.escapeMarkdown(plys);

    embed.addField(`Current Players (${info.players}/${info.max_players}${info.players >= info.max_players ? " - full!" : ``})`, plys)
        .addField(`Current Map`, `\`${info.map}\``);

    // lil hardcoded preview system. in the future it would be good to use a static image host for this. 
    if(qi && qi.game === "garrysmod") {
        embed.setImage(`${preview.location}/${info.map}.${preview.extension}`);
    }

    return message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
});

/**
 * Resolves an IP from a given hostname.
 * https://stackoverflow.com/a/71580190/17188891
 * @param {string} hostname - The hostname to give it. 
 * @returns {string} The IP, if it could be resolved.
 */
async function resolveHostname(hostname) {
    let obj = await dns.lookup(hostname).catch((error) => {
        throw error;
    });
    if(obj?.address) {
        return obj.address;
    }
    throw new Error("IP could not be resolved.");
}
