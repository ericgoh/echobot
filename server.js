////////////////////////////////////////////////////////////
// Start: To setup the script, Install these packages
// 
// npm install --save botbuilder 
// npm install --save node-rest-client
// npm install --save mathjs
//
////////////////////////////////////////////////////////////

var restify = require('Restify');
var builder = require('botbuilder');
var RestClient = require('node-rest-client').Client;
var restclient = new RestClient();
var math = require('mathjs');
var request = require("request");
var emoji = require('node-emoji');


////////////////////////////////////////////////////////////////////////////
// Global Variables
// Session Data
var LastMenu = 'LastMenu';
var NumOfFeedback = 'NumOfFeedback';
var DialogId = 'DialogId';
var DialogState = 'DialogState';
var imagedir = 'https://yellowchat.azurewebsites.net';
var OneTimePin = 'OneTimePin';
var PhoneNumber = 'PhoneNumber';
var ValidatedTime = 'ValidatedTime';

// Bot Retry Parameters
var MaxRetries = 1;
var MaxRetries_SingleMenu = 0;
var DefaultErrorPrompt = "Err... I didn't get that. Click on any of the above for help.";
var DefaultMaxRetryErrorPrompt = "Err... I didn't get that. Let's start again";
var AnyResponse = "blalala";    // any text
// API Gateway Variables
var ApiGwAuthToken = '';
var ApiGwAuthTokenExpiry = 0;
var ApiGwSmsCounter = 0;

////////////////////////////////////////////////////////////////////////////
// Initialization functions
// Get secrets from server environment
var botConnectorOptions = { 
    appId: process.env.BOTFRAMEWORK_APPID, 
    appPassword: process.env.BOTFRAMEWORK_APPSECRET
};
// Create bot
var connector = new builder.ChatConnector(botConnectorOptions);
var bot = new builder.UniversalBot(connector, [

    function (session) {
        session.beginDialog('menu');
        
        
    },
    function (session, results) {
        session.endConversation("Please type Menu");
    }

]).set('autoBatchDelay',1000);
// Require Functions
bot.library(require('./validators').createLibrary());
// start by getting API Gateway token first
//GetSmsAuthToken();
//GetSmsAuthToken2();
//setTimeout(function () { GenerateOtp3('0163372748');}, 2000);

// Initialize Telemetry Modules
var telemetryModule = require('./telemetry-module.js'); // Setup for Application Insights
var appInsights = require('applicationinsights');
var appInsightsClient = 0;
InitializeAppInsights();

function InitializeAppInsights(){
    try {
        appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY).start();
        appInsightsClient = appInsights.getClient();
    } catch (e) {
        console.log("Not connecting to AppInsights");
    }
}
////////////////////////////////////////////////////////////////////////////



////////////////////////////////////////////////////////////////////////////
// Send welcome when conversation with bot is started, by initiating the root dialog
bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                console.log("identity Added " + identity.id + " Message " + message.address.bot.id + " " + message.address.conversation.id);
                bot.beginDialog(message.address, 'intro');
            }
        });
    }
    if (message.membersRemoved){
        console.log("identity Removed " + identity.id + " Message " + message.address.bot.id + " " + message.address.conversation.id);
        message.membersRemoved.forEach(function (identity) {
            console.log("identity Removed " + identity.id + " Message " + message.address.bot.id + " " + message.address.conversation.id);
        });
    }
});

// Wrapper function for logging
function trackBotEvent(session, description, dialog_state, storeLastMenu) {
//    session.send({ type: 'typing' });   // Send typing to all menu

    // log session.message.address to identify user 
    //var address = JSON.stringify(session.message.address); session.send("User Address=" + address);
    //
    // Result & Sample Data
    //---------------------
    // Sample Data - Conversation 1 - Dialog 1
    //{“id”:”c57nfne1mh9b3leggc”,”channelId”:”emulator”,
    //”user”:{“id”:”default-user”,”name”:”User”},
    //”conversation”:{“id”:”meckjg4870nch9ebf”},
    //”bot”:{“id”:”default-bot”,”name”:”Bot”},
    //”serviceUrl”:”http://localhost:59711","useAuth":false}
    //
    // Sample Data - Conversation 1 - Dialog 2
    //{“id”:”90fea2l3k140jid8f”,”channelId”:”emulator”, // message.id is different for different dialog. 
    //”user”:{“id”:”default-user”,”name”:”User”},
    //”conversation”:{“id”:”meckjg4870nch9ebf”},        // Conversation.id is same for same conversation
    //”bot”:{“id”:”default-bot”,”name”:”Bot”},
    //”serviceUrl”:”http://localhost:59711","useAuth":false}    

    if(storeLastMenu==undefined) {
        session.privateConversationData[LastMenu] = description;
    }
// Logging to Database
//{"command": "update_chat_log",
//"auth_key": "a6hea2",
//"chat_id": "abcde12345",
//"dialog_id":"ateer",
//"dialog_state":"1",   1:mid/end conversation,  0:start conversation
//"dialog_type":"text", "Email" / "Phone Num" / etc
//"dialog_input":"",    "
//"chat_log": "menu|prepaid"}
    
    // @*)(*!)@(*#!@ ) why get local date also need 3 lines of text !)(@*#)(!@*#)()
//    var d = new Date();
//    var offset = (new Date().getTimezoneOffset() / 60) * -1;
//    var nowtime = new Date(d.getTime() + offset).toISOString().replace(/T/, ' ').replace(/\..+/, '');
    if(session.privateConversationData[DialogId] === undefined) {
        session.privateConversationData[DialogId] = session.message.address.id;
    }

    var options = {
        method: 'POST',
        url: process.env.CHATBOT_LOG_URL,
        qs: {       action: 'json' },
        headers: {  'content-type': 'multipart/form-data'   },
        formData: { 
            data: '{\
"command": "update_chat_log",\
"auth_key": "' + process.env.CHATBOT_LOG_AUTH_KEY+ '",\
"chat_id": "'  + session.message.address.conversation.id+ '",\
"dialog_id": "'+ session.privateConversationData[DialogId]+ '",\
"dialog_state":"' + dialog_state + '",\
"dialog_type":"",\
"dialog_input":"",\
"chat_log": "'+session.privateConversationData[LastMenu]+'"}'
        }
    };

    if (process.env.LOGGING>0) {
        try{
            request(options, function (error, response, body) { // Send to DB if this is Production Environment
                if (process.env.DEVELOPMENT) {
                    //console.log("DB Log:" + body);              // Log if this is Production & Development Mode
                }
            })
        } catch (e) {
            if (process.env.DEVELOPMENT) {
                //console.log("cannot log to DB");                // Log if this is Production &Development Environment
            }
        }
    } else {
        console.log("Logging : " + options.formData.data);  // Log if this is Staging Environment
    }
}

