////////////////////////////////////////////////////////////
// Start: To setup the script, Install these packages
// 
// npm install --save botbuilder 
// npm install --save restify
// npm install --save applicationinsights 
// npm install --save dotenv-extended   (RUN AS ADMIN)
// npm install --save node-rest-client
// npm install --save mathjs
//
////////////////////////////////////////////////////////////

require('dotenv-extended').load();

var restify = require('restify');
var builder = require('botbuilder');
var RestClient = require('node-rest-client').Client;
var restclient = new RestClient();
var math = require('mathjs');


// Initialize Telemetry Modules
var telemetryModule = require('./telemetry-module.js'); // Setup for Application Insights
var appInsights = require('applicationinsights');
appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY).start();
var appInsightsClient = appInsights.getClient();


// Get secrets from server environment
var botConnectorOptions = { 
    appId: process.env.BOTFRAMEWORK_APPID, 
    appPassword: process.env.BOTFRAMEWORK_APPSECRET
};


// Create bot
var connector = new builder.ChatConnector(botConnectorOptions);
var bot = new builder.UniversalBot(connector, [

    function (session) {
        var telemetry = telemetryModule.createTelemetry(session, { setDefault: false });

        // Start tracking
        appInsightsClient.trackTrace('start', telemetry);
                session.beginDialog('menu');
    },

    function (session, results) {
        session.endConversation("Please type Menu");
    }
]);

// Validators
bot.library(require('./validators').createLibrary());

////////////////////////////////////////////////////////////////////////////
// Global Variables
var MaxRetries = 2; 
var DefaultErrorPrompt = "Sorry, I don't really Understand. Can you repeat?"



// Send welcome when conversation with bot is started, by initiating the root dialog
bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                bot.beginDialog(message.address, 'menu');
            }
        });
    }
});


// R - menu
bot.dialog('menu', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu', telemetry);

        
        session.send("Hello, I'm your friendly Digi beta bot and I'll be available from 9pm-12am");
        builder.Prompts.choice(session, "To get started, these are the things I can help you with. Just click on any of the below and let's get started.", 'Prepaid|Postpaid|Broadband|Roaming|Commonly Asked Question', { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        try {
            switch (results.response.index) {
                case 0:     // Prepaid
                case 1:     // Postpaid
                case 2:     // Broadband
                case 3:     // Roaming
                    session.beginDialog('ComingSoon');
                    break;
                case 4:
                    session.beginDialog('CommonlyAskedQuestion');
                    break;
                default:
                    break;
            }
        } catch (e) {
            // After max retries, will come here
            session.send("Sorry I messed up, let's try again");
            session.replaceDialog('menu');
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /^(menu)|(exit)|(quit)|(depart)|(bye)|(goodbye)|(begin)/i
});

// R.0 - menu|ComingSoon
bot.dialog('ComingSoon', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu|ComingSoon', telemetry);
        
        builder.Prompts.choice(session, "Coming Soon", 'Main Menu', { listStyle: builder.ListStyle.button });
    },    
    function (session, results) {
        session.replaceDialog('menu');
    }
])

// R.4 - menu|CommonlyAskedQuestion
bot.dialog('CommonlyAskedQuestion', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu|CommonlyAskedQuestion', telemetry);
        
        session.send("There's a few ways to go about it");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.ThumbnailCard(session)
                .title('All About My Account')
                .subtitle('We have the answers to the most asked questions on managing your account')
//                .images([ builder.CardImage.create(session, 'http://new.digi.com.my/cs/site_template/digi/images/mydigi-exclusive/logo-digi_1.png')])
                .buttons([
                    builder.CardAction.imBack(session, "All About My Account", "More"),
                ]),

                new builder.ThumbnailCard(session)
                .title('My Digi App')
                .subtitle('An app to manage all your account needs. Find out how to use it')
                .buttons([
                    builder.CardAction.imBack(session, "My Digi App", "More"),
                ]),
                        
                new builder.ThumbnailCard(session)
                .title('Talk Time Services')
                .subtitle('Find out how to request from or give prepaid credit to others')
                .buttons([
                    builder.CardAction.imBack(session, "Talk Time Services", "More"),
                ]),

                new builder.ThumbnailCard(session)
                .title('Charges / Billing')
                .subtitle('Got questions on your bills? Maybe we can help')
                .buttons([
                    builder.CardAction.imBack(session, "Charges / Billing", "More"),
                ])
            ]);
        session.send(respCards);
        
        builder.Prompts.choice(session, "", "Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    },

])

// R.4.0 - menu|CommonlyAskedQuestion|AllAboutMyAccount
bot.dialog('AllAboutMyAccount', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu|CommonlyAskedQuestion|AllAboutMyAccount', telemetry);
        
        session.send("Just Key in the question number to find out the answer. Example: 3");
        session.send("1. How to get my acc no\
                    \n2. What is my PUK code?\
                    \n3. How to change my acc ownership?\
                    \n4. How to check F&F?\
                    \n5. How to add F&F");
        builder.Prompts.choice(session, "", '1|2|3|4|5|Main Menu|Next Page', { listStyle: builder.ListStyle.button });
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
    matches: /^(All About My Account)/i
});

// R.4.0.0 - menu|CommonlyAskedQuestion|AllAboutMyAccount|GetAccountNo
bot.dialog('GetAccountNo', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu|CommonlyAskedQuestion|AllAboutMyAccount|GetAccountNo', telemetry);
        
        session.send("Your Account Number is available on your bill at the top right hand corner");
        builder.Prompts.choice(session, "Main Menu", 'menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /^(Get Account No)/i
});

