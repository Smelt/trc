const API_KEY = '3ASLQN7TM71KOYWT.'
const axios = require('axios')
const fs = require('fs')
const createCsvWriter = require('csv-writer').createObjectCsvWriter

class Trade {
    constructor(index, date, asset, side, price, cash, leverage) {
        this.index = index
        this.date = date
        this.asset = asset
        this.side = side
        this.price = price
        this.quantity =  Math.floor((cash * .5 * leverage) / price)
        this.profit = 0
        this.cash = 0
        this.closePrice = 0
        this.closeDate = null

        this.closeIndex = 0
    }

    setProfit(profit) {
        this.profit = profit
    }

    getPrice(){
        return this.price
    }

    setClosePrice(price) {
        this.closePrice = price
    }

    setCloseDate(date) {
        this.closeDate = date
    }

    setCash(cash) {
        this.cash = cash
    }

    setCloseIndex(index) {
        this.closeIndex = index
    }
}
function parseAndFormat(fileName, start, end) {
    let prices = JSON.parse(fs.readFileSync(fileName))
    const ranged = prices.filter((el) => {
        let d = new Date(el.date)
        return d.getTime() >= start.getTime() && d.getTime() <= end.getTime()
    })

    return ranged
}

function normalizeRunningAvg(prices, lookBack) {
    let arr = []
    let dividend = 0
    let top = 0
    let avg = 0
    arr.push(1)
    for (let i = 1; i < prices.length; i++) {
        dividend += i
        top += (prices[i].price * i)
        avg = top / dividend
        let currAvg = prices[i].price / avg
        arr.push(currAvg)
    }
    return arr
}

function joinAndWeights(tlt, bnd, spy, gld, tltP, bndP, spyP, gldP) {
    let arr = []
    let weights = []
    for (let i = 0; i < tlt.length; i++) {
        //usd bond market 40 Trillion
        //usd stock market 30 trillion
        //gld market 3 trillion
        let tltWeight = tlt[i] * .8
        let bndWeight = bnd[i] * 1
        let spyWeight = spy[i] * 1.5
        let gldWeight = gld[i] * .28
        let total = tltWeight + bndWeight + spyWeight + gldWeight
        arr.push({
            total: total,
            gld: gldP[i].price,
            bnd: bndP[i].price,
            spy: spyP[i].price,
            tlt: tltP[i].price,
            date: spyP[i].date
        })
        weights.push({
            gld: gld[i],
            bnd: bnd[i],
            spy: spy[i],
            tlt: tlt[i],
    
        })
    }
    return { priceArr: arr, weightArr: weights }
}