const logUserConversation = (event) => { console.log('message: ' + event.text + ', user: ' + event.address.user.name);
};
// Middleware for logging
bot.use({
    receive: function (event, next) {
        logUserConversation(event);
        next();
//    },
//    send: function (event, next) {
//        logUserConversation(event);
//        next();
    }
});

// R - menu
bot.dialog('intro', [
    function (session) {
        // Initialize Session Data
        session.privateConversationData[NumOfFeedback] = 0;
        session.privateConversationData[DialogId] = session.message.address.id;

        trackBotEvent(session, 'intro', 0);
        
        session.send("I'm Yello, your friendly Virtual Assistant and I'll be available from 9pm-12am.");
        session.send("I'm a just newbie and constantly learning to serve you. So please bear with me");
		
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .text('You can ask me anything about Digi\'s products.')
                .buttons([
                    builder.CardAction.imBack(session, "Let's get started", "Let's get started"),
                    builder.CardAction.imBack(session, "Contact our Customer Service", "Contact our Customer Service")
                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt);
        session.replaceDialog('menu');
    }
]);

// R - menu
bot.dialog('menu', [
    function (session) {
        
        if(session.privateConversationData[NumOfFeedback]>2)    // Get Feedback every 2nd transaction
        {
            session.privateConversationData[NumOfFeedback] = 0;
            session.replaceDialog('getFeedback');
        } else {
            session.privateConversationData[NumOfFeedback]++;
            session.replaceDialog('menu2');            
        }
    }
]).triggerAction({
    matches: /^(main menu)|(menu)|(begin)|(Let\'s get started)$/i
});

bot.dialog('byemenu', [
    function (session) {
        session.send("Bye for now.");
        session.send("Thanks for using Yellow");
        session.send("You can always press \"Main Menu\" button above to start over");
            }
]).triggerAction({
    matches: /^(exit)|(quit)|(depart)|(bye)|(goodbye)$/i
});


bot.dialog('ContactCustomerService', [
    function (session) {
		
		var now = new Date();

		if(now.getHours()>9 && now.getHours()<21) {         //between 9pm-12pm
			session.send('Digi Live Chat service is available from 10am to 9pm.');
			var respCards = new builder.Message(session)
				.attachmentLayout(builder.AttachmentLayout.carousel)
				.attachments([
					new builder.HeroCard(session)
					.text('You can also reach Digi via our Community website or e-mail us at help@digi.com.my')
					.buttons([
						builder.CardAction.openUrl(session, 'https://community.digi.com.my/', 'Digi Community Website'),
						builder.CardAction.openUrl(session, 'http://new.digi.com.my/webchat', 'Digi Live Chat')
					])
				]);

		} else {	// outside LiveChat hours
			session.send('Digi Live Chat service will available from 10am to 9pm.');
			var respCards = new builder.Message(session)
				.attachmentLayout(builder.AttachmentLayout.carousel)
				.attachments([
					new builder.HeroCard(session)
					.text('However you can reach Digi via our Community website or e-mail us at help@digi.com.my')
					.buttons([
						builder.CardAction.openUrl(session, 'https://community.digi.com.my/', 'Digi Community Website')
					])
				]);
		}
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }		
]).triggerAction({
    matches: /(Customer Service)|(email)/i
});

bot.dialog('Feedback', [
    function (session) {
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Feedback Form (Internal Testing use only)')
                .subtitle('Thanks for your participation. We would appreciate your feedback')
                .buttons([
                    builder.CardAction.openUrl(session, 'https://goo.gl/forms/giIkIYVHLxL8l2ob2', 'My Feedback')
                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    },
]).triggerAction({
    matches: /^(Feedback)$/i
});


// R - menu
bot.dialog('menu2', [
    function (session) {
        trackBotEvent(session, 'menu', 0);
        
        // Store new unique ID for this conversation's Dialog
        session.privateConversationData[DialogId] = session.message.address.id;
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .text('To get started, these are the things I can help you with. Just click on any of the below and let\'s get started.')
                .buttons([
                    builder.CardAction.imBack(session, "Prepaid", "Prepaid"),
                    builder.CardAction.imBack(session, "Postpaid", "Postpaid"),
                    builder.CardAction.imBack(session, "Broadband", "Broadband"),
                    builder.CardAction.imBack(session, "Roaming", "Roaming"),
                    builder.CardAction.imBack(session, "Frequently Asked Questions", "Frequently Asked Questions"),
                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt);
        session.replaceDialog('menu');
    }
]);


// R.0 - menu|Prepaid
bot.dialog('Prepaid', [
    function (session) {
        trackBotEvent(session, 'menu|Prepaid',1);
        
        session.send("What would you like to find out today?");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Malaysia\'s Best Prepaid Packs')
                .subtitle('Prepaid Plans\n')
                .images([ builder.CardImage.create(session, imagedir + '/images/Prepaid-Plans.PNG') ])
                .buttons([
                    builder.CardAction.imBack(session, "Prepaid Plans", "More")
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),

                new builder.HeroCard(session)
                .title('Add On')
                .subtitle('Stay Connected')
                .images([ builder.CardImage.create(session, imagedir + '/images/Prepaid-Addons.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/prepaid-addons', 'More')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                        
                new builder.HeroCard(session)
                .title('Reload')
                .subtitle('Top-up your credit now!')
                .images([ builder.CardImage.create(session, imagedir + '/images/Prepaid-Reload.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/reload-details.ep', 'More')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Prepaid)|(reload)|(add on|(addon))/i
});

// R.0.0 - menu|Prepaid|PrepaidPlans
bot.dialog('PrepaidPlans', [
    function (session) {
        trackBotEvent(session, 'menu|Prepaid|PrepaidPlans',1);

        session.send("Here are our plans");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Digi Prepaid Live')
                .subtitle('Ultimate Video + Music Pack')
                .images([ builder.CardImage.create(session, imagedir + '/images/Prepaid-Live.png') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20016&isBundle=n&ppymttype=PREPAID&ptype=VOICE&orderType=NL&_ga=1.167919842.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/prepaid/live', 'More Info')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Digi Prepaid Best')
                .subtitle('Unlimited Social Internet Pack')
                .images([ builder.CardImage.create(session, imagedir + '/images/Prepaid-Best.png') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20015&isBundle=n&ppymttype=PREPAID&ptype=VOICE&orderType=NL&_ga=1.94994527.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/prepaid-plans', 'More Info')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Prepaid Plans)|(prepaid live)|(prepaid best)/i
});


// R.1 - menu|Postpaid
bot.dialog('Postpaid', [
    function (session) {
        trackBotEvent(session, 'menu|Postpaid',1);
        
        session.send("What would you like to find out today?");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Digi Postpaid')
                .subtitle('The plans for you')
                .images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-Plans.PNG') ])
                .buttons([
                    builder.CardAction.imBack(session, "Postpaid Plans", "More")
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),

                new builder.HeroCard(session)
                .title('Extras')
                .subtitle('All the extras you need to stay connected')
                .images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-Extra.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/postpaid-addons', 'More')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCards, "blalala", { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Postpaid)|(postpaid extra)/i
});

// R.1.0 - menu|Postpaid|PostpaidPlans
bot.dialog('PostpaidPlans', [
    function (session) {
        trackBotEvent(session, 'menu|Postpaid|PostpaidPlans',1);

        session.send("Here are our plans");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Digi Postpaid 150 Infinite')
                .images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-Infinite.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=DGI150&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=NL&_ga=1.164776316.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=DGI150&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=MNP&_ga=1.164776316.2103412470.1490767162', 'Port In'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=DGI150&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=COP&_ga=1.238199557.426176229.1488446290', 'Change from Prepaid'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/services/change-of-mobile-plans?changePlanName=Digi%20Postpaid%20150%20Infinite', 'Change from Postpaid')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Digi Postpaid 50')
                .images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-50.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10201VPA&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=NL&_ga=1.239507461.769883286.1492574194', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10201VPA&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=MNP&_ga=1.155287800.2103412470.1490767162', 'Port In'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10201VPA&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&_ga=1.64925487.1200425632.1479720347Postpaid&orderType=COP', 'Change from Prepaid'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/services/change-of-mobile-plans?changePlanName=Digi%20Postpaid%2050', 'Change from Postpaid')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Digi Postpaid 80')
                .images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-80.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10200VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=NL&_ga=1.65621101.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10200VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=MNP&_ga=1.92479582.2103412470.1490767162', 'Port In'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10200VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=COP', 'Change from Prepaid'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/services/change-of-mobile-plans?changePlanName=Digi%20Postpaid%2080', 'Change from Postpaid')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Digi Postpaid 110')
                .images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-110.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10202VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=NL&_ga=1.92479582.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10202VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=MNP&_ga=1.94988767.2103412470.1490767162', 'Port In'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10202VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=COP', 'Change from Prepaid'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/services/change-of-mobile-plans?changePlanName=Digi%20Postpaid%20110', 'Change from Postpaid')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});        
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Postpaid Plans)|(infinite)|(postpaid 110)|(postpaid 50)|(postpaid 80)/i
});


// R.2 - menu|Broadband
bot.dialog('Broadband', [
    function (session) {
        trackBotEvent(session, 'menu|Broadband',1);
        
        session.send("What would you like to find out today?");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Digi Broadband')
                .text('Non stop entertainment. \nNow at home')
                .buttons([
                    builder.CardAction.imBack(session, "Broadband Plans", "More")
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Running out of quota? ')
                .text('Boost your nonstop entertainment with Internet Top Up')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://digi.my/mybb', 'More')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});        
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Broadband)/i
});

// R.1.0 - menu|Broadband|BroadbandPlans
bot.dialog('BroadbandPlans', [
    function (session) {
        trackBotEvent(session, 'menu|Broadband|BroadbandPlans',1);

        session.send("Here are our plans");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Broadband 30')
                .subtitle('For prepaid')
                .images([ builder.CardImage.create(session, imagedir + '/images/Broadband-30.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20017&isBundle=n&ppymttype=PREPAID&ptype=BB&_ga=1.55846120.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/broadband', 'More Info')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Broadband 60')
                .subtitle('For Postpaid')
                .images([ builder.CardImage.create(session, imagedir + '/images/Broadband-60.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=90000P&isBundle=y&ppymttype=POSTPAID&ptype=BB&_ga=1.55846120.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/broadband', 'More Info')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Broadband 100')
                .subtitle('For Postpaid')
                .images([ builder.CardImage.create(session, imagedir + '/images/Broadband-100.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=90001P&isBundle=y&ppymttype=POSTPAID&ptype=BB&_ga=1.156903800.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/broadband', 'More Info')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});        
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Broadband Plans)|(broadband 30)|(broadband 60)|(broadband 100)/i
});


// R.3 - menu|Roaming
bot.dialog('Roaming', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming',1);
        
        session.send("What would you like to find out today?");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Roaming Plans')
                .text('Check out your roaming options')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-Plan.PNG') ])
                .buttons([
                    builder.CardAction.imBack(session, "Roaming Plans", "More")
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Roam by country? ')
                .text('Just let us know where you\'re off to')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-Country.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/international-roaming-rates', 'More')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Roaming Tips')
                .text('Here\'s all your need to know to stay connected')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-Tips.PNG') ])
                .buttons([
                    builder.CardAction.imBack(session, "Roaming Tips", "More")
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('IDD Rates')
                .text('International calls and SMS rates')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-Rates.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/international-calls-sms-rates', 'More')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('IDD 133')
                .text('Did you know we offer the lowest IDD rates to 36 countries?')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-133.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/idd-133', 'More')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});        
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Roaming)|(roam)|(idd)|(133)|(overseas)|(travel)/i
});

// R.3.0 - menu|Roaming|RoamingPlans
bot.dialog('RoamingPlans', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingPlans',1);

        session.send("You can roam with the following");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Roam Like Home')
                .subtitle('Some of our postpaid plans allow you to roam for free')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-LikeHome.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/roam-like-home-monthly', 'More')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Roaming Pass')
                .subtitle('Round the clock chatting & Surfing in 50 countries')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-Pass.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/roaming-pass', 'More')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Unlimited Internet')
                .subtitle('Enjoy a hassle free roaming experience')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-UnlimitedInternet.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/unlimited-internet', 'More')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});        
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Roaming Plans)|(roam like home)|(roaming pass)|(roam pass)/i
});

// R.3.1 - menu|Roaming|RoamingTips
bot.dialog('RoamingTips', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips',1);

        session.send("Let's get ready to roam");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Activate Roaming Services')
                .text('How long have you been with Digi? (in months)')
                .buttons([
                    builder.CardAction.imBack(session, "Less than 6", "Less than 6"),
                    builder.CardAction.imBack(session, "More than 6", "More than 6")
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Turn on/off data roaming')
                .subtitle('What is your phone\'s operating system?')
                .buttons([
                    builder.CardAction.imBack(session, "iOS Data Roaming", "iOS"),
                    builder.CardAction.imBack(session, "Android Data Roaming", "Android")
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Purchase / subscribe to Roam Pass')
                .text('Roam Passes are the way to go')
                .buttons([
                    builder.CardAction.imBack(session, "Roaming Pass", "Roaming Pass")
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Usage Tracking')
                .text('You can track your usage while you roam using the following')
                .buttons([
                    builder.CardAction.imBack(session, "MyDigi Roam Usage Tracking", "MyDigi Roam Usage Tracking"),
                    builder.CardAction.imBack(session, "UMB Roam Usage Tracking", "UMB Roam Usage Tracking")
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});        
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Roaming Tips)|(data roaming)/i
});

// R.3.1.0 - menu|Roaming|RoamingTips|ActivateRoamingOver6Months
bot.dialog('ActivateRoamingOver6Months', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|ActivateRoamingOver6Months',1);

        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Self-activate at MyDigi:')
                .text('Go to Plan Settings >\
                \n\n My Subscription >\
                \n\n International Roaming >\
                \n\n click \"Subscribe\" >')
//                .buttons([
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
//                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});        
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(More than 6)/i
});

// R.3.1.1 - menu|Roaming|RoamingTips|ActivateRoamingBelow6Months
bot.dialog('ActivateRoamingBelow6Months', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|ActivateRoamingBelow6Months',1);

        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Walk in to a Digi Store ')
                .text('Please provide us with \
                \n\n ○ Photocopy of NRIC\
                \n\n ○ Valid Passport\
                \n\n ○ Work permit (for non-Malaysian)')
//                .buttons([
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
//                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});        
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Less than 6)/i
});

// R.3.1.2 - menu|Roaming|RoamingTips|iOSDataRoaming
bot.dialog('iOSDataRoaming', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|iOSDataRoaming',1);

        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('iOS Turn on/off data roaming')
                .text('Go to Settings > Mobile Data >\
                \n\n Mobile Data Options > \
                \n\n slide the \"Data Roaming\" ON/OFF')
//                .buttons([
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
//                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});        
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(iOS Data Roaming)/i
});

// R.3.1.3 - menu|Roaming|RoamingTips|AndroidDataRoaming
bot.dialog('AndroidDataRoaming', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|AndroidDataRoaming',1);

        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Android Turn on/off data roaming')
                .text('Go to Settings > Mobile networks > slide the "Data Roaming" ON/OFF')
//                .buttons([
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
//                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});        
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Android Data Roaming)/i
});

// R.3.1.4 - menu|Roaming|RoamingTips|SubscribeRoamingPass
bot.dialog('SubscribeRoamingPass', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|SubscribeRoamingPass',1);

        session.send("Upon Arrival, follow these Steps");
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('Upon arrival, dial *128*5*1*6# and then Press "2" to "Purchase Roaming Top Up"'),
                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('You\'ll receive a confirmation SMS to notify you of successful Roaming Pass purchase'),
                new builder.HeroCard(session)
                .title('Step 4')
                .subtitle('Please manually select the specified/applicable network operator'),
                new builder.HeroCard(session)
                .title('Step 5')
                .subtitle('Turn on Data Roaming or Cellular Data/Mobile Data on your mobile phone and you\'re ready to roam!')
            ]);
//        session.send(respCards);
//        respCards = new builder.Message(session)
//            .attachments([
//                new builder.HeroCard(session)
////                    .buttons([
////                        builder.CardAction.imBack(session, "Main Menu", "Main Menu")])
//                ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});        
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Roaming Pass)|(roam pass)/i
});

// R.3.1.5 - menu|Roaming|RoamingTips|MyDigiCheckRoamUsage
bot.dialog('MyDigiCheckRoamUsage', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|MyDigiCheckRoamUsage',1);

        session.send("You can follow the steps below");
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('On usage page, select "View Details"')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-MyDigi-Step1.png') ]),
                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Select "Internet" for Internet quota balance')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-MyDigi-Step2.png') ]),
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('Select "Voice" for Voice minutes balance')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-MyDigi-Step3.png') ])
            ]);
//        session.send(respCards);
//        respCards = new builder.Message(session)
//            .attachments([
//                new builder.HeroCard(session)
//                    .buttons([
//                        builder.CardAction.imBack(session, "Main Menu", "Main Menu")])
//                ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});        
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(MyDigi Roam Usage Tracking)|(roam usage)|(overseas usage)/i
});

// R.3.1.6 - menu|Roaming|RoamingTips|UmbCheckRoamUsage
bot.dialog('UmbCheckRoamUsage', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|UmbCheckRoamUsage',1);

        session.send("You can follow the steps below");
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-UMB-Step1.png') ])
                .title('Step 1')
                .subtitle('In UMB: Dial *128*5*1*6#'),
                new builder.HeroCard(session)
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-UMB-Step2.png') ])
                .title('Step 2')
                .subtitle('Select 3 for voice minutes balance'),
                new builder.HeroCard(session)
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-UMB-Step3.png') ])
                .title('Step 3')
                .subtitle('View your balance')
            ]);
//        session.send(respCards);
//        respCards = new builder.Message(session)
//            .attachments([
//                new builder.HeroCard(session)
//                    .buttons([
//                        builder.CardAction.imBack(session, "Main Menu", "Main Menu")])
//                ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});        
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(UMB Roam Usage Tracking)|(umb check roaming)/i
});


