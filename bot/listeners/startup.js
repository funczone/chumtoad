const ListenerBlock = require("../../modules/ListenerBlock");
const log = require("../../modules/log");
const { MessageEmbed } = require("discord.js");
const { has } = require("lodash");
const { DateTime } = require("luxon");

const snowflake = new RegExp("^(\\d{17,21})$");

module.exports = new ListenerBlock({
    event: "ready",
    once: true,
}, async function(client) {
    // This code runs after the bot is online and workable, as this is a listener for the ready event
    // But it will only run once, so it's safe to use for things such as scheduling tasks or other one time operations

    // Add bot owner to hosts usergroup.
    // If the hosts group is an empty array, this won't happen on the assumption its intentional.
    if (client.storage.get("users.hosts") === null) {
        const app = await client.application.fetch();
        // This supports teams, but only the team's owner.
        // If anyone wants to implement real support for team members, it would be appreciated.
        const owner = has(app, "owner.members") ? app.owner.ownerID : app.owner.id;
        client.storage.set("users.hosts", [owner]);
        log.info(`Added the bot's owner "${owner}" to the hosts user group.`);
    }

    // Notify the channel log of liveliness.
    const clogging = client.config.get("commands.channellogging");
    if(clogging.enabled) {
        const guild = await client.guilds.fetch(clogging.guild);
        if(guild.available) {
            const embed = new MessageEmbed()
                .setTitle(`\uD83C\uDF89 Bot is now fully functional!`)
                .setColor("#43B581")
                .setFooter({ text: `${DateTime.now().toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}` });
            const channel = guild.channels.cache.get(clogging.channel);
            channel.send({ embeds: [embed] });
        }
    }

    // Set up client.reactions object, so we dont have to get it from the config every time.
    // Each reaction has an `emote` (safe for chat usage) and `id` (safe for internal usage) key.
    client.reactions = {};
    const reactions = client.config.get("metadata.reactions");
    for(const [key, value] of Object.entries(reactions)) {
        client.reactions[key] = {};
        if(snowflake.test(value)) {
            client.reactions[key].emote = `<:_:${value}>`;
        } else {
            client.reactions[key].emote = value;
        }
        client.reactions[key].id = value;
    }

    log.info("App is now fully functional!");
});
