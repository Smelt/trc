const API_KEY = '3ASLQN7TM71KOYWT.'
const axios = require('axios')
const API_KEY2 = 'DVGD0N76RMQM2LV0'
const API_KEY3 = 'XTKJ36VTRMDLLMQG'
const API_KEY4 = '4HPS4NFZKQMT4CGH'
const fs = require('fs')



const normalizeData = ({data}, time) => {
    //console.log(data)
    const metaData = data['Meta Data']
    const timeSeriesMap = data[`Time Series (${time}min)`]
    const timeSeries = []
    for(date in timeSeriesMap) {

        timeSeries.push(timeSeriesMap[date]['1. open'])
    }
    const firstPrice = timeSeries[0]

    const normalized = timeSeries.map((price) => {
        return (price/firstPrice * 100)
    })
    return normalized
}

const normalizeEMAData = ({data}, time) => {
    const metaData = data['Meta Data']
    console.log(data)
    const timeSeriesMap = data[`Technical Analysis: EMA`]
    const timeSeries = []
    for(date in timeSeriesMap) {
    
        timeSeries.push(timeSeriesMap[date]['EMA'])
    }
    const firstPrice = timeSeries[0]
    console.log(timeSeries)

    const normalized = timeSeries.map((price) => {
        return (price/firstPrice * 100)
    })
    return normalized
}

const testHistoricPrices = async (ticker, time = 5) => {
    //const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${ticker}&interval=${time}min&outputsize=full&apikey=${API_KEY}`
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${ticker}&interval=${time}min&apikey=${API_KEY4}`
    try {
        const res = await axios.get(url)
        const normalizedData = normalizeData(res, time)
        return normalizedData 
    }
    catch(err){
      console.log('FAILING -------------------------')
      console.log(err)
      return []
    }
}

const testHistoricEMA = async (ticker, time = 5) => {
    //const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${ticker}&interval=${time}min&outputsize=full&apikey=${API_KEY}`
    const url = `https://www.alphavantage.co/query?function=EMA&symbol=${ticker}&interval=${time}min&time_period=${time}&series_type=open&apikey=${API_KEY3}`
    try {
        const res = await axios.get(url)
        const normalizedData = normalizeEMAData(res, time)
        return normalizedData 
    }
    catch(err){
      console.log(err)
      return []
    }
}

const main = async() => {
    const SPY = await testHistoricPrices('SPY', 15)
    const BND = await testHistoricPrices('BND', 15)
    const GLD = await testHistoricPrices('GLD', 15)

    const GLD_EMA = await testHistoricEMA('GLD', 15)
    const BND_EMA = await testHistoricEMA('BND', 15)
    const SPY_EMA = await testHistoricEMA('SPY', 15)
    console.log('starting buying process')
    let buy = true
    console.log('running test buys')
    for(let i = 5; i < SPY.length - 2; i++) {
        let sum = GLD_EMA[i - 3] + BND_EMA[i - 3] + SPY_EMA[i - 3]
        let curr = GLD_EMA[i] + BND_EMA[i] + SPY_EMA[i]
        let val = SPY[i] + GLD[i] + BND[i]
        console.log(sum + " " + curr + " " + val)
        if(buy) {
            if(curr < (sum * .999)) {
                buy = false
                console.log('Buy at val ' + val)
            }
        } else {
            if(curr > (sum * .999)) {
                buy = true
                console.log('sell at val ' + val)
            }
        }
    }
   console.log('post buys'
   )

}


//main()