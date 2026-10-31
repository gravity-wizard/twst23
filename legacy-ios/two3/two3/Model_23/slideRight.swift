//
//  slideRight.swift
//  two4
//
//  Created by G on 10/26/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import Foundation
internal
extension ChildVC {
  func slideRightToCloseIn(
    _ game: Game,
    _ cyce:[Cie],
    _ dyce: [Die])
    -> Character {
      let emptyLLs = seekEmptyLLzIn(cyce)
      //        print("rc empLLs", emptyLLs)
      let ttArr = closeColRight(emptyLLs, game, cyce, dyce)
      return slideTTsRightToClose(game, cyce, dyce, axArr: ttArr)
  }
}
fileprivate
extension ChildVC {
  func slideTTsRightToClose(
    _ game: Game,
    _ cyce: [Cie],
    _ dyce: [Die],
    axArr: [Character]) -> Character {
    print("sr axArr", axArr)
    
    var rowDyce:[Die] = []
    var eastAXs:[Character] = []
    
    for char in axArr {
      if char == dash {
        eastAXs.append(dash)
        continue
      }
      let rowDi = seekDiPos_ax(char, in: dyce)
      rowDyce.append(rowDi)
      //            print("rwdi", char, rowDi.dir8mask, rowDi.dillz)
      
      let byte = rowDi.dir8mask
      let testDir3east = byte & Int(b3t)
      if testDir3east > 0 {
        print(char , "rightOK")
        eastAXs.append(rowDi.ax)
      }}
    return checkAXright(axs: eastAXs, game, cyce, dyce)
  }}
fileprivate
extension ChildVC {
  func closeColRight(
    _ ops: [String],
    _ game: Game,
    _ cyce:[Cie],
    _ dyce: [Die]) -> [Character] {
    //        print("cl empLLops", ops)
    var res:[Character] = []
    for llop in ops {
      let opCie = seekCie(llz: llop, in: cyce)
      //            let opCol = opCie.cicol
      //            let opTTs = game.r5col[opCol - 1]
      //            print( "opTTs", opTTs, "opCol", opCol! )
      let opRowNumber = opCie.cirow - 1
      //            print("opRowNumber", opRowNumber)
      let rowTTs = game.r5row[opRowNumber]
      //            print("rowTTs", rowTTs)
      
      for char in rowTTs {
        res.append(char)
      }
    }
    return res
  }}
fileprivate
extension ChildVC {
  func checkAXright(
    axs: [Character],
    _ game: Game,
    _ cyce: [Cie],
    _ dyce: [Die]) -> Character {
    print("ckAXr", axs)
    var foundDash = false
    assert(axs.contains(dash))
    for a1x in axs.reversed() { ///////// reverse for right
      if a1x == dash {
        foundDash = true
        continue }
      print("a1x", a1x)
      if foundDash {
        print(a1x, "mvRight")
        relocateAXright(ax: a1x, axs: axs, game, cyce, dyce)
        return a1x }
    }
    return nayRight
  }
  func relocateAXright(
    ax: Character,
    axs: [Character],
    _ game: Game,
    _ cyce: [Cie],
    _ dyce: [Die]) {
    
    assert(axs.contains(dash))
    if ax == dash { return }
    let rgCice = ciceFromAXs(arr: axs, cyce)
    let d = seekDiPos_ax(ax, in: dyce)
    let c = seekCi_ax(ax, psCice)
    
    let axRow = c.cirow
    let axTTs = game.r5row[axRow - 1]
    //        print("axr", ax , "axTTs", axTTs, "axs", axs)
    
    let posDex = axTTs.indexInt1st(of: ax)
    let dex1right = posDex! + 1 /// use negative for left
    let toAX = Array(axTTs)[dex1right]
    //        let fromAX = Array(axTTs)[posDex!]
    //        print("rrtoAX", toAX , "fromAX", fromAX)
    
    assert(toAX == dash)
    let toCie = seekCi_ax(toAX, rgCice)
    loadDie_ax(d, to: toCie)
    slideLoaded(die: d, cyce, dyce)
  }
}

