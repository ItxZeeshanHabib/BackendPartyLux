const mongoose = require('mongoose');
const globalServices = require('../../services/index');

const models = require('../../model');

module.exports = {
   createFcmToken: async (req, res) => {
    try {
      const { user } = req;
      const userRole = user.role;
      const userId = user._id.toString();

      const fcmToken = req.body.fcm_token;

      if (!fcmToken) {
        res.status(400).send({
          error: true,
          status: 400,
          msg: 'Missing fcmToken',
        });
        return;
      }

      const records = {
        user: userId,
        fcmToken: fcmToken,
        role: userRole,
      };

      let checkUser = await globalServices.notification.findUserByObjects({
        user: userId,
      });

      if (!checkUser) {
        let saved = await globalServices.notification.saveFcmToken(records);
        return globalServices.global.returnResponse(
          res,
          200,
          false,
          'Fcm token created and saved!',
          saved
        );
      } else if (checkUser && checkUser.fcmToken !== fcmToken) {
        let updated = await globalServices.notification.updateFcmToken(
          checkUser._id,
          fcmToken
        );
        return globalServices.global.returnResponse(
          res,
          200,
          false,
          'Fcm token updated!',
          updated
        );
      } else {
        return globalServices.global.returnResponse(
          res,
          200,
          false,
          'Fcm token already saved!',
          {}
        );
      }
    } catch (err) {
      res.status(500).json(err);
    }
  },

  getallNotificationsData: async (req, res) => {
    try {
      const { user } = req;
      const userId = user._id.toString();

      const result = await globalServices.notification.getallNotifications(
        userId
      );

      if (result) {
        return globalServices.global.returnResponse(
          res,
          200,
          false,
          'All notifications!',
          result
        );
      } else {
        return globalServices.global.returnResponse(
          res,
          404,
          false,
          'No notifications found for this user!',
          {}
        );
      }
    } catch (err) {
      res.status(500).json(err);
    }
  },

  deleteNotification : async (req,res) => {
    const { notiObjectId } = req.body;

    let { user } = req;
    let userId = user._id; 

    try {

    const notiExist = await models.notification.findOne({ "types._id" : notiObjectId }) ;
     
      if(!notiObjectId){
        return globalServices.global.returnResponse(
          res,
          400,   // Change the status code to 400
          true,  // Error flag set to true
          "Notification Object ID is required",
          {}
        );
        
       }

     if(!notiExist){
      return globalServices.global.returnResponse(
        res,
        404,
        true,
        "Against this id no notification are avaliable",
        {}
      );
     }


    let result = await models.notification.updateOne(
      { user: userId},
      { $pull: { types: { _id: notiObjectId } } }
    );

    if (result.nModified > 0) {
      return globalServices.global.returnResponse(
        res,
        200,
        false,
        "notification has been deleted",
        {}
      )
    }    
    } catch (error) {
      res.status(500).json(error);
    }
  },
};
