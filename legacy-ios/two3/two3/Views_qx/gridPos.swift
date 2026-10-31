//
//  gridPos.swift
//  two4
//
//  Created by G on 10/12/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit

//class Grid: UIView {}
extension ChildVC {
  func buildGridPositive(game: Game) {
    //    psGrid.tag = grd00tag
    let numOspc = game.ecHorizontal * game.ecVertical
    let comps = game.mask?.components(separatedBy: ",")
    if game.mask != nil {assert(comps?.count == numOspc)}
    
    //    psCice = []
    for i in 0..<numOspc {
      var isMaskedLL = true
      let row = (i % game.ecVertical) + 1
      let column = (i / game.ecVertical) + 1
      let zdim = 0 + 1 // positiveZ
      let llz = llzFrom(xyz: [column, row, zdim])
      let ll = llz.dropLast()
      if (game.mask?.contains(ll.lowercased()) ?? true) {
        isMaskedLL = false
      }
      if isMaskedLL { continue }
      // no die
      let c = Cie(hm: llz); /// ~~~~~~~~~~ cie
      
      c.zdim = zdim
      c.xyzArr = [column, row, zdim]
//      c.hm = llz
      c.cirow = row
      c.cicol = column
      
      //      c.assignCie(target: self)
      //      c.cieInitStylePos(dex: psCice.count)
      //      psCice.append(c) /// +++++++++++++ cie neg
      //    }
      //    if game is GameX { assert(psCice.count == 24) }
    }
  }
}
enum POLARITY: Int {
  case pos = 01
  case neg = -1
}

extension ChildVC {
  func ciceFor(
    game: Game,
    polarity: POLARITY
  ) -> [Cie] {
    //  psGrid.tag = grd00tag
    let numOspc = game.ecHorizontal * game.ecVertical
    let comps = game.mask?.components(separatedBy: ",")
    if game.mask != nil {assert(comps?.count == numOspc)}
    
    var cice: [Cie] = []
    for i in 0..<numOspc {
      var isMaskedLL = true
      let row = (i % game.ecVertical) + 1
      let column = (i / game.ecVertical) + 1
      
      let zdim = 0 + polarity.rawValue
      
      let llz = llzFrom(xyz: [column, row, zdim])
      let ll = llz.dropLast()
      if (game.mask?.contains(
        ll.lowercased()) ?? true) {
        isMaskedLL = false
      }; if isMaskedLL { continue }
      // no die
      let c = Cie(hm: llz); /// ~~~~~~~~~~ cie
      c.zdim = zdim
      c.xyzArr = [column, row, zdim]
//      c.hm = llz
      c.cirow = row
      c.cicol = column
      c.assignCie(target: self)
      c.cieInitStylePos(dex: cice.count)
      cice.append(c)
    }
    if game is Game_X_ { assert(cice.count == 24) }
    return cice
  }}

extension ChildVC {
  func rotateGridPositive(game: Game) {
    
    game.twistCice = game is Game_X_
      
    if game.twistCice {

      for c in psCice {
        c.ciLo(.ciPos4v, vw: psGrid) }
    } else {
      for c in psCice {
        c.ciLo(.ciPos0i, vw: psGrid) }
    }
  }
}
