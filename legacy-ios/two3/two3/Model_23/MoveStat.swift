//
//  MoveStat.swift
//  two3
//
//  Created by G on 12/31/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit

class MoveStat: Stat {
  enum Stub: String, CaseIterable {
    case nowMoves  = "Current Moves: "
    case bestMoves = "Personal  Best: "
  }
}
// for class testing
extension VC {
  func setNowStat(move: Int,
                  moveText: String,
                  u: String = #function) {
    let u2 = #function
    print(u2, move, u, g0scoreSlat?.tag as Any)
    /// step2_prepend_u2_&_print
    
    if g0scoreSlat == nil {
      //      print(u2, " g0scoreSlat == nil { return } ")
      return
    }
    let nowLabel =
      seekMoveStat(stub: .nowMoves, inArr: g0scoreSlat!.statArr)
    nowLabel?.text = (nowLabel?.stub! ?? g0sMoveText) + moveText
    
    let doHideStat = !ShowStat.moverSlatNow.__bool()
    nowLabel?.isHidden = doHideStat
    
//    let toTryNow = true // n0t-toTryNow setsAlert
//    setBestStat(move: move, moveText: moveText)
  }
  func setBestStat(move: Int,
                   moveText: String,
                   u: String = #function) {
    let u2 = #function; print(u2, move, u, g0scoreSlat?.tag as Any)
    /// step2_prepend_u2_&_print
    
    if g0scoreSlat == nil {
      //      print(u2, " g0scoreSlat == nil { return } ")
      return
    }
    let nowLabel =
      seekMoveStat(stub: .bestMoves, inArr: g0scoreSlat!.statArr)
    nowLabel?.text = (nowLabel?.stub! ?? g0sBestText) + moveText
    

    let threshold = true // move < g0sMoveThreshold
    let hideStat = ShowStat.moverSlatBest.rawValue % 2 == 0
    let doHideStat = threshold && hideStat
    nowLabel?.isHidden = doHideStat
  
  }
  func getNowMoveString() -> String? {
    let nowLabel = seekMoveStat(stub: .nowMoves, inArr: g0scoreSlat!.statArr)
    let nowString = nowLabel?.text
//    print("timeNowString", timeNowString as Any)
    return nowString
  }
  func seekMoveStat(
    stub: MoveStat.Stub,
    inArr stats: [Stat],
    u: String = #function) -> MoveStat? {
    let u2 = #function
//    print(u2, stats, u, g0scoreSlat?.tag as Any)
    // step2_prepend_u2_&_print arguments in sequence, then chain global tags
    var q = 0 // quanity
    var result: MoveStat?
    for e in stats {
      if e is MoveStat == false { continue }
    
      if (e.text!.contains(stub.rawValue)) {
        e.text = stub.rawValue
        result = (e as! MoveStat)
        q += 1
      }
    }
    if q != 1 { print(u2, u, "wrdQ", q) }
//    assert(q==1)
    return result
  }
}
extension ChildVC {
  func updateMover(
    to value:   Int,
    u: String = #function) {
    //    let u2 = #function; print(u2, value, u)
    gm.gameMove = gm.gameCounter(op:.update, to:value)
    gm.moveText = moverLabel_taa.getStringFor(move: gm.gameMove)
    gm.moveTextAtt = moverLabel_taa.attibuted(moveText: gm.moveText)
    
    moverLabel_skk.center = psGrid.moveView!.center
    //    moverLabel_skk.text = gm.moveText
    moverLabel_skk.attributedText = gm.moveTextAtt
    
    psGrid.moveView?.displayMove(text: gm.moveText)// nowHidden
    
//    return Void()
//    setNowStat(move: gm.gameMove,   moveText: gm.moveText)
  }
}

extension ChildVC {
  func show_moverLabel_skk() {
//    if !g0sShowTimer { return Void() }

    moverLabel_skk = topLeftCenter(pivot: psGrid).u5abe
    moverLabel_skk.name = gm.gameName
//    psGrid.alpha = gridAlpha
//    psGrid.backgroundColor = gridBGC
    
//    clockYposition = gm is Game_X_ ? .below : .above
    
    if clockYposition == .below {
      // grid width & height
      let gw = psGrid.frame.width
      let gh = psGrid.frame.height
      // mover width & height
      moverLabel_skk.bgc(.brown)
      let tw = moverLabel_skk.frame.width
      let th = moverLabel_skk.frame.height
      // timer coordinates
      let tx = gm is Game_X_ ? 0 + tw/4.0 : gw * 4.7/6.0
      let ty = gm is Game_X_ ? 0 + th/2.0 : gh * 1.0/6.0
      
      let bounds = UIScreen.main.bounds
      print("bounds", bounds)
      
      moverLabel_skk.center = CGPoint(x: tx, y: ty)
    }
    psGrid.addSubview(moverLabel_skk)
//    timerLab0ld.backgroundColor = .orange
    moverLabel_skk.textColor = moverLabel_skk.auto(color: nil)
//    timerLab0ld.setTitleColor(timerButton.auto(color: nil), for:[] )

  }
}