// R.4 - menu|FrequentlyAskedQuestion
bot.dialog('FrequentlyAskedQuestion', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion',1);
        
        session.send("What would you like to find out today?");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('All About My Account')
                .text('We have the answers to the most asked questions on managing your account')
                .buttons([
                    builder.CardAction.imBack(session, "About My Account", "More")
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),

                new builder.HeroCard(session)
                .title('MyDigi App')
                .text('An app to manage all your account needs. Find out how to use it')
                .buttons([
                    builder.CardAction.imBack(session, "MyDigi App", "More")
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),
                        
                new builder.HeroCard(session)
                .title('Talk Time Services')
                .text('Find out how to request from or give prepaid credit to others')
                .buttons([
                    builder.CardAction.imBack(session, "Talk Time Services", "More")
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ]),

                new builder.HeroCard(session)
                .title('Charges / Billing')
                .text('Got questions on your bills? Maybe we can help')
                .buttons([
                    builder.CardAction.imBack(session, "Charges Billing", "More")
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});        
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Frequently Asked Questions)|(faq)/i
});

// R.4.0 - menu|FrequentlyAskedQuestion|AllAboutMyAccount
bot.dialog('AllAboutMyAccount', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|AllAboutMyAccount',1);

        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .text("All About My Accounts")
                .buttons([
                    builder.CardAction.imBack(session, "How to get my acc no", "How to get my acc no?"),
                    builder.CardAction.imBack(session, "What is my PUK code", "What is my PUK code?"),
                    builder.CardAction.imBack(session, "Change my acc ownership", "Change my acc ownership?"),
                    builder.CardAction.imBack(session, "How to check F&F", "How to check F&F?"),
                    builder.CardAction.imBack(session, "How to add F&F", "How to add F&F?"),
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu"),
                    builder.CardAction.imBack(session, "Account:Next Page", "Next Page")
                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(About My Account)|(account)|(my acc)/i
});

// R.4.0.0 - menu|FrequentlyAskedQuestion|AllAboutMyAccount|GetAccountNo
bot.dialog('GetAccountNo', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|AllAboutMyAccount|GetAccountNo',1);

        session.send("Your account number is available on your bill at the top right hand corner. Eg: 1.356XXXX", 'Main Menu');
        
//        builder.Prompts.choice(session, "Your account number is available on your bill at the top right hand corner. Eg: 1.356XXXX", 'Main Menu', { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Account No)|(Acc No)|(How to get my acc no)/i
});

