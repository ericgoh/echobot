var restify = require('restify');
var builder = require('botbuilder');

// Get secrets from server environment
var botConnectorOptions = { 
    appId: process.env.BOTFRAMEWORK_APPID, 
    appPassword: process.env.BOTFRAMEWORK_APPSECRET
};

// Create bot
var connector = new builder.ChatConnector(botConnectorOptions);
var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.send("Hello, how can I help you?");
        session.beginDialog('rootMenu');
    },
    function (session, results) {
        session.endConversation("Goodbye until next time...");
    }
]);

// Add root menu dialog
bot.dialog('rootMenu', [
    function (session) {
        builder.Prompts.choice(session, "Choose an option:", 'English|Bahasa Melayu');
    },
    function (session, results) {
        switch (results.response.index) {
            case 0:
                session.beginDialog('EnglishDialog');
                break;
            case 1:
                session.beginDialog('BahasaDialog');
                break;
            default:
                session.endDialog();
                break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('rootMenu');
    }
]).reloadAction('showMenu', null, { matches: /^(menu|back)/i });

// Add root menu dialog
bot.dialog('EnglishDialog', [
    function (session) {
        builder.Prompts.choice(session, "What would you like to do?", 'Check qouta balance|Talk to a person');
    },
    function (session, results) {
        switch (results.response.index) {
            case 0:
		session.send("Your qouta balance is 10.9 GB");
                session.endDialog();
                break;
            case 1:
                session.send("Please wait while we connect you to a person.");
                session.endDialog();
                break;
            default:
                session.endDialog();
                break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('rootMenu');
    }
])

// Add root menu dialog
bot.dialog('BahasaDialog', [
    function (session) {
        builder.Prompts.choice(session, "Sila pilih keperluan anda?", 'Semak baki qouta|Cakap dengan orang');
    },
    function (session, results) {
        switch (results.response.index) {
            case 0:
		session.send("Baki qouta ialah 10.9 GB");
                session.endDialog();
                break;
            case 1:
                session.send("Sila tunggu sementara kami menghubungkan anda kepada seseorang.");
                session.endDialog();
                break;
            default:
                session.endDialog();
                break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('rootMenu');
    }
])


// Setup Restify Server
var server = restify.createServer();

// Handle Bot Framework messages
server.post('/api/messages', connector.listen());

// Serve a static web page
server.get(/.*/, restify.serveStatic({
	'directory': '.',
	'default': 'index.html'
}));

server.listen(process.env.port || 3978, function () {
    console.log('%s listening to %s', server.name, server.url); 
});
