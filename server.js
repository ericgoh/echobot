var restify = require('restify');
var builder = require('botbuilder');

// integration with API.ai
var apiairecognizer = require('api-ai-recognizer');
var recognizer = new apiairecognizer('5cf3fe4b33b14c269ee4c38929bd144f');

// Get secrets from server environment
var botConnectorOptions = { 
    appId: process.env.BOTFRAMEWORK_APPID, 
    appPassword: process.env.BOTFRAMEWORK_APPSECRET
};

// Create bot
var connector = new builder.ChatConnector(botConnectorOptions);
var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.send("Hello, I'm D'bot, the Friendly Digi bot!");
        session.beginDialog('rootMenu');
    },
    function (session, results) {
        session.endConversation("Goodbye until next time...");
    }
]);

// R.1 - rootMenu |
bot.dialog('rootMenu', [
    function (session) {
        builder.Prompts.choice(session, "Just pick any of the items below to begin", 'Prepaid|Postpaid|Broadband|Roaming|Download MyDigi|FAQ|Reference');
    },
    function (session, results) {
        switch (results.response.index) {
            case 0:     // Prepaid
                session.beginDialog('PrepaidDialog');
                break;
            case 1:     // Postpaid
                session.beginDialog('PostpaidDialog');
                break;
            case 2:     // Broadband
            case 3:     // Roaming
            case 4:     // Download MyDigi
                session.send("Coming Soon");
                break;
            case 5:     // FAQ
                session.beginDialog('FaqDialog');
                break;
            case 6:
                session.beginDialog('/ref');
                break;
            default:
                session.send("Sorry, I didn't quite get that.");
                session.send("Just pick any of the items below to begin", 'Prepaid|Postpaid|Broadband|Roaming|Download MyDigi|My Account');
                session.endDialog();
                break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('rootMenu');
    }
]).reloadAction('showMenu', null, { matches: /^(menu|back)/i });

// R.1 - rootMenu | PrepaidDialog
bot.dialog('PrepaidDialog', [
    function (session) {
        builder.Prompts.choice(session, "Here are some things that I can help you with", 'Plan Recommendation|Prepaid Plans|Promotions|Internet Plans|My Account');
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
            break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('rootMenu');
    }
])


// R.0.0 - rootMenu | PrepaidDialog | PrepaidRecommendationQ1 
bot.dialog('PrepaidRecommendationQ1', [
    function (session) {
        builder.Prompts.choice(session, "Do you use a lot of voice calls?", 'Yes|No');
    },
    function (session, results) {
        switch (results.response.index) {
        case 0: // Yes
        case 1: // No
            session.beginDialog('PrepaidRecommendationQ2');
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

// R.0.0.1 - rootMenu | PrepaidDialog | PrepaidRecommendationQ1 | PrepaidRecommendationQ2
bot.dialog('PrepaidRecommendationQ2', [
    function (session) {
        builder.Prompts.choice(session, "I see.  What do you usually use your data for?", 'Social Media|Music/Videos|Data is Life!|I don\'t really use data');
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

// R.0.0.1.1 - rootMenu | PrepaidDialog | PrepaidRecommendationQ1 | PrepaidRecommendationQ2 | getCardsBestPrepaid
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

// R.0.1 - rootMenu | PrepaidDialog | getCardsPrepaidPlan
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

// R.0.4 - rootMenu | PrepaidDialog  | MyAccountPrepaid
bot.dialog('MyAccountPrepaid', [
    function (session) {
        session.send("Just let us verify your identity for a sec ");
        builder.Prompts.choice(session, "You may choose \"One Time Code\" to get a verification code sent to your phone or you can sign in via \"Connect ID\"", 'One Time Code|Connect ID');
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.beginDialog('OneTimeCode');
            break;
        case 1:
            session.beginDialog('ConnectId');
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

// R.1.4.1 - rootMenu | PrepaidDialog  | MyAccountPrepaid | OneTimeCode
bot.dialog('OneTimeCode', [
    function (session) {
        builder.Prompts.text(session, 'What is your phone number?');
    },
    function (session, results) {
        session.userData.phoneNumber = results.response;
        builder.Prompts.text(session, 'Just sent the One Time Code to you. Can you please key in the 4 digit code?');        
    },
    function (session, results) {
        session.userData.oneTimeCode = results.response;        
        session.send('Your Phone is ' + session.userData.phoneNumber + ' your code is ' + session.userData.oneTimeCode);        
        session.replaceDialog('PrepaidAccountOverview');
    }
])

// R.0.4.1.1 - rootMenu | PrepaidDialog  | MyAccountPrepaid | OneTimeCode | PrepaidAccountOverview
bot.dialog('PrepaidAccountOverview', [
    function (session) {
        builder.Prompts.choice(session, "What can we help you with?", 'Credit Balance|Internet Quota|Talktime Services|Itemized Usage|Reload|Add On');
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


// R.1 - rootMenu | PostpaidDialog
bot.dialog('PostpaidDialog', [
    function (session) {
        builder.Prompts.choice(session, "Here are some things that I can help you with", 'Postpaid Plans|Promotions|Internet Plans|My Account|FAQ');
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
        session.replaceDialog('rootMenu');
    }
])

// R.5 - rootMenu | FAQDialog
bot.dialog('FaqDialog', [
    function (session) {
        builder.Prompts.choice(session, "Soemthing to begin with", 'General|Postpaid|Broadband|Prepaid|Roaming');
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
        session.replaceDialog('rootMenu');
    }
])

// R.5.0 - rootMenu | FAQDialog | FaqGeneral
bot.dialog('FaqGeneral', [
    function (session) {
        var msg = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.ThumbnailCard(session)
                    .title("PDPA")
                    .subtitle("PDPA – what is personal data protection act ?")
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
                    .subtitle("Why I’ve been charge calling 1300 number ?")
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
        session.replaceDialog('rootMenu');
    }
])

// R.5.1 - rootMenu | FAQDialog | FaqPostpaid
bot.dialog('FaqPostpaid', [
    function (session) {
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
        session.replaceDialog('rootMenu');
    }
])

// R.5.2 - rootMenu | FAQDialog | FaqBroadband
bot.dialog('FaqBroadband', [
    function (session) {
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
        session.replaceDialog('rootMenu');
    }
])

// R.5.3 - rootMenu | FAQDialog | Prepaid
bot.dialog('FaqPrepaid', [
    function (session) {
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
        session.replaceDialog('rootMenu');
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



//////////////////////////////////////////////////////////////////////////////
// All interfaces for Reference
//////////////////////////////////////////////////////////////////////////////


bot.dialog('/ref', [
    function (session) {
        builder.Prompts.choice(session, "What demo would you like to run?", "prompts|picture|cards|list|carousel|receipt|actions|(quit)");
    },
    function (session, results) {
        if (results.response && results.response.entity != '(quit)') {
            // Launch demo dialog
            session.beginDialog('/' + results.response.entity);
        } else {
            // Exit the menu
            session.endDialog();
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
	'directory': './digi_files',
	'default': 'digi.html'
}));

server.listen(process.env.port || 3978, function () {
    console.log('%s listening to %s', server.name, server.url); 
});