// R.4.0.1 - menu|CommonlyAskedQuestion|AllAboutMyAccount|WhatIsMyPuk
bot.dialog('WhatIsMyPuk', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu|CommonlyAskedQuestion|AllAboutMyAccount|WhatIsMyPuk', telemetry);
        
        session.send("You Can Follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.ThumbnailCard(session)
                .title('Step 1')
                .subtitle('On the MyDigi app, click on Menu'),

                new builder.ThumbnailCard(session)
                .title('Step 2')
                .subtitle('Click on Settings'),
                        
                new builder.ThumbnailCard(session)
                .title('Step 3')
                .subtitle('Swipe left to select SIM and you will find your PUK code')
            ]);
        session.send(respCards);
        
        builder.Prompts.choice(session, "Main Menu", 'menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /^(What Is My Puk)/i
});

// R.4.0.2 - menu|CommonlyAskedQuestion|AllAboutMyAccount|ChangeMyAccOwnership
bot.dialog('ChangeMyAccOwnership', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu|CommonlyAskedQuestion|AllAboutMyAccount|ChangeMyAccOwnership', telemetry);
        
        session.send("Please visit the nearest Digi Store to change ownership of account. Both parties must be present together with NRICs for validation");
        builder.Prompts.choice(session, "Main Menu", 'menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /^(Change My Account Ownership)/i
});

// R.4.0.3 - menu|CommonlyAskedQuestion|AllAboutMyAccount|CheckFnF
bot.dialog('CheckFnF', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu|CommonlyAskedQuestion|AllAboutMyAccount|CheckFnF', telemetry);
        
        session.send("You Can Follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.ThumbnailCard(session)
                .title('Step 1')
                .subtitle('On the MyDigi app, click on Menu'),

                new builder.ThumbnailCard(session)
                .title('Step 2')
                .subtitle('Click on Settings'),
                        
                new builder.ThumbnailCard(session)
                .title('Step 3')
                .subtitle('Swipe left to select \'Family & Friends\' to view your list')
            ]);
        session.send(respCards);
        
        builder.Prompts.choice(session, "Main Menu", 'menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /^(Check FnF)|(Check Friends and Family)/i
});

// R.4.0.5 - menu|CommonlyAskedQuestion|AllAboutMyAccount|AddFnF
bot.dialog('AddFnF', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu|CommonlyAskedQuestion|AllAboutMyAccount|AddFnF', telemetry);
        
        session.send("Dial *128*1# and press friends and family™. Reply 1 to register a Digi number as FnF. To register a non-Digi number, reply 2.");
        builder.Prompts.choice(session, "Main Menu", 'menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /^(Add FnF)|(Add Friends and Family)/i
});

// R.4.0.6 - menu|CommonlyAskedQuestion|AllAboutMyAccount2
bot.dialog('AllAboutMyAccount2', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu|CommonlyAskedQuestion|AllAboutMyAccount2', telemetry);
        
        session.send("Just Key in the question number to find out the answer. Example: 3");
        session.send("6. I'm going overseas, what can I do? \
                    \n7. How do I activate VOLTE\
                    \n8. How do I port-in?");
        builder.Prompts.choice(session, "", '6|7|8|Main Menu', { listStyle: builder.ListStyle.button });
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
        // Reload menu
        session.replaceDialog('menu');
    }
]);

// R.4.0.6.0 - menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|GoingOverseas
bot.dialog('GoingOverseas', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|GoingOverseas', telemetry);
        
        builder.Prompts.choice(session, "For short holidays, stay in touch by activating Roaming Services", 'menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /^(Going Overseas)|(Activate Roaming)/i
});

// R.4.0.6.1 - menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToActivateVolte
bot.dialog('HowToActivateVolte', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToActivateVolte', telemetry);
        
        var respCard = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.ThumbnailCard(session)
                .subtitle('Please check if your device is compatible and the instructions for activation can be found here')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/services/volte', 'Check'),
                    builder.CardAction.imBack(session, "Activation", "Activation"),
                    builder.CardAction.imBack(session, "menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCard, "Activation");      
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
    matches: /^(How to activate Volte)/i
});

// R.4.0.6.1.0 - menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToActivateVolte|ActivateVolte
bot.dialog('ActivateVolte', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToActivateVolte|ActivateVolte', telemetry);
        
        session.send("You Can Follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.ThumbnailCard(session)
                .title('Step 1')
                .subtitle('Select \"Settings\"'),

                new builder.ThumbnailCard(session)
                .title('Step 2')
                .subtitle('Select \"Mobile Data\"'),
                        
                new builder.ThumbnailCard(session)
                .title('Step 3')
                .subtitle('Tap on Mobile Data Options'),
                    
                new builder.ThumbnailCard(session)
                .title('Step 4')
                .subtitle('Select \"Enable 4G\"'),

                new builder.ThumbnailCard(session)
                .title('Step 5')
                .subtitle('Choose Voice & Data to enable VoLTE')
            ]);
        session.send(respCards);
        
        builder.Prompts.choice(session, "Main Menu", 'menu', { listStyle: builder.ListStyle.button });  
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /^(Activate Volte)/i
});

