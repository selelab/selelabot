module.exports = {
    name: 'serverinfo',
    description: 'Return the server information',
    execute(message, args) {
        message.channel.send(`Server name: ${message.guild.name}\nTotal members: ${message.guild.memberCount}`);
    },
};