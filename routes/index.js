var express = require('express');
var router = express.Router();
var uniqid = require('uniqid');
const UsersModel = require('../models/users');
const BooksModel = require('../models/books');
const uid2 = require('uid2');
const bcrypt = require('bcrypt');
var fs = require('fs');
const request = require('sync-request');

// POST : Login
router.post('/log-in', async function (req, res, next) {
  var lowerEmail = req.body.email.toLowerCase();

  if (!req.body.email || !req.body.password) {
    res.json({
      login: false,
      message: "Veuillez remplir tous les champs pour accéder à votre compte."
    })
  } else {
    const user = await UsersModel.findOne({email: lowerEmail}).populate('library').populate('wishlist').exec();
    const password = req.body.password;
    if (user) {
      const userToken = user.token;
      const userAvatar = user.avatar;
      const userLibrary = user.library;
      const userWishlist = user.wishlist;
      if (bcrypt.compareSync(password, user.password)) {
        res.json({ login: true, userToken, userAvatar , userLibrary, userWishlist});
      } else {
      res.json({login: false, message: "Mot de passe incorrect" }); }
    } else { 
      res.json({login: false, message: "Nous ne trouvons pas de compte associé à cet email et ce mot de passe, veuillez réessayer ou créer un compte." }); }
  }
});

// POST : upload user avatar
var cloudinary = require('cloudinary').v2;
cloudinary.config({
 cloud_name: 'dz9e1fv7v',
 api_key: '981624627874848',
 api_secret: '8-qt9VB4RsnoB94OcuTsVyo6uk8' 
});

router.post('/upload', async function (req, res, next) {
  const imagePath = './temp/'+uniqid()+'.jpg';
  const resultCopy = await req.files.avatar.mv(imagePath);
  if(!resultCopy) {
    const resultCloudinary = await cloudinary.uploader.upload(imagePath);
      fs.unlinkSync(imagePath);
    res.json({result: true, message: 'File uploaded!', url: resultCloudinary.url } );      
  } else {
    res.json({result: false, message: resultCopy} ); } 
});

// POST : sign-up
router.post('/sign-up', async function (req, res, next) {
  var lowerEmail = req.body.email.toLowerCase();

  if (!req.body.name || !req.body.email || !req.body.password) {
    res.json({
      result: false,
      message: "Veuillez remplir tous les champs pour créer un compte."
    })
  } else {
    const checkExistingUserFromEmail = await UsersModel.findOne({ email: lowerEmail });
    if (checkExistingUserFromEmail) {
      res.json({result: false, message: "Il existe déjà un compte associé à cet email. Vous pouvez y accéder en vous connectant."})
    } else {
      const cost = 10;
      const hash = bcrypt.hashSync(req.body.password, cost);
      const user = new UsersModel({
        userLibraryName: req.body.name,
        avatar: req.body.avatar,
        email: lowerEmail,
        password: hash,
        token: uid2(32),
      });
      const userSave = await user.save();
    res.json({result:true, userToken:userSave.token, userAvatar:userSave.avatar, userLibrary:userSave.library, userWishlist:userSave.wishlist});
    }
  }
});

// POST : Update profile 
// Step 1 : POST to find user email and pseudo
router.post('/users/:token', async (req, res) => {
  const user = await UsersModel.findOne({token: req.params.token});
  const userEmail = user.email;
  const userLibraryName = user.userLibraryName;
  res.json({result:true, userEmail, userLibraryName })
 })

// Step 2 : POST to update profile // In progress....
router.post('/users/update/:token', async (req, res) => {
  if (!req.body.name || !req.body.currentPassword || !req.body.password) {
    res.json({
      result: false,
      message: "Veuillez remplir tous les champs pour modifier votre compte."
    })
  } else {
    const user = await UsersModel.findOne({token: req.params.token});
    const currentPassword = req.body.currentPassword;
    const cost = 10;
    const hash = bcrypt.hashSync(req.body.password, cost);
    if (bcrypt.compareSync(currentPassword, user.password)) {
      user.userLibraryName = req.body.name;
      user.password = hash;
      user.avatar = req.body.avatar
      const userSave = await user.save();
      res.json({ result: true, userToken: userSave.token, userAvatar: userSave.avatar});
    } else {
    res.json({result: false, message: "Mot de passe incorrect" });
    }
  }
});

