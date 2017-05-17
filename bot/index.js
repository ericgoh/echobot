////////////////////////////////////////////////////////////
// Start: To setup the script, Install these packages
// 
// npm install --save botbuilder 
// npm install --save node-rest-client
// npm install --save mathjs
//
////////////////////////////////////////////////////////////

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
var MaxRetries = 2; 
var DefaultErrorPrompt = "Oops, I didn't get that. Click on any of the below for further information."
// API Gateway Variables
var ApiGwSmsAuthToken = '';
var ApiGwSmsAuthTokenExpiry = 0;
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

]);
// Require Functions
bot.library(require('./validators').createLibrary());
// start by getting API Gateway token first
GetSmsAuthToken();

// Initialize Telemetry Modules
var telemetryModule = require('./telemetry-module.js'); // Setup for Application Insights
var appInsights = require('applicationinsights');
appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY).start();
var appInsightsClient = appInsights.getClient();
////////////////////////////////////////////////////////////////////////////



////////////////////////////////////////////////////////////////////////////
// Send welcome when conversation with bot is started, by initiating the root dialog
bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                console.log("idenetity Added " + identity.id + " Message " + message.address.bot.id + " " + message.address.conversation.id);
                bot.beginDialog(message.address, 'intro');
            }
        });
    }
    if (message.membersRemoved){
        console.log("idenetity Removed " + identity.id + " Message " + message.address.bot.id + " " + message.address.conversation.id);
        message.membersRemoved.forEach(function (identity) {
            console.log("idenetity Removed " + identity.id + " Message " + message.address.bot.id + " " + message.address.conversation.id);
        });
    }
});

// Wrapper function for logging
function trackBotEvent(session, description, dialog_state, storeLastMenu) {
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
        
        var respCards = new builder.Message(session)
            .attachments([
                new builder.HeroCard(session)
                .subtitle('Hello, I\'m your friendly Digi Virtual Assistant and I\'ll be available from 9pm-12am')
                .images([ builder.CardImage.create(session, imagedir + '/images/digi-telecommunications.png') ])
                ]);
        session.send(respCards);        
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
    matches: /^(menu)|(exit)|(quit)|(depart)|(bye)|(goodbye)|(begin)/i
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
        session.send(respCards);
        
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    },
]).triggerAction({
    matches: /(Feedback)/i
});


