/**
 * @todo 01/08/23
 * this deserves a serious rewrite at some point, this is messy across the board. its better than it was but holy shit lmao
 * as of writing im simply rewriting it such that it is functional with JSONManager over lowdb - it works very well as a command but its still trash tho
 */

const CommandBlock = require("../../modules/CommandBlock");
const roleStorageDir = ["local", "roles"]; // Location of where the roles are being stored in the storage database.
const { find, remove, findIndex } = require("lodash");

/**
 * A list of system groups that are allowed to modify roles within the bot and func.zone.
 * If its equal to "*", everyone will be able to modify roles.
 * @readonly
 * @type {(string|string[])}
 */
const roleadmins = ["hosts", "staff"];

/**
 * Determines if the userID is a part of the above groups.
 * @param {string} userID The user ID.
 * @param {Object} groups The groups to test on.
 * @returns 
 */
const isroleadmin = (userID, groups) => {
    if(isroleadmin == "*") return true;
    for(const group of roleadmins) {
        if(Array.isArray(groups[group]) && groups[group].includes(userID)) return true;
    }
    return false;
};

/**
 * Returns true if the user is restricted from using the role. 
 * @param {Object} member The member to search for.
 * @param {Object} role The role to search on.
 */
const isrestricted = (member, role) => {
    let userID = member.id;
    let userroles = member.roles.cache;

    // are they specifically allowed
    if(Array.isArray(role.allowed.users) ? role.allowed.users.includes(userID) : role.allowed.users === "*") return false;
    if(Array.isArray(role.allowed.roles) ? !!(role.allowed.roles.filter(v => userroles.has(v)).length) : role.allowed.roles === "*") return false;

    // are they specifically disallowed
    if(Array.isArray(role.disallowed.users) ? role.disallowed.users.includes(userID) : role.disallowed.users === "*") return true;
    if(Array.isArray(role.disallowed.roles) ? !!(role.disallowed.roles.filter(v => userroles.has(v)).length) : role.disallowed.roles === "*") return true;

    // we've tested every case so they're good to go
    return false;
}

// Attemps to automatically generate "names" for each role.
const snakeCase = str => str.replace(/\W+/g, " ").split(/ |\B(?=[A-Z])/).map(word => word.toLowerCase()).join('_');    

