function findMinAsset(weights) {
    let arr = Object.keys(weights).map(function (key) { return weights[key]; });
    let min = Math.min.apply(null, arr);
    for (let asset in weights) {
        if (weights[asset] === min) {
            return asset
        }
    }
    return null

}


function findMinAsset2(weights) {
    let objArr = []
    objArr.push(weights.gld)
    objArr.push(weights.tlt)
    objArr.push(weights.bnd)
    objArr.push(weights.spy)
    let assetShort = objArr.indexOf(Math.min(...objArr))
   
    let assetName = ''
    if (assetShort == 0) {
       
        assetName = 'Gold'
    }
    if (assetShort == 1) {

        assetName = 'Tlt'
    }
    if (assetShort == 2) {
        assetName = 'Bnd'
    }
    if (assetShort == 3) {

        assetName = 'SPY'
    }
    return assetName
}



const weight = {
    gld: .25,
    spy: .3,
    tlt: .2,
    bnd: .4
}

console.log(findMinAsset(weight))

console.log(findMinAsset2(weight))