// R.4.0.6.2 - menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToPortIn
bot.dialog('HowToPortIn', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToPortIn', telemetry);
        
        session.send("Here are a few ways to go about it");
        var respCard = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.ThumbnailCard(session)
                .title('Digi Website')
                .subtitle('Checkout our plans on Digi Website and once you\'ve found the right plan, select Port-in to proceed')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/prepaid-plans', 'Prepaid'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/postpaid-plans', 'Postpaid'),
                ]),
                new builder.ThumbnailCard(session)
                .title('Digi Store')
                .subtitle('Just drop by the nearest Digi Store and we will take care of the rest for you')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/support/digi-store', 'Store Locator'),
                ])
                
            ]);
        builder.Prompts.choice(session, respCard, "menu");      
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /^(How to Port in)/i
});

// R.4.1 - menu|CommonlyAskedQuestion|MyDigiApp
bot.dialog('MyDigiApp', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu|CommonlyAskedQuestion|MyDigiApp', telemetry);
        
        session.send("Just Key in the question number to find out the answer. Example: 3");
        builder.Prompts.choice(session, "1. How do I get started with MyDigi?\
                                        \n2. How do I download my bill from MyDigi?\
                                        \n3. How do I make payment for another via MyDigi?", '1|2|3|Main Menu', { listStyle: builder.ListStyle.button });
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
    matches: /^(My Digi App)/i
});

// R.4.1.0 - menu|CommonlyAskedQuestion|MyDigiApp|GetStartedMyDigi
bot.dialog('GetStartedMyDigi', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu|CommonlyAskedQuestion|MyDigiApp|GetStartedMyDigi', telemetry);
        
        session.send("You Can Follow the steps below");
        var respCard = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.ThumbnailCard(session)
                .title('Step 1')
                .subtitle('Checkout our plans on Digi Website and once you\'ve found the right plan, select Port-in to proceed')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://appurl.io/j1801ncp', 'Download MyDigi'),
                ]),
                new builder.ThumbnailCard(session)
                .title('Step 2')
                .subtitle('Sign in to the app using a Connect ID or proceed with your number. Make sure to turn on your data or this may not work!')                
            ]);
        session.send(respCards);
        builder.Prompts.choice(session, "Main Menu", 'menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /^(Get Started with MyDigi)/i
});

// R.4.1.1 - menu|CommonlyAskedQuestion|MyDigiApp|DownloadBillFrMyDigi
bot.dialog('DownloadBillFrMyDigi', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu|CommonlyAskedQuestion|MyDigiApp|DownloadBillFrMyDigi', telemetry);
        
        session.send("You Can Follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.ThumbnailCard(session)
                .title('Step 1')
                .subtitle('Click on the Menu Button'),

                new builder.ThumbnailCard(session)
                .title('Step 2')
                .subtitle('Click on Bills'),
                        
                new builder.ThumbnailCard(session)
                .title('Step 3')
                .subtitle('Click on \'More\' icon at the top right corner'),
                    
                new builder.ThumbnailCard(session)
                .title('Step 4')
                .subtitle('Click on \'Previous Bills\''),

                new builder.ThumbnailCard(session)
                .title('Step 5')
                .subtitle('You can view & download your bills for the last 6 months')
            ]);
        session.send(respCards);
        
        builder.Prompts.choice(session, "Main Menu", 'menu', { listStyle: builder.ListStyle.button });  
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /^(Download Bill From MyDigi)/i
});

// R.4.1.2 - menu|CommonlyAskedQuestion|MyDigiApp|PayForAnotherNumber
bot.dialog('PayForAnotherNumber', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('menu|CommonlyAskedQuestion|MyDigiApp|PayForAnotherNumber', telemetry);
        
        session.send("You Can Follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.ThumbnailCard(session)
                .title('Step 1')
                .subtitle('Click on the Menu Button'),

                new builder.ThumbnailCard(session)
                .title('Step 2')
                .subtitle('Click on Digi Shares'),
                        
                new builder.ThumbnailCard(session)
                .title('Step 3')
                .subtitle('Click on Add a number to share'),
                    
                new builder.ThumbnailCard(session)
                .title('Step 4')
                .subtitle('Enter the Name and Mobile Number. Then click on Save'),

                new builder.ThumbnailCard(session)
                .title('Step 5')
                .subtitle('Select the name of the person you would like to make payment for, key in the amount and email address. Then click on Pay Bill')
            ]);
        session.send(respCards);
        
        builder.Prompts.choice(session, "Main Menu", 'menu', { listStyle: builder.ListStyle.button });  
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /^(Pay For Another Number)/i
});














///////////////////////////////////////////Previous Menu, maintained until tested. 
// R.1 - menu | PrepaidDialog
bot.dialog('PrepaidDialog', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('Main|Prepaid', telemetry);
        
        builder.Prompts.choice(session, "Here are some things that I can help you with", 'Plan Recommendation|Prepaid Plans|Promotions|Internet Plans|My Account', { listStyle: builder.ListStyle.button });
    },

    
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.beginDialog('PrepaidRecommendationQ1');
            break;
	    case 1:
	    case 2:    // Promotions
        case 3:    // Internet Plans
            var cards = getCardsPrepaidPlan();
		    var reply = new builder.Message(session).attachmentLayout(builder.AttachmentLayout.carousel).attachments(cards);
    		session.send(reply);
            break;
        case 4:    // My Account
            session.beginDialog('MyAccountPrepaid');
            break;
        default:
            session.send("Sorry, I don't quite get that");
            session.endDialog();
            session.beginDialog('MyAccountPrepaid');
            break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
])


// R.0.0 - menu | PrepaidDialog | PrepaidRecommendationQ1 
bot.dialog('PrepaidRecommendationQ1', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('Main|Prepaid|PrepaidRecommendationQ1', telemetry);
        
        builder.Prompts.choice(session, "Do you use a lot of voice calls?", 'Yes|No', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
        case 0: // Yes
        case 1: // No
            session.beginDialog('PrepaidRecommendationQ2');
            break;
        default:
    		session.send('Sorry, I don\'t quite understand that');
            break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
])

