const User = require("../../model/users.model");
const Profile = require("../../model/userProfile.model");
const UserModel = require("../../model/users.model");

const config = require("../../../config/vars");
const passport = require("passport");
const localStrategy = require("passport-local").Strategy;
const { sendEmail } = require("../../utils/emails/emails");
const randomstring = require("randomstring");
const mongoose = require("mongoose");
const { uploadToCloudinary, multi_upload } = require("../../utils/upload");
const multer = require("multer");
// const { uploadToCloudinary } = require('../../utils/upload');
var CryptoJS = require("crypto-js");
const Mail = require("../../model/email.model");
const bcrypt = require("bcryptjs");
var ObjectId = require("mongodb").ObjectID;

const globalServices = require("../../services/index");
const models = require("../../model");

exports.getUser = async (req, res) => {
  try {
    if (req.user) {
      let user = await models.user.aggregate([
        { $match: { _id: req.user._id } },
        {
          $lookup: {
            from: "userprofiles",
            localField: "_id",
            foreignField: "userId",
            pipeline: [
              { $project: { email: 0, userId: 0, _id: 0, fullName: 0 } },
            ],
            as: "profile",
          },
        },
        { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            password: 0,
            otp: 0,
            refreshTokens: 0,
          },
        },
      ]);

      if (user) {
        //check if user membership expirationsDate is passed then set membershipType to Free and expirationsDate to undefined
        
        let findMemberShip = await models.membership.findOne({ userId : user._id })

        if(findMemberShip){
        await models.membership.updateOne(
          { userId: user?._id, expirationDate: { $lt: currentDate } },
          { $set: { membershipType: "free", expirationDate: undefined } }
        );
        }



        globalServices.global.returnResponse(
          res,
          200,
          false,
          "User fetched succesfully",
          user
        );
      } else {
        globalServices.global.returnResponse(
          res,
          404,
          true,
          "user not found!",
          {}
        );
      }
    } else {
      globalServices.global.returnResponse(
        res,
        404,
        true,
        "userId not found!",
        {}
      );
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

/**
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @returns
 */
exports.getProfile = async (req, res, next) => {
  try {
    let { userId } = req.params;
    if (userId) {
      let profile = await models.userProfile
        .findOne({ userId: userId })
        .lean(true);
      // console.log("here-> profile -------------------->    " , profile)
      if (profile) {
        let user = await models.user.findById(userId);
        // console.log("user---------------------------------: ",user)
        let { username, role } = user;
        delete profile.fullName;
        profile = { ...profile, username, role };

        //check if user membership expirationsDate is passed then set membershipType to Free and expirationsDate to undefined
        

        // await models.membership.updateOne(
        //   { userId, expirationDate: { $lt: currentDate } },
        //   { $set: { membershipType: "free", expirationDate: undefined } }
        // );



        return globalServices.global.returnResponse(
          res,
          200,
          false,
          "User Profile fetched succesfully",
          profile
        );
      }
    }
    if (req.user) {
      let profile = await models.userProfile
        .findOne({ userId: req.user._id })
        .lean(true);
      if (profile) {
        let user = await models.user.findById(req.user._id);
        let { username, role } = user;
        delete profile.fullName;
        profile = { ...profile, username, role };
        return globalServices.global.returnResponse(
          res,
          200,
          false,
          "User Profile fetched succesfully",
          profile
        );
        // }
      } else {
        return globalServices.global.returnResponse(
          res,
          200,
          false,
          "User Profile is not Found",
          {}
        );
      }
    } else {
      return globalServices.global.returnResponse(
        res,
        404,
        true,
        "User not Found",
        {}
      );
    }
  } catch (error) {
    return next(error);
  }
};

exports.createProfile = async (req, res, next) => {
  try {
    let payload = req.body;

    if (req.user) {
      let profileExist = await Profile.findOne({
        userId: mongoose.Types.ObjectId(req.user._id),
      }).lean(true);
      if (!profileExist) {
        delete payload.email;
        let profile = new Profile({
          ...payload,
          username: payload.username  || req.user.username,
          userId: mongoose.Types.ObjectId(req.user._id),
        });
        profile = await profile.save();

        const modifiedProfile = {
          ...profile.toObject(), //this the way when you don't want extra keys
        };
        // modifiedProfile.username = modifiedProfile.fullName;
        delete modifiedProfile._id;
        delete modifiedProfile.joinedEvents;
        delete modifiedProfile.fullName;

        if (profile) {
          let updateState = await User.findOneAndUpdate(
            { _id: mongoose.Types.ObjectId(profile.userId) },
            { $set: { isProfile: true } },
            { new: true }
          );

          let userRole = await Profile.findById({
            _id: mongoose.Types.ObjectId(profile._id),
          })
            .populate("userId", ["role"])
            .exec();

          if (updateState) {
            return globalServices.global.returnResponse(
              res,
              200,
              false,
              "Profile is created sucessfully",
              {
                profile: {
                  ...modifiedProfile,
                  role: userRole.userId.role ? userRole.userId.role : "",
                },
              }
            );
          } else {
            return globalServices.global.returnResponse(
              res,
              401,
              true,
              "Profile is not updated",
              {}
            );
          }
        } else {
          return globalServices.global.returnResponse(
            res,
            200,
            false,
            "Profile is not created",
            {}
          );
        }
      } else {
        return globalServices.global.returnResponse(
          res,
          401,
          true,
          "Profile with that UserId exist",
          {}
        );
      }
    } else {
      return globalServices.global.returnResponse(
        res,
        401,
        true,
        "Invalid userId",
        {}
      );
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    let payload = {};
    payload = req.body;

    if (req.user._id) {
     
      if(payload.username){
        let userData = await UserModel.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(req.user._id) },
          { $set: payload },
          { new: true }
        );
      }

      let profile = await Profile.findOneAndUpdate(
        { userId: mongoose.Types.ObjectId(req.user._id) },
        { $set: payload },
        { new: true }
      );
      console.log("check data exist of profile or not  " + profile + req.user._id)
      if (profile) {
        return globalServices.global.returnResponse(
          res,
          200,
          false,
          "User's profile updated successfully.",
          profile
        );
      } else {
        return globalServices.global.returnResponse(
          res,
          401,
          true,
          "User not found.",
          {}
        );
      }
    } else {
      return globalServices.global.returnResponse(
        res,
        401,
        true,
        "Invalid payload.",
        {}
      );
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

exports.uploadProfileImage = async (req, res, next) => {
  try {
    if (req.file) {
      const image = req.file;
      // const imgData = fs.readFileSync(image.path)
      let photo = await uploadToCloudinary(image.path);
      // await unlinkAsync(image.path)
      return globalServices.global.returnResponse(
        res,
        200,
        false,
        "Photo upload successfully",
        photo
      );
    } else {
      return globalServices.global.returnResponse(
        res,
        401,
        false,
        "Photo not uploaded",
        {}
      );
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

exports.uploadMultiImage = async (req, res, next) => {
  try {
    multi_upload(req, res, async function (err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading.
        res
          .status(500)
          .send({
            error: { message: `Multer uploading error: ${err.message}` },
          })
          .end();
        return;
      } else if (err) {
        // An unknown error occurred when uploading.
        console.log("here we are in : ", err);
        if (err.name == "ExtensionError") {
          // res
          //   .status(413)
          //   .send({ error: { message: err.message } })
          //   .end();
          return;
        } else {
          res
            .status(500)
            .send({
              error: { message: `unknown uploading error: ${err.message}` },
            })
            .end();
        }
        return;
      }
      // Everything went fine.
      // show file `req.files`
      // show body `req.body`
      console.log("in-check-here ", req.files);
      imagesUpload = [];
      if (req.files) {
        let uploadPromises = req.files.map(async (file) => {
          try {
            let result = await uploadImage(file);
            imagesUpload.push(result);
          } catch (error) {
            console.error("Error uploading image: ", error);
          }
        });
        await Promise.all(uploadPromises);
      }

      return globalServices.global.returnResponse(
        res,
        200,
        false,
        "Photo upload successfully",
        imagesUpload
      );
    });
  } catch (error) {
    res.status(500).json(error);
  }
};

const uploadImage = async (image) => {
  return await new Promise((resolve) =>
    setTimeout(() => {
      let icon = uploadToCloudinary(image.path);
      // try{
      //   unlinkAsync(image.path)
      // }catch(th){}
      resolve(icon);
    }, 100 * Math.random())
  );
};

exports.updateUserProfile = async (req, res, next) => {
  try {
    const payload = req.body;
    const keys = Object.keys(payload); // extract keys from request body
    const projection = {};
    keys.forEach((key) => (projection[key] = 1)); // dynamically create projection object
    let { user } = req;
    let userId = user._id.toString();

    if (!userId) {
      globalServices.global.returnResponse(
        res,
        404,
        true,
        "user not found!",
        {}
      );
    }

    let userProfile = await models.userProfile.findOne({ userId: userId });

    if (userProfile) {
      let result = await globalServices.userProfile.updateUserProfile(
        userProfile._id,
        payload,
        projection
      );
      if (result) {
        globalServices.global.returnResponse(
          res,
          200,
          false,
          "User profile updated successfully!",
          result
        );
      } else {
        globalServices.global.returnResponse(
          res,
          401,
          true,
          "Failed to update User Profile!",
          {}
        );
      }
    } else {
      globalServices.global.returnResponse(
        res,
        401,
        true,
        "User Profile is not created yet!",
        {}
      );
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

exports.deleteCurrentUser = async (req, res, next) => {
  try {
    let { user } = req;
    const userId = user._id.toString();
    if (!userId) {
      globalServices.global.returnResponse(
        res,
        401,
        true,
        "Token not have useerId!",
        {}
      );
    }
    const findUser = await User.findById(userId);
    if(!findUser){
      globalServices.global.returnResponse(
        res,
        404,
        true,
        "User not found!",
        {}
      );
    }

    // Delete related references
    await models.userProfile.deleteOne({ userId: userId });
    //user delete below
    await findUser.remove();

    globalServices.global.returnResponse(
      res,
      200,
      false,
      "User deleted successfully!",
      {}
    );

  } catch (error) {
    res.status(500).json(error);
  }
};

exports.getUserCount = async (req,res) => {
  try {
      const totalCount = await User.countDocuments();
      const businessCount = await User.countDocuments({ role: 'business' });

    if (!totalCount) {
     return globalServices.global.returnResponse(
        res,
        400,
        true,
        "No user Found",
        {totalCount : 0}
      );
    }
    console.log("count" + totalCount)

    return globalServices.global.returnResponse(
      res,
      200,
      true,
      "count of User's",
      {totalCount , businessCount}
    
    );
  } catch (error) {
    res.status(500).json({ error: 'Could not get user count.' });
  }
};