// R - menu
bot.dialog('menu2', [
    function (session) {
        trackBotEvent(session, 'menu', 0);
        
        // Store new unique ID for this conversation's Dialog
        session.privateConversationData[DialogId] = session.message.address.id;

        builder.Prompts.choice(session, "To get started, these are the things I can help you with. Just click on any of the below and let's get started.", 'Prepaid|Postpaid|Broadband|Roaming|Commonly Asked Question', { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        try {
            switch (results.response.index) {
                case 0:     // Prepaid
                    session.beginDialog('Prepaid');
                    break;
                case 1:     // Postpaid
                    session.beginDialog('Postpaid');
                    break;
                case 2:     // Broadband
                    session.beginDialog('Broadband');
                    break;
                case 3:     // Roaming
                    session.beginDialog('Roaming');
                    break;
                case 4:
                    session.beginDialog('CommonlyAskedQuestion');
                    break;
                default:
                    break;
            }
        } catch (e) {
            // After max retries, will come here
            session.send("Ops I messed up, let's start over again");
            session.replaceDialog('menu2');
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('menu2');
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
                    builder.CardAction.imBack(session, "Prepaid Plans", "More"),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),

                new builder.HeroCard(session)
                .title('Add On')
                .subtitle('Stay Connected')
                .images([ builder.CardImage.create(session, imagedir + '/images/Prepaid-Addons.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/prepaid-addons', 'More'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                        
                new builder.HeroCard(session)
                .title('Reload')
                .subtitle('Top-up your credit now!')
                .images([ builder.CardImage.create(session, imagedir + '/images/Prepaid-Reload.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/reload-details.ep', 'More'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ])

            ]);
        session.send(respCards);
//        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    },
]).triggerAction({
    matches: /(Prepaid)/i
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
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/prepaid/live', 'More Info'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Digi Prepaid Best')
                .subtitle('Unlimited Social Internet Pack')
                .images([ builder.CardImage.create(session, imagedir + '/images/Prepaid-Best.png') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20015&isBundle=n&ppymttype=PREPAID&ptype=VOICE&orderType=NL&_ga=1.94994527.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/prepaid-plans', 'More Info'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ])
            ]);
        session.send(respCards);
//        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Prepaid Plans)/i
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
                    builder.CardAction.imBack(session, "Postpaid Plans", "More"),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),

                new builder.HeroCard(session)
                .title('Extras')
                .subtitle('All the extras you need to stay connected')
                .images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-Extra.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/postpaid-addons', 'More'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ])
            ]);
        session.send(respCards);
//        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    },
]).triggerAction({
    matches: /(Postpaid)/i
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
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/services/change-of-mobile-plans?changePlanName=Digi%20Postpaid%20150%20Infinite', 'Change from Postpaid'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Digi Postpaid 50')
                .images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-50.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10201VPA&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=NL&_ga=1.239507461.769883286.1492574194', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10201VPA&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=MNP&_ga=1.155287800.2103412470.1490767162', 'Port In'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10201VPA&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&_ga=1.64925487.1200425632.1479720347Postpaid&orderType=COP', 'Change from Prepaid'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/services/change-of-mobile-plans?changePlanName=Digi%20Postpaid%2050', 'Change from Postpaid'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Digi Postpaid 80')
                .images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-80.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10200VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=NL&_ga=1.65621101.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10200VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=MNP&_ga=1.92479582.2103412470.1490767162', 'Port In'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10200VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=COP', 'Change from Prepaid'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/services/change-of-mobile-plans?changePlanName=Digi%20Postpaid%2080', 'Change from Postpaid'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Digi Postpaid 110')
                .images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-110.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10202VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=NL&_ga=1.92479582.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10202VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=MNP&_ga=1.94988767.2103412470.1490767162', 'Port In'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10202VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=COP', 'Change from Prepaid'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/services/change-of-mobile-plans?changePlanName=Digi%20Postpaid%20110', 'Change from Postpaid'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ])
            ]);
        session.send(respCards);        
//        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Postpaid Plans)/i
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
                    builder.CardAction.imBack(session, "Broadband Plans", "More"),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Running out of quota? ')
                .text('Boost your nonstop entertainment with Internet Top Up')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://digi.my/mybb', 'More'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ])
            ]);
        session.send(respCards);
//        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    },
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
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/broadband', 'More Info'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Broadband 60')
                .subtitle('For Postpaid')
                .images([ builder.CardImage.create(session, imagedir + '/images/Broadband-60.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=90000P&isBundle=y&ppymttype=POSTPAID&ptype=BB&_ga=1.55846120.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/broadband', 'More Info'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Broadband 100')
                .subtitle('For Postpaid')
                .images([ builder.CardImage.create(session, imagedir + '/images/Broadband-100.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=90001P&isBundle=y&ppymttype=POSTPAID&ptype=BB&_ga=1.156903800.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/broadband', 'More Info'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
            ]);
        session.send(respCards);        
//        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Broadband Plans)/i
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
                .subtitle('Check out your roaming options')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-Plan.PNG') ])
                .buttons([
                    builder.CardAction.imBack(session, "Roaming Plans", "More"),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Roam by country? ')
                .subtitle('Just let us know where you\'regoing')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-Country.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/international-roaming-rates', 'More'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Roaming Tips')
                .subtitle('Here\'s all your need to know to stay connected')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-Tips.PNG') ])
                .buttons([
                    builder.CardAction.imBack(session, "Roaming Tips", "More"),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('IDD Rates')
                .subtitle('International calls + SMS Rates')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-Rates.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/international-calls-sms-rates', 'More'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('IDD 133')
                .subtitle('Enjoy the lowest IDD Rates to 36 countries')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-133.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/idd-133', 'More'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ])
            ]);
        session.send(respCards);
//        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    },
]).triggerAction({
    matches: /(Roaming)/i
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
                .subtitle('The only postpaid plan you need to roam with')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-LikeHome.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/roam-like-home-monthly', 'More'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Roaming Pass')
                .subtitle('Round the clock chatting & Surfing in 50 countries')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-Pass.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/roaming-pass', 'More'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Unlimited Internet')
                .subtitle('Enjoy a hassle free roaming experience')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-UnlimitedInternet.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/unlimited-internet', 'More'),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
            ]);
        session.send(respCards);
//        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Roaming Plans)/i
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
                .subtitle('How long are you with Digi?')
                .buttons([
                    builder.CardAction.imBack(session, "Activate Roaming Over 6 Months", "Over 6 months"),
                    builder.CardAction.imBack(session, "Activate Roaming Below 6 Months", "Less than 6 Months"),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Turn on/off data roaming')
                .subtitle('How long are you with Digi?')
                .buttons([
                    builder.CardAction.imBack(session, "iOS Data Roaming", "iOS"),
                    builder.CardAction.imBack(session, "Android Data Roaming", "Android"),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Purchase / subscribe to Roam Plass')
                .buttons([
                    builder.CardAction.imBack(session, "Subscribe Roaming Pass", "More"),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Usage Checking')
                .buttons([
                    builder.CardAction.imBack(session, "MyDigi Check Roam Usage", "MyDigi"),
                    builder.CardAction.imBack(session, "UMB Check Roam Usage", "UMB"),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ])
            ]);
        session.send(respCards);        
//        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Roaming Tips)/i
});

// R.3.1.0 - menu|Roaming|RoamingTips|ActivateRoamingOver6Months
bot.dialog('ActivateRoamingOver6Months', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|ActivateRoamingOver6Months',1);

        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Self-activate at MyDigi: ')
                .subtitle('Go to Plan Settings > \
                        \n My Subscription >\
                        \n International Roaming > \
                        \n click \"Subscribe\" >')
                .buttons([
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ])
            ]);
        session.send(respCards);        
//        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Activate Roaming Over 6 Months)/i
});

