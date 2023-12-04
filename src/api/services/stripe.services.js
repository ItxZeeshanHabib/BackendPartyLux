const models = require('../model/index');

// *************************************************************************
let stripeServices = (module.exports = {
  // **********************************************************************

  updatePaymentStatus: async (paymentId, event, status) => {
    try {
      if (event === 'payment_intent.succeeded' && status === 'succeeded') {
        return await models.stripePayment.findOneAndUpdate(
          { paymentIntent: paymentId },
          {
            paymentStatus: 'paid',
          },
          { new: true }
        );
      } else {
        console.log('payment not succeeded');
      }
    } catch (error) {
      throw createError(500);
    }
  },

  findPaymentsByObjects: (payLoad) =>
    new Promise((resolve, reject) =>
      models.stripePayment
        .findOne(payLoad)
        .then((data) => resolve(data))
        .catch((error) => {
          console.log('error => findPaymentsByObjects:', error);
          reject('');
        })
    ),

  // **********************************************************************
});
