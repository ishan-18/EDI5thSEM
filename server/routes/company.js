const router = require('express').Router({mergeParams: true});
const User = require('../models/User')
const Company = require('../models/Company');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authAdmin');
const geocoder = require('../middleware/geocoder');
const path = require('path');


router.get('/', async (req,res) => {
    try {
        const company = await Company.find()
        if(company){
            res.status(200).json({
                success: true,
                count: company.length,
                data: company
            })
        }
    } catch (err) {
        return res.status(400).json({err: err.message})
    }
})

router.get('/:id', async (req,res) => {
    try {
        const company = await Company.findById(req.params.id)
        if(!company){
            return res.status(400).json({
                success: false,
                data: "Company not found"
            })
        }

        res.status(200).json({
            success: true,
            data: company
        })
    } catch (err) {
        return res.status(400).json({err: err.message})
    }
})

router.post('/', protect, authorize("companyuser", "admin"), async (req,res) => {
    try {
        req.body.user = req.user.id

        const registeredCompany = await Company.findOne({user: req.user.id})

        if(registeredCompany && req.user.role !== "admin"){
            return res.status(400).json({
                success: false,
                data: `User with ${req.user.id} has already registered a company.`
            })
        }

        const company = await Company.create(req.body)
        res.status(201).json({
            success: true,
            data: company,
            message: "Company registered successfully"
        })

    } catch (err) {
        return res.status(400).json({err: err.message})
    }
})

router.put('/:id', protect, authorize("companyuser", "admin"), async (req,res) => {
    try {
        const company = await Company.findById(req.params.id)
        if(!company){
            return res.status(400).json({
                success: false,
                data: `Company Not Found`
            })
        }

        if(company.user.toString() !== req.user.id && req.user.role !== "admin"){
            return res.status(400).json({
                success: false,
                data: `User ${req.user.id} is not authorized to update this company`
            })
        }

        await Company.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })

        res.status(200).json({
            success: true,
            data: "Company Details Updated Successfully"
        })

    } catch (err) {
        return res.status(500).json({err: err.message})
    }
})

router.delete('/:id', protect, authorize("companyuser", "admin"), async (req,res) => {
    try {
        const company = await Company.findById(req.params.id)
        if(!company){
            return res.status(400).json({
                success: false,
                data: `Company Not Found`
            })
        }

        if(company.user.toString() !== req.user.id && req.user.role !== "admin"){
            return res.status(400).json({
                success: false,
                data: `User ${req.user.id} is not authorized to update this company`
            })
        }

        await Company.remove();

        res.status(200).json({
            success: true,
            data: {}
        })

    } catch (err) {
        return res.status(500).json({err: err.message})
    }
})

router.get('/radius/:zipcode/:distance', protect, async (req,res) => {
    try {
        const {zipcode, distance} = req.params
        
        const loc = await geocoder.geocode(zipcode)
        const lat = loc[0].latitude;
        const lng = loc[0].longitude;
        
        // Calc radius using radians
        // Divide dist by radius of Earth
        // Earth Radius = 3,963 mi / 6,378 km
        const radius = distance / 3963

        const company = await Company.find({
            c_location: {$geoWithin: { $centerSphere: [[lng,lat], radius]}}
        })

        res.status(200).json({
            success: true,
            count: company.length,
            data: company
        })

    } catch (err) {
        return res.status(400).json({err: err.message})
    }
})

router.put('/:id/c_photo', protect, authorize("companyuser", "admin"), async (req,res) => {
    try {
        const company = await Company.findById(req.params.id)
        if(!company){
            return res.status(400).json({
                success: false,
                data: `Company not found`
            })
        }

        if(company.user.toString() !== req.user.id && req.user.role !== "admin"){
            return res.status(400).json({
                success: false,
                data: `User ${req.user.id} is not authorized to update this company`
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

        file.name = `photo_${company._id}${path.parse(file.name).ext}`

        file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
            if(err){
                console.error(err);
                return res.status(500).json({
                    success: false,
                    data: "Problem with file upload"
                })
            }
        })

        await Company.findByIdAndUpdate(req.params.id, {c_photo: file.name});

        res.status(200).json({
            success: true,
            data: file.name
        })

    } catch (err) {
        return res.status(400).json({err: err.message})
    }
})

router.put('/:id/license', protect, authorize("companyuser", "admin"), async (req,res) => {
    try {
        const company = await Company.findById(req.params.id)
        if(!company){
            return res.status(400).json({
                success: false,
                data: `Company not found`
            })
        }

        if(company.user.toString() !== req.user.id && req.user.role !== "admin"){
            return res.status(400).json({
                success: false,
                data: `User ${req.user.id} is not authorized to update this company`
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
                data: `File must be an document`
            })
        }

        if(file.size > process.env.MAX_FILE_UPLOAD){
            return res.status(400).json({
                success: false,
                data: `File is too large. Please upload a document less than ${process.env.MAX_FILE_UPLOAD}`
            })
        }

        file.name = `license_${company._id}${path.parse(file.name).ext}`
        file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
            if(err){
                console.error(err);
                return res.status(500).json({
                    success: false,
                    data: "Problem with file upload"
                })
            }
        })

        await Company.findByIdAndUpdate(req.params.id, {c_license: file.name});

        res.status(200).json({
            success: true,
            data: file.name
        })

    } catch (err) {
        return res.status(400).json({err: err.message})
    }
})


module.exports = router