// R.3.1.1 - menu|Roaming|RoamingTips|ActivateRoamingBelow6Months
bot.dialog('ActivateRoamingBelow6Months', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|ActivateRoamingBelow6Months',1);

        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Self-activate at MyDigi: ')
                .subtitle('Please provide us with \
                        \n i) Photocopy of NRIC \
                        \n ii) Valid Passport\
                        \n iii) Work permit (for non-Malaysian)')
                .buttons([
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ])
            ]);
        session.send(respCards);        
//        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Activate Roaming Below 6 Months)/i
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
                .text('Go to Settings > Mobile Data > \
                        \n Mobile Data Options > \
                        \nslide the \"Data Roaming\" ON/OFF')
                .buttons([
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ])
            ]);
        session.send(respCards);        
//        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
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
                .subtitle('Go to Settings > Mobile networks > slide the "Data Roaming" ON/OFF')
                .buttons([
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ])
            ]);
        session.send(respCards);        
//        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Android Data Roaming)/i
});

// R.3.1.4 - menu|Roaming|RoamingTips|SubscribeRoamingPass
bot.dialog('SubscribeRoamingPass', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|SubscribeRoamingPass',1);

        session.send("BEFORE DEPARTURE: \
                    \nMake sure you turn off Data Roaming or Cellular Data/Mobile Data on your mobile phone");        
        session.send("Upon Arrival, follow these Steps");
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('Dial *128*5*1*6#'),
                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Press "2" to "Purchase Roaming Top Up"'),
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('You\'ll receive a confirmation SMS to notify you of successful Roaming Pass purchase'),
                new builder.HeroCard(session)
                .title('Step 4')
                .subtitle('Manually select the specified/applicable network operator'),
                new builder.HeroCard(session)
                .title('Step 5')
                .subtitle('Turn on Data Roaming or Cellular Data/Mobile Data on your mobile phone')
            ]);
        session.send(respCards);        
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Subscribe Roaming Pass)/i
});

// R.3.1.5 - menu|Roaming|RoamingTips|MyDigiCheckRoamUsage
bot.dialog('MyDigiCheckRoamUsage', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|MyDigiCheckRoamUsage',1);

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
        session.send(respCards);
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(MyDigi Check Roam Usage)/i
});

// R.3.1.6 - menu|Roaming|RoamingTips|UmbCheckRoamUsage
bot.dialog('UmbCheckRoamUsage', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|UmbCheckRoamUsage',1);

        session.send("How to check balance for my Roaming Pass");
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
        session.send(respCards);        
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(UMB Check Roam Usage)/i
});


