const CommandBlock = require("../../modules/CommandBlock");
const { Rcon } = require("rcon-client");

module.exports = [
  new CommandBlock({
    identity: ["rcon"],
    description: "Creates an rcon query to the func.zone TTT server.\n\nConfigure the rcon connection by evaluating the following;```js\nclient.config.set(\"commands.rcon.ip\", \"< your ip address >\").write();\nclient.config.set(\"commands.rcon.pass\", \"< your rcon password >\").write();\nclient.config.set(\"commands.rcon.port\", \"< your rcon port >\").write();```", // @todo this is so lazy
    usage: "[rcon command]",
    locked: ["hosts", "staff"]
  }, async function(client, message, content, args) {
    const positive = client.config.get("metadata.reactions.positive").value();
    const negative = client.config.get("metadata.reactions.negative").value();

    const ip = client.config.get("commands.rcon.ip").value();
    const pass = client.config.get("commands.rcon.pass").value();
    const port = client.config.get("commands.rcon.port").value();
    if(!ip || !pass || !port) {
      return message.channel.send(`<:_:${negative}> You need to configure the rcon IP, password, and port.`);
    }

    const server = new Rcon({ host: ip, port: port, password: pass });

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
