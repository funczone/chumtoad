const CommandBlock = require("../../modules/CommandBlock");
const os = require("os");
const log = require("../../modules/log");
const { spawn } = require("child_process");

const lua = {
    "win32": "",
    "linux": "/usr/bin/lua"
}

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

    if(os.platform() == "win32") {
        return message.channel.send(`<:_:${negative}> The lua command is not supported on windows yet.`);
    }

    const shell = spawn(lua[os.platform()]);
    [shell.stdout, shell.stderr].forEach((e) => {
        e.on("data", (d) => {
            d = d.toString(); // buffer shits
            message.channel.send(`\`\`\`lua\n${d}\`\`\``);
        })
    });

    let cmds = content.split(/\r?\n/);
    for(let i = 0; i < cmds.length; i++) shell.stdin.write(cmds[i].trim() + "\n");
    shell.stdin.end();
});
