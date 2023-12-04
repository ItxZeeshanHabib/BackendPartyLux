const express = require('express');
const controller = require('../../../controller/mobile/event.controller');
const stripeController = require('../../../controller/mobile/stripe.controller');
const subscriptionController = require('../../../controller/mobile/subscription.controller');
const notificationController = require('../../../controller/mobile/notification.controller');
const cron = require('node-cron');
const { cpUpload } = require('../../../utils/upload');
const router = express.Router();
const { userValidation } = require('../../../middleware/auth');
const models = require("../../../model");

router.post(
  '/webhook-prod',
  express.raw({ type: '*/*' }),
  stripeController.paymentSucceeded
);


cron.schedule('0 * * * *', async () => {
  try {
    const eightHoursAgo = new Date();
    eightHoursAgo.setHours(eightHoursAgo.getHours() - 8);

    console.log("Hey, we are here to remove participants " + eightHoursAgo);

    // Update the query to pull participants that match the condition
    const result = await models.addEventparticipents.updateMany(
      { "Participants.addedAt": { $lt: eightHoursAgo } },
      { $pull: { "Participants": { "addedAt": { $lt: eightHoursAgo } } } }
    );

    // console.log(`Removed ${result.nModified} participants older than 8 hours.`);
  } catch (error) {
    console.error('Error removing participants:', error);
  }
});


// router.post(
//   '/hooks',
//   express.raw({ type: '*/*' }),
//   stripeController.paymentSucceeded
// );

router.route('/create-event').post(userValidation, controller.createEvent);
router.route('/event-list').get(userValidation, controller.getEventList);
router
  .route('/event-request-list/:eventId')
  .get(userValidation, controller.getEventRequestList);

router.route('/event-details').post(userValidation, controller.getEventDetails);

router
  .route('/:eventId/subscribe')
  .post(userValidation, subscriptionController.subscribeEvent);

router
  .route('/event-subscription-status')
  .post(userValidation, subscriptionController.playerSubscriptionStatusUpdate);

router
  .route('/get-pending-participant')
  .post(userValidation, subscriptionController.getPendingParticipant);

router
  .route('/subscribe-membership')
  .post(userValidation, subscriptionController.subscribeMembership);

router
  .route('/update-event/:eventId')
  .patch(userValidation, controller.updateUserEvent);

router
  .route('/stripe-payment-checkout')
  .post(userValidation, stripeController.createPaymentCheckout);

  router
  .route('/stripe-payment-withdrawl')
  .post(userValidation, stripeController.paymentWithDrawl);

router
  .route('/connect')
  .get(stripeController.connectAccount);

router
  .route('/callback')
  .get(stripeController.connectRedirectCallback);

router
  .route('/membership-payment-checkout')
  .post(userValidation, stripeController.membershipPaymentCheckout);


router
  .route('/get-pending-partner')
  .get( subscriptionController.getPendingPatner);



router
  .route('/update-status/partner')
  .post(userValidation, subscriptionController.adminApprovalForPartner);

router.route('/my-events').get(userValidation, controller.getMyEventList);

router
  .route('/validateReferenceCode')
  .post(userValidation, controller.validateRefrenceCode);

  router
  .route('/my-reserve-events')
  .get(userValidation, controller.getMyReserveEvents);

router
  .route('/my-events-history')
  .get(userValidation, controller.getMyEventsHistory);

router.route('/live-events').get(userValidation, controller.getLiveEventList);

router
  .route('/owner-live-events')
  .get(userValidation, controller.ownerLiveEventList);

router
  .route('/my-event-cancel')
  .post(userValidation, controller.eventCancelByPlayer);

router
  .route('/my-wallet-balance')
  .get(userValidation, controller.getPlayerCurrentBalance);

router
  .route('/create-fcmToken')
  .post(userValidation, notificationController.createFcmToken);

router
  .route('/get-notifications')
  .get(userValidation, notificationController.getallNotificationsData);

router
  .route('/addParticipant')
  .post(userValidation, controller.addParticipents);

router
  .route('/get-participant-detail')
  .get(controller.getParticipantDetail);

router
  .route('/remove-participant')
  .post(userValidation, controller.removeParticipant);

  router
  .route('/remove-participant-from-all-events')
  .post(userValidation, controller.removeParticipantFromAllEvents);

router
  .route('/delete-event')
  .delete(userValidation, controller.deleteEvent);

  router
  .route('/delete-notification')
  .delete(userValidation, notificationController.deleteNotification);


router
  .route('/get-participants')
  .post( controller.getparticipant);

  router
  .route('/getTopLiveEvent')
  .post( controller.getTopEvents);

  router
  .route('/udateEventState')
  .patch( userValidation ,controller.updateEventState);

  router
  .route('/geofencing')
  .post( userValidation ,controller.getBusinessHousePatiesAroundYou);

module.exports = router;
