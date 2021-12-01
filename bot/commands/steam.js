const CommandBlock = require("../../modules/CommandBlock");
const { MessageEmbed } = require("discord.js");
const { DateTime } = require("luxon");
const fetch = require("node-fetch");
const SteamID = require("steamid");

module.exports = [
    new CommandBlock({
        identity: ["steam", "steamid"],
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
        //require("../../modules/log").debug(JSON.stringify(json, null, 4));

        const embed = new MessageEmbed()
            .setColor("#1b2838")
            .setTitle(profile.personaname)
            .setURL(`https://steamcommunity.com/profiles/${profile.steamid}`)
            .setThumbnail(profile.avatarfull);
        
        let description = [
            `\`\`\`yaml\n`,
            profile.profileurl,
            `Status:      ${profile.personastate == 0 ? "Offline" : profile.personastate == 1 ? "Online" : profile.personastate == 2 ? "Busy" : profile.personastate == 3 ? "Away" : profile.personastate == 4 ? "Snooze" : profile.personastate == 5 ? "Looking to Trade" : profile.personastate == 6 ? "Looking to Play" : "Unknown"}\n`
        ].join("\n");
        
        if(profile.communityvisibilitystate !== 3) { // private profile
            embed.setFooter("This profile is private.");
        } else if(!profile.profilestate) { // no community profile
            embed.setFooter("This user has not set up their Steam Community profile.");
        } else if(profile.communityvisibilitystate === 3) { // public profile
            description = description + [
                `Real Name:   ${profile.realname}`,
                `Country:     ${profile.loccountrycode}`,
                `Created:     ${DateTime.fromMillis(profile.timecreated * 1000).toLocaleString(DateTime.DATETIME_MED)}`
            ].join("\n");
            description += "\n";
            if(profile.personastate == 0 && profile.lastlogoff) { // sometimes this isnt given in the api response i dont know why
                description += `Last online: ${DateTime.fromMillis(profile.lastlogoff * 1000).toLocaleString(DateTime.DATETIME_MED)}\n`;
            }
            embed.setFooter("This profile is public.");
        }

        description = description + [
            `---`,
            `SteamID:     ${steamID.getSteam2RenderedID(true)}`,
            `SteamID3:    ${steamID.getSteam3RenderedID()}`,
            `SteamID64:   ${profile.steamid}`,
        ].join("\n");

        description = description + `\`\`\``;
        embed.setDescription(description);

        return message.channel.send(embed);
    }),
];