/* Ajout d'un livre dans la bibliothèque d'un user dans la BDD  */
router.post('/library/add/:token/:bookId', async (req, res) => {
  let token = req.params.token;
  let bookId = req.params.bookId;
  const regex = new RegExp("[0-9A-Za-z_\-]{12}")



  if (!token || !regex.test(bookId) ) {
    res.json({ result: false, message: "Aie, nous n'avons pas pu ajouter le livre à votre bibliothèque" });
    return
  
  } else {

  try {

    var bookToCheck = await BooksModel.findOne({bookId: bookId});

    if (bookToCheck === null) { 
      const newBookInLibrary =  new BooksModel({
        title: req.body.title, 
        cover: req.body.cover, 
        bookId: bookId,
        authors:req.body.authors,
        description:req.body.description,
        publisher:req.body.publisher,
        date:req.body.date,
        categories:req.body.categories,
        pageCount:req.body.pageCount
      });
      savedBookInLibrary = await newBookInLibrary.save();
      
      var userCheck = await UsersModel.findOne({token: token});
      var userCheckTab = [];
      for (let i = 0; i < userCheck.library.length; i++) {
        if (JSON.stringify(userCheck.library[i]) === JSON.stringify(savedBookInLibrary._id)) {
          userCheckTab.push(userCheck)
        }
      }


      if (userCheckTab.length === 0) { 
        var user = await UsersModel.findOneAndUpdate({token: token},{ $push: {library: savedBookInLibrary._id}});
        res.json({ result: true });
      } else {res.json({ result: false, message: "Livre déjà dans votre bibliothèque" });}

    } else {
      var userCheck2 = await UsersModel.findOne({token: token});
      var userCheckTab2 = [];
      for (let i = 0; i < userCheck2.library.length; i++) {
        if (JSON.stringify(userCheck2.library[i]) === JSON.stringify(bookToCheck._id)) {
          userCheckTab2.push(userCheck2)
        }
      }

      if (userCheckTab2.length === 0) {
        var user2 = await UsersModel.findOneAndUpdate({token: token},{ $push: {library: bookToCheck._id}});
        res.json({ result: true });
      } else {res.json({ result: false, message: "Livre déjà dans votre bibliothèque" });}
    }
  }
  catch (error) {
    res.json({result:false, message:error})
  }
 }});


/* Recherche de library dans la BDD  */
router.post('/library', async (req, res) => {
  let token = req.body.token;
  if (!token) {
    res.json({ result: false, message: "Nous n'avons pas vu vous identifier" });
  } else {
  const user = await UsersModel.findOne({token: req.body.token}).populate('library').exec()
  var userLibrary = (user.library || null)
  res.json({result: true, library: userLibrary})
}
});

/* Delete a book from library */
router.delete('/library/delete/:token/:bookId', async (req, res) => {
  let token = req.params.token;
  let bookId = req.params.bookId;
  const regex = new RegExp("[0-9A-Za-z_\-]{12}");

  if (!token || !regex.test(bookId) ) {
    res.json({ result: false, message: "Aie, nous n'avons pas pu supprimer le livre de votre bibliothèque" });
  } else {
            var bookToDelete = await BooksModel.findOne({bookId: bookId});
            var userCheck = await UsersModel.findOne({token: token, library: bookToDelete._id})
            if (userCheck !== null) {
              var user = await UsersModel.findOneAndUpdate({token: token},{ $pull: {library: bookToDelete._id}});
              res.json({ result: true});
            } else {
                res.json({ result: false, message: "livre déjà supprimé de votre bibliothèque" });
              }
          }
});

