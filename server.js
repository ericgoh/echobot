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
        builder.Prompts.choice(session, "What would you like to do?", 'Check qouta balance|Latest Promo|Topup Account|Talk to a person');
    },
    function (session, results) {
        switch (results.response.index) {
            case 0:
	 	//post https to get qouta balance
		//provide me your msisdn + verification icno
		session.send("Your qouta balance is 10.9 GB");
                session.endConversation("Goodbye until next time...1");
                break;
	    case 1:
			 var cards = getCardsAttachments();

		    // create reply with Carousel AttachmentLayout
		    var reply = new builder.Message(session)
			.attachmentLayout(builder.AttachmentLayout.carousel)
			.attachments(cards);

    		session.send(reply);
		break;
	    case 2:
                session.beginDialog('TopupDialog');
                break;
            case 3:
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
		//provide me your msisdn
		//generate payment link 
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

function getCardsAttachments(session) {
    return [
        new builder.HeroCard(session)
            .title('Azure Storage')
            .subtitle('Offload the heavy lifting of data center management')
            .text('Store and help protect your data. Get durable, highly available data storage across the globe and pay only for what you use.')
            .images([
                builder.CardImage.create(session, 'https://docs.microsoft.com/en-us/azure/storage/media/storage-introduction/storage-concepts.png')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/services/storage/', 'Learn More')
            ]),

        new builder.ThumbnailCard(session)
            .title('DocumentDB')
            .subtitle('Blazing fast, planet-scale NoSQL')
            .text('NoSQL service for highly available, globally distributed apps—take full advantage of SQL and JavaScript over document and key-value data without the hassles of on-premises or virtual machine-based cloud database options.')
            .images([
                builder.CardImage.create(session, 'https://docs.microsoft.com/en-us/azure/documentdb/media/documentdb-introduction/json-database-resources1.png')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/services/documentdb/', 'Learn More')
            ]),

        new builder.HeroCard(session)
            .title('Azure Functions')
            .subtitle('Process events with a serverless code architecture')
            .text('An event-based serverless compute experience to accelerate your development. It can scale based on demand and you pay only for the resources you consume.')
            .images([
                builder.CardImage.create(session, 'https://azurecomcdn.azureedge.net/cvt-5daae9212bb433ad0510fbfbff44121ac7c759adc284d7a43d60dbbf2358a07a/images/page/services/functions/01-develop.png')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/services/functions/', 'Learn More')
            ]),

        new builder.ThumbnailCard(session)
            .title('Cognitive Services')
            .subtitle('Build powerful intelligence into your applications to enable natural and contextual interactions')
            .text('Enable natural and contextual interaction with tools that augment users\' experiences using the power of machine-based intelligence. Tap into an ever-growing collection of powerful artificial intelligence algorithms for vision, speech, language, and knowledge.')
            .images([
                builder.CardImage.create(session, 'https://azurecomcdn.azureedge.net/cvt-68b530dac63f0ccae8466a2610289af04bdc67ee0bfbc2d5e526b8efd10af05a/images/page/services/cognitive-services/cognitive-services.png')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/services/cognitive-services/', 'Learn More')
            ])
    ];
}


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