// R.0.0.1 - menu | PrepaidDialog | PrepaidRecommendationQ1 | PrepaidRecommendationQ2
bot.dialog('PrepaidRecommendationQ2', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('Main|Prepaid|PrepaidRecommendationQ2', telemetry);

        builder.Prompts.choice(session, "I see.  What do you usually use your data for?", 'Social Media|Music/Videos|Data is Life!|I don\'t really use data', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
	    case 1:
	    case 2:
	    case 3:
            var cards = getCardsBestPrepaid();
		    var reply = new builder.Message(session).attachmentLayout(builder.AttachmentLayout.carousel).attachments(cards);
    		session.send(reply);
            session.beginDialog('getFeedback');
            break;
        default:
    		session.send('Sorry, I don\'t quite understand that');
            break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
])

// R.0.0.1.1 - menu | PrepaidDialog | PrepaidRecommendationQ1 | PrepaidRecommendationQ2 | getCardsBestPrepaid
function getCardsBestPrepaid(session) {
    return [
        new builder.HeroCard(session)
            .title('Digi Prepaid BEST')
            .subtitle('Unlimited Social Internet Pack')
            .images([
                builder.CardImage.create(session, 'http://new.digi.com.my/cs/Satellite?blobcol=urldata&blobkey=id&blobtable=MungoBlobs&blobwhere=1410526370609&ssbinary=true')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20016&isBundle=n&ppymttype=PREPAID&ptype=VOICE&_ga=1.60494381.1675682806.1470899460', 'Buy Now'),
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20016&isBundle=n&ppymttype=PREPAID&ptype=VOICE&_ga=1.60494381.1675682806.1470899460', 'Port In')
            ])
    ];
}

// R.0.1 - menu | PrepaidDialog | getCardsPrepaidPlan
function getCardsPrepaidPlan(session) {
    return [
        new builder.HeroCard(session)
            .title('Digi Prepaid BEST')
            .subtitle('The Best Deal for Prepaid')
            .images([
                builder.CardImage.create(session, 'http://new.digi.com.my/cs/Satellite?blobcol=urldata&blobkey=id&blobtable=MungoBlobs&blobwhere=1410526370609&ssbinary=true')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20016&isBundle=n&ppymttype=PREPAID&ptype=VOICE&_ga=1.60494381.1675682806.1470899460', 'Buy Now'),
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20016&isBundle=n&ppymttype=PREPAID&ptype=VOICE&_ga=1.60494381.1675682806.1470899460', 'Port In')
            ]),
        new builder.HeroCard(session)
            .title('Digi Prepaid LIVE')
            .subtitle('ALL the internet you need')
            .images([
                builder.CardImage.create(session, 'http://new.digi.com.my/cs/Satellite?blobcol=urldata&blobkey=id&blobtable=MungoBlobs&blobwhere=1410526372124&ssbinary=true')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20016&isBundle=n&ppymttype=PREPAID&ptype=VOICE&_ga=1.60494381.1675682806.1470899460', 'Buy Now'),
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20016&isBundle=n&ppymttype=PREPAID&ptype=VOICE&_ga=1.60494381.1675682806.1470899460', 'Port In')
            ])
    ];
}

// R.0.4 - menu | PrepaidDialog  | MyAccountPrepaid
bot.dialog('MyAccountPrepaid', [
    function (session) {
        session.send("Just let us verify your identity for a sec ");
        
        session.beginDialog('validators:phonenumber', {
            prompt: session.gettext('What is your phone number?'),
            retryPrompt: session.gettext('The phone number is invalid. Please key in Digi Phone Number 01xxxxxxxx'),
            maxRetries: MaxRetries
        });
    },
    function (session, results) {
        session.userData.phoneNumber = results.response;
        session.userData.oneTimeCode = GenerateOtp(session.userData.phoneNumber);
        builder.Prompts.text(session, 'I have just sent the One Time Code to you. Can you please key in the 4 digit code?');
    },
    function (session, results) {
        session.send('Your Phone is ' + session.userData.phoneNumber + ' your code is ' + session.userData.oneTimeCode);
        session.replaceDialog('PrepaidAccountOverview');
    },
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
])

function GenerateOtp(phoneNumber){
    
    var randomotp = math.randomInt(1,9999);
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
        headers: { Authorization: "Basic " + "aGVsbG93aWZpOmhlbGxvd2lmaSMxMjM=",
                   "Content-Type": "application/json"}
    };
    restclient.post("https://app.digi.com.my/digiext/smsmt/" + phoneNumber, args, function(data,response) {});
return randomotp;
}


