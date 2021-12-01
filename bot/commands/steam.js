/* this is the shittiest thing ever and i haven't eaten in 12 hours */
const CommandBlock = require("../../modules/CommandBlock");
const { MessageEmbed } = require("discord.js");
const fetch = require("node-fetch");
const SteamID = require("steamid");

module.exports = [
    new CommandBlock({
        identity: ["steam"],
        description: "Gets someones Steam profile information.",
        usage: "[SteamID]"
    }, async function(client, message, content, [id]) {
        const positive = client.config.get("metadata.reactions.positive").value();
        const negative = client.config.get("metadata.reactions.negative").value();

        const apikey = client.config.get("commands.steam.apikey").value();
        if(!apikey) {
            return message.channel.send(`<:_:${negative}> You need to configure an API key.`);
        }
        if(!id) return message.channel.send(`<:_:${negative}> You must pass in a SteamID to get a users information.`);
        
        let steamID;
        try {
            steamID = new SteamID(id);
        } catch(e) {
            return message.channel.send(`<:_:${negative}> This is not a valid SteamID!`);
        }

        if(!steamID.isValidIndividual()) return message.channel.send(`<:_:${negative}> This SteamID does not correspond to an individuals account!`);

        const resp = await fetch(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apikey}&steamids=${steamID.getSteamID64()}`);
        const json = await resp.json();
        const profile = json.response.players[0];
        require("../../modules/log").debug(JSON.stringify(json, null, 4));

        const embed = new MessageEmbed()
            .setColor("#1b2838")
            .setTitle(`${profile.personaname} \`${steamID.getSteam2RenderedID(true)}\``)
            .setURL(`https://steamcommunity.com/profiles/${profile.steamid}`)
            .setThumbnail(profile.avatarfull);
        
        let description = [
            `\`\`\`\n`,
            profile.profileurl,
            `SteamID64:   ${profile.steamid}`,
            `Status:      ${profile.personastate == 0 ? "Offline" : profile.personastate == 1 ? "Online" : profile.personastate == 2 ? "Busy" : profile.personastate == 3 ? "Away" : profile.personastate == 4 ? "Snooze" : profile.personastate == 5 ? "Looking to Trade" : profile.personastate == 6 ? "Looking to Play" : "Unknown"}\n`
        ].join("\n");
        
        if(profile.communityvisibilitystate === 1) { // private profile
            embed.setFooter("This profile is private.");
        } else if(profile.communityvisibilitystate === 3) { // public profile
            description = description + [
                `Real Name:   ${profile.realname}`,
                `Country:     ${profile.loccountrycode}`,
                `Created:     ${new Date(profile.timecreated * 1000)}`,
                profile.lastlogoff && profile.personastate == 0 ? `Last online: ${new Date(profile.lastlogoff * 1000)}` : undefined,
            ].join("\n");
            embed.setFooter("This profile is public.");
        } else if(!profile.profilestate) {
            embed.setFooter("This user does not have a community profile configured.");
        }
        description = description + `\`\`\``;
        embed.setDescription(description);

        return message.channel.send(embed);
    }),
];
