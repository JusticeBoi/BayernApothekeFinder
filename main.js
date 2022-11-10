import axios from 'axios';
import { parse } from 'node-html-parser';
import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()


const timeout = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const postRequest = async (date, dateInput, lat, lon) => {
    const data = `lat=${lat}&lon=${lon}&date=${date}&dateInput={dateInput}`
    const result = await axios.post('https://lak-bayern.notdienst-portal.de/blakportal/schnellsuche/ergebnis',
        data, { headers: {
        accept: '*/*',
        'Content-Type': 'application/x-www-form-urlencoded'}})
    const root = parse(result.data)
    const searchResults = root.querySelectorAll('.searchResultEntry')
    const finalResults = searchResults.map((res) => {
    
        return {name: res.querySelector('.name').rawText,
                phone: res.querySelector('.phone').rawText,
                lat: res.rawAttributes['data-lat'],
                lon: res.rawAttributes['data-lon']}
                
    })
    return finalResults
}




const bot = new Telegraf(process.env.BOT_TOKEN);
bot.on('location', async (ctx) => {
// console.log(ctx.message)
  const latUser = ctx.message.location.latitude
  const lonUser = ctx.message.location.longitude
  const date = new Date().getTime()
  const dateInput = new Date().toLocaleDateString('en-GB')
  const results = await postRequest(date, dateInput, latUser, lonUser)
  const length = results.length > 3 ? 3 : results.length
// for (const res of results) {
for (var i = length - 1; i >= 0; i-- ) {
    const res = results[i]; 
    const R = 6371e3; // metres
    const latRes = Number(res.lat)
    const lonRes = Number(res.lon)
    const φ1 = latRes * Math.PI/180; // φ, λ in radians
    const φ2 = latUser * Math.PI/180;
    const Δφ = (latUser-latRes) * Math.PI/180;
    const Δλ = (lonUser-lonRes) * Math.PI/180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    const d = Math.round(R * c) ; // in kilometres
    await ctx.telegram.sendMessage(ctx.message.chat.id,`Name: ${res.name}\nTel: ${res.phone}\nDistance: ${Math.round(d/10)/100} km`)
    await ctx.telegram.sendLocation(ctx.message.chat.id,Number(res.lat), Number(res.lon))
    }
});
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