// R.0.4.1.1 - menu | PrepaidDialog  | MyAccountPrepaid | OneTimeCode | PrepaidAccountOverview
bot.dialog('PrepaidAccountOverview', [
    function (session) {
        builder.Prompts.choice(session, "What can we help you with?", 'Credit Balance|Internet Quota|Talktime Services|Itemized Usage|Reload|Add On', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
        case 0: // Credit Balance
            session.beginDialog('CreditBalance');
            break;
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


// R.1 - menu | PostpaidDialog
bot.dialog('PostpaidDialog', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('Main|Postpaid', telemetry);

        builder.Prompts.choice(session, "Here are some things that I can help you with", 'Postpaid Plans|Promotions|Internet Plans|My Account|FAQ', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
            var cards = getCardsPostpaidPlan();
		    var reply = new builder.Message(session).attachmentLayout(builder.AttachmentLayout.carousel).attachments(cards);
    		session.send(reply);
            break;
	    case 1:    // Promotions
	    case 2:    // Internet Plans
        case 3:    // My Account
            session.send("coming soon");
            break;
        default:
            session.send("Sorry, I didn't quite get that.");
            session.beginDialog('PostpaidDialog');
            break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
])


// R.4 - menu | DownloadMyDigi
bot.dialog('DownloadMyDigi', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('Main|DownloadMyDigi', telemetry);
                
        var downloadMyDigiCard = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.ThumbnailCard(session)
                .title('Download MyDigi')
                .subtitle('The all-new MyDigi rewards you in every way')
                .images([
                    builder.CardImage.create(session, 'http://new.digi.com.my/cs/site_template/digi/images/mydigi-exclusive/logo-digi_1.png')
                ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://appurl.io/j1801ncp', 'Download Now'),
                    builder.CardAction.imBack(session, "Back", "Back")
                ])
            ]);
        builder.Prompts.choice(session, downloadMyDigiCard, "Back");        
    }, 
    function (session) {
        session.endDialog();
        session.replaceDialog('menu');
    }
])


// R.5 - menu | FAQDialog
bot.dialog('FaqDialog', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('Main|FAQ', telemetry);

        builder.Prompts.choice(session, "Soemthing to begin with", 'General|Postpaid|Broadband|Prepaid|Roaming', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.beginDialog('FaqGeneral');
            break;
	    case 1:    
            session.beginDialog('FaqPostpaid');
            break;
	    case 2:    
            session.beginDialog('FaqBroadband');
            break;
        case 3:    // My Account
            session.beginDialog('FaqPrepaid');
            break;
        case 4:    // My Account
            session.beginDialog('FaqRoaming');
            break;
        default:
            session.send("Sorry, I didn't quite get that.");
            session.beginDialog('PostpaidDialog');
            break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
])

// R.5.0 - menu | FAQDialog | FaqGeneral
bot.dialog('FaqGeneral', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('Main|FAQ|General', telemetry);

        var msg = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.ThumbnailCard(session)
                    .title("PDPA")
                    .subtitle("PDPA â€“ what is personal data protection act ?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:100", "Answer")
                    ]),
                new builder.ThumbnailCard(session)
                    .title("Toll Free")
                    .subtitle("Will I get charged for toll free no 1300/1800?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:101", "Answer")
                    ]),
                new builder.ThumbnailCard(session)
                    .title("Port In/Out")
                    .subtitle("How to port in/out ?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:102", "Answer")
                    ]),
                new builder.ThumbnailCard(session)
                    .title("Register MyDigi")
                    .subtitle("How to register Mydigi ?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:103", "Answer")
                    ]),
                new builder.ThumbnailCard(session)
                    .title("Check Account No")
                    .subtitle("How to check my account number ?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:104", "Answer")
                    ]),
                new builder.ThumbnailCard(session)
                    .title("Activate VOLTE")
                    .subtitle("How to activate VOLTE ?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:105", "Answer")
                    ]),
                new builder.ThumbnailCard(session)
                    .title("Talktime Transer")
                    .subtitle("How to do Talktime Transfer ?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:106", "Answer")
                    ]),
                new builder.ThumbnailCard(session)
                    .title("Payment for Others")
                    .subtitle("How to make payment for other number via Mydigi ?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:107", "Answer")
                    ]),
                new builder.ThumbnailCard(session)
                    .title("Download Bill")
                    .subtitle("How to download bill via Mydigi ?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:108", "Answer")
                    ]),
                new builder.ThumbnailCard(session)
                    .title("PUK code")
                    .subtitle("What is my PUK code ?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:109", "Answer")
                    ]),
                new builder.ThumbnailCard(session)
                    .title("Change Ownership")
                    .subtitle("How to change ownership ?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:110", "Answer")
                    ]),
                new builder.ThumbnailCard(session)
                    .title("Call 1300")
                    .subtitle("Why Iâ€™ve been charge calling 1300 number ?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:111", "Answer")
                    ]),
                new builder.ThumbnailCard(session)
                    .title("Add FnF")
                    .subtitle("How to check and add FnF number ?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:112", "Answer")
                    ]),
                new builder.ThumbnailCard(session)
                    .title("Digi Store")
                    .subtitle("Where is Digi Store/Centre ?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:113", "Answer")
                    ])            ]);        
        builder.Prompts.choice(session, msg, "select:100|select:101|select:102|select:103|select:104|select:105|select:106|select:107|select:108|select:109|select:110|select:111|select:112|select:113");
    },
    function (session, results) {
        var action, item;
        var kvPair = results.response.entity.split(':');
        switch (kvPair[0]) {
            case 'select':
                action = 'selected';
                break;
        }
        switch (kvPair[1]) {
            case '100':
                item = "PDPA Answer";
                break;
            case '101':
                item = "Toll Free Answer";
                break;
            case '102':
                item = "Port In/Out Answer";
                break;
            case '103':
                item = "Register MyDigi Answer";
                break;
            case '104':
                item = "Check Account No Answer";
                break;
            case '105':
                item = "Activate VOLTE Answer";
                break;
            case '106':
                item = "Talktime Transer Answer";
                break;
            case '107':
                item = "Payment for Others Answer";
                break;
            case '108':
                item = "Download Bill Answer";
                break;
            case '109':
                item = "PUK code Answer";
                break;
            case '110':
                item = "Change Ownership Answer";
                break;
            case '111':
                item = "Call 1300 Answer";
                break;
            case '112':
                item = "Add FnF Answer";
                break;
            case '113':
                item = "Digi Store Answer";
                break;
        }
        session.endDialog('You %s "%s"', action, item);
    }, 
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
])