// R.4.0.1 - menu|FrequentlyAskedQuestion|AllAboutMyAccount|WhatIsMyPuk
bot.dialog('WhatIsMyPuk', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|AllAboutMyAccount|WhatIsMyPuk',1);

        session.send("You can follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('On the MyDigi app, click on Menu'),

                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Click on Settings'),
                        
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('Swipe left to select SIM and you will find your PUK code')
            ]);
//        session.send(respCards);
//        
//        respCards = new builder.Message(session)
//            .attachments([
//                new builder.HeroCard(session)
//                    .buttons([
//                        builder.CardAction.imBack(session, "Main Menu", "Main Menu")])
//                ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(What Is My Puk)|(What is my PUK code)|(puk)/i
});

// R.4.0.2 - menu|FrequentlyAskedQuestion|AllAboutMyAccount|ChangeMyAccOwnership
bot.dialog('ChangeMyAccOwnership', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|AllAboutMyAccount|ChangeMyAccOwnership',1);

        session.send("Change or transfer of ownership? Just head to the nearest Digi Store. Just a reminder - Both parties must be there with NRICs for validation, please.");
//        builder.Prompts.choice(session, "Change or transfer of ownership? Just head to the nearest Digi Store. Just a reminder - Both parties must be there with NRICs for validation, please.", 'Main Menu', { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Change My Account Ownership)|(acc ownership)/i
});

