const axios = require('axios')
const cheerio = require('cheerio');


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
            console.log(platform)
            
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



module.exports = {is_prod_valid}

