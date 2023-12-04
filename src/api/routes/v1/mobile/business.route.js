const express = require('express');
const controller = require('../../../controller/mobile/partner.controller');
const router = express.Router();
const { userValidation } = require('../../../middleware/auth');



router.route('/create-business').post(userValidation, controller.createBusiness);

router.route('/business-list').get(userValidation, controller.getBusinessList);

router.route('/business-detail').post(userValidation, controller.getBusinessDetails);

router
  .route('/update-business/:businessId')
  .put(userValidation, controller.updateUserBusiness);

  router
  .route('/my-business')
  .get(userValidation, controller.getMyBusiness);

  
router
.route('/delete-business')
.delete(userValidation, controller.deleteBusiness);

router
.route('/updateBusinessState')
.patch( userValidation ,controller.updateBusinessState);


//   router
//   .route('/get-business')
//   .get(userValidation, controller.getBusiness);

router
.route('/getTopLiveBusiness')
.post( controller.getTopBusiness);




module.exports = router;