module.exports = [
    new CommandBlock({
        names: ["role"],
        summary: "Allows you to join or leave a role.\nUsers and roles can also be disallowed and allowed to join certain roles. If you're disallowed from a role, you cannot join it unless you're *specifically* allowed to use it via user ID or role ID.\nTo see roles you can actually join, perform \`role list\`. \`roles\` is an alias of this command.",
        usage: "[join [role_name]] [leave [role_name]] [restrictions [role_name]] [list]",
        guilds: "661830624797261824",
    }, async function(client, message, content, [subcommand, role, alias, ...args]) {
        if(!client.storage.has(roleStorageDir)) {
            client.storage.set(roleStorageDir, []);
        }

        const roleadmin = isroleadmin(message.author.id, client.storage.get("users"));

        if(!subcommand) {
            return message.reply(`${client.reactions.negative.emote} You must input a subcommand! Perform \`help ${this.firstName}\` for more information.`);
        } else if(!role && subcommand !== "list") {
            return message.reply(`${client.reactions.negative.emote} You must input a role ID or a role name! Perform \`help ${this.firstName}\` for more information.`);
        }

        subcommand = subcommand.toLowerCase();
        role = (role || "").replace(/[\\<>@#&!]/g, "").toLowerCase();
        alias = (alias || "").replace(/[\\<>@#&!]/g, "").toLowerCase();

        const roleStorage = client.storage.get(roleStorageDir);
        const roleobj = find(roleStorage, { name: role }) || find(roleStorage, { id: role });
        const idtype = message.guild.roles.cache.has(alias) ? "roles" : message.guild.members.cache.has(alias) ? "users" : alias === "*" ? "wildcard" : null;

        switch(subcommand) {
            case "join":
            case "add": { // chum role join ttt_alarm
                if(!roleobj) {
                    return message.reply(`${client.reactions.negative.emote} This role hasn't been set up with the bot.`);
                } else if(message.member.roles.cache.has(roleobj.id)) {
                    return message.reply(`${client.reactions.negative.emote} You already have this role.`);
                } else if(isrestricted(message.member, roleobj)) {
                    return message.reply(`${client.reactions.negative.emote} You are restricted from joining this role.`);
                }

                message.member.roles.add(roleobj.id);
                message.react(client.reactions.positive.id);
                break;
            }

            case "leave":
            case "remove": { // chum role leave ttt_alarm
                if(!roleobj) {
                    return message.reply(`${client.reactions.negative.emote} This role hasn't been set up with the bot.`);
                } else if(!message.member.roles.cache.has(roleobj.id)) {
                    return message.reply(`${client.reactions.negative.emote} You don't have this role.`);
                }

                message.member.roles.remove(roleobj.id);
                message.react(client.reactions.positive.id);
                break;
            }

            case "create":
            case "create_role": { // chum role create 736017975080910910
                if(roleadmin) {
                    const guildroles = message.guild.roles.cache;
                    if(!guildroles.has(role)) {
                        return message.reply(`${client.reactions.negative.emote} This role doesn't exist on the server.`);
                    }

                    const rolename = snakeCase(guildroles.get(role).name);
                    let _roleobj = {
                        "name": rolename,
                        "id": role,
                        "disallowed": {
                            "roles": [], /** @type {(string|string[])} */
                            "users": []  /** @type {(string|string[])} */
                        },
                        "allowed": {
                            "roles": [], /** @type {(string|string[])} */
                            "users": []  /** @type {(string|string[])} */
                        }
                    };
                    roleStorage.push(_roleobj);
                    client.storage.set(roleStorageDir, roleStorage);

                    message.react(client.reactions.positive.id);
                    return message.reply({ content: `${client.reactions.positive.emote} Successfully added role \`${rolename}\` to the selection!`, allowedMentions: { parse: [] } });
                }
                break;
            }

            case "delete":
            case "delete_role": { // chum delete remove ttt_alarm
                if(roleadmin) {
                    if(!roleobj) {
                        return message.reply(`${client.reactions.negative.emote} This role hasn't been set up with the bot.`);
                    }

                    remove(roleStorage, { name: roleobj.name });
                    client.storage.set(roleStorageDir, roleStorage);
                    message.react(client.reactions.positive.id);
                    return message.reply({ content: `${client.reactions.positive.emote} Successfully removed role \`${roleobj.name}\` from the selection!`, allowedMentions: { parse: [] } });
                }
                break;
            }

            case "disallow":
            case "restrict":
            case "addrestriction": { // chum role disallow ttt_alarm 183740622484668416
                if(roleadmin) {
                    if(!roleobj) {
                        return message.reply(`${client.reactions.negative.emote} This role hasn't been set up with the bot.`);
                    } else if(!idtype) {
                        return message.reply(`${client.reactions.negative.emote} This ID isn't of a user or role.`);
                    }

                    // wildcard case
                    if(idtype === "wildcard") {
                        roleobj.disallowed.roles = "*";
                        roleobj.disallowed.users = "*";
                        roleobj.allowed.roles = [];
                        roleobj.allowed.users = [];                        
                        client.storage.set([...roleStorageDir, findIndex({ name: roleobj.name })], roleobj);

                        message.react(client.reactions.positive.emote);
                        return message.reply({ content: `${client.reactions.positive.emote} Disallowed role \`${roleobj.name}\` for everyone!`, allowedMentions: { parse: [] } });
                    }

                    const r = idtype === "roles";
                    const inspected = r ? roleobj.disallowed.roles : roleobj.disallowed.users;

                    // check if its already disallowed (this id shouldn't appear in either of the arrays)
                    if(
                        idtype === "roles" && (Array.isArray(inspected) && inspected.includes(alias)) ||
                        idtype === "users" && (Array.isArray(inspected) && inspected.includes(alias))
                    ) {
                        return message.reply(`${client.reactions.negative.emote} This ${r ? "role" : "user"} is already restricted!`);
                    }

                    // perform the action
                    let removed_wildcard;
                    if(inspected instanceof String) {
                        removed_wildcard = true;
                        inspected = []
                    };
                    inspected.push(alias);

                    // put er back in the obj
                    if(r) {
                        roleobj.disallowed.roles = inspected;
                    } else {
                        roleobj.disallowed.users = inspected;
                    }

                    // set the storage object
                    client.storage.set([...roleStorageDir, findIndex({ name: roleobj.name })], roleobj);
                    message.react(client.reactions.positive.id);
                    return message.reply({
                        content: [
                            `${client.reactions.positive.emote} Disallowed role \`${roleobj.name}\` to ${r ? "Discord role" : "user"} \`${alias}\`.`,
                            removed_wildcard ? "**Warning:** A *full restriction* wildcard predicate was removed for this role - make sure permissions are what you expect them to be!" : undefined
                        ].filter((e) => e !== undefined).join("\n"),
                        allowedMentions: { parse: [] }
                    });
                }
                break;
            }

            case "allow":
            case "unrestrict":
            case "removerestriction": { // chum role allow ttt_alarm 183740622484668416
                if(roleadmin) {
                    if(!roleobj) {
                        return message.reply(`${client.reactions.negative.emote} This role hasn't been set up with the bot.`);
                    } else if(!idtype) {
                        return message.reply(`${client.reactions.negative.emote} This ID isn't of a user or role.`);
                    }

                    // wildcard case
                    if(idtype === "wildcard") {
                        roleobj.disallowed.roles = [];
                        roleobj.disallowed.users = [];
                        roleobj.allowed.roles = [];
                        roleobj.allowed.users = [];

                        client.storage.set([...roleStorageDir, findIndex({ name: roleobj.name })], roleobj);
                        message.react(client.reactions.positive.id);
                        return message.reply({ content: `${client.reactions.positive.emote} Allowed role \`${roleobj.name}\` to everyone.`, allowedMentions: { parse: [] } });
                    }

                    const r = idtype === "roles";
                    const inspected = r ? roleobj.allowed.roles : roleobj.allowed.users;

                    // check if its already allowed (this id should appear in either of the arrays)
                    if(
                        idtype === "roles" && (Array.isArray(inspected) && inspected.includes(alias)) ||
                        idtype === "users" && (Array.isArray(inspected) && inspected.includes(alias))
                    ) {
                        return message.reply(`${client.reactions.negative.emote} This ${r ? "Discord role" : "user"} is already allowed!`);
                    }

                    // perform the action
                    let removed_wildcard;
                    if(inspected instanceof String) {
                        removed_wildcard = true;
                        inspected = []
                    };
                    inspected.push(alias);

                    // put er back in the obj
                    if(r) {
                        roleobj.allowed.roles = inspected;
                    } else {
                        roleobj.allowed.users = inspected;
                    }

                    // set the storage object
                    client.storage.set([...roleStorageDir, findIndex({ name: roleobj.name })], roleobj);
                    message.react(client.reactions.positive.id);
                    return message.reply({
                        content: [
                            `${client.reactions.positive.emote} Allowed role \`${roleobj.name}\` to ${r ? "Discord role" : "user"} \`${alias}\`.`,
                            removed_wildcard ? "**Warning:** A *full restriction* wildcard predicate was removed for this role - make sure permissions are what you expect them to be!" : undefined
                        ].filter((e) => e !== undefined).join("\n"),
                        allowedMentions: { parse: [] }
                    });
                }
                break;
            }

            case "rename": {// chum role rename ttt_alarm tttalarm
                if(roleadmin) {
                    if(!roleobj) {
                        return message.reply(`${client.reactions.negative.emote} This role hasn't been set up with the bot.`);
                    } else if(!alias) {
                        return message.reply(`${client.reactions.negative.emote} You must input a new role name!`);
                    }

                    const exists = find(roleStorage, { name: alias });
                    if(exists) {
                        return message.reply(`${client.reactions.negative.emote} This name is already in use by ID \`${exists.id}\`!`);
                    }
                    roleobj.name = alias;

                    client.storage.set([...roleStorageDir, findIndex({ name: role })], roleobj);
                    message.react(client.reactions.positive.id);
                    return message.reply({
                        content: `${client.reactions.positive.emote} Renamed role \`${role}\` to \`${alias}\`.`,
                        allowedMentions: { parse: [] }
                    });
                }
                break;
            }

            case "restricted":
            case "restrictions": { // chum role restrictions ttt_alarm
                if(!roleobj) {
                    return message.reply(`${client.reactions.negative.emote} This role hasn't been set up with the bot.`);
                }

                /** Helper function for generating the restriction text. */
                const buildString = async (group, isRole = false) => {
                    let str = "";
                    if(Array.isArray(group)) {
                        const ids = [];
                        for(const value of roleobj.allowed.users) {
                            try {
                                if(isRole) {
                                    const role = await message.guild.roles.fetch(value);
                                    ids.push(role.name);
                                } else {
                                    const member = await message.guild.members.fetch(value);
                                    ids.push(`@${member.user.tag}`); 
                                }
                            } catch(e) {
                                ids.push(value);
                            }
                        }
                        str += ids.join(", ");
                    } else {
                        str += group;
                    }
                    return str || "N/A";
                }

                let str = "```diff\n";
                str += `+ USERS ALLOWED: ${await buildString(roleobj.allowed.users)}\n`;
                str += `- USERS DISALLOWED: ${await buildString(roleobj.disallowed.users)}\n\n`;
                str += `+ ROLES ALLOWED: ${await buildString(roleobj.allowed.roles)}\n`;
                str += `- ROLES DISALLOWED: ${await buildString(roleobj.disallowed.roles)}\n`;
                str += "```";
                message.reply({ content: str, allowedMentions: { parse: [] } });
                break;
            }

            case "l":
            case "ls":
            case "list": {
                const roles = [];
                for(const role of roleStorage) {
                    if(!isrestricted(message.member, role)) {
                        roles.push(role.name);
                    }
                }
                return message.reply({
                    content: `Roles available to you are;\`\`\`\n${roles.join(", ")}\`\`\``,
                    allowedMentions: { parse: [] }
                });
            }
        }
    }),
    new CommandBlock({
        names: ["roles", "listroles"],
        description: "Lists the roles you are able to join.\n\nThis command is an alias of the `role list` subcommand.",
        guilds: "661830624797261824",
    }, async function(client, message, content, args) {
        return client.commands.runByName("role", message, "list", ["list"]);
    })
];
