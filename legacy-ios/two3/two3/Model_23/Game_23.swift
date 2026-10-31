//
//  Game_23.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import SwiftUI
// n0t-1n initValue
let g0sGameName = "1n"

let g0sGameMove = 0
let g0sMoveText = " 0 "
let g0sMoveTextAtt = NSMutableAttributedString(string: " 0 ")
let g0sBestMove = 0
// n0t-g0s globalStatic


let g0sBestText = "__" // dual purpose

let g0sGameTime = 0.00
let g0sTimeText = " 0.0 "
let g0sTimeTextAtt = NSMutableAttributedString(string: " 0.0 ")
let g0sBestTime = 0.00

let g0sMoveThreshold = 5
let g0sTimeThreshold = 15.55

class Game: NSObject {
  
  var tries = 0
  var maxTries = 9
  
  var dex = (-1)
  
  var gameStats: [Stat] = []
  
  var gameName          = g0sGameName
  
  var gameTime: Double  = g0sGameTime
  var timeText: String  = g0sTimeText
  var timeTextAtt: NSMutableAttributedString  = g0sTimeTextAtt
  var timeBest: Double  = g0sBestTime
  
  var gameMove: Int     = g0sGameMove
  var moveText: String  = g0sMoveText
  var moveTextAtt: NSMutableAttributedString  = g0sMoveTextAtt
  var moveBest: Int     = g0sBestMove
  
  var gameRect: CGRect?
  var sortedDyce: [Die]?// buggy
  
  var mask: String?
  var twistDice = false
  var twistCice = false
  
  var nowString = ""
  var h1moves: [Move] = [] // historyMoves
  var h1slides: [Slide] = [] // historyMoves
  
  var ecHorizontal = 3 // edgeCounts
  var ecVertical   = 2
  
  var okToSwapCice = true
  var okToSwapDice = true
  let okToStackDice = true
  
  var trgt: Cie?
  var plck: Die? = nil
  var r5row: [String] = []
  var r5col: [String] = []
  var r5box: [String] = []
  
  var a8sub   = true // dirNums dir8subs
  var arrows8 = "↑,↗,→,↘,↓,↙,←,↖"
  /// 1 for Single and No Shuffle or Zero to notHome
  var prcntHoles = 1
  var shuffleDice = false
  var closeChars: [Character] = []
  var slids = 1
  let slids0 = 1// resetValue
  let slidsMax = 4
  
  var lastULDR: ULDR = .up
  let warp0: Double = 5
  var dwarp: Double = 5
  var sectorFig: CGFloat = 0.0
  var flipX   = false
  
  var mixFig  = 0
  var mixFig0 = 1
  //    var mixFig = 0-1
  // neg for continuous
  var solution = ""
  var savedStr = ""
  
  var dashDex0: Int?
  //  var dashLLz: String?
  
  var tap2close = true
  var dir8toClose = 0-1
  
  var counter = 0
  var savedLLzArr: [String] = []
  var gmtitle = " tittle "
  
  let liteGrain: WoodGrain = .wgLite
  let darkGrain: WoodGrain = .wgDark
  
  
  var scalePad:   CGFloat = 1.00 // tweakGridSize
  var scalePhone: CGFloat = 1.00
  var shifter:    CGFloat = 1.00 // shiftRight Game4x6
  var didShift = false
  
  enum MIXED {
    case none
    case some
    case last
    case done
  }
  enum FIXED {
    case none
    case done
  }
  var mixed: MIXED = .none
  var fixed: FIXED = .none
  var state: STATE = .none
  
  enum STATE {
    case none
    case mixing
    case fixing
    case paused
    case solved
    case suspended
  }
  
  func reset(state: STATE) -> Bool {
    
    if state != .none { return false }
    mixed = .none
    fixed = .none
    self.state = state
    
    slids = slids0
    mixFig = mixFig0
    
    return true
  }
  func resetStats() {
    
    gameStats = []
    gameTime = g0sGameTime
    timeText = g0sTimeText
    timeTextAtt = g0sTimeTextAtt
    timeBest = g0sBestTime
    
    gameMove = g0sGameMove - 0
    moveText = g0sMoveText
    moveTextAtt = g0sMoveTextAtt
    moveBest = g0sBestMove
    
    h1moves = [] // historyMoves
    h1slides = [] // historyMoves
  }
  func resetALL() -> Bool {
    resetStats()
    return(reset(state: .none))
  }
}
// for slider games
class Game_QX_: Game {
  override init() {
    super.init()
    gameName = " gYm "
  }
}
class Game_Q_: Game_QX_ {
  override init() {
    super.init()
    gameName = " gQm " // gameName
    gmtitle = " Slide Q 23 "
    
    //   shifter = 0.90
  }
}
class Game_X_: Game_QX_ {
  override init() {
    super.init()
    gameName = " gXm "
    //    gmtitle = " Slide AX "
    gmtitle = " X 23 "
    
//    darkGrain = .wgLite
    //    darkGrain = .wg078fst2h // grainy
    //    liteGrain = .wg078fst2h // grainy
    
    mask          = keep24
    ecHorizontal  = 6
    ecVertical    = 6
    twistDice     = true
    twistCice     = true
    sectorFig     = 0
    
    
    scalePad  = 0.94
    //    shifter = 1.10
    
  }
}
//FIXME: noMix tmpCO
//let mixFig0 = 1 // for restart

