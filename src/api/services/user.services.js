const models = require('../model/index');
const cron = require('node-cron');

let userServices = (module.exports = {
  createUser: async (payLoad) => {
    let savingObjects = models.user(payLoad);
    let result = await savingObjects.save();
    return result;
  },

  findSubscribedPlayer: async (playerId, event) => {
    try {
      return await models.subscription.findOne({
        participant: playerId,
        eventId : event,
      });
    } catch (error) {
      throw createError(500);
    }
  },

  updatePlayerSubscription: async (id, status) => {
    try {
      return await models.subscription.findOneAndUpdate(
        { _id: id },
        { isAcceptedByOwner: status },
        { new: true }
      );
    } catch (error) {
      throw createError(500);
    }
  },
});

cron.schedule('*/10 * * * *', () => {
  const today = new Date().toISOString();
  if (newstartDate <= today) {
  }

  models.event
    .find({
      startDate: {
        $lte: today,
      },
    })
    .then((docs) => {
      docs.forEach((doc) => {
        if (doc.eventState === 'open') {
          models.event.findOneAndUpdate(
            {
              _id: doc._id,
            },
            {
              $set: {
                eventState: 'start',
              },
            },
            function (err) {
              if (err) throw err;
            }
          );
        } else {
          return;
        }
      });
    })
    .catch((err) => {
      console.log(err);
    });
});
