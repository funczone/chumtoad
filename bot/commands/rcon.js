const CommandBlock = require("../../modules/CommandBlock");
const { Rcon } = require("rcon-client");

module.exports = [
  new CommandBlock({
    identity: ["rcon"],
    description: "Creates an rcon query to the func.zone TTT server.",
    usage: "[rcon command]",
    locked: ["hosts", "staff"]
  }, async function(client, message, content, args) {
    const positive = client.config.get("metadata.reactions.positive").value();
    const negative = client.config.get("metadata.reactions.negative").value();

    const ip = client.config.get("commands.rcon.ip").value();
    const pass = client.config.get("commands.rcon.pass").value();
    if(!ip || !pass) return message.channel.send(`<:_:${negative}> You need to configure the rcon IP and password.`);

    const server = new Rcon({ host: ip, port: 27015, password: pass });
    
    //server.on("connect", () => console.log("connected"));
    //server.on("authenticated", () => console.log("authenticated"));
    //server.on("end", () => console.log("end"));

    let result;
    try {
      await server.connect();
      result = await server.send(content);
    } catch(e) {
      message.react(negative);
      return message.channel.send(`<:_:${negative}> An error occured;\`\`\`\n${e.message}\`\`\``);
    }

    if(result.length > 1993) result = result.substring(0, 1990) + "...";
    message.react(positive);
    message.channel.send(`\`\`\`\n${result}\`\`\``);

    return server.end();
  })
];

/* 
in the future, dealing with other servers;
- create a command that lists and allows individual users to cycle between servers.
  - for example, "chum rconsv tf2" would let *that* user target the tf2 server.
  - "chum rconsv list" would list every possible server 
*/