// R.5.1 - menu | FAQDialog | FaqPostpaid
bot.dialog('FaqPostpaid', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('Main|FAQ|Postpaid', telemetry);

        var msg = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.ThumbnailCard(session)
                    .title("Bill Cycle")
                    .subtitle("Can I change my bill cycle date to a different date to cater for my pay day?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:200", "Answer")
                    ]),
                new builder.ThumbnailCard(session)
                    .title("Phone Package")
                    .subtitle("Can I know latest phone package ?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:201", "Answer")
                    ]),
                new builder.ThumbnailCard(session)
                    .title("Latest Plan")
                    .subtitle("What are the available call plan ?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:202", "Answer")
                    ])
            ]);       
        builder.Prompts.choice(session, msg, "select:200|select:201|select:202");
    },
    function (session, results) {
        var action, item;
        var kvPair = results.response.entity.split(':');
        switch (kvPair[0]) {
            case 'select':
                action = 'selected';
                break;
        }
        switch (kvPair[1]) {
            case '200':
                item = "Bill Cycle Answer";
                break;
            case '201':
                item = "Phone Package Answer";
                break;
            case '202':
                item = "Latest Plan Answer";
                break;
        }
        session.endDialog('You %s "%s"', action, item);
    }, 
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
])

// R.5.2 - menu | FAQDialog | FaqBroadband
bot.dialog('FaqBroadband', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('Main|FAQ|Broadband', telemetry);
        
        var msg = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.ThumbnailCard(session)
                    .title("Quota")
                    .subtitle("How do I check broadband quota ?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:300", "Answer")
                    ])
            ]);        
        builder.Prompts.choice(session, msg, "select:300");
    },
    function (session, results) {
        var action, item;
        var kvPair = results.response.entity.split(':');
        switch (kvPair[0]) {
            case 'select':
                action = 'selected';
                break;
        }
        switch (kvPair[1]) {
            case '300':
                item = "Quota Answer";
                break;
        }
        session.endDialog('You %s "%s"', action, item);
    }, 
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
])

// R.5.3 - menu | FAQDialog | Prepaid
bot.dialog('FaqPrepaid', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('Main|FAQ|Prepaid', telemetry);
        
        var msg = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.ThumbnailCard(session)
                    .title("Buddyz")
                    .subtitle("Why I  am being charge RM10 to add buddyz number?")
                    .buttons([
                        builder.CardAction.imBack(session, "select:400", "Answer")
                    ])
            ]);        
        builder.Prompts.choice(session, msg, "select:400");
    },
    function (session, results) {
        var action, item;
        var kvPair = results.response.entity.split(':');
        switch (kvPair[0]) {
            case 'select':
                action = 'selected';
                break;
        }
        switch (kvPair[1]) {
            case '400':
                item = "Buddyz Answer";
                break;
        }
        session.endDialog('You %s "%s"', action, item);
    }, 
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
])

function getCardsPostpaidPlan(session) {
    return [
        new builder.HeroCard(session)
            .title('Postpaid 50')
            .subtitle('The internet you need at the best rates')
            .images([
                builder.CardImage.create(session, 'https://2.bp.blogspot.com/-BaSSHAGxr1o/V_2_AUiAwDI/AAAAAAAAbPo/RX4k1SMyF_UAmYMu0WzYkQN-F3F_IW5yQCLcB/s1600/digi%2B50.PNG')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10201VPA&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=NL&_ga=1.98087199.1675682806.1470899460', 'Buy Now'),
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10201VPA&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=MNP&_ga=1.98087199.1675682806.1470899460', 'Port In'),
                builder.CardAction.dialogAction(session, 'ChangeOfPlans')
            ]),
        new builder.HeroCard(session)
            .title('Postpaid 80')
            .subtitle('Never go without internet')
            .images([
                builder.CardImage.create(session, 'https://2.bp.blogspot.com/-XNZiuqJSEx0/V_2_AsP7OBI/AAAAAAAAbPs/f-BL7sjDdbcMroFcRKXtTOINbwtW7S-BwCLcB/s1600/digi%2B80.PNG')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10200VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=NL&_ga=1.162140604.1675682806.1470899460', 'Buy Now'),
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10200VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=MNP&_ga=1.162140604.1675682806.1470899460', 'Port In'),
                builder.CardAction.dialogAction(session, 'ChangeOfPlans')
            ]),
        new builder.HeroCard(session)
            .title('Postpaid 110')
            .subtitle('All the internet you will ever need')
            .images([
                builder.CardImage.create(session, 'http://store.malaysiable.com/uploads/D/88/D88287702A.jpeg')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10202VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=NL&_ga=1.163698367.1675682806.1470899460', 'Buy Now'),
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10202VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=MNP&_ga=1.63176367.1675682806.1470899460', 'Port In'),
                builder.CardAction.dialogAction(session, 'ChangeOfPlans')
            ])
    ];
}


// R.5.3 - menu | FAQDialog | Prepaid
bot.dialog('getFeedback', [
    function (session) {
        var telemetry = telemetryModule.createTelemetry(session);
        appInsightsClient.trackEvent('Main|Feedback', telemetry);

        builder.Prompts.choice(session, "We would appreciate your feedback\n Do you find our Virtual Assistant userful? ", 'Yes|No', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
            case 0:
                var telemetry = telemetryModule.createTelemetry(session);
                appInsightsClient.trackEvent('Main|Feedback Yes', telemetry);

                break;
            case 1:
                var telemetry = telemetryModule.createTelemetry(session);
                appInsightsClient.trackEvent('Main|Feedback No', telemetry);

                break;
            default:
                session.send("Sorry, I didn\'t quite get that.");
                break;
        }


        session.send('Thank you for your feedback');
        session.replaceDialog('menu');
    }
])


