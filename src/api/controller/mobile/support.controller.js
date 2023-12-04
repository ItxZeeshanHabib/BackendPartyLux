const globalServices = require('../../services/index');

const models = require('../../model');

module.exports = {
    create: async (req, res)=> {
        try{
            let payload = req.body;
            let support = await models.support.create(payload)
            let setting = await models.settings.findOne({})
            let contactInfo = setting.contactInfo   ?  setting.contactInfo : {}
            if(support){
                return globalServices.global.returnResponse(
                    res,
                    200,
                    false,
                    'Support is created',
                    {support , contactInfo}
                  );
            }
            else{
                return globalServices.global.returnResponse(
                    res,
                    401,
                    true,
                    'Something wrong while create Support',
                    {}
                );
            }
        }
        catch(error){
            res.status(500).json(error);
        }

    },

    sendEmail: async (req,res)=> {
        let { name , email , phone , company , message } = req.body;
        
        if(!name ||  !email || !phone || !company || !message){
            return globalServices.global.returnResponse(
                res,
                403,
                true,
                'Required data is missing',
                {}
              );
        }

        let payLoad = { name : name , email : email , phone : phone , comapnyName : company , message : message }
    

    let savingObjects = models.Supportquries(payLoad);
    let result = await savingObjects.save();
     
    if(result){
        return globalServices.global.returnResponse(
            res,
            200,
            false,
            'Your Email has been send',
            {}
          );
    }else{
        return globalServices.global.returnResponse(
            res,
            403,
            true,
            'Some thing went Wrong',
            {}
          );
    }
    },

    subscribeNewsletter : async (req,res)=> {
        let {  email } = req.body;
        let payLoad = { email : email  }

        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

        console.log("emailRegex.test(email)"); 

      console.log(emailRegex.test(email)); 

      if(!emailRegex.test(email)){
        return globalServices.global.returnResponse(
            res,
            403,
            true,
            'email not valid',
            {}
          );
      }



    if(!email){
        return globalServices.global.returnResponse(
            res,
            400,
            true,
            'email is missing',
            {}
          );
    }

    let user = await models.newsletter.findOne({ email : email });

    if (user) {
        return globalServices.global.returnResponse(
          res,
          201,
          true,
          'User already exists',
          {}
        );
    }



    let savingObjects = models.newsletter(payLoad);
    let result = await savingObjects.save();
     
    if(result){
        return globalServices.global.returnResponse(
            res,
            200,
            false,
            'Your Subscribe us our latest new will ping you on time',
            {}
          );
    }else{
        return globalServices.global.returnResponse(
            res,
            403,
            true,
            'Some thing went Wrong',
            {}
          );
    }
    }
}