/* Recherche de wishlist dans la BDD  */
router.post('/wishlist', async (req, res) => {
  let token = req.body.token;
  if (!token) {
    res.json({ result: false, message: "Nous n'avons pas vu vous identifier" });
  } else {
    const user = await UsersModel.findOne({
      token: req.body.token
    }).populate('wishlist').exec()
    var userWishlist = (user.wishlist || null);
    res.json({
      result: true,
      wishlist: userWishlist
    })
  }
});


/* Suppression d'un livre dans la wishlist d'un user dans la BDD */
router.delete('/wishlist/delete/:token/:bookId', async (req, res) => {
  let token = req.params.token;
  let bookId = req.params.bookId;
  const regex = new RegExp("[0-9A-Za-z_\-]{12}")

  if (!token || !regex.test(bookId) ) {
    res.json({ result: false, message: "Aie, nous n'avons pas pu supprimer le livre de votre wishlist" });
  } else {
    var bookToDelete = await BooksModel.findOne({
      bookId: bookId
    });

    var userCheck = await UsersModel.findOne({token: token, wishlist: bookToDelete._id})
    if (userCheck !== null)
    {
    var user = await UsersModel.findOneAndUpdate({
      token: token
    }, {
      $pull: {
        wishlist: bookToDelete._id
      }
    });
    res.json({
      result: true
    });
  } else {
    res.json({ result: false, message: "livre déjà supprimé de votre wishlist" });
  }
  }
});

/* Ajout d'un livre dans la wishlist d'un user dans la BDD  */
router.post('/wishlist/add/:token/:bookId', async (req, res) => {
  let token = req.params.token;
  let bookId = req.params.bookId;
  const regex = new RegExp("[0-9A-Za-z_\-]{12}")

  if (!token || !regex.test(bookId) ) {
    res.json({ result: false, message: "Aie, nous n'avons pas pu ajouter le livre à votre wishlist" });

  } else {

    try {

      var bookToCheck = await BooksModel.findOne({
        bookId: bookId
      });

      if (bookToCheck === null) {
        const newBookInWishlist = new BooksModel({
          title: req.body.title, 
          cover: req.body.cover, 
          bookId: bookId,
          authors:req.body.authors,
          description:req.body.description,
          publisher:req.body.publisher,
          date:req.body.date,
          categories:req.body.categories,
          pageCount:req.body.pageCount
        });
        savedBookInWishlist = await newBookInWishlist.save();

        var userCheck = await UsersModel.findOne({
          token: token
        });
        var userCheckTab = [];
        for (let i = 0; i < userCheck.wishlist.length; i++) {
          if (JSON.stringify(userCheck.wishlist[i]) === JSON.stringify(savedBookInWishlist._id)) {
            userCheckTab.push(userCheck)
          }
        }

        if (userCheckTab.length === 0) { 
          var user = await UsersModel.findOneAndUpdate({token: token},{ $push: {wishlist: savedBookInWishlist._id}});
          res.json({ result: true, message: "Livre n'est pas dans la wishlist" });
        } else {
          res.json({ result: false, message: "Livre déjà dans votre wishlist" })
          ;};

      } else {
        var userCheck2 = await UsersModel.findOne({token: token});
        var userCheckTab2 = [];
        for (let i = 0; i < userCheck2.wishlist.length; i++) {
          if (JSON.stringify(userCheck2.wishlist[i]) === JSON.stringify(bookToCheck._id)) {
            userCheckTab2.push(userCheck2)
          }
        }

        if (userCheckTab2.length === 0) {
          var user2 = await UsersModel.findOneAndUpdate({token: token},{ $push: {wishlist: bookToCheck._id}});
          res.json({ result: true, message: "Livre n'est pas dans la wishlist" });
        } else {
          res.json({ result: false, message: "Livre déjà dans votre wishlist" });
        }
      }
    } catch (error) {
      res.json({ result: false, message: error });
    }
  }
})




module.exports = router;