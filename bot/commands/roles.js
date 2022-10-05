const CommandBlock = require("../../modules/CommandBlock");
const roleStorage = ["local", "default", "roles"]; // Location of where the roles are being stored in the storage database.

/**
 * A list of system groups that are allowed to modify roles within the bot and func.zone.
 * If its equal to "*", everyone will be able to modify roles.
 * @readonly
 * @type {(string|Array)}
 */
const roleadmins = ["hosts", "staff"];
const isroleadmin = (userID, groups) => {
    if(isroleadmin == "*") return true;
    for(const group of roleadmins) {
        if(Array.isArray(groups[group]) && groups[group].includes(userID)) return true;
    }
    return false;
};

/**
 * Returns true if the user is restricted from using the role. 
 * @param {Object} member 
 * @param {Object} role 
 * @param {string} search - If true, searches if the member is specifically *disallowed*, rather than if the user is allowed in some other case. 
 */
const isrestricted = (member, role) => {
    let userID = member.id;
    let userroles = member.roles.cache;

    // are they specifically allowed
    if(Array.isArray(role.allowed.users) ? role.allowed.users.includes(userID) : role.allowed.users === "*") return false;
    if(!!(role.allowed.roles.filter(v => userroles.has(v)).length)) return false;

    // are they specifically disallowed
    if(Array.isArray(role.disallowed.users) ? role.disallowed.users.includes(userID) : role.disallowed.users === "*") return true;
    if(!!(role.disallowed.roles.filter(v => userroles.has(v)).length)) return true;

    // we've tested every case so they're good to go
    return false;
}

// Attemps to automatically generate "names" for each role.
const snakeCase = str => str.replace(/\W+/g, " ").split(/ |\B(?=[A-Z])/).map(word => word.toLowerCase()).join('_');    

