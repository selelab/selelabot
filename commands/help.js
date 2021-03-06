const fs = require('fs');
const log4js = require('log4js');
const path = require('path');

log4js.configure(path.join(__dirname, "../setting/log4js.config.json")); //log4jsの設定の読み込み
const logger = log4js.getLogger();
const { command_prefix } = JSON.parse(fs.readFileSync('./setting/env.json'));

module.exports = {
    name: 'help',
    description: 'List all of the commands or info about a specific command.',
    aliases: ['commands'],
    usage: '[command name]',
    cooldown: 5,
    execute(message, args) {
        const data = [];
        const { commands } = message.client;

        if (!args.length) {
            data.push('Here\'s a list of all my commands:');
            data.push(commands.map(command => command.name).join(', '));
            data.push(`\nYou can send \`${command_prefix}help [command name]\` to get info on a specific command!`);

            return message.author.send(data, { split: true })
                .then(() => {
                    if (message.channel.type === 'DM') return;
                    message.reply({
                        content: 'I\'ve sent you a DM with all my commands!',
                        allowedMentions: { repliedUser: true }
                    });
                })
                .catch(error => {
                    logger.error(`Could not send help DM to ${message.author.tag}.\n`, error);
                    message.reply({
                        content: 'it seems like I can\'t DM you! Do you have DMs disabled?',
                        allowedMentions: { repliedUser: true }
                    });
                });
        }

        const name = args[0].toLowerCase();
        const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));

        if (!command) {
            return message.reply({
                content: 'that\'s not a valid command!',
                allowedMentions: { repliedUser: true }
            });
        }

        data.push(`**Name:** ${command.name}`);

        if (command.aliases) data.push(`**Aliases:** ${command.aliases.join(', ')}`);
        if (command.description) data.push(`**Description:** ${command.description}`);
        if (command.usage) data.push(`**Usage:** ${command_prefix}${command.name} ${command.usage}`);

        data.push(`**Cooldown:** ${command.cooldown || 3} second(s)`);

        message.channel.send(data, { split: true });
    },
};