// R.4 - menu|CommonlyAskedQuestion
bot.dialog('CommonlyAskedQuestion', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion',1);
        
        session.send("What would you like to find out today?");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('All About My Account')
                .text('We have the answers to the most asked questions on managing your account')
                .buttons([
                    builder.CardAction.imBack(session, "About My Account", "More"),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),

                new builder.HeroCard(session)
                .title('MyDigi App')
                .text('An app to manage all your account needs. Find out how to use it')
                .buttons([
                    builder.CardAction.imBack(session, "MyDigi App", "More"),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                        
                new builder.HeroCard(session)
                .title('Talk Time Services')
                .text('Find out how to request from or give prepaid credit to others')
                .buttons([
                    builder.CardAction.imBack(session, "Talk Time Services", "More"),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),

                new builder.HeroCard(session)
                .title('Charges / Billing')
                .text('Got questions on your bills? Maybe we can help')
                .buttons([
                    builder.CardAction.imBack(session, "Charges Billing", "More"),
                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ])
            ]);
        session.send(respCards);      
//        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    },
]).triggerAction({
    matches: /(Commonly Asked Question)/i
});

// R.4.0 - menu|CommonlyAskedQuestion|AllAboutMyAccount
bot.dialog('AllAboutMyAccount', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount',1);

//        session.send("1. How to get my acc no\
//                    \n2. What is my PUK code?\
//                    \n3. How to change my acc ownership?\
//                    \n4. How to check F&F?\
//                    \n5. How to add F&F");
//        builder.Prompts.choice(session, "", '1|2|3|4|5|Main Menu|Next Page', { listStyle: builder.ListStyle.button });
        
        builder.Prompts.choice(session, "All About My Accounts", 'How to get my acc no?|What is my PUK code?|Change my acc ownership?|How to check F&F?|How to add F&F?|Main Menu|Next Page', { listStyle: builder.ListStyle.button });
        
        
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.replaceDialog('GetAccountNo');
            break;
	    case 1:
            session.replaceDialog('WhatIsMyPuk');
            break;
	    case 2:
            session.replaceDialog('ChangeMyAccOwnership');
            break;
        case 3:
            session.replaceDialog('CheckFnF');
            break;
        case 4: 
            session.replaceDialog('AddFnF');
            break;
        case 5:    // Main Menu
            session.replaceDialog('menu');
            break;
        default:    // Next Page
            session.replaceDialog('AllAboutMyAccount2');
            break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(About My Account)/i
});

// R.4.0.0 - menu|CommonlyAskedQuestion|AllAboutMyAccount|GetAccountNo
bot.dialog('GetAccountNo', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|GetAccountNo',1);

        session.send("Your Account Number is available on your bill at the top right hand corner");
        builder.Prompts.choice(session, "", 'Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Get Account No)/i
});

// R.4.0.1 - menu|CommonlyAskedQuestion|AllAboutMyAccount|WhatIsMyPuk
bot.dialog('WhatIsMyPuk', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|WhatIsMyPuk',1);

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
        session.send(respCards);
        
        builder.Prompts.choice(session, "", 'Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(What Is My Puk)/i
});

// R.4.0.2 - menu|CommonlyAskedQuestion|AllAboutMyAccount|ChangeMyAccOwnership
bot.dialog('ChangeMyAccOwnership', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|ChangeMyAccOwnership',1);

        builder.Prompts.choice(session, "Please visit the nearest Digi Store to change ownership of account. Both parties must be present together with NRICs for validation", 'Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Change My Account Ownership)/i
});

// R.4.0.3 - menu|CommonlyAskedQuestion|AllAboutMyAccount|CheckFnF
bot.dialog('CheckFnF', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|CheckFnF',1);

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
                .subtitle('Swipe left to select \'Family & Friends\' to view your list')
            ]);
        session.send(respCards);
        
        builder.Prompts.choice(session, "", 'Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Check FnF)|(Check Friends and Family)/i
});