//class GameX: Game_X_ {
//  override init() {
//    super.init()
//    mask = keep24
//    ecHorizon = 6
//    ecVertical = 6
//    twistDice = true
//    twistCice = true
//    sectorFig = 0
//    //        flipX   = true
//
////    title = " Slide AX "
//    gmtitle = " X 24 "
//
//  }}
class Game4x6: Game_Q_ {
  override init() {
    super.init()
    ecVertical    = 6
    ecHorizontal  = 4
    
    //    mixFig  = 1
    //    mixFig0 = 1
    scalePad    = 0.90
    scalePhone  = 0.90
    shifter     = 4/3
    gmtitle = "  4 x 6 "
    
  }}
class Game2x2: Game_Q_ {
  override init() {
    super.init()
    ecVertical    = 2
    ecHorizontal  = 2
    gmtitle = " 2 x 2 "
  }}
class Game4x4: Game_Q_ {
  override init() {
    super.init()
    ecVertical    = 4
    ecHorizontal  = 4
    gmtitle = " 4 x 4 "
    
  }}
class Game3x2: Game_Q_ {
  override init() {
    super.init()
    ecVertical    = 2
    ecHorizontal  = 3
    gmtitle = " 3 x 2 "
    
  }}
class Game4x3: Game_Q_ {
  override init() {
    super.init()
    ecVertical    = 3
    ecHorizontal  = 4
    gmtitle = " 4 x 3 "
    
  }}
class Game2x1: Game_Q_ {
  override init() {
    super.init()
    ecVertical    = 1
    ecHorizontal  = 2
    gmtitle = " 2 x 1 "
  }}
extension Game_QX_ {
  func writeSolutionFrom(cyce: [Cie]) {
    
    assert(cyce.count > 0)
    
    if !solution.isEmpty {
      print("solution", solution)
      return
    }
    
    if self is Game_X_ {
      writeSolutionFrom_ax(dict:axDict)
      return
    }
    
    var cycstr = ""
    for c in cyce {
      if c.ciax == dash {
        //                dashDex0 = c.cidex
        //                print("dashDex0", dashDex0)
        
      }
      cycstr.append( c.ciax )
    }
    
    var minus1 = cycstr
    minus1.removeLast()
    assert(minus1.count == cyce.count - 1)
    //        assert(minus1.contains(dash) ==  false)
    
    solution = minus1
    
  }
  fileprivate
  func writeSolutionFrom_ax(dict: Dictionary<Character,
    Character>) {
    let soluVals = valsFrom_ax(dict)
    let soluKeys = soluVals.replaceVia(dict)
    var sol23 = soluKeys
    sol23.removeLast()
    solution = sol23
  }
  func checkSolutionIn(cyce: [Cie]) -> String {
    
    var cycstr = ""
    for c in cyce {
      cycstr.append( c.ciax )
    }
    var minus1 = cycstr
    minus1.removeLast()
    assert(minus1.count == cyce.count - 1)
    assert(minus1.count == solution.count)
    savedStr = cycstr
    
    return minus1
  }
}
extension Game {
  func sortBySlids(
    dyce: [Die],
    u:String=#function) -> [Die] {
    //    ui(#function + u)// bugrr qst
    
    var total = 0
    for d in dyce {
      total += d.slids
      //      print("d.slids", d.slids, d.ax)
    }
    if total < 3 {
      total.ui(#function + u)// bugrr qst
      return dyce }
    
    return dyce.sorted(
      by: { (d1, d2) -> Bool
        in return d1.slids < d2.slids })
  }
}
extension ChildVC {
  func updateSolution() -> Bool {
    
    //    ckCombo(vc: self)
    
    let cstr = gm.checkSolutionIn(cyce: psCice)
    if cstr.contains(dash) {
      return false // c0ut for all
    }
    //    etvs[1].text = cstr + "\n" + etvs[1].text
    print("sol, cstr", gm.solution, cstr)
    
    return cstr == gm.solution
  }
}

extension Game {
  func saveLLzArr(dyce: [Die]) -> [String] {
    //        assert(dyce.count > 0)
    var arr:[String] = []
    for d in dyce {
      var ndg = d.dillz // appendage
      ndg += "#" + String(d.slids)
      
      arr.append(ndg)
    }
    //        savedLLzArr = arr
    print("arrLLz", arr)
    
    return arr
  }
  func writeLLzArr(dyce: [Die]) -> Bool {
    print("svdLLzArr", savedLLzArr)
    if savedLLzArr.isEmpty {
      
      return false }
    assert(dyce.count > 0)
    assert(dyce.count == savedLLzArr.count)
    
    for (i,d) in dyce .enumerated() {
      
      let svd = savedLLzArr[i]
      let LLZ = svd.split(separator: "#")[0]
      let num = svd.split(separator: "#")[1]
      let llz = String(LLZ)
      let sds = String(num).toInt()
      
      print(i, "i svd llz sds", svd, llz, sds)
      
      
      //      d.dillz = savedLLzArr[i]
      d.dillz = llz
      d.slids = sds
      d.h1z.append(d.dillz) // history
    }
    return true
  }
}

