const CommandBlock = require("../../modules/CommandBlock");

module.exports = new CommandBlock({
    identity: ["quit", "exit", "shutdown", "logout", "restart", "die", "perish"],
    description: "Logs the bot out, and exits the process. Bot may be auto restarted externally.",
    locked: "hosts",
    clientPermissions: ["USE_EXTERNAL_EMOJIS", "ADD_REACTIONS"]
}, async function(client, message, content, args) {
    await message.react(client.reactions.positive.id);
    client.destroy();
    process.exit(0);
});
