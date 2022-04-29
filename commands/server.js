module.exports = {
    name: 'server',
    description: 'Return the server information',
    execute(message, args) {
        if (args[0] === 'name') {
            message.channel.send(`Server name: ${message.guild.name}`);
        } else if (args[0] === 'member') {
            message.channel.send(`Total members: ${message.guild.memberCount}`);
        } else if (!args[0]) {
            message.reply({
                content: '本コマンドの実行には引数が必要です。どうにかしてください',
                allowedMentions: { repliedUser: true }
            });
        } else {
            message.reply({
                content: `引数 "${args[0]}" は本コマンドに存在しません`,
                allowedMentions: { repliedUser: true }
            });
        }
    },
};