//////////////////////////////////////////////////////////////////////////////
// All interfaces for Reference
//////////////////////////////////////////////////////////////////////////////


bot.dialog('/ref', [
    function (session) {
        builder.Prompts.choice(session, "What demo would you like to run?", "prompts|picture|cards|list|carousel|receipt|actions|quit");
    },
    function (session, results) {
        if (results.response && results.response.entity != 'quit'
            && results.response.entity != 'menu'
            && results.response.entity != 'exit'
            && results.response.entity != 'begin') {
            // Launch demo dialog
            session.beginDialog('/' + results.response.entity);
        } else {
            // Exit the menu
            session.replaceDialog('menu');
        }
    },
    function (session, results) {
        // The menu runs a loop until the user chooses to (quit).
        session.replaceDialog('/menu');
    }
]).reloadAction('reloadMenu', null, { matches: /^menu|show menu/i });

bot.dialog('/help', [
    function (session) {
        session.endDialog("Global commands that are available anytime:\n\n* menu - Exits a demo and returns to the menu.\n* goodbye - End this conversation.\n* help - Displays these commands.");
    }
]);

bot.dialog('/prompts', [
    function (session) {
        session.send("Our Bot Builder SDK has a rich set of built-in prompts that simplify asking the user a series of questions. This demo will walk you through using each prompt. Just follow the prompts and you can quit at any time by saying 'cancel'.");
        builder.Prompts.text(session, "Prompts.text()\n\nEnter some text and I'll say it back.");
    },
    function (session, results) {
        session.send("You entered '%s'", results.response);
        builder.Prompts.number(session, "Prompts.number()\n\nNow enter a number.");
    },
    function (session, results) {
        session.send("You entered '%s'", results.response);
        session.send("Bot Builder includes a rich choice() prompt that lets you offer a user a list choices to pick from. On Facebook these choices by default surface using Quick Replies if there are 10 or less choices. If there are more than 10 choices a numbered list will be used but you can specify the exact type of list to show using the ListStyle property.");
        builder.Prompts.choice(session, "Prompts.choice()\n\nChoose a list style (the default is auto.)", "auto|inline|list|button|none");
    },
    function (session, results) {
        var style = builder.ListStyle[results.response.entity];
        builder.Prompts.choice(session, "Prompts.choice()\n\nNow pick an option.", "option A|option B|option C", { listStyle: style });
    },
    function (session, results) {
        session.send("You chose '%s'", results.response.entity);
        builder.Prompts.confirm(session, "Prompts.confirm()\n\nSimple yes/no questions are possible. Answer yes or no now.");
    },
    function (session, results) {
        session.send("You chose '%s'", results.response ? 'yes' : 'no');
        builder.Prompts.time(session, "Prompts.time()\n\nThe framework can recognize a range of times expressed as natural language. Enter a time like 'Monday at 7am' and I'll show you the JSON we return.");
    },
    function (session, results) {
        session.send("Recognized Entity: %s", JSON.stringify(results.response));
        builder.Prompts.attachment(session, "Prompts.attachment()\n\nYour bot can wait on the user to upload an image or video. Send me an image and I'll send it back to you.");
    },
    function (session, results) {
        var msg = new builder.Message(session)
            .ntext("I got %d attachment.", "I got %d attachments.", results.response.length);
        results.response.forEach(function (attachment) {
            msg.addAttachment(attachment);    
        });
        session.endDialog(msg);
    }
]);

bot.dialog('/picture', [
    function (session) {
        session.send("You can easily send pictures to a user...");
        var msg = new builder.Message(session)
            .attachments([{
                contentType: "image/jpeg",
                contentUrl: "http://www.theoldrobots.com/images62/Bender-18.JPG"
            }]);
        session.endDialog(msg);
    }
]);

bot.dialog('/cards', [
    function (session) {
        session.send("You can use either a Hero or a Thumbnail card to send the user visually rich information. On Facebook both will be rendered using the same Generic Template...");

        var msg = new builder.Message(session)
            .attachments([
                new builder.HeroCard(session)
                    .title("Hero Card")
                    .subtitle("The Space Needle is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                    ])
                    .tap(builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle"))
            ]);
        session.send(msg);

        msg = new builder.Message(session)
            .attachments([
                new builder.ThumbnailCard(session)
                    .title("Thumbnail Card")
                    .subtitle("Pike Place Market is a public market overlooking the Elliott Bay waterfront in Seattle, Washington, United States.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/320px-PikePlaceMarket.jpg")
                    ])
                    .tap(builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Pike_Place_Market"))
            ]);
        session.endDialog(msg);
    }
]);

bot.dialog('/list', [
    function (session) {
        session.send("You can send the user a list of cards as multiple attachments in a single message...");

        var msg = new builder.Message(session)
            .attachments([
                new builder.HeroCard(session)
                    .title("Space Needle")
                    .subtitle("The Space Needle is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                    ]),
                new builder.HeroCard(session)
                    .title("Pikes Place Market")
                    .subtitle("Pike Place Market is a public market overlooking the Elliott Bay waterfront in Seattle, Washington, United States.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/320px-PikePlaceMarket.jpg")
                    ])
            ]);
        session.endDialog(msg);
    }
]);