// R.4.0.5 - menu|CommonlyAskedQuestion|AllAboutMyAccount|AddFnF
bot.dialog('AddFnF', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|AddFnF',1);

        session.send("Dial *128*1# and press friends and family™. Reply 1 to register a Digi number as FnF. To register a non-Digi number, reply 2.");
        builder.Prompts.choice(session, "", 'Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Add FnF)|(Add Friends and Family)/i
});

// R.4.0.6 - menu|CommonlyAskedQuestion|AllAboutMyAccount2
bot.dialog('AllAboutMyAccount2', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount2',1);

        builder.Prompts.choice(session, "", 'I\'m going overseas, what can I do?|How do I activate VOLTE?|How do I port-in?|Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.replaceDialog('GoingOverseas');
            break;
	    case 1:
            session.replaceDialog('HowToActivateVolte');
            break;
	    case 2:
            session.replaceDialog('HowToPortIn');
            break;
        default:    // Main Menu
            session.replaceDialog('menu');
            break;
        }
    },
    function (session) {
        session.replaceDialog('menu');
    }
]);

// R.4.0.6.0 - menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|GoingOverseas
bot.dialog('GoingOverseas', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|GoingOverseas',1);

        builder.Prompts.choice(session, "For short holidays, stay in touch by activating Roaming Services", 'Roaming', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('Roaming');
    }
]).triggerAction({
    matches: /(Going Overseas)|(Activate Roaming)/i
});

// R.4.0.6.1 - menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToActivateVolte
bot.dialog('HowToActivateVolte', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToActivateVolte',1);

        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .subtitle('Please check if your device is compatible and the instructions for activation can be found here')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/services/volte', 'Check'),
                    builder.CardAction.imBack(session, "Activation", "Activation"),
                    builder.CardAction.imBack(session, "menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCards, "Activation|Main Menu");
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.beginDialog('ActivateVolte');
            break;
        default:
                session.replaceDialog('menu');
            break;
        }
    }
]).triggerAction({
    matches: /(How to activate Volte)/i
});

// R.4.0.6.1.0 - menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToActivateVolte|ActivateVolte
bot.dialog('ActivateVolte', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToActivateVolte|ActivateVolte',1);

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
        session.send(respCards);
        
        builder.Prompts.choice(session, "", 'Main Menu', { listStyle: builder.ListStyle.button });  
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Activate Volte)/i
});

// R.4.0.6.2 - menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToPortIn
bot.dialog('HowToPortIn', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToPortIn',1);

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
        session.send(respCards);
        builder.Prompts.choice(session, "", 'Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(How to Port in)/i
});

// R.4.1 - menu|CommonlyAskedQuestion|MyDigiApp
bot.dialog('MyDigiApp', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|MyDigiApp',1);

        builder.Prompts.choice(session, "", 'How do I get started with MyDigi?|How do I download my bill from MyDigi?|How do I make payment for another via MyDigi?|Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.replaceDialog('GetStartedMyDigi');
            break;
	    case 1:
            session.replaceDialog('DownloadBillFrMyDigi');
            break;
	    case 2:
            session.replaceDialog('PayForAnotherNumber');
            break;
        default:    // Main Menu
                session.replaceDialog('menu');
            break;
        }
    }
]).triggerAction({
    matches: /(MyDigi App)/i
});

// R.4.1.0 - menu|CommonlyAskedQuestion|MyDigiApp|GetStartedMyDigi
bot.dialog('GetStartedMyDigi', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|MyDigiApp|GetStartedMyDigi',1);

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
        session.send(respCards);
        builder.Prompts.choice(session, "", 'Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Get Started with MyDigi)/i
});

// R.4.1.1 - menu|CommonlyAskedQuestion|MyDigiApp|DownloadBillFrMyDigi
bot.dialog('DownloadBillFrMyDigi', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|MyDigiApp|DownloadBillFrMyDigi',1);

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
        session.send(respCards);        
        builder.Prompts.choice(session, "", 'See bills for past 6 months|Main Menu', { listStyle: builder.ListStyle.button });  
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.replaceDialog('SeeBillsForPastSixMonths');
            break;
        default:    // Main Menu
                session.replaceDialog('menu');
            break;
        }
    }
]).triggerAction({
    matches: /(Download Bill From MyDigi)/i
});