// R.4.0.3 - menu|FrequentlyAskedQuestion|AllAboutMyAccount|CheckFnF
bot.dialog('CheckFnF', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|AllAboutMyAccount|CheckFnF',1);

        session.send("It's literally as easy as 1,2,3.");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('On the MyDigi app, click on Menu'),

                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Click on Settings'),
                        
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('Swipe left to select \'Family & Friends\' to view your list')
            ]);
//        session.send(respCards);
//        
//        respCards = new builder.Message(session)
//            .attachments([
//                new builder.HeroCard(session)
//                    .buttons([
//                        builder.CardAction.imBack(session, "Main Menu", "Main Menu")])
//                ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Check FnF)|(Check Friends and Family)|(How to check F&F)|(friends and family)|(friend and family)|(friend family)|(friends family)/i
});

// R.4.0.5 - menu|FrequentlyAskedQuestion|AllAboutMyAccount|AddFnF
bot.dialog('AddFnF', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|AllAboutMyAccount|AddFnF',1);

        session.send("I can help you with that. Here's how.");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('On the MyDigi app, click on Menu.'),

                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Click on Settings'),
                        
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('Swipe left to select \'Family & Friends\' to view your list.'),
                
                new builder.HeroCard(session)
                .title('Step 4')
                .subtitle('Click on + Key in the phone number')
            ]);
//        session.send(respCards);
//        
//        respCards = new builder.Message(session)
//            .attachments([
//                new builder.HeroCard(session)
//                    .buttons([
//                        builder.CardAction.imBack(session, "Main Menu", "Main Menu")])
//                ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Add FnF)|(Add Friends and Family)|(How to add F&F)/i
});

// R.4.0.6 - menu|FrequentlyAskedQuestion|AllAboutMyAccount2
bot.dialog('AllAboutMyAccount2', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|AllAboutMyAccount2',1);

        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .text("All About My Accounts")
                .buttons([
                    builder.CardAction.imBack(session, "I\'m going overseas", "I\'m going overseas, what can I do?"),
                    builder.CardAction.imBack(session, "How do I activate VOLTE", "How do I activate VOLTE?"),
                    builder.CardAction.imBack(session, "How do I port-in", "How do I port-in?")
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Account:Next Page)/i
});

// R.4.0.6.0 - menu|FrequentlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|GoingOverseas
bot.dialog('GoingOverseas', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|GoingOverseas',1);

        builder.Prompts.choice(session, "For short holidays, stay in touch by activating Roaming Services", 'Roaming', { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.replaceDialog('Roaming');
    }
]).triggerAction({
    matches: /(Going Overseas)|(Activate Roaming)|(I\'m going overseas)/i
});

// R.4.0.6.1 - menu|FrequentlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToActivateVolte
bot.dialog('HowToActivateVolte', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToActivateVolte',1);

        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .subtitle('Please check if your device is compatible and the instructions for activation can be found here')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/services/volte', 'Check'),
                    builder.CardAction.imBack(session, "Activate Volte", "Activate Volte")
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(How to activate Volte)|(How do I activate VOLTE)|(volte)/i
});

// R.4.0.6.1.0 - menu|FrequentlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToActivateVolte|ActivateVolte
bot.dialog('ActivateVolte', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToActivateVolte|ActivateVolte',1);

        session.send("You can follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('Select \"Settings\"'),

                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Select \"Mobile Data\"'),
                        
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('Tap on Mobile Data Options'),
                    
                new builder.HeroCard(session)
                .title('Step 4')
                .subtitle('Select \"Enable 4G\"'),

                new builder.HeroCard(session)
                .title('Step 5')
                .subtitle('Choose Voice & Data to enable VoLTE')
            ]);
//        session.send(respCards);
//        
//        respCards = new builder.Message(session)
//            .attachments([
//                new builder.HeroCard(session)
//                    .buttons([
//                        builder.CardAction.imBack(session, "Main Menu", "Main Menu")])
//                ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Activate Volte)/i
});

// R.4.0.6.2 - menu|FrequentlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToPortIn
bot.dialog('HowToPortIn', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToPortIn',1);

        session.send("Here are a few ways to go about it");
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Digi Website')
                .subtitle('Checkout our plans on Digi Website and once you\'ve found the right plan, select Port-in to proceed')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/prepaid-plans', 'Prepaid'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/postpaid-plans', 'Postpaid')
                ]),
                new builder.HeroCard(session)
                .title('Digi Store')
                .subtitle('Just drop by the nearest Digi Store and we will take care of the rest for you')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/support/digi-store', 'Store Locator')
                ])
            ]);
//        session.send(respCards);
//
//        respCards = new builder.Message(session)
//            .attachments([
//                new builder.HeroCard(session)
//                    .buttons([
//                        builder.CardAction.imBack(session, "Main Menu", "Main Menu")])
//                ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(How to Port in)|(How do I port-in)|(port in)|(portin)/i
});

