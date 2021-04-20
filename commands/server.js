module.exports = {
    name: 'server',
    description: 'Return the server information',
    execute(message, args) {
        if (args[0] === 'name') {
            message.channel.send(`Server name: ${message.guild.name}`);
        } else if (args[0] === 'member') {
            message.channel.send(`Total members: ${message.guild.memberCount}`);
        } else if (!args[0]) {
            message.channel.send('No arguments.');
        } else message.channel.send('Invalid argument.');
    },
};