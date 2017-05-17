var builder = require('botbuilder');

var PhoneRegex = new RegExp(/^01\d{8,9}$$/);       // Format = 01xxxxxxxxx
var EmailRegex = new RegExp(/[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/);

var lib = new builder.Library('validators');

lib.dialog('notes',
    builder.DialogAction.validatedPrompt(builder.PromptType.text, function (response) {
        return response && response.length <= 200;
    }));

lib.dialog('phonenumber',
    builder.DialogAction.validatedPrompt(builder.PromptType.text, function (response) {
        return PhoneRegex.test(response);
    }));

lib.dialog('email',
    builder.DialogAction.validatedPrompt(builder.PromptType.text, function (response) {
        return EmailRegex.test(response);
    }));
  
lib.dialog('otp',
    builder.DialogAction.validatedPrompt(builder.PromptType.text, function (response) {
    console.log ("otp = " + session.userData.oneTimeCode);
        return response == '1234';
    }));
//lib.dialog('otp', [
//    function (session, args, next) {
//        var otp = session.userData.oneTimeCode;
//console.log("one time code = " + otp);
//        builder.DialogAction.validatedPrompt({
//            prompt: session.gettext('I have just sent the One Time Code to you. Can you please key in the 4 digit code?'),
//            retryPrompt: session.gettext('Sorry, the code is incorrect. Let\'s try 1 more time'),
//            maxRetries: 1
//        }, function (response) {
//            return response == '1234';
//        })
//    }]);

// Export createLibrary() function
module.exports.createLibrary = function () {
    return lib.clone();
};

module.exports.PhoneRegex = PhoneRegex;
module.exports.EmailRegex = EmailRegex;