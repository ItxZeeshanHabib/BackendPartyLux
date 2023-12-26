const globalServices = require('../../services/index');
const stripe = require('../../utils/stripe');
const modals = require('../../model');
const Stripe = require('stripe');


// **************** Stripe checkout ********************************
module.exports = {
  createPaymentCheckout: async (req, res) => {
    try {
    const { user } = req;
    const userRole = user.role;
    const userId = user._id;
    let { eventName, eventId , entranceCode , eventType , expirationDate , eventPrice } = req.body;

    let eventData = await modals.event.findOne({
      _id: eventId
    })  

    if(!eventType){
      return  globalServices.global.returnResponse(
        res,
        400,
        true,
        'event Type is required',
        {}
      );
    }

    if(eventType == "private"){
      console.log("hey i am here")
      if(!entranceCode){
        return  globalServices.global.returnResponse(
          res,
          400,
          true,
          'In private party entrence code is required',
          {}
        );
      }
      let codeFound = eventData.entrenceCode.find(obj => obj.code === entranceCode);
      if(!codeFound){
        return  globalServices.global.returnResponse(
          res,
          400,
          true,
          'Entrence code is in valid',
          {}
        );
      }
      eventPrice = codeFound.price
      console.log("eventPrice" + eventPrice)
    }



    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: eventData.name,
            },
            unit_amount: eventPrice * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',

      success_url: 'https://www.dev.admin.fitner.it/checkout-success',
      cancel_url: 'https://www.dev.admin.fitner.it/checkout-cancel',
      customer_email: user.email,
    });

    const currentDate = new Date();

    let formatedDate = await globalServices.event.formatDateToISO(currentDate);

    const isAlreadySubscribed = await modals.stripePayment.findOne({
      eventSubscriber: userId,
      eventId: eventId,
      expirationDate: { $gt: formatedDate  }
    });

    // console.log("isAlreadySubscribed" + isAlreadySubscribed)

    if (session && session.id && session.url !== '') {
      let checkout = await modals.stripePayment.findOne({
        eventSubscriber : userId,
        eventId: eventId,
      });

      if (checkout && checkout._id  && checkout.paymentStatus === 'paid' && isAlreadySubscribed) {
        globalServices.global.returnResponse(
          res,
          400,
          true,
          'You have already paid for this event!',
          {}
        );
        return;
      }

      if (checkout && checkout.paymentStatus === 'unpaid') {

        const updatePayLoad = {
          paymentUrl: session.url,
          eventPrice : eventPrice ,
        };
        const updatedResult = await modals.stripePayment.findOneAndUpdate(
          {_id : checkout._id},
          { $set: updatePayLoad },
          { new: true }
        );
        globalServices.global.returnResponse(
          res,
          200,
          false,
          'Payment checkout successfull!',
          updatedResult
        );

        return;
      }

      // console.log("i am in unpaid ")

      if (!isAlreadySubscribed) {
        let result = await modals.stripePayment.create({
          eventSubscriber: user._id,
          customerId: session.id,
          paymentIntent: session.payment_intent,
          eventPrice: eventPrice,
          eventId: eventId,
          // eventCategory : category,
          eventName: eventData.name,
          currency: session.currency,
          mode: session.mode,
          paymentStatus: session.payment_status,
          paymentMethodTypes: session.payment_method_types,
          paymentUrl: session.url,
          expirationDate : expirationDate
        });

        if (result && result._id) {
          globalServices.global.returnResponse(
            res,
            200,
            false,
            'Payment checkout successfull!',
            result
          );
        } else {
          globalServices.global.returnResponse(
            res,
            400,
            true,
            'Payment checkout not saved!',
            {}
          );
        }
      }
    } else {
      globalServices.global.returnResponse(
        res,
        401,
        true,
        'Stripe checkout session not created!',
        {}
      );
    }
    } catch (err) {
      res.status(500).json(err);
    }
  },

  membershipPaymentCheckout: async (req, res) => {
    try {
      const { user } = req;
      const userId = user._id;
      let { membershipType, membershipFee } = req.body;


      if(membershipType == "free"){
        return globalServices.global.returnResponse(
          res,
          400,   // Change the status code to 400
          true,  // Error flag set to true
          'Membership type could not be free',
          {}
        );
        
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: membershipType,
              },
              unit_amount: membershipFee * 100,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',

        success_url: 'https://www.dev.admin.fitner.it/checkout-success',
        cancel_url: 'https://www.dev.admin.fitner.it/checkout-cancel',
        customer_email: user.email,
      });

      if (session && session.id && session.url !== '') {
        let checkout = await modals.membershipPayments.findOne({
          userId: userId,
        });

        if (
          checkout &&
          checkout._id &&
          checkout.isExpired === false &&
          checkout.paymentStatus === 'paid'
        ) {
          globalServices.global.returnResponse(
            res,
            400,
            true,
            'You have already paid for this membership!',
            {}
          );
          return;
        }

        if (checkout && checkout.paymentStatus === 'unpaid') {
          const updatePayLoad = {
            paymentUrl: session.url,
          };

          const updatedResult =
            await modals.membershipPayments.findOneAndUpdate(
              { _id: checkout._id },
              { $set: updatePayLoad },
              { new: true }
            );

          globalServices.global.returnResponse(
            res,
            200,
            false,
            'Payment checkout successfull for membership!',
            updatedResult
          );

          return;
        }

        if (!checkout) {
          let result = await modals.membershipPayments.create({
            userId: userId,
            customerId: session.id,
            paymentIntent: session.payment_intent,
            membershipType: membershipType,
            membershipFee: membershipFee,
            currency: session.currency,
            mode: session.mode,
            paymentStatus: session.payment_status,
            paymentMethodTypes: session.payment_method_types,
            paymentUrl: session.url,
          });

          if (result && result._id) {
            globalServices.global.returnResponse(
              res,
              200,
              false,
              'Payment checkout successfull for membership!!',
              result
            );
          } else {
            globalServices.global.returnResponse(
              res,
              400,
              true,
              'Payment checkout not saved!',
              {}
            );
          }
        }
      } else {
        globalServices.global.returnResponse(
          res,
          401,
          true,
          'Stripe checkout session not created!',
          {}
        );
      }
    } catch (err) {
      res.status(500).json(err);
    }
  },

  paymentSucceeded: async (request, response) => {
    const payload = request.body;
    const payloadString = JSON.stringify(payload, null, 2);
    const secret = process.env.STRIPE_WEBHOOK_SIGNATURE;
    const header = stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret,
    });
    let event;
    try {
      // *************************************************************
      event = stripe.webhooks.constructEvent(payloadString, header, secret);
    } catch (err) {
      console.log('error found in webhook', err.message);
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle the event
    console.log( "YS IT WORKS" + event.type);
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log("paymentIsdaassdadsadntent " + paymentIntent.payment_intent)
        if (paymentIntent) {
          try {
            const paymentId = paymentIntent.id;
            const status = paymentIntent.status;
            let updated = await globalServices.stripe.updatePaymentStatus(
              paymentId,
              event.type,
              status
            );
          } catch (err) {
            console.log('error found in stripe', err.message);
            return;
          }
        }
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    response.send();
  },