bot.dialog('/carousel', [
    function (session) {
        session.send("You can pass a custom message to Prompts.choice() that will present the user with a carousel of cards to select from. Each card can even support multiple actions.");
        
        // Ask the user to select an item from a carousel.
        var msg = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                    .title("Space Needle")
                    .subtitle("The Space Needle is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                            .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/800px-Seattlenighttimequeenanne.jpg")),
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle", "Wikipedia"),
                        builder.CardAction.imBack(session, "select:100", "Select")
                    ]),
                new builder.HeroCard(session)
                    .title("Pikes Place Market")
                    .subtitle("Pike Place Market is a public market overlooking the Elliott Bay waterfront in Seattle, Washington, United States.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/320px-PikePlaceMarket.jpg")
                            .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/800px-PikePlaceMarket.jpg")),
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Pike_Place_Market", "Wikipedia"),
                        builder.CardAction.imBack(session, "select:101", "Select")
                    ]),
                new builder.HeroCard(session)
                    .title("EMP Museum")
                    .subtitle("EMP Musem is a leading-edge nonprofit museum, dedicated to the ideas and risk-taking that fuel contemporary popular culture.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Night_Exterior_EMP.jpg/320px-Night_Exterior_EMP.jpg")
                            .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Night_Exterior_EMP.jpg/800px-Night_Exterior_EMP.jpg"))
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/EMP_Museum", "Wikipedia"),
                        builder.CardAction.imBack(session, "select:102", "Select")
                    ])
            ]);
        builder.Prompts.choice(session, msg, "select:100|select:101|select:102");
    },
    function (session, results) {
        var action, item;
        var kvPair = results.response.entity.split(':');
        switch (kvPair[0]) {
            case 'select':
                action = 'selected';
                break;
        }
        switch (kvPair[1]) {
            case '100':
                item = "the Space Needle";
                break;
            case '101':
                item = "Pikes Place Market";
                break;
            case '102':
                item = "the EMP Museum";
                break;
        }
        session.endDialog('You %s "%s"', action, item);
    }    
]);

bot.dialog('/receipt', [
    function (session) {
        session.send("You can send a receipts for facebook using Bot Builders ReceiptCard...");
        var msg = new builder.Message(session)
            .attachments([
                new builder.ReceiptCard(session)
                    .title("Recipient's Name")
                    .items([
                        builder.ReceiptItem.create(session, "$22.00", "EMP Museum").image(builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/a/a0/Night_Exterior_EMP.jpg")),
                        builder.ReceiptItem.create(session, "$22.00", "Space Needle").image(builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/7/7c/Seattlenighttimequeenanne.jpg"))
                    ])
                    .facts([
                        builder.Fact.create(session, "1234567898", "Order Number"),
                        builder.Fact.create(session, "VISA 4076", "Payment Method")
                    ])
                    .tax("$4.40")
                    .total("$48.40")
            ]);
        session.send(msg);

        session.send("Or using facebooks native attachment schema...");
        msg = new builder.Message(session)
            .sourceEvent({
                facebook: {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "receipt",
                            recipient_name: "Stephane Crozatier",
                            order_number: "12345678902",
                            currency: "USD",
                            payment_method: "Visa 2345",        
                            order_url: "http://petersapparel.parseapp.com/order?order_id=123456",
                            timestamp: "1428444852", 
                            elements: [
                                {
                                    title: "Classic White T-Shirt",
                                    subtitle: "100% Soft and Luxurious Cotton",
                                    quantity: 2,
                                    price: 50,
                                    currency: "USD",
                                    image_url: "http://petersapparel.parseapp.com/img/whiteshirt.png"
                                },
                                {
                                    title: "Classic Gray T-Shirt",
                                    subtitle: "100% Soft and Luxurious Cotton",
                                    quantity: 1,
                                    price: 25,
                                    currency: "USD",
                                    image_url: "http://petersapparel.parseapp.com/img/grayshirt.png"
                                }
                            ],
                            address: {
                                street_1: "1 Hacker Way",
                                street_2: "",
                                city: "Menlo Park",
                                postal_code: "94025",
                                state: "CA",
                                country: "US"
                            },
                            summary: {
                                subtotal: 75.00,
                                shipping_cost: 4.95,
                                total_tax: 6.19,
                                total_cost: 56.14
                            },
                            adjustments: [
                                { name: "New Customer Discount", amount: 20 },
                                { name: "$10 Off Coupon", amount: 10 }
                            ]
                        }
                    }
                }
            });
        session.endDialog(msg);
    }
]);

bot.dialog('/actions', [
    function (session) { 
        session.send("Bots can register global actions, like the 'help' & 'goodbye' actions, that can respond to user input at any time. You can even bind actions to buttons on a card.");

        var msg = new builder.Message(session)
            .attachments([
                new builder.HeroCard(session)
                    .title("Space Needle")
                    .subtitle("The Space Needle is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                    ])
                    .buttons([
                        builder.CardAction.dialogAction(session, "weather", "Seattle, WA", "Current Weather")
                    ])
            ]);
        session.send(msg);

        session.endDialog("The 'Current Weather' button on the card above can be pressed at any time regardless of where the user is in the conversation with the bot. The bot can even show the weather after the conversation has ended.");
    }
]);

// Create a dialog and bind it to a global action
bot.dialog('/weather', [
    function (session, args) {
        session.endDialog("The weather in %s is 71 degrees and raining.", args.data);
    }
]);
bot.beginDialogAction('weather', '/weather');   // <-- no 'matches' option means this can only be triggered by a button.



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
