require("dotenv").config()

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const https = require("https");
const lodash = require('lodash');
// const backendWork = require("./backend-work.js")
const backendWork = require(__dirname+"/backend-work.js")
const AWS = require('aws-sdk');
const PORT = process.env.POST || 3000;


const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));



app.get("/", function (req, res) {
    res.render("home.ejs")
});

app.post("/", async function (req, res) {

    let data_obj = {
      product_name: req.body.product_name,
      product_url: req.body.product_url,
      email: req.body.email,
      trigger_price: req.body.trigger_price
    }

    backendWork.is_prod_valid(req.body.product_url).then(is_valid => {
        if(is_valid){
          const s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          });

          const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Bucket: "my-products-for-alert",
            Key: Date.now().toString(),
            Body: JSON.stringify(data_obj),
            ContentType: "application/json",
          }
          
          s3.putObject(params, function(err, data){
            if (err) {
              console.log(err)
              res.redirect("/error")
              return
            }
            console.log(data)
            res.redirect("/success")
          });
        }else{
          res.redirect("/error")
        }
    });

});



app.get("/success", function (req, res) {
    res.render("success.ejs",{message_title:"Product saved!", message_text:"Sit back and relax, we'll alert you when your product is available cheaper."})
});

app.get("/error", function (req, res) {
  res.render("error.ejs", {message_title:"Error occured.", message_text:"An error occured while processing, please verify details or try again later."})
});



app.listen(PORT, function () {
  console.log("Server started on port 3000");
});