// R.4.1.1.0 - menu|CommonlyAskedQuestion|MyDigiApp|DownloadBillFrMyDigi|SeeBillsForPastSixMonths
bot.dialog('SeeBillsForPastSixMonths', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|MyDigiApp|DownloadBillFrMyDigi|SeeBillsForPastSixMonths',1);

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
        session.send(respCards);
        
        builder.Prompts.choice(session, "", 'menu', { listStyle: builder.ListStyle.button });  
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Bills for past 6 months)/i
});

// R.4.1.2 - menu|CommonlyAskedQuestion|MyDigiApp|PayForAnotherNumber
bot.dialog('PayForAnotherNumber', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|MyDigiApp|PayForAnotherNumber',1);

        session.send("You can follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('Click on the Menu Button'),

                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Click on Digi Shares'),
                        
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('Click on Add a number to share'),
                    
                new builder.HeroCard(session)
                .title('Step 4')
                .subtitle('Enter the Name and Mobile Number. Then click on Save'),

                new builder.HeroCard(session)
                .title('Step 5')
                .subtitle('Select the name of the person you would like to make payment for, key in the amount and email address. Then click on Pay Bill')
            ]);
        session.send(respCards);
        
        builder.Prompts.choice(session, "", 'Main Menu', { listStyle: builder.ListStyle.button });  
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Pay For Another Number)/i
});

// R.4.2 - menu|CommonlyAskedQuestion|TalkTimeServices
bot.dialog('TalkTimeServices', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|TalkTimeServices',1);

        builder.Prompts.choice(session, "", 'How to get my acc no?|Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.replaceDialog('TalkTimeTransfer');
            break;
        default:    // Next Page
                session.replaceDialog('menu');
            break;
        }
    }
]).triggerAction({
    matches: /(Talk Time Services)/i
});

// R.4.2.0 - menu|CommonlyAskedQuestion|TalkTimeServices|TalkTimeTransfer
bot.dialog('TalkTimeTransfer', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|TalkTimeTransfer',1);

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
        session.send(respCards);
        
        builder.Prompts.choice(session, "", 'Main Menu', { listStyle: builder.ListStyle.button });  
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Talk Time Transfer)/i
});

// R.4.3 - menu|CommonlyAskedQuestion|ChargesOrBilling
bot.dialog('ChargesOrBilling', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|ChargesOrBilling',1);

        builder.Prompts.choice(session, "", 'Will I be charged for calling 1300/1800 numbers?|Why is there an RM10 charge for my Buddyz?|Can I change my billing cycle?|Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.replaceDialog('ChargeForCallingTollFree');
            break;
        case 1:
            session.replaceDialog('ChargeForBuddyz');
            break;
        case 2:
            session.replaceDialog('ChangeBillingCycle');
            break;
        default:    // Next Page
                session.replaceDialog('menu');
            break;
        }
    }
]).triggerAction({
    matches: /(Charges Billing)/i
});

// R.4.3.0 - menu|CommonlyAskedQuestion|ChargesOrBilling|ChargeForCallingTollFree
bot.dialog('ChargeForCallingTollFree', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|ChargesOrBilling|ChargeForCallingTollFree',1);

        builder.Prompts.choice(session, "To be confirmed", 'Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Talk Time Services)/i
});

// R.4.3.1 - menu|CommonlyAskedQuestion|ChargesOrBilling|ChargeForBuddyz
bot.dialog('ChargeForBuddyz', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|ChargesOrBilling|ChargeForBuddyz',1);

        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .subtitle('You can register your first three (3) Buddyz (Digi numbers), free of charge and each change after that will be charged RM10')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/Page/tnc/default/tnc_buddyz', 'More Details'),
                    builder.CardAction.imBack(session, "menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCards, "menu");
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Charge For Buddyz)/i
});

// R.4.3.0 - menu|CommonlyAskedQuestion|ChargesOrBilling|ChangeBillingCycle
bot.dialog('ChangeBillingCycle', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|ChargesOrBilling|ChangeBillingCycle',1);

        builder.Prompts.choice(session, "To be confirmed", 'Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Change Billing Cycle)/i
});

bot.dialog('NLP', [
// R - menu
    function (session) {
        trackBotEvent(session, 'NLP',1);  
    },
    function (session) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /^(Who)|(What)|(How)(I want)/i
});


