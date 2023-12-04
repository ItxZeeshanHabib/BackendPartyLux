const express = require('express');
const cardController = require('../../../controller/mobile/card.controller');
const router = express.Router();

const { userValidation } =require('../../../middleware/auth')
router.route('/create-cards').post( userValidation ,cardController.createVipCard)

router.route('/update-cards').patch( userValidation ,cardController.updateVipCard)

module.exports = router;