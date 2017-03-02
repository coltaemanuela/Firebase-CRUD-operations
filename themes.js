var express = require('express');
var firebase = require('firebase');
var gcloud = require('google-cloud');
var multer = require('multer'); 
var upload = multer({
    dest: 'uploads/'
});
var fs = require("fs");
var router = express.Router();


//---------------------------gcloud storage --------------------------------------------------------------------------
var storage = gcloud.storage({
    projectId: "***",
    keyFilename: '****.json'
});
var bucket = storage.bucket(`*******`);



//-------------------------------CRUD OPERATIONS-------------------------------------------------

//-------------------------- READ. GET data -----------------------------------------------------

router.get('/', function(req, res) {

    var id = req.params.id;
    firebase.database().ref("themes").once('value')
        .then(function(data) {
            res.render('themes', {
                id: id,
                title: 'All Themes',
                themes: data.val()
            });
        })
        .catch(function(error) {
            res.render('error', {
                error: error
            });
        });
});

//------------------------------- CREATE THEME. GET the view and POST data ----------------------------------------------

router.get('/add', function(req, res) {
    res.render('createTheme', {
        title: "Add new Theme"
    });
});

router.post('/add', upload.single('image'), function(req, res) {

    var db = firebase.database();
    var themesRef = db.ref('themes');

    var title = req.body.title;
    var details = req.body.details;

    var path = req.file.path;
    var image = req.file;

    themesRef.push({
        'title': title,
        'details': details
    });

    themesRef.orderByKey().limitToLast(1).on('child_added', function(snapshot) {

        var thisid = snapshot.key;
        var extension = ".jpg";
        var filePath = thisid + extension;

        fs.rename(path, filePath, function(err) {
            if (err) {
                console.log(err);
            }

            var themesPath = 'themes/' + filePath;
            var storageFile = bucket.file(themesPath);
            var storageFileStream = storageFile.createWriteStream({
                metadata: {
                    contentType: req.file.mimetype //set the content type; use mimetype to filter out other types of files
                }
            });

            storageFileStream.on('error', function(err) {
                res.render("error", {
                    error: err
                });
            });

            storageFileStream.on('finish', function() {
                // cloudFile.makePublic after the upload has finished, because otherwise the file is only accessible to the owner:
                storageFile.makePublic(function(err, data) {
                    if (err)
                        console.log(err);
                });

                // Delete the file from the hard disk
                fs.unlink(filePath, function(err) {
                    //err && console.error(err);
                    console.error(err);
                });             
               // res.redirect('/admin/themes');
            });

            fs.createReadStream(filePath).pipe(storageFileStream);
        });
    });
      res.redirect('/admin/themes');
});

//-------------------------------- Edit and UPDATE --------------------------------------
router.get('/edit/:id', function(req, res) {

    var id = req.params.id;
    firebase.database().ref(`themes/` + id).once('value')
        .then(function(data) {
            res.render('themeEdit', {
                id: id,
                title: ' Edit Theme',
                themes: data.val()
            });
        })
        .catch(function(error) {
            res.render('error', {
                error: error
            });
        });
});

router.post('/edit', upload.single('image'), function(req, res) {

    var id = req.body.id;
    var title = req.body.title;
    var details = req.body.details;
    var image = req.file;

    if (!req.file) {
        console.log('no image has been uploaded');
        firebase.database().ref(`themes/` + id).update({
            'title': title,
            'details': details,
        });
        res.redirect('/admin/themes');
    } else {

        console.log('image successfully uploaded');

        var extension = ".jpg";
        var filePath = id + extension;


        fs.rename(req.file.path, filePath, function(err) {
            if (err) {
                return res.render("error", {
                    err: err
                });
            }

            var themesPath = 'themes/' + filePath;
            var storageFile = bucket.file(themesPath);
            var storageFileStream = storageFile.createWriteStream({
                metadata: {
                    contentType: req.file.mimetype //set the content type; use mimetype to filter out other types of files
                }
            });

            storageFileStream.on('error', function(err) {
                res.render("error", {
                    error: err
                });
            });

            storageFileStream.on('finish', function() {
                // cloudFile.makePublic after the upload has finished, because otherwise the file is only accessible to the owner:
                storageFile.makePublic(function(err, data) {
                    if (err)
                        console.log(err);
                });

                fs.unlink(filePath, function(err) {
                    //err && console.error(err);
                    console.error(err);
                });
                firebase.database().ref(`themes/` + id).update({
                    'title': title,
                    'details': details,
                });
            });

            fs.createReadStream(filePath).pipe(storageFileStream);
        });
        res.redirect('/admin/themes');
    }
    
});

//-------------------------------DELETE------------------------------------------------ 

router.get('/delete/:id', function(req, res) {
    var id = req.params.id;
    firebase.database().ref(`themes/` + id + '/themeItems').remove();
    res.render('themesDeleteConfirmation', {
        id: id,
        title: "Delete Confirmation"
    });

});

//--------------------------------------------------------------------------------
module.exports = router;