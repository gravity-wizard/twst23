//
//  buildViews_qx.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit
extension ChildVC {
  // VDL(ViewDidLoad)
  func configureVDL(_ mode: M0DLookGm, game: Game) {
    
    if game.a8sub {
      var replacments: [String] = []
      let comps = game.arrows8.components(
        separatedBy: ",")
      for (i,_) in comps.enumerated() {
        let nu1 = String(i + 0)
        replacments.append(nu1)
      }
      game.arrows8 = replacments.joined(
        separator: ",")
    }
    print("game.arrows8", game.arrows8, game.gameName)
    
    switch mode {
      case .gmP0nly: gmPosAct0(game: game)
      case .gmBoth1: gmAllAct1(game: game)
    }
  }
  func gmCommonAct(game: Game) {
    sectRect = game.sectorFig
  }
  func gmPosAct0(game: Game) { // pos0nly
    gmCommonAct(game: game)
    grsf = grsf0
  }
  func gmAllAct1(game: Game) {
    gmCommonAct(game: game)
    grsf = grsf1
  }}
extension ChildVC {
  func restore(
    _ cyce: [Cie],
    _ dyce: [Die]) {
    
    if gm.writeLLzArr(dyce: dyce) {
      bg(.weird)
    } // d.h1z.append(d.dillz) // history
    
//    let allCice = nsCice + psCice
    
    for c in cyce {
      c.ciax = dash
    }
    for d in dyce {
      if d.h1z.isEmpty {
        d.h1z.append(d.dillz)
      }
      let zLast = d.h1z.last
      print("rd", d.tt, d.h1z)
      let zcie = seekCie(llz: zLast!, in: cyce)
      
      loadDie_LLz(d, to: zcie, game: gm)
      relocateLoaded(die: d, cyce, dyce)
    }
  }
}
