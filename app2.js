require("dotenv").config()

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const https = require("https");
const lodash = require('lodash');
// const backendWork = require(__dirname + "/backend-work.js")
const AWS = require('aws-sdk');

const axios = require('axios')
const cheerio = require('cheerio');


const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));



const AMAZON = "amazon"
const FLIPKART = "flipkart"
const MYNTRA = "myntra"
const NYKAA = "nykaa"
const PLATFORMS = [AMAZON, FLIPKART, MYNTRA, NYKAA]

const USER_AGENTS = [
    ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.110 Safari/537.36'),  
    ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.79 Safari/537.36'),
    ('Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:55.0) Gecko/20100101 Firefox/55.0'),
    ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.91 Safari/537.36'),
    ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.89 Safari/537.36'),
    ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.108 Safari/537.36'),
    ('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'),
];


function get_platform_name(url){
    url = url.toLowerCase()

    for(pf of PLATFORMS){
        if (url.search(pf.toLowerCase()) != -1) 
            return pf
    }

    return PLATFORMS[0]
}

async function is_prod_valid(url) {
    try {
        for (u of USER_AGENTS){
            const config = {
                headers:{"User-Agent" : u}
            };
            
            const {data} = await axios.get(url, config);
            let platform = get_platform_name(url)
            // console.log(platform)
            
            const $ = cheerio.load(data);
            const content = [];

            switch(platform){
                case AMAZON:
                    $('#productTitle').each((_idx, el) => {
                        const title = $(el).text().trim()
                        content.push(title)
                    });
                    break;
                case FLIPKART:
                    $('.B_NuCI').each((_idx, el) => {
                        const title = $(el).text().trim()
                        content.push(title)
                    });
                    break
                case NYKAA:
                    $('.css-1gc4x7i').each((_idx, el) => {
                        const title = $(el).text().trim()
                        content.push(title)
                    });
                    break
                case MYNTRA:
                    $('pdp-name').each((_idx, el) => {
                        const title = $(el).text().trim()
                        content.push(title)
                    });
                    break
                default:
                    break
            }

            // console.log(content)
            return (content.length>0)
        }
    
    } catch (error) {
        // console.log(error)
        return false
    }
    
    return false
}



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

    is_prod_valid(req.body.product_url).then(is_valid => {
        if(is_valid){
          const s3 = new AWS.S3({
            // accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            // secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            accessKeyId: "AKIASKNBV4DMGVMSCPW2",
            secretAccessKey: "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",
          });

          const params = {
            // Bucket: process.env.AWS_BUCKET_NAME,
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



app.listen(process.env.POST || 3000, function () {
  console.log("Server started on port 3000");
});
