// :D
const { Rcon } = require("rcon-client");

async function main() {
    const server = new Rcon({ host: "74.91.124.160", port: 27015, password: "KYnsT3Pzeya96aJa" });
    
    server.on("connect", () => console.log("connected"));
    server.on("authenticated", () => console.log("authenticated"));
    server.on("end", () => console.log("end"));

    await server.connect();

    console.log(await server.send("status"));

    server.end();
}

main().catch(console.error);