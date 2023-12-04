const User = require('../../model/users.model');
const config = require('../../../config/vars');
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const { sendEmail } = require('../../utils/emails/emails');
const randomstring = require('randomstring');
const mongoose = require('mongoose');
var ObjectId = require('mongoose').Types.ObjectId;
// const { uploadToCloudinary } = require('../../utils/upload');
var CryptoJS = require('crypto-js');
const globalServices = require('../../services/index');
const Mail = require('../../model/email.model');
const mailGun = require('nodemailer-mailgun-transport');
const bcrypt = require('bcryptjs');
// const email=require('../../utils/emails/emails')
//GOOGLEOAuth
const { OAuth2Client } = require('google-auth-library');
const firebaseAdmin = require('firebase-admin');
// const { login } = require('./auth');
const { verify } = require('jsonwebtoken');

// const GOOGLE_CLIENT_ID = '314779179992-rb620l2a1ckomh23e24njcc0s6p30a3e.apps.googleusercontent.com';

// const client = new OAuth2Client({
//   //client_ID =314779179992-rb620l2a1ckomh23e24njcc0s6p30a3e.apps.googleusercontent.com
//   //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
//   clientId: GOOGLE_CLIENT_ID ,
//   clientSecret: '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',
// });

const clientId = 'http://530453377117-92tt8cro2eepkd66sdt08ubihbkipkqq.apps.googleusercontent.com'; // Replace with your Google OAuth 2.0 client ID

// Create an instance of the OAuth2Client
const oAuth2Client = new OAuth2Client(clientId);

const googleClientId =
  '314779179992-p8754t3q32m8ti6m3gfa9cvci8b8c9do.apps.googleusercontent.com';
const firebaseServiceAccountKey = require('../../utils/party-lux-4e1f3-firebase-adminsdk-rydld-31b288f562.json');

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(firebaseServiceAccountKey),
});

// firebaseAdmin.initializeApp({
//   credential: firebaseAdmin.credential.cert(firebaseServiceAccountKey),
//   // databaseURL:    'https://party-lux-382913-default-rtdb.firebaseio.com/' , //'<your-firebase-database-url>'
// });

