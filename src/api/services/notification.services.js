const models = require('../model/index');
const firebaseAdmin = require('firebase-admin');
let notificationService = (module.exports = {
  findUserByObjects: (payLoad) =>
    new Promise((resolve, reject) =>
      models.notification
        .findOne(payLoad)
        .then((data) => resolve(data))
        .catch((error) => {
          console.log('error => findUserBYObjects:', error);
          reject('');
        })
    ),
  saveFcmToken: (payLoad) => {
    return new Promise((resolve, reject) => {
      let savingObjects = models.notification(payLoad);
      savingObjects
        .save()
        .then((result) => {
          if (result && result._id) {
            resolve(result);
          } else {
            console.log('error => creation fcmToken :', result);
            reject('');
          }
        })
        .catch((error) => {
          console.log('error => creation fcmToken :', error);
          reject('');
        });
    });
  },

  updateFcmToken: async (id, fcmToken) => {
    return await models.notification.findByIdAndUpdate(
      id,
      {
        fcmToken: fcmToken,
      },
      { new: true }
    );
  },

  updateNotificationType: async (
    userId,
    title,
    content,
    actionId,
    eventName
  ) => {
    let typeObj = {
      title: title,
      content: content,
      actionId: actionId,
      eventName: eventName,
    };
    let result = await models.notification.updateOne(
      { user: userId.toString() },
      { $push: { types: typeObj } }
    );
    return result;
  },

 sendNotification : async (userId, title, body) => {
    try {
      const userNotification = await models.notification.findOne({ user: userId });
  
      if (!userNotification) {
        throw new Error('User notification data not found');
      }
  
      const message = {
        notification: {
          title: title,
          body: body,
        },
        token: userNotification.fcmToken,
      };
  
      const response = await firebaseAdmin.messaging().send(message);
      console.log('Successfully sent notification:', response);
      return response;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  },

  getallNotifications: async (userId) => {
    try {
      userId = userId.toString();
      let query = {
        user: { $eq: userId },
      };
      return await models.notification.find(query);
    } catch (error) {
      throw createError(500);
    }
  },
});
