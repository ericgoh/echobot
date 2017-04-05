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
        builder.Prompts.choice(session, "What would you like to do?", 'Check qouta balance|Topup Account|Talk to a person');
    },
    function (session, results) {
        switch (results.response.index) {
            case 0:
		session.send("Your qouta balance is 10.9 GB");
                session.endConversation("Goodbye until next time...1");
                break;
	    case 1:
                session.beginDialog('TopupDialog');
                break;
            case 2:
                session.send("Please wait while we connect you to a person.");
                session.endConversation("Goodbye until next time...2");
                break;
            default:
                session.endDialog();
                break;
        }
    }
])

// Add root menu dialog
bot.dialog('TopupDialog', [
    function (session) {
        builder.Prompts.choice(session, "Which topup do you want?", '8GB - 7 Days - RM10|10GB - 7 Days - RM12|20GB - 7 Days - RM20');
    },
    function (session, results) {
        switch (results.response.index) {
            case 0:
                session.endConversation("You successfully topup 8GB - 7 Days - RM10");
                break;
	    case 1:
                session.endConversation("You successfully topup 10GB - 7 Days - RM12");
                break;
            case 3:
                session.endConversation("You successfully topup 20GB - 7 Days - RM20");
                break;
            default:
                session.endDialog();
                break;
        }
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
                session.endConversation("Goodbye until next time...3");
                break;
            case 1:
                session.send("Sila tunggu sementara kami menghubungkan anda kepada seseorang.");
                session.endConversation("Goodbye until next time...4");
                break;
            default:
                session.endDialog();
                break;
        }
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
