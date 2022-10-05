const CommandBlock = require("../../modules/CommandBlock");
const os = require("os");
const log = require("../../modules/log");
const { spawn } = require("child_process");

const lua = {
    "win32": "",
    "linux": "/usr/bin/lua"
}

module.exports = new CommandBlock({
    names: ["lua"],
    description: "Evaluates lua code.",
    locked: ["hosts", "lua"],
    usage: "[lua]",
}, function(client, message, content, args) {
    if(os.platform() == "win32") {
        return message.reply(`${client.reactions.negative.emote} The lua command is not yet supported on Windows systems yet.`);
    }

    const shell = spawn(lua[os.platform()]);
    [shell.stdout, shell.stderr].forEach((e) => {
        e.on("data", (d) => {
            d = d.toString(); // buffer shits
            if(e === shell.stdout) {
                log.debug(`Lua eval from ${message.author.tag} resulted in:`, d);
            } else if(e === shell.stderr) {
                log.error(`Lua eval from ${message.author.tag} caused an error:`, d);
            }
            message.reply({ content: `\`\`\`lua\n${d}\`\`\``, allowedMentions: { parse: [] } });
        })
    });

    let cmds = content.split(/\r?\n/);
    for(let i = 0; i < cmds.length; i++) shell.stdin.write(cmds[i].trim() + "\n");
    shell.stdin.end();
});
