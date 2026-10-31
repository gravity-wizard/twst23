//
//  slideHorz.swift
//  two4
//
//  Created by G on 10/25/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import Foundation
internal
extension ChildVC {
  func slideLeftToCloseIn(
    _ game: Game,
    _ cyce:[Cie],
    _ dyce: [Die])
    -> Character {
      let emptyLLs = seekEmptyLLzIn(cyce)
      //        print("lc empLLs", emptyLLs)
      let ttArr = closeColLeft(emptyLLs, game, cyce, dyce)
      return slideTTsLeftToClose(ttArr, game, cyce, dyce)
  }
}
fileprivate
extension ChildVC {
  func slideTTsLeftToClose(
    _ axArr: [Character],
    _ game: Game,
    _ cyce:[Cie],
    _ dyce: [Die])
    -> Character {
      //        print("sl ttArr", ttArr)
      
      var rowDyce:[Die] = []
      var westAXs:[Character] = []
      
      for char in axArr {
        if char == dash {
          westAXs.append(dash)
          continue
        }
        let rowDi = seekDiPos_ax(char, in: dyce)
        rowDyce.append(rowDi)
        //            print("rwdi", char, rowDi.dir8mask, rowDi.dillz)
        
        let byte = rowDi.dir8mask
        let testDir7west = byte & Int(b7t)
        if testDir7west > 0 {
          //                print(char , "leftOK")
          westAXs.append(rowDi.ax)
        }}
      return checkAXleft(axs: westAXs, game, cyce, dyce)
  }}
fileprivate
extension ChildVC {
  func closeColLeft(
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
  func checkAXleft(
    axs: [Character],
    _ game: Game,
    _ cyce:[Cie],
    _ dyce: [Die]) -> Character {
  //        print("ckAXl", axs)
    var foundDash = false
    assert(axs.contains(dash))
    for a1x in axs { ///////////// reverse for right
      if a1x == dash {
        foundDash = true
        continue }
      //            print("a1x", a1x)
      if foundDash {
        //                print(a1x, "mvLeft")
        relocateAXleft(ax: a1x, axs: axs, game, cyce, dyce)
        return a1x }
    }
    return nayLeft
  }
  func relocateAXleft(
    ax: Character,
    axs: [Character],
    _ game: Game,
    _ cyce:[Cie],
    _ dyce: [Die]) {
    assert(axs.contains(dash))
    if ax == dash { return }
    let rgCice = ciceFromAXs(arr: axs, cyce)
    let d = seekDiPos_ax(ax, in: dyce)
    let c = seekCi_ax(ax, cyce)
    
    let axRow = c.cirow
    let axTTs = game.r5row[axRow - 1]
    //        print("axl", ax , "axTTs", axTTs, "axs", axs)
    
    let posDex = axTTs.indexInt1st(of: ax)
    let dex1left = posDex! - 1 /// use negative for left
    let toAX = Array(axTTs)[dex1left]
    //        let fromAX = Array(axTTs)[posDex!]
    //        print("rltoAX", toAX , "fromAX", fromAX)
    
    assert(toAX == dash)
    let toCie = seekCi_ax(toAX, rgCice)
    loadDie_ax(d, to: toCie)
    slideLoaded(die: d, cyce, dyce)
  }
}

