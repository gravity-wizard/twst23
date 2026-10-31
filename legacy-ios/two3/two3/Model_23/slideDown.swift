//
//  slideDown.swift
//  two4
//
//  Created by G on 10/26/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import Foundation
internal
extension ChildVC {
  func slideDownToCloseIn(
     _ game: Game,
    _ cyce:[Cie],
    _ dyce: [Die])
    -> Character {
    let emptyLLs = seekEmptyLLzIn(cyce)
    //        print("dc empLLs", emptyLLs)
    let ttArr = closeRowDown(emptyLLs, game, cyce, dyce)
    return slideTTsDownToClose(ttArr, game, cyce, dyce)
  }
}
fileprivate
extension ChildVC {
  func slideTTsDownToClose(
    _ axArr: [Character],
    _ game: Game,
    _ cyce: [Cie],
    _ dyce: [Die])
    -> Character {
    //        print("sd ttArr", ttArr)
    
    var colDyce:[Die] = []
    var southAXs:[Character] = []
    
    for char in axArr {
      if char == dash {
        southAXs.append(dash)
        continue
      }
      let colDi = seekDiPos_ax(char, in: dyce)
      colDyce.append(colDi)
      //            print("cdi", char, colDi.dir8mask, colDi.dillz)
      
      let byte = colDi.dir8mask
      let testDir5south = byte & Int(b5t)
      if testDir5south > 0 {
        //                print(char , "dwnOK")
        //                southAXs.append(ttToAX(colDi.tt))
        southAXs.append(colDi.ax)
      }}
    return checkAXdown(axs: southAXs, game, cyce, dyce)
  }}
fileprivate
extension ChildVC {
  func closeRowDown(
    _ ops: [String],
    _ game: Game,
    _ cyce: [Cie],
    _ dyce: [Die])
    -> [Character] {
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
  func checkAXdown(
    axs: [Character],
    _ game: Game,
    _ cyce: [Cie],
    _ dyce: [Die]) -> Character {
      //        print("ckAXd", axs)
      var foundDash = false
    assert(axs.contains(dash))
    for a1x in axs.reversed() { /// don't reverse forUp
      if a1x == dash {
        foundDash = true
        continue }
      //            print("a1x", a1x)
      if foundDash {
        //                print(a1x, "mvDwn")
        relocateAXdown(ax: a1x, axs: axs, game, cyce, dyce)
        return a1x }
    }
    return nayDown
  }
  func relocateAXdown(
    ax: Character,
    axs: [Character],
    _ game: Game,
    _ cyce: [Cie],
    _ dyce: [Die]) {
    
    assert(axs.contains(dash))
    if ax == dash { return }
    let rgCice = ciceFromAXs(arr: axs, cyce)
    let d = seekDiPos_ax(ax, in: dyce)
    let c = seekCi_ax(ax, rgCice)
    
    let axCol = c.cicol
    let axTTs = game.r5col[axCol - 1]
    //        print("axd", ax , "axTTs", axTTs, "axs", axs)
    
    let posDex = axTTs.indexInt1st(of: ax)
    let dex1down = posDex! + 1
    let toAX = Array(axTTs)[dex1down]
    //        let fromAX = Array(axTTs)[posDex!]
    //        print("rdtoAX", toAX , "fromAX", fromAX)
    
    assert(toAX == dash)
    let toCie = seekCi_ax(toAX, rgCice)
    loadDie_ax(d, to: toCie)
    slideLoaded(die: d, cyce, dyce)
  }
}

internal
extension ChildVC {
  func slideDownToCloseIn_rp(
    _ game: Game,
    _ cyce:[Cie],
    _ dyce: [Die],
    f:String=#function) -> Character {
    let emptyLLs = seekEmptyLLzIn(cyce)
    //        print("dc empLLs", emptyLLs)
    let ttArr = closeRowDown(emptyLLs, game, cyce, dyce)
    return slideTTsDownToClose(ttArr, game, cyce, dyce)
  }
}
fileprivate
extension ChildVC {
  func slideTTsDownToClose_rp(
    _ axArr: [Character],
    _ game: Game,
    _ cyce:[Cie],
    _ dyce: [Die],
    f:String=#function) -> Character {
    //        print("sd ttArr", ttArr)
    
    var colDyce:[Die] = []
    var southAXs:[Character] = []
    
    for char in axArr {
      if char == dash {
        southAXs.append(dash)
        continue
      }
      let colDi = seekDiPos_ax(char, in: dyce)
      colDyce.append(colDi)
      //            print("cdi", char, colDi.dir8mask, colDi.dillz)
      
      let byte = colDi.dir8mask
      let testDir5south = byte & Int(b5t)
      if testDir5south > 0 {
        //                print(char , "dwnOK")
        //                southAXs.append(ttToAX(colDi.tt))
        southAXs.append(colDi.ax)
      }}
    return checkAXdown(axs: southAXs, game, cyce, dyce)
  }}
fileprivate
extension ChildVC {
  func closeRowDown_rp(
    _ ops: [String],
    _ game: Game,
    _ cyce:[Cie],
    _ dyce: [Die],
    f:String=#function) -> [Character] {
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
  func checkAXdown_rp(
    axs: [Character],
    _ game: Game,
    _ cyce:[Cie],
    _ dyce: [Die],
    f:String=#function) -> Character {
    //        print("ckAXd", axs)
    var foundDash = false
    assert(axs.contains(dash))
    for a1x in axs.reversed() { /// don't reverse forUp
      if a1x == dash {
        foundDash = true
        continue }
      //            print("a1x", a1x)
      if foundDash {
        //                print(a1x, "mvDwn")
        relocateAXdown(ax: a1x, axs: axs, game, cyce, dyce)
        return a1x }
    }
    return nayDown
  }
  func relocateAXdown_rp(
    ax: Character,
    axs: [Character],
     _ game: Game,
     _ cyce:[Cie],
     _ dyce: [Die],
     f:String=#function) {
    assert(axs.contains(dash))
    if ax == dash { return }
    let rgCice = ciceFromAXs(arr: axs, cyce)
    let d = seekDiPos_ax(ax, in: dyce)
    let c = seekCi_ax(ax, rgCice)
    
    let axCol = c.cicol
    let axTTs = game.r5col[axCol - 1]
    //        print("axd", ax , "axTTs", axTTs, "axs", axs)
    
    let posDex = axTTs.indexInt1st(of: ax)
    let dex1down = posDex! + 1
    let toAX = Array(axTTs)[dex1down]
    //        let fromAX = Array(axTTs)[posDex!]
    //        print("rdtoAX", toAX , "fromAX", fromAX)
    
    assert(toAX == dash)
    let toCie = seekCi_ax(toAX, rgCice)
    loadDie_ax(d, to: toCie)
    slideLoaded(die: d, cyce, dyce)
  }
}





