const CommandBlock = require("../../modules/CommandBlock");
const log = require("../../modules/log");
const { spawn } = require("child_process");

module.exports = new CommandBlock({
    identity: "lua",
    description: "Evaluates lua code.",
    scope: ["dm", "text", "news"],
    locked: ["hosts", "lua"],
    usage: "[lua code]",
    clientPermissions: ["VIEW_CHANNEL", "SEND_MESSAGES"],
}, function(client, message, content, args) {
    const positive = client.config.get("metadata.reactions.positive").value();
    const negative = client.config.get("metadata.reactions.negative").value();

    const shell = spawn("/usr/bin/lua");
    shell.stdout.on("data", (d) => {
        d = d.toString(); // buffer shits
        message.channel.send(`\`\`\`lua\n${d}\`\`\``);
    });
    shell.stderr.on("data", (d) => {
        d = d.toString();
        message.channel.send(`\`\`\`\n${d}\`\`\``);
    });

    let cmds = content.split(/\r?\n/);
    for(let i = 0; i < cmds.length; i++) shell.stdin.write(cmds[i].trim() + "\n");
    shell.stdin.end();
});