function findMinAsset(weights) {
    let arr = Object.keys(weights).map(function (key) { return weights[key] })
    let min = Math.min.apply(null, arr);
    for (let asset in weights) {
        if (weights[asset] === min) {
            return asset
        }
    }
    return null
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function findMaxAsset(weights) {
    let arr = Object.keys(weights).map(function (key) { return weights[key]; });
    let max = Math.max.apply(null, arr);

    for (let asset in weights) {

        if (weights[asset] === max) {
            return asset
        }
    }
    return null
}
function findMaxDrawDown(mtm){
    let maxArr = []
    let maxDiff = -1000
    maxArr.push(mtm[0].cash)
   for(let i = 1; i < mtm.length; i++ ) {
        let max = Math.max(mtm[i].cash, mtm[i-1].cash)
        maxArr.push(max)
   }
   for(let i = 0; i < mtm.length; i++) {
        let diff = ((Number.parseFloat(maxArr[i]) - Number.parseFloat(mtm[i].cash))/Number.parseFloat(maxArr[i]))
        maxDiff = Math.max(diff, maxDiff)

        
   }
   return maxDiff
}
/* 
Starting Cash : is how much algo starts with in money
Sensitivity : is how much the much of a variance the algo waits for executing a trade
Lookback: how many days we look back for our weighted averages
*/
function runStrategy(cash = 10000, sensitivity = 0.998, lookBack = 5, leverage = 1, priceArr = [], weightArr = [], fixedSize = false, start, end) {
    const outputArr = []
    let buySell = true
    let longTrade = null
    let shortTrade = null
    let profit = 0
    let runningProfit = 0
    let tradeCount = 0
    const tradeArr = []
    let mtmCash = cash
    const mtmArr = []
    for (let i = lookBack; i < priceArr.length; i++) {
        let weightedMovingTotal = 0
        let div = 0

        for (let x = 1; x <= lookBack; x++) {
            weightedMovingTotal += priceArr[i - lookBack + x - 1].total * x
            div += x
        }
        const wma = weightedMovingTotal / div
        const todayPrice = priceArr[i].total
        const todayDate = priceArr[i].date

        if ( shortTrade !== null ) {
            const { asset, direction, quantity, price, date } = shortTrade
            let mtmGain = ( priceArr[i - 1][asset]- priceArr[i][asset] ) * quantity
            mtmCash += mtmGain
        }
            
        if ( longTrade !== null ) {
            const { asset, direction, quantity, price, date } = longTrade
            let mtmGain = ( priceArr[i][asset] -  priceArr[i - 1][asset] ) * quantity

            mtmCash += mtmGain
        }

        

        mtmArr.push({ index: i, date: 'onw', cash: mtmCash, spy: priceArr[i]['spy'] })
        //  if in buy 
        if (buySell && (wma * sensitivity) < todayPrice) {
            let asset = findMinAsset(weightArr[i])         
            longTrade = new Trade(i, todayDate, asset, 'long', priceArr[i][asset], cash, leverage)
      
            if ( shortTrade !== null ) {
                const {asset, price, quantity}  = shortTrade
                profit = ( price - priceArr[i][asset] ) * quantity
                runningProfit += ( price - priceArr[i][asset] ) * quantity
                if ( fixedSize === false) {
                    cash += profit
                }
                shortTrade.setProfit(profit)
                shortTrade.setClosePrice(priceArr[i][asset])
                shortTrade.setCloseDate(todayDate)
                shortTrade.setCloseIndex(i)
                const { index, side, closeDate, closePrice, closeIndex } = shortTrade
           
                tradeArr.push({ index: index, price: shortTrade.getPrice(), side: side, asset: asset, profit: profit, cash: cash, closeDate: closeDate, closePrice: closePrice, closeIndex: i })
                shortTrade = null
                tradeCount++
            }
            buySell = false
        } else if ((buySell === false) && (wma * sensitivity) > todayPrice) {
            let asset = findMaxAsset(weightArr[i])
            shortTrade = new Trade(i, todayDate, asset, 'short', priceArr[i][asset], cash, leverage)
            
            if ( longTrade !== null ) {
                const {asset, price, quantity} = longTrade
                profit = ( priceArr[i][asset] - price ) * quantity
    
                longTrade.setProfit(profit)
                longTrade.setClosePrice(priceArr[i][asset])
                longTrade.setCloseDate(todayDate)
                longTrade.setCloseIndex(i)
                const { index, side, closeDate, closePrice, closeIndex } = longTrade
               
                
                if ( fixedSize === false) {
                    cash += profit
                } 
                tradeArr.push({ index: index, side: side, price: longTrade.getPrice(), asset: asset, profit: profit.toFixed(3), cash: cash, closeDate: closeDate, closePrice: closePrice, closeIndex: closeIndex })
                runningProfit +=( priceArr[i][asset] - price ) * quantity
                longTrade = null
                tradeCount++
            }
            buySell = true
        }

    }
    console.log(mtmCash)
    console.log('Trade Count ' + numberWithCommas(tradeCount.toFixed(0) ))
    console.log('Profit ' + numberWithCommas(runningProfit.toFixed(0)))
    console.log('Cash ' + numberWithCommas(cash.toFixed(0)))
    const deltaTime = end.getYear() - start.getYear()
    const percentReturnYearOverYear = computeCompoundInterest(10000, cash, start.getYear(), end.getYear())
    const maxDrawDown = findMaxDrawDown(mtmArr)
    console.log(percentReturnYearOverYear.toFixed(2) + '% for ' + deltaTime + ' years')
    console.log('Max draw down of: ' + (maxDrawDown.toFixed(4) * 100) + '%')
    return { trades: tradeArr, mtm: mtmArr }

}

function computeCompoundInterest(startingCash, endCash, startTime, endTime) {
    return (Math.log(endCash/startingCash)/(endTime - startTime)).toFixed(5) * 100
}




const dailyPnl = createCsvWriter({
    path: 'daily.csv',
    header: [
        { id: 'index', title: 'index' },
        { id: 'date', title: 'date' },
        { id: 'cash', title: 'cash' },
        { id: 'spy', title: 'spy'}
    ]
})








const csvWriter = createCsvWriter({
    path: 'out.csv',
    header: [
        { id: 'index', title: 'index' },
        { id: 'side', title: 'side' },
        { id: 'asset', title: 'asset' },
        { id: 'date', title: 'date' },
        { id: 'profit', title: 'profit' },
        { id: 'price', title: 'price' },
        { id: 'closePrice', title: 'closePrice'},
        { id: 'closeIndex', title: 'closeIndex'}
    ]
})
const start = new Date('06/01/2007')
const end = new Date('06/01/2019')
const lookBack = 15
let tlt = parseAndFormat('tlt_prices.json', start, end)
let bnd = parseAndFormat('bnd_prices.json', start, end)
let spy = parseAndFormat('spy_prices.json', start, end)
let gld = parseAndFormat('gld_prices.json', start, end)

let normalGld = normalizeRunningAvg(gld, lookBack)
let normalBnd = normalizeRunningAvg(bnd, lookBack)
let normalSpy = normalizeRunningAvg(spy, lookBack)
let normalTlt = normalizeRunningAvg(tlt, lookBack)
let { priceArr, weightArr } = joinAndWeights(normalTlt, normalBnd, normalSpy, normalGld, tlt, bnd, spy, gld)
const { trades, mtm }  = runStrategy(10000, .998, lookBack, 1, priceArr, weightArr, false, start, end)










csvWriter
  .writeRecords(trades)
  .then(()=> console.log('The CSV file was written successfully'))


dailyPnl
    .writeRecords(mtm)
    .then(() => console.log(''))

