const router = require('express').Router();
const User = require('../models/User')
const Company = require('../models/Company');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authAdmin');

router.put('/user/:id/isVerified', protect, authorize("admin"), async (req,res) => {
    try {
        const user = await User.findById(req.params.id);
        if(!user){
            res.status(400).json({
                success: false,
                data: `User with ${req.params.id} not found`
            })
        }

        const newUser = await User.findByIdAndUpdate(req.params.id, {
            $set: {
                isVerified: true
            }
        }, {
            new: true,
            runValidators: true
        })

        res.status(200).json({
            success: true,
            data: newUser
        })

    } catch (err) {
        return res.status(500).json({err: err.message})
    }
})

router.put('/company/:id/isVerified', protect, authorize("admin"), async (req,res) => {
    try {
        const company = await Company.findById(req.params.id);
        if(!company){
            res.status(400).json({
                success: false,
                data: `Company with ${req.params.id} not found`
            })
        }

        const newCompany = await Company.findByIdAndUpdate(req.params.id, {
            $set: {
                c_isVerified: true
            }
        }, {
            new: true,
            runValidators: true
        })

        res.status(200).json({
            success: true,
            data: newCompany
        })

    } catch (err) {
        return res.status(500).json({err: err.message})
    }
})

router.delete('/company/:id', protect, authorize("admin"), async (req,res) => {
    try {
        const company = await Company.findById(req.params.id)
        if(!company){
            return res.status(400).json({
                success: false,
                data: `Company with ${req.params.id} not found`
            })
        }

        await Company.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: {}
        })

    } catch (err) {
        return res.status(500).json({err: err.message})
    }
})

router.delete('/user/:id', protect, authorize("admin"), async (req,res) => {
    try {
        const user = await User.findById(req.params.id)
        if(!user){
            return res.status(400).json({
                success: false,
                data: `User with ${req.params.id} not found`
            })
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: {}
        })
    } catch (err) {
        return res.status(500).json({err: err.message})
    }
})

module.exports = router