// R.4.1 - menu|FrequentlyAskedQuestion|MyDigiApp
bot.dialog('MyDigiApp', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|MyDigiApp',1);        
        
        var respCards = new builder.Message(session)
            .attachments([
                new builder.HeroCard(session)
                .buttons([
                    builder.CardAction.imBack(session, 'How do I get started with MyDigi', 'How do I get started with MyDigi?'),
                    builder.CardAction.imBack(session, "How do I download my bill from MyDigi", "How do I download my bill from MyDigi?"),
                    builder.CardAction.imBack(session, "How do I make payment for another via MyDigi", "How do I make payment for another via MyDigi?")
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }        
]).triggerAction({
    matches: /(MyDigi App)|(mydigi)|(my digi)/i
});

// R.4.1.0 - menu|FrequentlyAskedQuestion|MyDigiApp|GetStartedMyDigi
bot.dialog('GetStartedMyDigi', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|MyDigiApp|GetStartedMyDigi',1);

        session.send("You can follow the steps below");
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('Checkout our plans on Digi Website and once you\'ve found the right plan, select Port-in to proceed')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://appurl.io/j1801ncp', 'Download MyDigi'),
                ]),
                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Sign in to the app using a Connect ID or proceed with your number. Make sure to turn on your data or this may not work!')                
            ]);
//        session.send(respCards);
//
//        respCards = new builder.Message(session)
//            .attachments([
//                new builder.HeroCard(session)
//                    .buttons([
//                        builder.CardAction.imBack(session, "Main Menu", "Main Menu")])
//                ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Get Started with MyDigi)|(How do I get started with MyDigi)/i
});

// R.4.1.1 - menu|FrequentlyAskedQuestion|MyDigiApp|DownloadBillFrMyDigi
bot.dialog('DownloadBillFrMyDigi', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|MyDigiApp|DownloadBillFrMyDigi',1);

        session.send("You can follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('Click on View Details'),

                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Click on \'Download Bills\' just below the total charges'),
            ]);
//        session.send(respCards);
//        var respCards = new builder.Message(session)
//            .attachments([
//                new builder.HeroCard(session)
//                .buttons([
//                    builder.CardAction.imBack(session, "See bills for past 6 months", "See bills for past 6 months"),
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
//                ])
//            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }        
]).triggerAction({
    matches: /(Download Bill)|(download my bill)/i
});

// R.4.1.1.0 - menu|FrequentlyAskedQuestion|MyDigiApp|DownloadBillFrMyDigi|SeeBillsForPastSixMonths
bot.dialog('SeeBillsForPastSixMonths', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|MyDigiApp|DownloadBillFrMyDigi|SeeBillsForPastSixMonths',1);

        session.send("You can follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('Click on the Menu Button'),

                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Click on Bills'),
                        
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('Click on \'More\' icon at the top right corner'),
                    
                new builder.HeroCard(session)
                .title('Step 4')
                .subtitle('Click on \'Previous Bills\''),

                new builder.HeroCard(session)
                .title('Step 5')
                .subtitle('You can view & download your bills for the last 6 months')
            ]);
//        session.send(respCards);
//        
//        respCards = new builder.Message(session)
//            .attachments([
//                new builder.HeroCard(session)
//                    .buttons([
//                        builder.CardAction.imBack(session, "Main Menu", "Main Menu")])
//                ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Bills for past 6 months)|(previous bill)|(past bill)/i
});

// R.4.1.2 - menu|FrequentlyAskedQuestion|MyDigiApp|PayForAnotherNumber
bot.dialog('PayForAnotherNumber', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|MyDigiApp|PayForAnotherNumber',1);

        session.send("You can follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('On the MyDigi app, click on Menu.'),

                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('See \'Digi Share\'? Click on it.'),
                        
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('Click on \'Add a number to share\''),
                    
                new builder.HeroCard(session)
                .title('Step 4')
                .subtitle('Enter the Name and Mobile Number. Then click on Save.'),

                new builder.HeroCard(session)
                .title('Step 5')
                .subtitle('Select the name of the person you would like to make payment for, key in the amount and email address. Then click on Pay Bill. That\'s it - all done!')
            ]);
//        session.send(respCards);
//        
//        respCards = new builder.Message(session)
//            .attachments([
//                new builder.HeroCard(session)
//                    .buttons([
//                        builder.CardAction.imBack(session, "Main Menu", "Main Menu")])
//                ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Pay For Another Number)|(make payment for another via MyDigi)/i
});

// R.4.2 - menu|FrequentlyAskedQuestion|TalkTimeServices
bot.dialog('TalkTimeServices', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|TalkTimeServices',1);

        var respCards = new builder.Message(session)
            .attachments([
                new builder.HeroCard(session)
                .buttons([
                    builder.CardAction.imBack(session, 'How do I do a talk-time transfer','How do I do a talk-time transfer?')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Talk Time Services)/i
});

// R.4.2.0 - menu|FrequentlyAskedQuestion|TalkTimeServices|TalkTimeTransfer
bot.dialog('TalkTimeTransfer', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|TalkTimeTransfer',1);

        session.send("You can follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('Dial *128# from your Digi mobile, then select My Account. From the menu, select Talktime Service'),

                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Reply 1 to select Talktime Transfer, and then choose a transfer option. Key in the Digi mobile number you wish to send Prepaid credit to and select CALL/SEND'),
                        
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('You will receive a confirmation text message upon successful transaction')
            ]);
//        session.send(respCards);
//        
//        respCards = new builder.Message(session)
//            .attachments([
//                new builder.HeroCard(session)
//                    .buttons([
//                        builder.CardAction.imBack(session, "Main Menu", "Main Menu")])
//                ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Talk Time Transfer)|(How do I do a talk-time transfer)/i
});

// R.4.3 - menu|FrequentlyAskedQuestion|ChargesOrBilling
bot.dialog('ChargesOrBilling', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|ChargesOrBilling',1);

        var respCards = new builder.Message(session)
            .attachments([
                new builder.HeroCard(session)
                .buttons([
                    builder.CardAction.imBack(session, 'Will I be charged for calling 1300 1800 numbers', 'Will I be charged for calling 1300/1800 numbers?'),
                    builder.CardAction.imBack(session, 'Why is there an RM10 charge for my Buddyz', 'Why is there an RM10 charge for my Buddyz?'),
                    builder.CardAction.imBack(session, 'Can I change my billing cycle', 'Can I change my billing cycle?')
//                    builder.CardAction.imBack(session, "Main Menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCards, AnyResponse, { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.send(DefaultMaxRetryErrorPrompt)
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Charges Billing)|(billing)|(charges)|(1800)/i
});

// R.4.3.0 - menu|FrequentlyAskedQuestion|ChargesOrBilling|ChargeForCallingTollFree
bot.dialog('ChargeForCallingTollFree', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|ChargesOrBilling|ChargeForCallingTollFree',1);

        session.send("Yes. For peak hour 7am to 6.59pm is RM0.30 per min and off peak 7pm to 6.59am is only RM0.15 per min");
//        builder.Prompts.choice(session, "Yes. For peak hour 7am to 6.59pm is RM0.30 per min and off peak 7pm to 6.59am is only RM0.15 per min", 'Main Menu', { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Charge for calling toll free)|(calling tollfree)|(Will I be charged for calling 1300 1800 numbers)/i
});

// R.4.3.1 - menu|FrequentlyAskedQuestion|ChargesOrBilling|ChargeForBuddyz
bot.dialog('ChargeForBuddyz', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|ChargesOrBilling|ChargeForBuddyz',1);

		session.send("You can register up to three (3) Buddyz™ (Digi numbers), free of charge and change them at any time. RM10.00 will be charged for each change of number.");
//        builder.Prompts.choice(session, "You can register up to three (3) Buddyz™ (Digi numbers), free of charge and change them at any time. RM10.00 will be charged for each change of number.", 'Main Menu', { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Charge For Buddyz)|(Why is there an RM10 charge for my Buddyz)|(buddyz)/i
});