exports.register = async (req, res, next) => {
  try {
    let { username, email, password , role} = req.body;

    if (username && email && password) {
      email = email.toLowerCase().trim();
      let user = await User.findOne({ email });

      if (user) {
        return globalServices.global.returnResponse(
          res,
          200,
          true,
          'User already exists',
          {}
        );
        // return res
        //   .status(200)
        //   .send({ status: false, message: 'User already exists' });
      }
      // const otp = randomstring.generate({ length: 4, charset: 'numeric' }); //for sake of development it is otp : 123
      const otp = '1234';
      user = await User.create({
        username:   username,
        email : email,
        password :password,
        otp : otp,
        userLoginType : "email",
        role : role
      });

      let content = { otp: `${otp}` };
      await sendEmail(email, '[Party Lux] Verification Code', 
      `Account Validation OTP` ,content );

      let data = {
        userId: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isPartnerCreated: user.isPartnerCreated,
        userLoginType : user.userLoginType,
      };
      return globalServices.global.returnResponse(
        res,
        200,
        false,
        'User registered successfully',
        data
      );
    } else {
      return globalServices.global.returnResponse(
        res,
        200,
        true,
        'Required fields are missing',
        {}
      );
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { userId, Otp } = req.body;

    const user = await User.findOne({ _id: mongoose.Types.ObjectId(userId) });

    if (Otp) {
      if (Otp == user?.otp) {
        const updateOtp = await User.findOneAndUpdate(
          { _id: mongoose.Types.ObjectId(userId) },
          { $set: { otp: '', isVerified: true } },
          { new: true }
        );

        console.log('updateOtp: ', updateOtp);
        var accessToken = await updateOtp.token();
        let data = {
          authToken: accessToken,
          userId: updateOtp._id,
          username: updateOtp.username,
          email: updateOtp.email,
          role: updateOtp.role,
          isVerified: updateOtp.isVerified,
          isProfile: updateOtp.isProfile,
        };

        return globalServices.global.returnResponse(
          res,
          200,
          false,
          'OTP successfully matched',
          data
        );
        // return res.json({ success: true, data , message: 'OTP successfully matched' });
      } else {
        return globalServices.global.returnResponse(
          res,
          401,
          true,
          'OTP not matched',
          {}
        );
        // return res.json({ success: false, message: 'OTP not matched' });
      }
    } else {
      return globalServices.global.returnResponse(
        res,
        200,
        false,
        'OTP not validate',
        {}
      );
      // return res.json({ success: false, message: 'OTP not validate' });
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { userId } = req.body;
    // const otp = randomstring.generate({ length: 4, charset: 'numeric' });
  const otp = '1234';
    const user = await User.findOneAndUpdate(
      { _id: mongoose.Types.ObjectId(userId) },
      { $set: { otp: otp, verified: false } }
    );

    if (!user) {
      return globalServices.global.returnResponse(
        res,
        401,
        false,
        'User not Found',
        {}
      );
      // return res.json({ success: false, message: 'User not Found' });
    }
    let content = { otp: `${otp}` };
    await sendEmail(user.email, '[Party Lux] Resend Code', 
    `Resend Verification Code` ,content );

    return globalServices.global.returnResponse(
      res,
      200,
      false,
      'OTP send sucessfully',
      {}
    );
    // return res.json({ success: true, message: 'OTP send sucessfully' });
  } catch (error) {
    res.status(500).json(error);
  }
};

/**
 * Returns jwt token if valid email and password is provided
 * @public
 */
exports.sigin = async (req, res, next) => {
  try {
    let { email, password } = req.body;

    if (email) email = email.toLowerCase();

    if (email && password) {
      passport.use(
        new localStrategy(
          { usernameField: 'email' },
          (username, password, done) => {
            User.findOne({ email: username }, (err, user) => {
              if (err) return done(err);
              if (user && user.password === undefined)
                // unregistered email
                return done(null, false, {
                  status: false,
                  message: 'User does not exist!',
                });
              else if (!user)
                // unregistered email
                return done(null, false, {
                  status: false,
                  message: 'Incorrect email',
                });
              else if (!user.verifyPassword(password))
                // wrong password
                return done(null, false, {
                  status: false,
                  message: 'Incorrect password',
                });
              else return done(null, user);
            }).populate({ path: 'roleId', select: 'title' });
          }
        )
      );
      // call for passport authentication
      passport.authenticate('local', async (err, user, info) => {
        if (err) {
          return globalServices.global.returnResponse(
            res,
            400,
            true,
            'Oops! Something went wrong while authenticating',
            {}
          );
        } else if (user) {
          if (!user.isVerified) {
            //when user not verified
            const data = {
              userId: user._id,
              isVerified: user.isVerified,
              isProfile: user.isProfile,
              isPartnerCreated: user.isPartnerCreated,
              userLoginType : user.userLoginType,
            };

            return globalServices.global.returnResponse(
              res,
              200,
              false,
              'You have not verified yet',
              data
            );
            // return res.status(200).send({
            //   status: false,
            //   data: {
            //     userId: user._id,
            //     isVerified : user.isVerified ,
            //     isProfile : user.isProfile
            //   },
            //   message: 'You have not verified yet'
            // })
          }
          var accessToken = await user.token();
          let data = {
            authToken: accessToken,
            userId: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            isProfile: user.isProfile,
            isPartnerCreated: user.isPartnerCreated,
            userLoginType : user.userLoginType,
          };
          return globalServices.global.returnResponse(
            res,
            200,
            false,
            'You have logged in successfully',
            data
          );
          // return res.status(200).send({
          //   status: true,
          //   message: 'You have logged in successfully',
          //   data,
          // });
        }
        // unknown user or wrong password
        else {
          return globalServices.global.returnResponse(
            res,
            401,
            true,
            'Incorrect Email & Password  ',
            {}
          );
          // return res
          //   .status(200)
          //   .send({ status: false, message: 'Incorrect Email, Password or userType ' });
        }
      })(req, res);
    } else {
      return globalServices.global.returnResponse(
        res,
        404,
        false,
        'Email & password required',
        {}
      );
      // return res
      // .status(200)
      // .send({ status: false, message: 'Email & password required' });
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

exports.get = (req, res) => {
  console.log('here we go ');
  return globalServices.global.returnResponse(
    res,
    200,
    false,
    'Email & password required',
    {}
  );
  // return res
  //   .status(200)
  //   .send({ status: 0, message: 'Email & password required' });
};

exports.forgotPassword = async (req, res, next) => {
  try {
    let { email } = req.body;
    if (email) {
      email = email.toLowerCase();
      await User.findOne({ email: email }, async (err, user) => {
        if (err) {
          return globalServices.global.returnResponse(
            res,
            400,
            true,
            'Oops! Something went wrong while finding',
            {}
          );
          // return res.status(400).send({
          //   err,
          //   status: false,
          //   message: 'Oops! Something went wrong while finding',
          // });
        }

        if (user) {
          // const otp = randomstring.generate({ length: 4, charset: 'numeric' });
          const otp = '1234';
          user.otp = otp;
          user.isVerified = false;
          user.save();

          let content = { otp: `${otp}` };
          await sendEmail(email, `[Party Lux] Verification Code`,
           `Password Reset Code` , content);
          let data = {
            userId: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            isProfile: user.isProfile,
          };
          return globalServices.global.returnResponse(
            res,
            200,
            false,
            'Email sent successfully',
            data
          );
          // res
          //   .status(200)
          //   .send({ status: true, data , message: 'Email sent successfully' });
        } else {
          return globalServices.global.returnResponse(
            res,
            200,
            false,
            'Email not valid',
            {}
          );
        }
        // return res
        //   .status(200)
        //   .send({ status: false, message: 'Email not valid' });
      });
    } else {
      return globalServices.global.returnResponse(
        res,
        200,
        false,
        'Please enter email',
        {}
      );
      // return res
      //   .status(200)
      //   .send({ status: false, message: 'Please enter email' });
    }
  } catch (error) {
    res.status(500).json(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  let { newPassword, userId } = req.body;
  try {
    if (!ObjectId.isValid(userId)) {
      console.log('here we go');
      return globalServices.global.returnResponse(
        res,
        400,
        true,
        'Invalid userId ',
        {}
      );
    }
    userId = new ObjectId(userId);

    const user = await User.findOne({ _id: mongoose.Types.ObjectId(userId) });

    if (!user) {
      return globalServices.global.returnResponse(
        res,
        400,
        true,
        'Oops! Something went wrong while finding User',
        {}
      );
    }

    if (user) {
      // const rounds = pwdSaltRounds ? parseInt(pwdSaltRounds) : 10;
      // bcrypt =
      user.password = newPassword;
      user.isVerified = true;

      user.save();

      // password has been successfully change
      return globalServices.global.returnResponse(
        res,
        200,
        false,
        'Your password is changed successfully!',
        {}
      );
    } else {
      return globalServices.global.returnResponse(
        res,
        400,
        true,
        'Unsuccessful! Current Password not matched',
        {}
      );
    }
  } catch (error) {
    res.status(500).json(error);
  }

  // await User.findOne({ _id: mongoose.Types.ObjectId(userId) }, (err, user) => {
  //   console.log("err", err)
  //   if (err){
  //     return globalServices.global.returnResponse(
  //       res,
  //       400,
  //       true,
  //       'Oops! Something went wrong while finding',
  //       {}
  //     );
  //     // return res.status(400).send({
  //     //   err,
  //     //   success: false,
  //     //   message: 'Oops! Something went wrong while finding',
  //     // });
  //   }

  //   // if (!user.verifyPassword(oldPassword)) // wrong password
  //   //   return  res.status(200).send({ success: true, message: 'Your old password is incorrect!' });

  //   if (user) {
  //     // const rounds = pwdSaltRounds ? parseInt(pwdSaltRounds) : 10;
  //     // bcrypt =
  //     user.password = newPassword;
  //     user.isVerified = true;

  //     user.save();

  //     // password has been successfully change
  //     return globalServices.global.returnResponse(
  //       res,
  //       200,
  //       false,
  //       'Your password is changed successfully!',
  //       {}
  //     );
  //     // return res.status(200).send({
  //     //   success: true,
  //     //   message: 'Your password is changed successfully!',
  //     // });
  //   } else {
  //     return globalServices.global.returnResponse(
  //       res,
  //       400,
  //       true,
  //       'Unsuccessful! Current Password not matched',
  //       {}
  //     );
  //   }
  // });
};


exports.socialLogin = async (req, res, next) => {
  try {
    const { uid , userLoginType , userName} = req.body;

    if (uid && userLoginType && userName ) {

      const socialUser = await User.findOne({ socailId : uid});

      //  User Login     
        if (socialUser) {
         if(socialUser.userLoginType === userLoginType){
          const token = await socialUser.token();

          let data = {
            userId : socialUser._id,
            authToken: token,
            socailId : socialUser.socailId,
            username: socialUser.username,
            email: socialUser.email || "",
            role: socialUser.role,
            isVerified: socialUser.isVerified,
            isProfile: socialUser.isProfile,
            isPartnerCreated: socialUser.isPartnerCreated,
            userLoginType : socialUser.userLoginType,
          };

          return globalServices.global.returnResponse(
            res,
            200,
            false,
            `You have logged in through ${userLoginType} successfully`,
            data
          );
         }else{
          return globalServices.global.returnResponse(
            res,
            403,
            false,
            `Your login type is not Valid`,
           {}
          );
         }
        } else {

          //register here
          const user = await User.create({
            socailId : uid,
            username : userName,
            userLoginType : userLoginType,
            isVerified : true
          });

          const token = await user.token();

  
          // let data = {
          //   userId: user._id,
          //   socailId : user.socailId,
          //   role: user.role,
          //   isPartnerCreated: user.isPartnerCreated,
          //   accessToken : token,
          //   userLoginType : user.userLoginType,
          // };

          let data = {
            userId : user._id,
            authToken: token,
            socailId : user.socailId,
            username: user.username,
            email: user.email || "",
            role: user.role,
            isVerified: user.isVerified,
            isProfile: user.isProfile,
            isPartnerCreated: user.isPartnerCreated,
            userLoginType : user.userLoginType,
          };
  
          return globalServices.global.returnResponse(
            res,
            200,
            false,
            `User registered through ${userLoginType} successfully`,
            data
          );
        }
    }else{
              return globalServices.global.returnResponse(
        res,
        400,
        true,
        'required fields are missing',
        {}
      );
    }
  } catch (error) {
    res.status(500).json(error);
  }
 
};

exports.googleSignIn = async (req, res, next) => {
  // try {

  const googleToken = req.body.googleToken;
   
  const ticket = await oAuth2Client.verifyIdToken({
    idToken: googleToken,
    audience: "530453377117-92tt8cro2eepkd66sdt08ubihbkipkqq.apps.googleusercontent.com",
  });

  console.log("ticket" + ticket)

  // Get the payload (user information) from the token
  const payload = ticket.getPayload();
  const userId = payload.sub;
  const userEmail = payload.email;
  const userName = payload.name;
  // ... other user information

  // Return the user information or perform your desired actions
  return {
    userId,
    userEmail,
    userName,
    // ... other user information
  };


    // const googleToken = req.body.googleToken;
    // const role = req.body.role;


    //  console.log("googleToken" + googleToken)
    // if (!googleToken) {
    //   res.status(400).send({
    //     error: true,
    //     status: 400,
    //     msg: 'Missing Token',
    //   });
    //   return;
    // }
    // const googleData = await firebaseAdmin.auth().verifyIdToken(googleToken);


    // console.log("googleData" + googleData)

    // if (googleData && googleData.email_verified === true) {
    //   const { name, email, email_verified } = googleData;
    //   let emailAccount = await User.findOne(email);

    //   if (
    //     emailAccount &&
    //     emailAccount._id &&
    //     emailAccount.googleVerified === true
    //   ) {
    //     // let JwtToken = await globalServices.global.JwtToken({
    //     //   _id: emailAccount._id,
    //     // });
    //     let JwtToken = await emailAccount.token();

    //     let updatedResult = await User.findOneAndUpdate(
    //       { _id: emailAccount._id },
    //       { $set: { token: JwtToken, login_try: 0 } }
    //     );

    //     // return globalServices.global.returnResponse(
    //     //   res,
    //     //   200,
    //     //   false,
    //     //   'Google Login successful.redirecting you to dashboard.',
    //     //   updatedResult
    //     // );
    //     return res.status(200).send({
    //       status: 1,
    //       message: 'Google Login successful.redirecting you to dashboard.',
    //       data: updatedResult,
    //     });
    //   }

    //   // google sign up ist time

    //   const records = {
    //     name: name,
    //     email: email,
    //     googleVerified: email_verified,
    //     // role: role,
    //   };

    //   let result = await User.create(records); //await user.googleSignUp(records);

    //   if (result && result._id) {
    //     let JwtToken = await result.token();
    //     // globalServices.global.JwtToken({
    //     //   _id: result._id,
    //     // });
    //     let updatedResult = await User.findOneAndUpdate(
    //       { _id: result._id },
    //       { $set: { token: JwtToken, verified: true } }
    //     );
    //     // globalServices.user.updateUserAccountById(result._id, {
    //     //   token: JwtToken,
    //     //   verified: true,
    //     // });

    //     return res.status(200).send({
    //       status: false,
    //       message: 'Google Login successful.redirecting you to dashboard.',
    //       data: updatedResult,
    //     });
    //     // return globalServices.global.returnResponse(
    //     //   res,
    //     //   200,
    //     //   false,
    //     //   'Google Login successful.redirecting you to dashboard.',
    //     //   updatedResult
    //     // );
    //   } else {
    //     return res.status(404).send({
    //       status: true,
    //       message: 'Something went wrong! user registration failed',
    //       data: {},
    //     });

    //     // return globalServices.global.returnResponse(
    //     //   res,
    //     //   404,
    //     //   true,
    //     //   'Something went wrong! user registration failed',
    //     //   {}
    //     // );
    //   }
    // } else {
    //   return res.status(401).send({
    //     status: true,
    //     message: 'Google sign in issue by firebase.',
    //     data: googleData,
    //   });

    //   // return globalServices.global.returnResponse(
    //   //   res,
    //   //   401,
    //   //   true,
    //   //   'Google sign in issue by firebase.',
    //   //   googleData
    //   // );
    // }
  // } catch (error) {
  //   res.status(500).json(error);
  // }
};


