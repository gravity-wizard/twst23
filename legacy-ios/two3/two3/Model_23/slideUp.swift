//
//  slideUp.swift
//  two4
//
//  Created by G on 10/26/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import Foundation
internal
extension ChildVC {
  func slideUpToCloseIn(
    _ game: Game,
    _ cyce: [Cie],
    _ dyce: [Die])
    -> Character {
      let emptyLLs = seekEmptyLLzIn(cyce)
      //        print("uc empLLs", emptyLLs)
      let ttArr = closeRowUp(game, cyce, dyce, ops: emptyLLs)
      return slideTTsUpToClose(ttArr, game, cyce, dyce)
  }
}
fileprivate
extension ChildVC {
  func slideTTsUpToClose(
    _ axArr: [Character],
    _ game: Game,
    _ cyce: [Cie],
    _ dyce: [Die]) -> Character {
    //        print("su ttArr", ttArr)
    
    var colDyce:[Die] = []
    var northAXs:[Character] = []
    
    for char in axArr {
      if char == dash {
        northAXs.append(dash)
        continue
      }
      let colDi = seekDiPos_ax(char, in: dyce)
      colDyce.append(colDi)
      //            print("cdi", char, colDi.dir8mask, colDi.dillz)
      
      let byte = colDi.dir8mask
      let testDir1north = byte & Int(b1t)
      if testDir1north > 0 {
        //                print(char , "upOK")
        northAXs.append(colDi.ax)
      }}
    return checkAXup(game, cyce, dyce, axs: northAXs)
  }}
fileprivate
extension ChildVC {
  func closeRowUp(
     _ game: Game,
    _ cyce: [Cie],
    _ dyce: [Die],
      ops: [String]) -> [Character] {
    //        print("cr empLLops", ops)
    var res:[Character] = []
    for llop in ops {
      let opCie = seekCie(llz: llop, in: cyce)
      //            let opRow = opCie.cirow
      //            let opTTs = game.r5row[opRow - 1]
      //            print( "opTTs", opTTs, "opRow", opRow! )
      let opColNumber = opCie.cicol - 1
      //            print("opColNumber", opColNumber)
      let colTTs = game.r5col[opColNumber]
      //            print("colTTs", colTTs)
      
      for char in colTTs {
        res.append(char)
      }
    }
    return res
  }}
fileprivate
extension ChildVC {
  func checkAXup(
    _ game: Game,
    _ cyce: [Cie],
    _ dyce: [Die],
    axs: [Character]) -> Character {
    //        print("ckAXu", axs)
    var foundDash = false
    assert(axs.contains(dash))
    for a1x in axs { /// don't reverse forUp
      if a1x == dash {
        foundDash = true
        continue }
      //            print("a1x", a1x)
      if foundDash {
        //                print(a1x, "mvUp")
        relocateAXup(game, cyce, dyce, ax:a1x, axs: axs)
        return a1x }
    }
    return nayUp
  }
  func relocateAXup(
    _ game: Game,
    _ cyce: [Cie],
    _ dyce: [Die],
    ax: Character,
    axs: [Character]) {
    assert(axs.contains(dash))
    if ax == dash { return }
    let rgCice = ciceFromAXs(arr: axs, cyce)
    let d = seekDiPos_ax(ax, in: dyce)
    let c = seekCi_ax(ax, rgCice)
    
    let axCol = c.cicol
    let axTTs = game.r5col[axCol - 1]
    //        print("axu", ax , "axTTs", axTTs, "axs", axs)
    
    let posDex = axTTs.indexInt1st(of: ax)
    let dex1up = posDex! - 1
    let toAX = Array(axTTs)[dex1up]
    //        let fromAX = Array(axTTs)[posDex!]
    //        print("rutoAX", toAX , "fromAX", fromAX)
    
    assert(toAX == dash)
    let toCie = seekCi_ax(toAX, cyce)
    loadDie_ax(d, to: toCie)
    slideLoaded(die: d, cyce, dyce)
  }
}


