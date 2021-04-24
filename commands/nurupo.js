const Discord = require('discord.js');

module.exports = {
    name: 'ぬるぽ',
    description: 'ぬるぽ',
    execute(message, args) {
        const exampleEmbed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setDescription('ぬるぽdescription')
            .addFields(
                { name: 1, value: 'ガッ' },
                { name: 2, value: '**ガッ**'},
                { name: 3, value: '~~ガッ~~'},
            )
            .addField('Inline ぬるぽtitle', '``ガッ``', true);
        message.channel.send(exampleEmbed);
        
        // message.channel.send('ガッ');
    },
};