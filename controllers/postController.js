// Handles routes specific to post
const { promisify } = require("util");

const multer = require("multer");
const sharp = require("sharp");
const sizeOf = require("image-size");

const Post = require("../models/postModel");
const User = require("../models/userModel");
const Follow = require("../models/followModel");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// ! ALL ROUTES HERE MUST BE PROTECTED BY authController.protectRoute()

// *? 1. CREATE NEW POST

// * 1a. Multer for image handling
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
	if (file.mimetype.startsWith("image")) {
		cb(null, true);
	} else {
		cb(new AppError("Please upload images only!", 400));
	}
};

const upload = multer({
	storage: multerStorage,
	fileFilter: multerFilter,
	limits: {
		fileSize: 7000000, // 7MB
	},
});

exports.uploadPostPhoto = upload.single("photo");

exports.convertImageToJpeg = async (req, res, next) => {
	if (!req.file) {
		throw new AppError("Please provide an image.", 400);
	}

	req.file.filename = `post-${req.user.id}-${new Date(
		Date.now()
	).getTime()}.jpg`;

	await sharp(req.file.buffer)
		.toFormat("jpeg")
		.jpeg({ quality: 90 })
		.toFile(`public/img/posts/${req.file.filename}`);

	next();
};

// * 1b. Store post to database
exports.storePost = catchAsync(async (req, res) => {
	const caption = req.body.caption || "";

	const dimensions = await promisify(sizeOf)(
		`public/img/posts/${req.file.filename}`
	);

	const newPost = {
		caption,
		photo: `/img/posts/${req.file.filename}`,
		dimensions: `${dimensions.width} x ${dimensions.height}`,
		createdBy: req.user.id,
	};

	// Create the new post
	const post = await Post.create(newPost);

	// Update the post date of user
	await User.findByIdAndUpdate(req.user.id, {
		lastPostAt: Date.now(),
	});

	res.status(201).send({
		status: "success",
		data: {
			post,
		},
	});
});

// *? 2. EDIT A POST
exports.editPost = catchAsync(async (req, res) => {
	const post = await Post.findById(req.params.postId);

	if (req.body.photo) {
		throw new AppError("You can only edit captions in a post.", 400);
	}

	const caption = req.body.caption || "";

	// a. If post exists or not
	if (!post) {
		throw new AppError("No post found with this id.", 400);
	}

	// b. If user editing the post has only created it
	if (post.createdBy.toString() != req.user._id) {
		throw new AppError("You do not have permission to delete this post.", 403);
	}

	// c. Edit the post
	const updatedPost = await Post.findByIdAndUpdate(
		req.params.postId,
		{ caption },
		{ new: true }
	);

	res.status(200).json({
		status: "success",
		data: {
			post: updatedPost,
		},
	});
});

// *? 3. DELETE A POST
exports.deletePost = catchAsync(async (req, res) => {
	const post = await Post.findById(req.params.postId);

	// a. If post exists or not
	if (!post) {
		throw new AppError("No post found with this id.", 400);
	}

	// b. If user deleting the post has only created it
	if (post.createdBy.toString() != req.user._id) {
		throw new AppError("You do not have permission to delete this post.", 403);
	}

	// c. Delete the post
	await Post.findByIdAndRemove(req.params.postId);

	res.status(204).json({
		status: "success",
	});
});

// *? 4. GET POSTS TO SHOW TO A USER (timeline)
exports.getTimeline = catchAsync(async (req, res) => {
	// a. For pagination
	const limit = Number(req.query.limit) || 10;
	const skip = (Number(req.query.page) - 1) * limit || 0;

	// b. Get current user and the id of users it follows
	const currentUser = await User.findById(req.user.id).populate({
		path: "follows",
		select: "_id",
		populate: {
			path: "follows",
			select: "isActive",
		},
	});

	// c. Extract only user id's
	const userFollows = [];
	currentUser.follows.forEach((user) => {
		if (user.follows.isActive) {
			userFollows.push(user.follows.id);
		}
	});

	// d. Get posts by followers
	const posts = await Post.find({
		createdBy: { $in: userFollows },
	})
		.limit(limit)
		.skip(skip)
		.sort({ createdAt: -1 })
		.populate({
			path: "createdBy",
			select: "username photo",
		});

	res.status(200).json({
		status: "success",
		results: posts.length,
		data: {
			posts,
		},
	});
});
