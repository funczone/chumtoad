const CommandBlock = require("../../modules/CommandBlock");
const { MessageEmbed } = require("discord.js");
const { DateTime } = require("luxon");
const fetch = require("node-fetch");
const SteamID = require("steamid");
const { countries } = require("../../data/countries-states-cities.min.json");

module.exports = [
    new CommandBlock({
        identity: ["steam", "steamid"],
        description: "Gets someones Steam profile information.",
        usage: "[SteamID or custom URL]"
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
            // check if its a vanity url via another api endpoint
            const resp = await fetch(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${apikey}&vanityurl=${id}`);
            const json = await resp.json();
            if(!json.response || json.response.success !== 1) {
                return message.channel.send(`<:_:${negative}> This is not a valid SteamID or custom URL!`);
            }
            steamID = new SteamID(json.response.steamid);
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
        
        // private profile
        if(profile.communityvisibilitystate !== 3) {
            embed.setFooter("This profile is private.");

        // no community profile
        } else if(!profile.profilestate) {
            embed.setFooter("This user has not set up their Steam Community profile.");

        // public profile
        } else if(profile.communityvisibilitystate === 3) {
            // some of these aren't given in the api response.
            if(profile.realname) {
                description += `Real Name:   ${profile.realname}\n`;
            }
            
            // location stuff
            let country;
            if(profile.loccountrycode) {
                country = countries.find((obj) => obj.code == profile.loccountrycode);
                description += `Country:     ${country ? country.name : profile.loccountrycode}\n`;
            }
            let state;
            if(profile.locstatecode) {
                state = country.states.find((obj) => obj.code === profile.locstatecode);
                description += `State:       ${state ? state.name : profile.locstatecode}\n`;
            }
            let city;
            if(profile.loccityid) {
                city = state.cities.find((obj) => obj.id === profile.loccityid);
                description += `City:        ${city ? city.name : profile.loccityid}\n`;
            }
            description += `Created:     ${DateTime.fromMillis(profile.timecreated * 1000).toLocaleString(DateTime.DATETIME_MED)}\n`;
            
            // for some reason this *only sometimes* is not included in the response.
            if(profile.personastate == 0 && profile.lastlogoff) {
                description += `Last online: ${DateTime.fromMillis(profile.lastlogoff * 1000).toLocaleString(DateTime.DATETIME_MED)}\n`;
            }
            embed.setFooter("This profile is public.");
        }

        // calculate steam ids
        description = description + [
            `---`,
            `SteamID:     ${steamID.getSteam2RenderedID(true)}`,
            `SteamID3:    ${steamID.getSteam3RenderedID()}`,
            `SteamID64:   ${profile.steamid}`,
        ].join("\n");
        description = description + `\`\`\``;
        embed.setDescription(description);

        // launch
        return message.channel.send(embed);
    }),
];