// R.4.3.0 - menu|FrequentlyAskedQuestion|ChargesOrBilling|ChangeBillingCycle
bot.dialog('ChangeBillingCycle', [
    function (session) {
        trackBotEvent(session, 'menu|FrequentlyAskedQuestion|ChargesOrBilling|ChangeBillingCycle',1);

        session.send("I'm afraid you can't change your billing cycle.");
//        builder.Prompts.choice(session, "I'm afraid you can't change your billing cycle.", 'Main Menu', { listStyle:builder.ListStyle.button, maxRetries:MaxRetries_SingleMenu, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Change Billing Cycle)|(Can I change my billing cycle)|(bill cycle)/i
});

//bot.dialog('NLP', [
//// R - menu
//    function (session) {
//        trackBotEvent(session, 'NLP',1);
//        session.send(DefaultMaxRetryErrorPrompt);        
//        session.replaceDialog('menu');
//    }
//]).triggerAction({
//    matches: /(Who)|(What)|(How)(I want)/i
//});


bot.dialog('getFeedback', [
    function (session) {
        builder.Prompts.choice(session, emoji.emojify("We would appreciate your feedback. How would you rate our Virtual Assistant? \n(1)not able to help me, (5)very useful"), emoji.emojify('★|★★|★★★|★★★★|★★★★★'), { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
            case 0:
                trackBotEvent(session,session.privateConversationData[LastMenu]+'|Feedback 1',1,0);
                break;
            case 1:
                trackBotEvent(session,session.privateConversationData[LastMenu]+'|Feedback 2',1,0);
                break;
            case 2:
                trackBotEvent(session,session.privateConversationData[LastMenu]+'|Feedback 3',1,0);
                break;
            case 3:
                trackBotEvent(session,session.privateConversationData[LastMenu]+'|Feedback 4',1,0);
                break;
            case 4:
                trackBotEvent(session,session.privateConversationData[LastMenu]+'|Feedback 5',1,0);
                break;
            default:
                session.send("Please help to rate me 1~5 above");
                break;
        }
        session.send('Thank you for your feedback');
        session.replaceDialog('menu');
    }
])

bot.dialog('CheckMyAccount', [
    function (session) {
        var currentTime = Date.now();
        var diffTime = currentTime - session.privateConversationData[ValidatedTime];
        // OTP will be valid for 1 hour 60*60*1000
        if((session.privateConversationData[ValidatedTime] == undefined) || diffTime>3600000) 
        {
            session.send("Just let us verify your identity for a sec ");

            session.beginDialog('validators:phonenumber');
        } else {
            session.replaceDialog('PrepaidAccountOverview');
            return;

        }
    },
    function (session, results) {
        session.privateConversationData[PhoneNumber] = results.response;
        session.privateConversationData[OneTimePin] = GenerateOtp2(session.privateConversationData[PhoneNumber]);

        if (process.env.DEVELOPMENT) {
            console.log("OTP is " + session.privateConversationData[OneTimePin]);
        }

        builder.Prompts.text(session, "I have just sent the One Time Code to you. Can you please key in the 4 digit code?");
    },
    function (session, results) {
        if(session.privateConversationData[OneTimePin] == results.response)
        {
            session.privateConversationData[ValidatedTime] = Date.now();
            session.replaceDialog('PrepaidAccountOverview');
            return;
        }
        builder.Prompts.text(session, "Ops, the OTP is wrong. Can you please key in the 4 digit code?");
    },
    function (session, results) {   // OTP Wrong, Retry second time
        if(session.privateConversationData[OneTimePin] == results.response)
        {
            session.privateConversationData[ValidatedTime] = Date.now();
            session.replaceDialog('PrepaidAccountOverview');
            return;
        }
        session.send('Ops, the OTP is wrong. Sorry, I\'ll bring you back to our Main Menu');
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /^(chinyankeat)$/i
});

// Generate OTP using SBP API
function GenerateOtp(phoneNumber){
    
    var randomnum = math.randomInt(1,9999);
    // add leading zero in front
    var randomotp = "0000" + randomnum; 
    randomotp = randomotp.substr(randomotp.length-4);
    
    var args = {
        data:  "{\
                 \"ref_id\": \"TEST123456#\",\
                 \"service_id\": \"DG_HELLOWIFI\",\
                 \"msisdn\": \"" + phoneNumber + "\",\
                 \"status\": \"1\",\
                 \"transaction_id\": \"\",\
                 \"price_code\": \"VAS220000\",\
                 \"keyword\": \"test\",\
                 \"source_mobtel\": \"20000\",\
                 \"sender_name\": \"\",\
                 \"sms_contents\": [\
                  {\
                   \"content\": \"RM0.00 Digi Virtual Assistant. Your one time PIN is " + randomotp + ", valid for the next 3 minutes\",\
                   \"ucp_data_coding_id\": \"0\",\
                   \"ucp_msg_type\": \"3\",\
                   \"ucp_msg_class\": \"3\"\
                  }\
                 ]\
                }",
        headers: { Authorization: "Basic " + process.env.SBP_SMS_AUTHORIZATIONKEY,
                   "Content-Type": "application/json"}
    };
    if (process.env.DEVELOPMENT != 1) { // send out real OTP SMS only if production mode
        restclient.post(process.env.SBP_SMS_SENDURL + phoneNumber, args, function(data,response) {});
    }
    return randomotp;
}

// Generate OTP using API Gateweay
function GenerateOtp2(phoneNumber){

    var randomnum = math.randomInt(1,9999);
    // add leading zero in front for the random OTP
    var randomotp = "0000" + randomnum; 
    randomotp = randomotp.substr(randomotp.length-4);    
    
    // Token Expired
    if (ApiGwAuthTokenExpiry < Date.now()) {
        GetSmsAuthToken();
    }
    
    // Generate unique ID for API Gateway's ID
    ApiGwSmsCounter++;
    if (ApiGwSmsCounter>99999) {
        ApiGwSmsCounter = 0;
    }
    var SmsCounter = "00000" + ApiGwSmsCounter; 
    SmsCounter = SmsCounter.substr(SmsCounter.length-5);    

    var options = {
        method: 'POST',
        url: process.env.APIGW_URL + '/notifications/v1/sms/vas',
        headers: {
//            'postman-token': 'c5791e8d-ad6f-b1f9-8155-7434571289cb',
            'cache-control': 'no-cache',
            'content-type': 'application/json',
            authorization: 'Bearer '+ ApiGwAuthToken
        },
        body: {
            sourceId: 'EXPLORER',
            correlationId: 'EXPLOR' + SmsCounter,
            id: {
                type: 'MSISDN',
                value: '6' + phoneNumber,
            },
            message: 'RM0.00 Digi Virtual Assistant. Your one time PIN is ' + randomotp + ', valid for the next 3 minutes'
        },
        'json': true
    };

//    if (process.env.DEVELOPMENT != 1) { // send out real OTP SMS only if production mode
        try {
            request(options, function (error, response, body) {
                //console.log('Sent to APIGW '+ JSON.stringify(response));
            })
        } catch (e) {
            //console.log('test2 '+ options);        
        }
//    }
    return randomotp;
}

// Generate OTP using API Gateweay
function GenerateOtp3(phoneNumber){
    var randomnum = math.randomInt(1,9999);
    // add leading zero in front for the random OTP
    var randomotp = "0000" + randomnum; 
    randomotp = randomotp.substr(randomotp.length-4);    
    
    // Token Expired
    if (ApiGwAuthTokenExpiry < Date.now()) {
        GetSmsAuthToken();
    }
    
    // Generate unique ID for API Gateway's ID
    ApiGwSmsCounter++;
    if (ApiGwSmsCounter>99999) {
        ApiGwSmsCounter = 0;
    }
    var SmsCounter = "00000" + ApiGwSmsCounter; 
    SmsCounter = SmsCounter.substr(SmsCounter.length-5);    

    // Generate unique ID for API Gateway's ID
    ApiGwSmsCounter++;
    if (ApiGwSmsCounter>99999) {
        ApiGwSmsCounter = 0;
    }
    var SmsCounter = "00000" + ApiGwSmsCounter; 
    SmsCounter = SmsCounter.substr(SmsCounter.length-5);    
    
    var options = {
        method: 'POST',
        url: 'http://localhost:8080/demo/api/apigwsendsms/',
        headers: {
            'cache-control': 'no-cache',
            'content-type': 'application/json',
            authorization: 'Bearer ' + ApiGwAuthToken
        },
        body: {
            msisdn: '6' + phoneNumber,
            correlationId: 'EXPLOR' + SmsCounter,
            authorizationToken: ApiGwAuthToken,
            message: 'RM0.00 Digi Virtual Assistant. Your one time PIN is ' + randomotp + ', valid for the next 3 minutes'
        },
        json: true
    };

//    if (process.env.DEVELOPMENT != 1) { // send out real OTP SMS only if production mode
        try {
            request(options, function (error, response, body) {
                //console.log('Sent to APIGW '+ JSON.stringify(response));
            })
        } catch (e) {
            //console.log('test2 '+ options);        
        }
//    }
    return randomotp;
}

function GetSmsAuthToken(){
    var options = {
        method: 'POST',
        url: process.env.APIGW_URL + '/oauth/v1/token',
        headers: {
            'cache-control': 'no-cache',
            'content-type': 'application/x-www-form-urlencoded'
        },
        form: {
            client_id: process.env.APIGW_SMS_AUTH_CLIENT_ID,
            client_secret: process.env.APIGW_SMS_AUTH_CLIENT_SECRET,
            grant_type: 'client_credentials',
            expires_in: '86400'
        }
    };

    try {
        request(options, function (error, response, body) {
            if (!error) {
                var ApiGwAuth = JSON.parse(body);
                if(ApiGwAuth.status == 'approved'){
                    var ApiGwAuth = JSON.parse(body);
                    ApiGwAuthToken = ApiGwAuth.accessToken;
                    ApiGwAuthTokenExpiry = Date.now() + 23*50*60*1000;   // Expire in 24 hours. Renew Token 10 mins before expiry 

                    console.log('Token = ' + ApiGwAuthToken + ' expiry in ' + ApiGwAuthTokenExpiry);            
                }                
            }
        });
    } catch (e) {        
    }
}

// get auth token using ChatbotIod
function GetSmsAuthToken2(){
    var options = {
        method: 'GET',
        url: 'http://localhost:8080/demo/api/apigwtoken/',
        headers: {
            'cache-control': 'no-cache',
            authorization: 'Basic YmlsbDphYmMxMjM='
        }
    };
    try {
        request(options, function (error, response, body) {
            if (!error) {
                var ApiGwSmsAuth = JSON.parse(body);
                if(ApiGwSmsAuth.status == 'approved'){
                    var ApiGwAuth = JSON.parse(body);
                    ApiGwAuthToken = ApiGwSmsAuth.accessToken;
                    ApiGwAuthTokenExpiry = Date.now() + 23*50*60*1000;   // Expire in 24 hours. Renew Token 10 mins before expiry 

                    console.log('Token = ' + ApiGwAuthToken + ' expiry in ' + ApiGwAuthTokenExpiry);            
                }                
            } else {
            }
        });
    } catch (e) {        
    }
}



// R.0.4.1.1 - menu | PrepaidDialog  | MyAccountPrepaid | OneTimeCode | PrepaidAccountOverview
bot.dialog('PrepaidAccountOverview', [
    function (session) {
        builder.Prompts.choice(session, "What can we help you with?", 'Credit Balance|Internet Quota|Talktime Services|Itemized Usage|Reload|Add On', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
        case 0: // Credit Balance
        case 1: // Internet Quota
        case 2: // Talktime Services
        case 3: // Itemized Usage
        case 4: // Reload
        case 5: // Add On
            session.send("Coming Soon!!");
        default:
            session.send("Sorry, I didn't quite get that.");
            break;
        }
    }
])

// Connector listener wrapper to capture site url
var connectorListener = connector.listen();
function listen() {
    return function (req, res) {
        // Capture the url for the hosted application
        // We'll later need this url to create the checkout link 
        connectorListener(req, res);
    };
}

module.exports = {
    listen: listen,
};





//////////////////////////////////////////////////////////////////////////////
// Setup Restify Server
//////////////////////////////////////////////////////////////////////////////
var server = restify.createServer();

// Handle Bot Framework messages
server.post('/api/messages', connector.listen());

// Serve a static web page
server.get(/.*/, restify.serveStatic({
	'directory': './dso',
	'default': 'digi.html'
}));

server.listen(process.env.port || 3978, function () {
    console.log('%s listening to %s', server.name, server.url); 

});

