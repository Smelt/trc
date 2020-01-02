const API_KEY = '3ASLQN7TM71KOYWT.'
const axios = require('axios')
const fs = require('fs')
const createCsvWriter = require('csv-writer').createObjectCsvWriter


function parseAndFormat(fileName) {
    let prices = JSON.parse(fs.readFileSync(fileName))
    const start = new Date(2008,5,1)
    const end = new Date(2009,5,1)

    const ranged = prices.filter((el) => {
        let d = new Date(el.date)
        return d.getTime() > start.getTime() && d.getTime() < end.getTime()
    })
    return ranged
}

function normalizeRunningAvg(prices) {
    let arr = []
    let dividend = 0
    let top = 0
    let avg = 0
    for(let i = 1; i < prices.length; i++) {
        dividend += i
        top += (prices[i].price * i)
        avg = top/dividend
        let currAvg = prices[i].price / avg
        arr.push(currAvg)
    }
    return arr
}

function joinAndWeights(tlt, bnd, spy, gld, tltP, bndP, spyP, gldP) {
    const weights = []
    const prices = []
    const arr = []
    for(let i = 0; i < tlt.length; i++) {
        let tltWeight = tlt[i] * 1
        let bndWeight = bnd[i] * 1
        let spyWeight = spy[i] * 1
        let gldWeight = gld[i] * .5

        let total = tltWeight + bndWeight + spyWeight + gldWeight

        arr.push({total: total, 
            gld: gldP[i].price, bnd: bndP[i].price, spy: spyP[i].price, tlt: tltP[i].price,
            gldW: gldWeight * 2, bndW: bndWeight, spyW: spyWeight, tltW: tltWeight,
        })
    }
    return arr
}

let tlt = parseAndFormat('tlt_prices.json')
let bnd = parseAndFormat('bnd_prices.json')
let spy = parseAndFormat('spy_prices.json')
let gld = parseAndFormat('gld_prices.json')

let normalGld = normalizeRunningAvg(gld)
let normalBnd = normalizeRunningAvg(bnd)
let normalSpy = normalizeRunningAvg(spy)
let normalTlt = normalizeRunningAvg(tlt)

let arr = joinAndWeights(normalTlt, normalBnd, normalSpy, normalGld, tlt, bnd, spy, gld)





const csvWriter = createCsvWriter({
  path: 'out.csv',
  header: [
    {id: 'index', title: 'index'},
    { id: 'side', title: 'side'},
    { id: 'asset', title: 'asset'},
    { id: 'date', title: 'date'},
    {id: 'profit', title: 'profit'},
    {id: 'gains', title: 'gains'}
  ]
})

let dollars = 10000
let profitArr = []
let buy = true
let purchasePrice = 0
let shortPrice = 0
let movingAvg = 0
let weightedMovingTotal = 0
let wma = 0;
let div = 0;
let movingTotal = 0
let profit = 0
let asset = 0
let assetShort = 0
let quantityBought = 0
let quantityShort = 0
for(let i = 0; i < 5; i++) {
    movingTotal += arr[i].total
}
for(let i = 5; i < arr.length; i++ ) {
    movingTotal += arr[i].total 
    movingTotal -= arr[i - 5].total
    movingAvg = movingTotal/5
    div = 0

    weightedMovingTotal = 0
    for(let x = 1; x < 5; x++ ) {
        weightedMovingTotal += arr[i - 5].total * x
        div += x
    }
    wma = weightedMovingTotal/ div
    //  console.log(`${wma} - ${movingAvg} - ${arr[i].total}`)
    if(buy) {
        if((wma * .99 ) < arr[i].total) {
            
            let objArr = []
            objArr.push(arr[i].gldW)
            objArr.push(arr[i].tltW)
            objArr.push(arr[i].bndW)
            objArr.push(arr[i].spyW)

            let prices = []
            prices.push(arr[i].gld)
            prices.push(arr[i].tlt)
            prices.push(arr[i].bnd)
            prices.push(arr[i].spy)
            asset = objArr.indexOf(Math.min(...objArr))

            let currPrice = 0
            let assetName = ''
            if(assetShort == 0) {
                currPrice = arr[i].gld
                assetName = 'Gold'
            }
            if(assetShort == 1) {
                currPrice = arr[i].tlt
                assetName = 'Tlt'
            }
            if(assetShort == 2) {
                currPrice = arr[i].bnd
                assetName= 'Bnd'
            }
            if(assetShort == 3) {
                currPrice = arr[i].spy
                assetName = 'SPY'
            }
            
            let currProfit = shortPrice - currPrice;
            quantityShort = (dollars / 1) / shortPrice 
            
            
            if(shortPrice === 0 ) {
                profit = 0
            }
            if(shortPrice !== 0 ) {
                profit += currProfit * quantityShort
                //  dollars +=  currProfit * quantityShort
            }
            
            console.log('ASset ' + asset)
            purchasePrice = prices[asset]
            buy = false
            //  console.log(`Buy at :  ${purchasePrice}`)
            if(shortPrice !== 0 ) {
             
                profitArr.push({index: i, side: 'Short', asset: assetName, profit: profit, date: spy[i].date,gains: dollars})
            }
           
        }
    } else {
        if((wma * .99 ) > arr[i].total) {
            buy = true
            let currPrice = 0
            let assetName = ''
            if(asset == 0) {
                currPrice = arr[i].gld
                assetName = 'Gold'
            }
            if(asset == 1) {
                currPrice = arr[i].tlt
                assetName = 'Tlt'
            }
            if(asset == 2) {
                currPrice = arr[i].bnd
                assetName= 'Bnd'
            }
            if(asset == 3) {
                currPrice = arr[i].spy
                assetName = 'SPY'
            }
            let objArr = []
            objArr.push(arr[i].gldW)
            objArr.push(arr[i].tltW)
            objArr.push(arr[i].bndW)
            objArr.push(arr[i].spyW)

            let prices = []
            prices.push(arr[i].gld)
            prices.push(arr[i].tlt)
            prices.push(arr[i].bnd)
            prices.push(arr[i].spy)
            assetShort = objArr.indexOf(Math.max(...objArr))
            shortPrice = prices[assetShort]
            let currProfit = currPrice - purchasePrice;
            quantityBought= (dollars / 1) / purchasePrice
            profit += currProfit * quantityBought
            //  dollars += currProfit * quantityBought
            profitArr.push({ index: i, side: 'Long', asset: assetName, profit: profit, date: spy[i].date, gains: dollars})
            //  console.log(`Sell at :  ${currPrice} - Profit: ${currProfit}`)
        }
    }

}

console.log('total profit ' + profit)
console.log('remaining : '  + dollars)
csvWriter
  .writeRecords(profitArr)
  .then(()=> console.log('The CSV file was written successfully'));
