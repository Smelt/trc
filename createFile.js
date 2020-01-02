const fs = require('fs')
const axios = require('axios')
const API_KEY = '3ASLQN7TM71KOYWT.'


const format = res => {
    let data = res.data['Time Series (Daily)']
    let prices = []
    for(date in data) {
        let price = Number.parseFloat(data[date]['1. open'])
        prices.unshift({ 
            date: new Date(date), 
            price: price
        })
    }
    return prices
}

const createFile = async(ticker) => {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=full&apikey=${axios}`
    try {
        const res = await axios.get(url)
        const prices = format(res)
        const json = JSON.stringify(prices)
        fs.writeFileSync(`${ticker}_prices.json`, json)
    }
    catch(err){
      console.log(err)
      return []
    }
}

