const models = require('../model/index');
let cardServices = (
  module.exports = {
  createVipCard: async (payLoad) => {
    let savingObjects = models.vipCard(payLoad);
    let result = await savingObjects.save();
    return result;
  },

  updateVipCard: async (id, payload) => {
      return await models.vipCard.findOneAndUpdate(
        { eventId : id },
        {
          $set: payload,
        },
        { new: true }
      )
  }
}
);
