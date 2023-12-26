const models = require('../../model');
const globalServices = require('../../services/index');
const randomOrderId = require('../../utils/global');
const User = require('../../model/users.model');
const mongoose = require('mongoose');
const firebaseAdmin = require('firebase-admin');

module.exports = {

  subscribeEvent: async (req, res) => {
    const { user } = req;
    const userId = user._id
    // .toString();

    const { eventId } = req.params;
    // const { category } = req.query;
    let { genderType, eventPrice, VipCardName, vipCardId, expirationDate, eventType, entranceCode } = req.body;

    try {
      const participant = await models.userProfile.findOne({ userId: userId });
      const reserved = await models.subscription.find({ userId: userId, eventId: eventId });

      let eventData = await models.event.findOne({
        _id: eventId
      })

      if (eventData.eventType == "private" && !eventType) {
        return globalServices.global.returnResponse(
          res,
          400,
          true,
          'In private party event type is required',
          {}
        );
      }

      if (!eventType) {
        eventType = "public"
      }

      if (eventType == "private") {
        if (!entranceCode) {
          return globalServices.global.returnResponse(
            res,
            400,
            true,
            'In private party entrence code is required',
            {}
          );
        }
        let codeFound = eventData.entrenceCode.find(obj => obj.code === entranceCode);
        if (!codeFound) {
          return globalServices.global.returnResponse(
            res,
            400,
            true,
            'Entrence code is in valid',
            {}
          );
        }
        eventPrice = codeFound.price
      }

      if (participant) {

        if (!expirationDate) {
          return globalServices.global.returnResponse(
            res,
            400, 
            true,  
            'Expiration Date is required',
            {}
          );
          }          

        const participantId = userId.toString();

        const event = await models.event.findOne({
          _id: eventId,
        })

        if (!event) {
          return globalServices.global.returnResponse(
            res,
            404,
            true,
            'event not found',
            {}
          );
        }

        const ownerUserId = event.userId;

        if (event) {

          const currentDate = new Date();

          let formatedDate = await globalServices.event.formatDateToISO(currentDate)

          const isAlreadySubscribed = await models.subscription.findOne({
            userId: userId,
            eventId: eventId,
            expirationDate: { $gt: formatedDate }
          });
          if (!isAlreadySubscribed) {
            let isAcceptedObject = {
              participant: participantId,
              eventId: eventId,
              eventOwner: ownerUserId,
              eventName: event.name,
              isAcceptedByOwner: 'accept',
              userId: userId.toString(),
              subscriptionType: 'event',
              genderType: genderType,
              price: eventPrice,
              VipCardName: VipCardName,
              vipCardId: vipCardId,
              userProfile: participantId,
              expirationDate: expirationDate,
              eventType: eventType,
              entranceCode: entranceCode
            };

            await models.subscription.create(isAcceptedObject);

            const subscription = await models.subscription.findOne({
              participant: participantId,
              eventId: eventId,
            });

            const fetchUserWallet = await models.wallet.findOne({ userId: userId });
            const fetchOwnerWallet = await models.wallet.findOne({ userId: ownerUserId });


            const orderId = randomOrderId.gererateOrderId();
            let eventName = event.name;

            if (!fetchUserWallet) {
              const walletObj = {
                userId: userId,
                transacrion: {
                  eventId: eventId.toString(),
                  transType: 'debit',
                  amount: eventPrice,
                  action: `Party On! The ${eventName} is Reserved!`
                },
              };
              await models.wallet.create(walletObj);
            } else {

              let newTransacrion = {
                eventId: eventId.toString(),
                transType: 'debit',
                amount: eventPrice,
                action: `Party On! The ${eventName} is Reserved!`
              };

              let result = await models.wallet.updateOne(
                { userId: userId },
                { $push: { transacrion: newTransacrion } }
              );
            }

            let priceAfterDetection = await globalServices.event.cutTenPercent(eventPrice);



            if (!fetchOwnerWallet) {
              const walletOwnerObj = {
                userId: ownerUserId,
                balance: priceAfterDetection,
                transacrion: [
                  {
                    eventId: eventId.toString(),
                    transType: 'credit',
                    amount: priceAfterDetection,
                    action: `${participant.username} Epic ${eventName}`,
                  },
                ],
              };
              await models.wallet.create(walletOwnerObj);
            } else {
              fetchOwnerWallet.balance += priceAfterDetection
              let newTransacrion = {
                eventId: eventId.toString(),
                transType: 'credit',
                amount: priceAfterDetection,
                action: `${participant.username} Epic ${eventName}`,
              }

              await fetchOwnerWallet.save()

              let result = await models.wallet.updateOne(
                { userId: ownerUserId },
                { $push: { transacrion: newTransacrion } }
              );
            }

            //notification .....



            let ownerNotiTitle = "Ecstatic cheers! 🎉✨"
            let ownerNotiBody = `${participant.username} Epic ${eventName}`
            let ownerNotiActionId = 'payment_received';

            let userNotiTitle = "Ecstatic cheers! 🎉✨"
            let userNotiBody = `Party On! The ${eventName} is Reserved!`;
            let userNotiActionId = 'payment_success';


            await globalServices.notification.updateNotificationType(
              ownerUserId,
              ownerNotiTitle,
              ownerNotiBody,
              ownerNotiActionId,
              eventName
            );

            await globalServices.notification.updateNotificationType(
              userId,
              userNotiTitle,
              userNotiBody,
              userNotiActionId,
              eventName
            );




            await globalServices.notification.sendNotification(
              userId, userNotiTitle, userNotiBody
            );

            await globalServices.notification.sendNotification(
              ownerUserId, ownerNotiTitle, ownerNotiBody
            );



            //   const fetchUserWallet = await models.wallet.findOne({ userId: userId });
            //   const fetchOwnerWallet = await models.wallet.findOne({ userId: ownerUserId });


            //   const orderId = randomOrderId.gererateOrderId();
            //   let eventName =  event.name ;

            //  if(!fetchUserWallet){ 
            //   const walletObj = {
            //     userId: userId,
            //     transacrion: {
            //         eventId: eventId.toString(),
            //         transType: 'debit',
            //         amount: eventPrice,
            //         action: `Party On! The ${eventName} is Reserved!`
            //       },
            //   };
            //   await models.wallet.create(walletObj);
            // }else{

            //   let newTransacrion = {
            //     eventId: eventId.toString(),
            //     transType: 'debit',
            //     amount: eventPrice,
            //     action: `Party On! The ${eventName} is Reserved!`
            //   };

            //   let result = await models.wallet.updateOne(
            //     { userId: userId },
            //     { $push: { transacrion : newTransacrion } }
            //   );
            // }

            // let priceAfterDetection = await globalServices.event.cutTenPercent(eventPrice);



            // if(!fetchOwnerWallet){ 
            //   const walletOwnerObj = {
            //     userId: ownerUserId,  
            //     balance : priceAfterDetection,
            //     transacrion: [
            //       {
            //         eventId: eventId.toString(),
            //         transType: 'credit',
            //         amount: priceAfterDetection,
            //         action: `${participant.fullName} Epic ${eventName}`,
            //       },
            //     ],
            //   };
            //   await models.wallet.create(walletOwnerObj);
            // }else{
            //   fetchOwnerWallet.balance += priceAfterDetection
            //   let newTransacrion =  {
            //     eventId: eventId.toString(),
            //     transType: 'credit',
            //     amount: priceAfterDetection,
            //     action: `${participant.fullName} Epic ${eventName}`,
            //   }

            //   await fetchOwnerWallet.save()

            //   let result = await models.wallet.updateOne(
            //     { userId: ownerUserId },
            //     { $push: { transacrion : newTransacrion } }
            //   );
            // }

            //notification .....



            // let ownerNotiTitle = "Ecstatic cheers! 🎉✨" 
            // let ownerNotiBody = `${participant.fullName} Epic ${eventName}`
            // let ownerNotiActionId = 'payment_received';

            // let userNotiTitle = "Ecstatic cheers! 🎉✨" 
            // let userNotiBody = `Party On! The ${eventName} is Reserved!`;
            // let userNotiActionId = 'payment_success';


            // await globalServices.notification.updateNotificationType(
            //   ownerUserId,
            //   ownerNotiTitle,
            //   ownerNotiBody,
            //   ownerNotiActionId,
            //   eventName
            // );

            // await globalServices.notification.updateNotificationType(
            //   userId,
            //   userNotiTitle,
            //   userNotiBody,
            //   userNotiActionId,
            //   eventName
            // );




            // await globalServices.notification.sendNotification(
            //   userId,userNotiTitle,userNotiBody
            // );

            // await globalServices.notification.sendNotification(
            //   ownerUserId,ownerNotiTitle,ownerNotiBody
            // );


            globalServices.global.returnResponse(
              res,
              200,
              false,
              'You have subscribed this event successfully!',
              {}
            );

          } else {
            return globalServices.global.returnResponse(
              res,
              200,
              false,
              'you have already subscribed this event!'
            );
          }
        } else {
          return globalServices.global.returnResponse(
            res,
            404,
            false,
            'Event not found!'
          );
        }
      } else {
        globalServices.global.returnResponse(
          res,
          404,
          false,
          'No participant found!',
          {}
        );
      }
    } catch (err) {
      res.status(500).json(err);
    }
  },

  adminApprovalForPartner: async (req, res) => {
    const { user } = req;
    const userRole = user.role;
    let payLoad = req.body;

    if (userRole !== 'admin') {
      res.status(401).send({
        error: true,
        status: 401,
        msg: 'Only admin can approve or reject!',
      });
      return;
    }

    if (!payLoad.userId || !payLoad.businessId || !payLoad.isApproved) {
      return globalServices.global.returnResponse(
        res,
        400,
        true,
        'Required fileds are missing',
        {}
      );
    }

    try {
      const partner = await models.partner.findOne({
        _id: payLoad.businessId,
        userId: payLoad.userId
      });

      if (!partner) {
        globalServices.global.returnResponse(
          res,
          404,
          true,
          'No request found for bussiness!',
          {}
        );
        return;
      }

      if (partner.bussinessStatus != "approved") {
        const updatedPartner = await models.partner.findOneAndUpdate(
          { _id: partner._id },
          {
            bussinessStatus: payLoad.isApproved,
          },
          { new: true }
        )

        return globalServices.global.returnResponse(
          res,
          200,
          false,
          `request is ${payLoad.isApproved} for bussiness by admin!`,
          updatedPartner
        );
      } else {
        return globalServices.global.returnResponse(
          res,
          200,
          false,
          `bussiness is already Approved`,
          partner
        );
      }
    } catch (err) {
      res.status(500).json(err);
    }
  },

  getPendingPatner: async (req, res) => {


    try {
      const partner = await models.partner.find({
        bussinessStatus: "pending"
      });

      console.log("partner " + partner)

      if (!partner) {
        globalServices.global.returnResponse(
          res,
          404,
          true,
          'No request are present to approved',
          {}
        );
        return;
      }




      return globalServices.global.returnResponse(
        res,
        200,
        false,
        `the list of pending bsiness are given below`,
        partner
      );

    } catch (err) {
      res.status(500).json(err);
    }
  },

  subscribeMembership: async (req, res) => {
    try {
      const { user } = req;
      const userId = user._id.toString();
      const payLoad = req.body;
      const currentDate = new Date();
      const participant = await models.userProfile.findOne({ userId });

      if (!participant) {
        return globalServices.global.returnResponse(res, 401, false, 'You have not set up your profile yet');
      }

      const participantId = participant._id.toString();
      const membership = await models.membership.findOne({ userId });

      if (membership && membership.membershipType === 'vip' && membership.expirationDate > currentDate) {
        return globalServices.global.returnResponse(res, 200, false, 'You have already subscribe this membership successfully!');
      }

      Object.assign(payLoad, {
        userId: userId,
        participant: participantId,
      });

      let result;

      if (membership) {
        result = await models.membership.findOneAndUpdate({ userId }, payLoad, { new: true });
      } else {
        result = await globalServices.event.createMembershipByUser(payLoad);
      }

      await models.subscription.updateMany({ userId: result.userId }, { $set: { membershipType: result.membershipType } });

      const subs = await models.subscription.findOne({ userId: result.userId });
      await models.userProfile.findOneAndUpdate({ userId: mongoose.Types.ObjectId(subs.userId) }, { $set: { membershipType: subs.membershipType } }, { new: true });

      const fetchUserWallet = await models.wallet.findOne({ userId });

      const newTransaction = {
        membershipType: payLoad.membershipType,
        transType: 'debit',
        amount: payLoad.amount,
        action: `Unlock premium perks with our monthly membership!`,
      };

      if (!fetchUserWallet) {
        const walletObj = { userId, transaction: [newTransaction] };
        await models.wallet.create(walletObj);
      } else {
        await models.wallet.updateOne({ userId }, { $push: { transaction: newTransaction } });
      }

      const NotiTitle = 'Ecstatic cheers! 🎉✨';
      const NotiBody = `Unlock premium perks with our monthly ${payLoad.membershipType} membership!`;
      const NotiActionId = 'membership_subscription';

      await globalServices.notification.updateNotificationType(userId, NotiTitle, NotiBody, NotiActionId, payLoad.membershipType);

      await globalServices.notification.sendNotification(
        userId,NotiTitle,NotiBody
      );

      globalServices.global.returnResponse(res, 200, false, 'You have subscribed this membership successfully!', result);
    } catch (err) {
      res.status(500).json(err);
    }
  },


  getPendingParticipant: async (req, res) => {

    let { eventId } = req.body;
    let { user } = req;
    const userId = user._id;
    try {

      let { limit, page } = req.query;

      limit = limit ? limit : 5;
      page = page ? page : 1;
      const queryLimit = parseInt(limit);

      if (!eventId) {
        return globalServices.global.returnResponse(
          res,
          400,
          true,
          'eventId is required',
          {}
        );
      }

      const eventDetail = await models.event.findOne({
        _id: eventId
      });

      console.log("eventDetail.userId " + eventDetail.userId)
      console.log(eventDetail.userId == userId)


      if (eventDetail.userId.toString() === userId.toString()) {

        let result = await models.subscription.aggregate([
          {
            $match: {
              eventId: mongoose.Types.ObjectId(eventId),
              isAcceptedByOwner: "pending",
            },
          },
          { $skip: limit * page - queryLimit },
          { $limit: queryLimit },
          { $sort: { createdAt: -1 } },
          {
            $lookup: {
              from: "users",
              localField: "participant",
              foreignField: "_id",
              pipeline: [
                {
                  $lookup: {
                    from: "userprofiles",
                    localField: "_id",
                    foreignField: "userId",
                    as: "profile",
                  },
                },
                {
                  $unwind: { path: "$profile", preserveNullAndEmptyArrays: true },
                },
                {
                  $project: {
                    profile: {
                      profileImage: "$profile.profileImage",
                      description: "$profile.description",
                      age: "$profile.age",
                      gender: "$profile.gender",
                      phoneNumber: "$profile.phoneNumber",
                      location: "$profile.location",
                      hobbies: "$profile.hobbies",
                      interests: "$profile.interests",
                      isPrivate: "$profile.isPrivate",
                      phoneCode: "$profile.phoneCode",
                      joinedEvents: "$profile.joinedEvents",
                    },
                    username: 1,
                    email: 1,
                    _id: 1,
                  },
                },
              ],
              as: "userDetail",
            },
          },
          { $unwind: { path: "$userDetail", preserveNullAndEmptyArrays: true } },
        ]);

        if (!result) {
          return globalServices.global.returnResponse(
            res,
            404,
            true,
            'No request are present to accept',
            {}
          );

        }
        return globalServices.global.returnResponse(
          res,
          200,
          false,
          `the list of pending participant to join are given below`,
          result
        );
      } else {
        return globalServices.global.returnResponse(
          res,
          401,
          true,
          `Only event owner can accpet or reject participant`,
          {}
        );
      }
    } catch (err) {
      res.status(500).json(err);
    }
  },

  playerSubscriptionStatusUpdate: async (req, res) => {
    try {
      let { participantId, eventId, status } = req.body;
      let { user } = req;
      const userId = user._id.toString();

      const playerId = participantId.toString();
      const event = eventId.toString();

      let player = await globalServices.user.findSubscribedPlayer(
        playerId,
        event
      );

      const eventOwner = player?.eventOwner.toString();

      if (eventOwner !== userId) {
        res.status(400).send({
          error: true,
          status: 400,
          msg: 'Only Event owner can accept or reject user participat!',
        });
        return;
      }

      const playerName = await models.userProfile.findOne({
        userId: participantId,
      });

      const eventDetail = await models.event.findOne({
        _id: eventId,
      });


      const id = player._id.toString(); // subscription _id

      if (player && player.isAcceptedByOwner === 'pending') {
        let result = await globalServices.user.updatePlayerSubscription(
          id,
          status
        );
        let priceAfterDetection = globalServices.event.cutTenPercent(player?.price);
        const fetchUserWallet = await models.wallet.findOne({ userId: participantId });
        const fetchOwnerWallet = await models.wallet.findOne({ userId: eventOwner });

        if (result && status === 'accept') {



          console.log("player?.price " + player?.price)

          if (!fetchOwnerWallet) {
            const walletOwnerObj = {
              userId: eventOwner,
              balance: priceAfterDetection,
              transacrion: [
                {
                  eventId: eventId.toString(),
                  transType: 'credit',
                  amount: priceAfterDetection,
                  action: `${playerName.fullName} Epic ${eventDetail.name}`,
                },
              ],
            };
            await models.wallet.create(walletOwnerObj);
          } else {
            fetchOwnerWallet.balance += priceAfterDetection
            let newTransacrion = {
              eventId: eventId.toString(),
              transType: 'credit',
              amount: priceAfterDetection,
              action: `${playerName.fullName} Epic ${eventDetail.name}`,
            }

            await fetchOwnerWallet.save()

            let result = await models.wallet.updateOne(
              { userId: eventOwner },
              { $push: { transacrion: newTransacrion } }
            );
          }

          const subscriptionData = await models.subscription.findOne({
            _id: id,
          });

          // notification ...

          let title = 'Accepted By Event Owner!';
          let content = `You have accepted by event owner for subscription of ${subscriptionData?.eventName}`;
          let actionId = 'event_accepted';

          await globalServices.notification.updateNotificationType(
            playerId,
            title,
            content,
            actionId,
            subscriptionData?.eventName
          );

          //  await globalServices.notification.sendNotification(
          //   participantId,title,content
          //   );

          // owner notification

          let newTitle = 'User Successfuly Enroled in the Event!';
          let newContent = `${playerName?.fullName} has participated in the ${subscriptionData?.eventName}`;
          let newActionId = 'event_enroled';

          await globalServices.notification.updateNotificationType(
            userId,
            newTitle,
            newContent,
            newActionId,
            subscriptionData?.eventName
          );

          // await globalServices.notification.sendNotification(
          //   eventOwner ,newTitle,newContent
          //   );

          globalServices.global.returnResponse(
            res,
            200,
            false,
            'User has accepted by Owner!',
            subscriptionData
          );
        } else if (result && status === 'reject') {


          if (!fetchUserWallet) {
            const walletOwnerObj = {
              userId: playerId,
              balance: priceAfterDetection,
              transacrion: [
                {
                  eventId: eventId.toString(),
                  transType: 'credit',
                  amount: priceAfterDetection,
                  action: `${playerName.fullName} Epic ${eventDetail.name}`,
                },
              ],
            };
            await models.wallet.create(walletOwnerObj);
          } else {
            fetchUserWallet.balance += priceAfterDetection
            let newTransacrion = {
              eventId: eventId.toString(),
              transType: 'credit',
              amount: priceAfterDetection,
              action: `${playerName.fullName} Epic ${eventDetail.name}`,
            }

            await fetchUserWallet.save()

            let result = await models.wallet.updateOne(
              { userId: playerId },
              { $push: { transacrion: newTransacrion } }
            );
          }


          const subscriptionData = await models.subscription.findOne({
            _id: id,
          });

          let title = 'Rejected By Event Owner!';
          let content = `You have Rejected by event owner for subscription of ${subscriptionData?.eventName}`;
          let actionId = 'event_rejected';

          await globalServices.notification.updateNotificationType(
            playerId,
            title,
            content,
            actionId,
            subscriptionData?.eventName
          );



          globalServices.global.returnResponse(
            res,
            200,
            false,
            'User has rejected by Owner! payment will be sent to your wallet',
            subscriptionData
          );


          // const updateWallet = await models.wallet.findOneAndUpdate

          // const refunded = await globalServices.stripe.paymentRefundToPlayer(
          //   playerUserId.user,
          //   eventId
          // );

          // console.log('refunded to player', refunded);

          // if (refunded.status === 'succeeded') {
          //   globalServices.global.returnResponse(
          //     res,
          //     200,
          //     false,
          //     'Sei rifiutato da fitner e i tuoi pagamenti sono stati rimborsati',
          //     {}
          //   );
          // } else {
          //   globalServices.global.returnResponse(
          //     res,
          //     400,
          //     true,
          //     'Something went wrong while refunded payments by stripe!',
          //     {}
          //   );
          //   return;
          // }
        } else {
          globalServices.global.returnResponse(
            res,
            401,
            true,
            'status is not valid!',
            {}
          );
        }
      } else if (player.isAcceptedByOwner === 'accept') {
        globalServices.global.returnResponse(
          res,
          401,
          true,
          'User has already accepted!',
          {}
        );
      } else if (player.isAcceptedByOwner === 'reject') {
        globalServices.global.returnResponse(
          res,
          401,
          true,
          'User has already rejected!',
          {}
        );
      } else {
        globalServices.global.returnResponse(
          res,
          404,
          true,
          'User or event not exist with this id!',
          {}
        );
      }
    } catch (err) {
      console.log(err);
      res.status(500).json(err);
    }
  },










};