module.exports = [
    new CommandBlock({
        names: ["role"],
        summary: "Allows you to join or leave a role.\nUsers and roles can also be disallowed and allowed to roles. If you're disallowed from a role, you cannot join it unless you're *specifically* allowed to use it via user ID or role ID.\nTo see roles you can actually join, perform the \`roles\` command.",
        usage: "[join (role name)] [leave (role name)] [restrictions (role name)]",
        funconly: true
    }, async function(client, message, content, [subcommand, role, alias]) {
        if(!client.storage.has(roleStorage).value()) {
            client.storage.set(roleStorage, []).write();
        }

        const roleadmin = isroleadmin(message.author.id, client.storage.get("users").value());

        if(!subcommand) {
            return message.reply(`${client.reactions.negative.emote} You must input a subcommand! Perform \`help ${this.firstName}\` for more information.`);
        } else if(!role) {
            return message.reply(`${client.reactions.negative.emote} You must input a role ID or a role name! Perform \`help ${this.firstName}\` for more information.`);
        }

        subcommand = subcommand.toLowerCase();
        role = role.replace(/[\\<>@#&!]/g, "").toLowerCase();
        alias = (alias || "").replace(/[\\<>@#&!]/g, "").toLowerCase();

        let roleobj = client.storage.get(roleStorage).find({ name: role }).value() || client.storage.get(roleStorage).find({ id: role }).value();
        let idtype = message.guild.roles.cache.has(alias) ? "roles" : message.guild.members.cache.has(alias) ? "users" : alias === "*" ? "wildcard" : null;

        switch(subcommand) {
            case "join": // chum role join ttt_alarm
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

            case "leave": // chum role leave ttt_alarm
                if(!roleobj) {
                    return message.reply(`${client.reactions.negative.emote} This role hasn't been set up with the bot.`);
                } else if(!message.member.roles.cache.has(roleobj.id)) {
                    return message.reply(`${client.reactions.negative.emote} You don't have this role.`);
                }

                message.member.roles.remove(roleobj.id);
                message.react(client.reactions.positive.id);
                break;

            case "add": // chum role add 736017975080910910
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
                            "roles": [], /** @type {(string|Array)} */
                            "users": []    /** @type {(string|Array)} */
                        },
                        "allowed": {
                            "roles": [], /** @type {(string|Array)} */
                            "users": []    /** @type {(string|Array)} */
                        }
                    };
                    client.storage.get(roleStorage).push(_roleobj).write();

                    message.react(client.reactions.positive.id);
                    return message.reply({ content: `${client.reactions.positive.emote} Successfully added role \`${rolename}\`!`, allowedMentions: { parse: [] } });
                }
                break;

            case "remove": // chum role remove ttt_alarm
                if(roleadmin) {
                    if(!roleobj) {
                        return message.reply(`${client.reactions.negative.emote} This role hasn't been set up with the bot.`);
                    }

                    client.storage.get(roleStorage).remove({ name: roleobj.name }).write();
                    message.react(client.reactions.positive.id);
                    return message.reply({ content: `${client.reactions.positive.emote} Successfully removed role \`${roleobj.name}\`!`, allowedMentions: { parse: [] } });
                }
                break;

            case "disallow":
            case "restrict":
            case "addrestriction": // chum role disallow ttt_alarm 183740622484668416
                if(roleadmin) {
                    if(!roleobj) {
                        return message.reply(`${client.reactions.negative.emote} This role hasn't been set up with the bot.`);
                    } else if(!idtype) {
                        return message.reply(`${client.reactions.negative.emote} This ID isn't of a user or role.`);
                    }

                    // check if its already disallowed (for this to be the case this id *should* appear in one of the arrays)
                    if(idtype == "roles") {
                        if(Array.isArray(roleobj.disallowed.roles) && roleobj.disallowed.roles.includes(alias)) {
                            return message.reply(`${client.reactions.negative.emote} This role is already restricted!`);
                        }

                        let val = roleobj.disallowed.roles;
                        if(val instanceof String) val = [];
                        val.push(alias);

                        client.storage.get(roleStorage).find({ name: role }).set(["disallowed", "roles"], val).write();
                        message.react(client.reactions.positive.id);
                        return message.reply({ content: `${client.reactions.positive.emote} Disallowed role \`${roleobj.name}\` to role \`${alias}\`.`, allowedMentions: { parse: [] } });
                    
                    } else if(idtype == "users") {
                        if(Array.isArray(roleobj.disallowed.users) && roleobj.disallowed.users.includes(alias)) return message.reply(`${client.reactions.negative.emote} This user is already restricted!`);
                        
                        let val = roleobj.disallowed.users;
                        if(val instanceof String) val = [];
                        val.push(alias);

                        client.storage.get(roleStorage).find({ name: role }).set(["disallowed", "users"], val).write();
                        message.react(client.reactions.positive.id);
                        return message.reply({ content: `${client.reactions.positive.emote} Disallowed role \`${roleobj.name}\` to role \`${alias}\`.`, allowedMentions: { parse: [] } });
                 
                    } else {
                        client.storage.get(roleStorage).find({ name: role }).set(["disallowed", "roles"], "*")
                            .set(["disallowed", "users"], "*")
                            .set(["allowed", "roles"], [])
                            .set(["allowed", "users"], []).write();

                        message.react(client.reactions.positive.emote);
                        return message.reply({ content: `${client.reactions.positive.emote} Disallowed role \`${roleobj.name}\` for everyone.`, allowedMentions: { parse: [] } });
                    }
                }
                break;

            case "allow":
            case "unrestrict":
            case "removerestriction": // chum role allow ttt_alarm 183740622484668416
                if(roleadmin) {
                    if(!roleobj) {
                        return message.reply(`${client.reactions.negative.emote} This role hasn't been set up with the bot.`);
                    } else if(!idtype) {
                        return message.reply(`${client.reactions.negative.emote} This ID isn't of a user or role.`);
                    }

                    // check if its already allowed (for this to be the case this id *should* appear in one of the arrays)
                    if(idtype == "roles") {
                        if(Array.isArray(roleobj.allowed.roles) && roleobj.allowed.roles.includes(alias)) return message.reply(`${client.reactions.negative.emote} This role is already restricted!`);
                        
                        let val = roleobj.allowed.roles;
                        if(val instanceof String) val = [];
                        val.push(alias);
                        
                        client.storage.get(roleStorage).find({ name: role }).set(["allowed", "roles"], val);
                        message.react(client.reactions.positive.id);
                        return message.reply({ content: `${client.reactions.positive.emote} Allowed role \`${roleobj.name}\` to role \`${alias}\`.`, allowedMentions: { parse: [] } });
                    
                    } else if(idtype == "users") {
                        if(Array.isArray(roleobj.allowed.users) && roleobj.allowed.users.includes(alias)) return message.reply(`${client.reactions.negative.emote} This user is already restricted!`);
                        
                        let val = roleobj.allowed.users;
                        if(val instanceof String) val = [];
                        val.push(alias);
                        
                        client.storage.get(roleStorage).find({ name: role }).set(["allowed", "users"], val);
                        message.react(client.reactions.positive.id);
                        return message.reply({ content: `${client.reactions.positive.emote} Allowed user \`${roleobj.name}\` to role \`${alias}\`.`, allowedMentions: { parse: [] } });
                    
                    } else {
                        client.storage.get(roleStorage).find({ name: role }).set(["disallowed", "roles"], [])
                            .set(["disallowed", "users"], [])
                            .set(["allowed", "roles"], [])
                            .set(["allowed", "users"], []).write();
                        message.react(client.reactions.positive.id);
                        return message.reply({ content: `${client.reactions.positive.emote} Allowed role \`${roleobj.name}\` to everyone.`, allowedMentions: { parse: [] } });
                    }
                }
                break;

            case "rename": // chum role rename ttt_alarm tttalarm
                if(roleadmin) {
                    if(!roleobj) {
                        return message.reply(`${client.reactions.negative.emote} This role hasn't been set up with the bot.`);
                    } else if(!alias) {
                        return message.reply(`${client.reactions.negative.emote} You must input a new role name!`);
                    }

                    const existant = client.storage.get(roleStorage).find({ name: alias }).value();
                    if(existant) return message.reply(`${client.reactions.negative.emote} This name is already in use!`)

                    client.storage.get(roleStorage).find({ name: role }).set("name", alias).write();
                    message.react(client.reactions.positive.id);
                    return message.reply({ content: `${client.reactions.positive.emote} Renamed role \`${role}\` to \`${alias}\`.`, allowedMentions: { parse: [] } });
                }
                break;

            // theres probably a better way of doing this but i want the braindead way please
            case "restrictions": // chum role restrictions ttt_alarm
                if(!roleobj) {
                    return message.reply(`${client.reactions.negative.emote} This role hasn't been set up with the bot.`);
                }

                let ids = [];
                let str = "```diff\n";
                str += "+ USERS ALLOWED: ";
                if(Array.isArray(roleobj.allowed.users)) {
                    for(const value of roleobj.allowed.users) {
                        try {
                            let tag = await message.guild.members.fetch(value).then(m => m.user.tag);
                            ids.push(`@${tag}`);
                        } catch(e) {
                            ids.push(value);
                        }
                    }
                    str += ids.join(", ");
                } else if(roleobj.allowed.users == "*") str += "*";

                ids = [];
                str += "\n- USERS DISALLOWED: ";
                if(Array.isArray(roleobj.disallowed.users)) {
                    for(const value of roleobj.disallowed.users) {
                        try {
                            let tag = await message.guild.members.fetch(value).then(m => m.user.tag);
                            ids.push(`@${tag}`);
                        } catch(e) {
                            ids.push(value);
                        }
                    }
                    str += ids.join(", ");
                } else if(roleobj.disallowed.users == "*") str += "*";

                ids = [];
                str += "\n\n+ ROLES ALLOWED: ";
                if(Array.isArray(roleobj.allowed.roles)) {
                    for(const value of roleobj.allowed.roles) {
                        try {
                            let rolename = await message.guild.roles.fetch(value).then(r => r.name);
                            ids.push(rolename);
                        } catch(e) {
                            ids.push(value);
                        }
                    }
                    str += ids.join(", ");
                } else if(roleobj.allowed.roles == "*") str += "*";

                ids = [];
                str += "\n- ROLES DISALLOWED: ";
                if(Array.isArray(roleobj.disallowed.roles)) {
                    for(const value of roleobj.disallowed.roles) {
                        try {
                            let rolename = await message.guild.roles.fetch(value).then(r => r.name);
                            ids.push(rolename);
                        } catch(e) {
                            ids.push(value);
                        }
                    }
                    str += ids.join(", ");
                } else if(roleobj.disallowed.roles == "*") str += "*";

                str += "```";
                message.reply({ content: str, allowedMentions: { parse: [] } });
                break;
        }
    }),
    new CommandBlock({
        names: ["roles", "listroles"],
        description: "Lists the roles you are able to join.",
        funconly: true
    }, async function(client, message, content, args) {
        let roles = [];
        client.storage.get(roleStorage).filter(v => !isrestricted(message.member, v)).forEach(r => {
            roles.push(r.name);
        }).value();
        return message.reply({ content: `Roles available to you are;\`\`\`\n${roles.join(", ")}\`\`\``, allowedMentions: { parse: [] } });
    })
];
    