bot.dialog('getFeedback', [
    function (session) {
        builder.Prompts.choice(session, emoji.emojify("We would appreciate your feedback. How would you rate our Virtual Assistant? \n(1)not able to help me, (5)very useful"), emoji.emojify('1|2|3|4|5'), { listStyle: builder.ListStyle.button });
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

            session.beginDialog('validators:phonenumber', {
                prompt: session.gettext('What is your phone number? (e.g. 01xxxxxxxx )'),
                retryPrompt: session.gettext('The phone number is invalid. Please key in Digi Phone Number 01xxxxxxxx'),
                maxRetries: MaxRetries
            });
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
    matches: /^(chinyankeat)/i
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
    if (ApiGwSmsAuthTokenExpiry < Date.now()) {
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
            authorization: 'Bearer '+ ApiGwSmsAuthToken
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

function GetSmsAuthToken(){
    var options = {
        method: 'POST',
        url: process.env.APIGW_URL + '/oauth/v1/token',
        headers: {
//            'postman-token': '805fa373-aa4d-1a6c-9b18-8e3e75b30336',
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
                var ApiGwSmsAuth = JSON.parse(body);
                if(ApiGwSmsAuth.status == 'approved'){
                    var ApiGwAuth = JSON.parse(body);
                    ApiGwSmsAuthToken = ApiGwSmsAuth.accessToken;
                    ApiGwSmsAuthTokenExpiry = Date.now() + 23*50*60*1000;   // Expire in 24 hours. Renew Token 10 mins before expiry 

                    console.log('Token = ' + ApiGwSmsAuthToken + ' expiry in ' + ApiGwSmsAuthTokenExpiry);            
                }                
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






//
//this.props.showTimestamp && (n = this.props.format.strings.timeSent.replace("%1", new Date(this.props.activity.timestamp).toLocaleTimeString())), e = o.createElement("span", null, this.props.activity.from.name || this.props.activity.from.id, n)
//}
//var i = this.props.fromMe ? "me" : "bot",
//    u = a.classList("wc-message-wrapper", this.props.activity.attachmentLayout || "list", this.props.onClickActivity && "clickable"),
//    c = a.classList("wc-message-content", this.props.selected && "selected");
//    return 
//        o.createElement("div", {
//            "data-activity-id": this.props.activity.id,
//            className: u,
//            onClick: this.props.onClickActivity
//        }, 
//        o.createElement("div", 
//            {className: "wc-message wc-message-from-" + i,ref: function (e) { return t.messageDiv = e }}
//            , o.createElement("div", { className: c},
//                    o.createElement("svg", {className: "wc-message-callout"}, 
//                        o.createElement("path", {className: "point-left",d: "m0,6 l6 6 v-12 z"}), 
//                        o.createElement("path", {className: "point-right",d: "m6,6 l-6 6 v-12 z"})),
//                    o.createElement(s.ActivityView, r.__assign({}, this.props)), 
//                    this.props.children
//            )), 
//        o.createElement("div", {className: "wc-message-from wc-message-from-" + i}, e)
//        )
//    }, t
//    }(o.Component);
//    t.WrappedActivity = d
//    },
//function (e, t, n) {
//    "use strict";
//
//    function r(e) {
//        if (e && 0 !== e.length) {
//            var t = e[e.length - 1];
//            return "message" === t.type && t.suggestedActions && t.suggestedActions.actions.length > 0 ? t : void 0
//        }
//    }
//    Object.defineProperty(t, "__esModule", {
//        value: !0
//    });
//    var o = n(12),
//        i = n(9),
//        s = n(43),
//        a = n(82),
//        u = n(17),
//        c = function (e) {
//            return i.createElement("div", {
//                className: u.classList("wc-message-pane", e.activityWithSuggestedActions && "show-actions")
//            }, e.children, i.createElement("div", {
//                className: "wc-suggested-actions"
//            }, i.createElement(l, o.__assign({}, e))))
//        },
//        l = function (e) {
//            function t(t) {
//                return e.call(this, t) || this
//            }
//            return o.__extends(t, e), t.prototype.actionClick = function (e, t) {
//                    this.props.activityWithSuggestedActions &
//
//
