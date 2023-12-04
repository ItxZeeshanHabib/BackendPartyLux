const globalServices = {};

globalServices.global = require('./global.services');
globalServices.event = require('./event.services');
globalServices.partner = require('./partner.services');
globalServices.card = require('./card.services');
globalServices.user = require('./user.services');
globalServices.userProfile = require('./userProfile.services')
globalServices.stripe = require('./stripe.services');
globalServices.notification = require('./notification.services')
module.exports = globalServices;