connectAccount: async (req,res) => {

  const scopes = [
    'read_write',
    'payment_method:read',
  ];

  const state = 'qwertyuiopasdfghjklzxcvbnm'; // Replace with a random string to prevent CSRF attacks
  const authorizeUrl = stripe.oauth.authorizeUrl({
    client_id: 'ca_OLXCuyr67s9uKKNNFmb3A54h49CryjHA', // Replace with your Stripe client ID
    scope: 'read_write',// Adjust scopes as needed based on your requirements
    // redirect_uri: REDIRECT_URI,
    state,
  });

  console.log("authorizeUrl " + authorizeUrl ) 

  res.redirect(authorizeUrl);
},


connectRedirectCallback : async (req,res) => {
  const { code, state } = req.query;
  const payoutAmount = 100; 
  const currency = 'usd';

  if (state !== 'qwertyuiopasdfghjklzxcvbnm') {
    return res.status(400).send('Invalid state parameter');

  }

  try {
    const tokenResponse = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    const connectedAccount = await stripe.accounts.retrieve(tokenResponse.stripe_user_id);
    
    const connectedAccountId = connectedAccount.id;

    const externalAccounts = await stripe.accounts.listExternalAccounts(connectedAccountId, { limit: 100 });

     externalAccounts.data.forEach((account) => {
      console.log('External Account ID:', account.id);
      console.log('Account Currency:', account.currency);
});

const externalAccount =  stripe.accounts.createExternalAccount(connectedAccountId, {
  external_account: 'bank_account',
  country: 'US',
  currency: 'usd',
  account_number: '000123456789', 
  routing_number: '110000000', 
})

const payout = stripe.payouts.create({
  amount: payoutAmount,
  currency: currency,
  destination: externalAccount.id,
  method: 'standard',
})
  res.status(200).json(connectedAccount)
  } catch (err) {
    console.error('Error during OAuth callback:', err);
    res.redirect('/error');
  }
},
  paymentWithDrawl : async (req,res) => {
    // const { amount, bankAccountNumber, routingNumber, accountHolderName, country } = req.body;
    const { name, email, address, contact_info, currency } = req.body;
    const { user } = req;
    // const userRole = user.role;
    const userId = "cus_OLfK3C9mAxw7Wl";

    stripe.tokens.create({
      bank_account: {
          country: 'US',
          currency: 'usd',
          routing_number: '110000000', // A test routing number for US accounts
          account_number: '000123456789', // A test account number for US accounts
          account_holder_name: 'Jenny Rosen', // Name of the account holder
          account_holder_type: 'individual',
      }
  }, function(err, token) {
      // asynchronously called
      if(err) {
          console.log(err);
          res('REQUEST ERROR');
      } else {
        console.log("token" + token)
          let userID = userId;
          let param = {
              source: token.id
          };

          stripe.customers.createSource(
              userID,
              param,
              async function(err, bank_account) {
                  // asynchronously called
                  if(err) {
                      console.log(err);
                      // res('REQUEST ERROR');
                  } else {
  
                  
                      res.json(bank_account);
                  }
              }
          );
      }
  });

  // stripe.transfers.create(
  //   {
  //    amount: 500,
  //    currency: 'usd',
  //    destination: "ba_1NaBYHEQeufHHynAjQtlXOf0",
  //   },
  //          function(err, payout) {
  //              // asynchronously called
  //              if(err) {
  //                  console.log(err);
  //                 //  res('REQUEST ERROR');
  //              } else {
  //                 //  res.json(payout);
  //                 consle.log(payout)
  //              }
  //          })

// try {

//   const payout = await stripe.payouts.create({
//   amount: 500,
//   currency: 'usd',
// });

// const externalAccountData = req.body;

// const externalAccount = await stripe.accounts.createExternalAccount(
//   connectedAccountId,
//   externalAccountData
// );

// // Create a transfer to the external account
// const transfer = await stripe.transfers.create({
//   amount: 10000, // Replace with the desired payout amount in cents
//   currency: 'usd', // Replace with the desired payout currency
//   destination: externalAccount.id,
//   source_transaction: null, // Set this to null for standard transfers (not related to a specific charge)
// });

//   // const account = await stripe.accounts.create({
//   //   type: 'express', // You can also use 'standard' or 'custom' based on your needs
//   //   country: 'US', // Replace with the appropriate country code
//   //   email,
//   //   // Website :contact_info.website, 
//   //   business_profile: {
//   //     name,
//   //     // phone: contact_info,
//   //     // url: contact_info.website, 
//   //   },
//   //   capabilities: {
//   //     card_payments: { requested: true }, // Enable card payments capability
//   //     transfers: { requested: true }, // Enable transfers capability
//   //   },
//   //   settings: {
//   //     payouts: {
//   //       schedule: {
//   //         interval: 'daily', // Payout schedule (daily, weekly, monthly, etc.)
//   //       },
//   //       statement_descriptor: 'Your Business Name', // Statement descriptor for payouts
//   //     },
//   //   },
//   //   external_account: { // Add an external bank account to receive payouts
//   //     object: 'bank_account',
//   //     country: 'US', // Replace with the appropriate country code
//   //     currency,
//   //     account_number: '000123456789', // Add the account number
//   //     routing_number: '110000000', // Add the routing number
//   //   },
//   // });

//   // const externalAccountId = account.data.external_accounts.data[0].id;

// // console.log("External Account ID:", externalAccountId);

//   // const externalAccounts = await stripe.accounts.listExternalAccounts(account.id, {
//   //   object: 'bank_account',
//   // });

//   // console.log("externalAccounts" + externalAccounts)

//   // const connectedAccount = await stripe.accounts.create({
//   //   type: 'standard', // or 'express' or 'custom'
//   //   country: 'US', // Replace with the desired country code
//   //   email: 'zamanhabib@gmail.com', // Replace with the connected account's email
//   // });

//   // const bankAccountToken = await stripe.tokens.create({
//   //   bank_account: {
//       // country: 'US',
//       // currency: 'usd',
//       // routing_number: '110000000', // A test routing number for US accounts
//       // account_number: '000123456789', // A test account number for US accounts
//       // account_holder_name: 'Jenny Rosen', // Name of the account holder
//       // account_holder_type: 'individual', // 'individual' or 'company'
//   //   },
//   // });

//   // const externalAccount = await stripe.accounts.createExternalAccount(
//   //   "ca_OLXCuyr67s9uKKNNFmb3A54h49CryjHA",
//   //   {
//   //     external_account: "ba_1NZoO3E75P3Pgxh1Y43EXEdO",
//   //   }
//   // );

//   // const payout = await stripe.payouts.create({
//   //   amount: 1000, // Amount in cents
//   //   currency : "usd",
//   //   destination: "ba_1NZwzyE782SyE1qhrrOfSbBO", // Use the external account ID as the destination
//   //   // stripe_account: account.id,
//   // },
//   // {
//   //   stripeAccount:  account.id, // Specify the connected account ID for the payout
//   // });
//   // const getPayout = await stripe.payouts.retrieve(payout.id);
//   // console.log('Payout status:', getPayout.status);


//   return globalServices.global.returnResponse(
//     res,
//     401,
//     true,
//     'Payment has been successfully withdrawn',
//     payout
//   );
// } catch (error) {
//   console.error('Error processing payout:', error);
// }
  }
}
