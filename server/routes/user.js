const router = require('express').Router();
const User = require('../models/User')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const protect = require('../middleware/auth');
const authorize = require('../middleware/authAdmin');
const path = require('path');
const Job = require('../models/Job');

router.get('/', async (req,res) => {
    try {
        const users = await User.find();
        if(users){
            res.status(200).json({
                success: true,
                count: users.length,
                data: users
            })
        }
    } catch (err) {
        return res.status(400).json({err: err.message})
    }
})

router.get('/:id', protect, async (req,res) => {
    try {
        const user = await User.findById(req.params.id)
        if(user){
            res.status(200).json({
                success: true,
                data: user
            })
        }
    } catch (err) {
        return res.status(400).json({err: err.message})
    }
})

router.post('/register', async (req,res) => {
    try {
        const {name, email, password} = req.body

        const user = await User.findOne({email});
        if(email === user.email){
            return res.status(400).json({
                success: false,
                data: "User Already exists"
            })
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = new User({
            name,
            email,
            password: hashedPassword
        })

        await newUser.save()

        sendTokenResponse(newUser, 201, res)

    } catch (err) {
        return res.status(400).json({err: err.message})
    }
})

router.post('/login', async (req,res) => {
    try {
        const {email, password} = req.body

        const user = await User.findOne({email}).select("+password")
        if(!user){
            res.status(400).json({
                success: false,
                data: 'Invalid Credentials'
            })
        }

        const matchPassword = await bcrypt.compare(password, user.password)
        if(!matchPassword){
            res.status(400).json({
                success: false,
                data: 'Invalid Credentials'
            })
        }else{
            sendTokenResponse(user, 200, res)
        }

    } catch (err) {
        return res.status(400).json({err: err.message})
    }
})

router.put('/logout', protect,  async (req,res) => {
    try {
        res.cookie('token', 'none', {
            expires: new Date(Date.now() + 10 * 1000),
            httpOnly: true
        })
        
        res.status(200).json({
            success: true,
            data: {}
        })
    } catch (err) {
        return res.status(400).json({err: err.message})
    }
})

const sendTokenResponse = (user, statusCode, res) => {
    const token = user.getSignedJwtToken()

    const options = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        httpOnly: true
    };

    if(process.env.ENVIRONMENT === 'production'){
        options.secure = true;
    }

    res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
        success: true,
        token,
        user
    })
}

router.put('/:id/photo', protect, async (req,res) => {
    try {
        const user = await User.findById(req.params.id)
        if(!user){
            return res.status(400).json({
                success: false,
                data: `User not found`
            })
        }

        if(req.params.id !== req.user.id){
            return res.status(400).json({
                success: false,
                data: `User with ${req.params.id} is not authorized to update the user`
            })
        }

        if(!req.files){
            return res.status(400).json({
                success: false,
                data: `No file uploaded`
            })
        }

        const file = req.files.file

        if(!file.mimetype.startsWith("image")){
            return res.status(400).json({
                success: false,
                data: `File must be an image`
            })
        }

        if(file.size > process.env.MAX_FILE_UPLOAD){
            return res.status(400).json({
                success: false,
                data: `File is too large. Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`
            })
        }

        file.name = `photo_${user._id}${path.parse(file.name).ext}`

        file.mv(`${process.env.FILE_UPLOAD_PATH}/users/${file.name}`, async err => {
            if(err){
                console.error(err);
                return res.status(500).json({
                    success: false,
                    data: "Problem with file upload"
                })
            }
        })

        await User.findByIdAndUpdate(req.params.id, {photo: file.name});

        res.status(200).json({
            success: true,
            data: file.name
        })
    } catch (err) {
        return res.status(500).json({err: err.message})
    }
})

router.put('/:id/certificate', protect, async (req,res) => {
    try {
        const user = await User.findById(req.params.id)
        if(!user){
            return res.status(400).json({
                success: false,
                data: `User not found`
            })
        }


        if(req.params.id !== req.user.id){
            return res.status(400).json({
                success: false,
                data: `User with ${req.params.id} is not authorized to update the user`
            })
        }

        if(!req.files){
            return res.status(400).json({
                success: false,
                data: `No file uploaded`
            })
        }

        const file = req.files.file

        if(!file.mimetype.startsWith("application")){
            return res.status(400).json({
                success: false,
                data: `File must be a document`
            })
        }

        if(file.size > process.env.MAX_FILE_UPLOAD){
            return res.status(400).json({
                success: false,
                data: `File is too large. Please upload a document less than ${process.env.MAX_FILE_UPLOAD}`
            })
        }

        file.name = `certificate${user._id}${path.parse(file.name).ext}`

        file.mv(`${process.env.FILE_UPLOAD_PATH}/users/${file.name}`, async err => {
            if(err){
                console.error(err);
                return res.status(500).json({
                    success: false,
                    data: "Problem with file upload"
                })
            }
        })

        await User.findByIdAndUpdate(req.params.id, {certificate: file.name});

        res.status(200).json({
            success: true,
            data: file.name
        })
    } catch (err) {
        return res.status(500).json({err: err.message})
    }
})

router.put('/:id/apply/:jobid', protect, async (req,res) => {
    try {
        const job = await Job.findById(req.params.jobid)
        if(!job){
            return res.status(400).json({
                success: false,
                data: `Job with ${req.params.jobid} not found`
            })
        }

        const user = await User.findById(req.params.id)
        if(!user){
            return res.status(400).json({
                success: false,
                data: `User with ${req.params.id} not found`
            })
        }

        if(req.params.id !== req.user.id){
            return res.status(400).json({
                success: false,
                data: `User with ${req.user.id} is not authorize to update the user`
            })
        }

        const newUser = await User.findByIdAndUpdate(req.params.id, {
            $push: {
                applied: {
                    job: req.params.jobid
                }
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

module.exports = router