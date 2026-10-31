//
//  Move.swift
//  two4
//
//  Created by G on 10/18/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import Foundation
class Move: NSObject {
  
  let diID: Int?
  let mvLLz: String?
  let mvPoints: Int?
  
  init(dex: Int, to llz: String) {
    diID = dex
    mvLLz = llz
    mvPoints = 0
  }
}
extension ChildVC {
  func initMoveDi(
    plck: Die?,
//    _ game: Game,
    _ cyce: [Cie],
    _ dyce: [Die],
    u: String = #function) -> Bool? {
    
    let u2 = #function; print(u2, u, plck?.ax as Any)
    
    if gm.tap2close {
     return closeOnTapOf(die: plck, cyce, dyce);
    }
    if plck == nil
      || gm.trgt == nil { return false }
    moveDie(plck!, to: gm.trgt!, cyce, dyce)
    
    return nil // only close on tap 4now
  }
  func initMoveCi(
    trgt: Cie?,
    _ game: Game,
    _ cyce: [Cie],
    _ dyce: [Die]) {
    
    if game.tap2close { return }
    if trgt == nil
      || game.plck == nil { return }
    moveDie(gm.plck!, to: trgt!, cyce, dyce)
  }
  func moveDie(
    _ plck: Die,
    to trgt: Cie,
//    _ game: Game,
    _ cyce:[Cie],
    _ dyce: [Die],
    f:String=#function) {
    slidePlucked(plck, to: trgt, cyce, dyce)
  }
  func closeOnTapOf(
      die: Die?,
//    _ game: Game,
    _ cyce: [Cie],
    _ dyce: [Die],
    u: String = #function) -> Bool {
    let u2 = #function; print(u2, u, die?.ax as Any, die?.hm as Any)
    
    if die == nil { return false }
    //        die!.isPlucked = true
    print("cot", die!.ax, die!.AX)
    gm.dir8toClose = die!.dir8mask
    if slideDir8toCloseIn(cyce, dyce) == nil {
//      die!.resetDi(game: game)
      return false
    }
    return true
  }
}
