//
//  Slide_ULDR_qx.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//

//
//  slideAnyULDR.swift
//  two4
//
//  Created by G on 10/26/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import Foundation
enum ULDR: Int, CaseIterable {
  case up     = 1
  case left   = 2
  case down   = 3
  case right  = 4
}

extension ChildVC {
  func slideDir8toCloseIn(
    _ cyce:[Cie],
    _ dyce: [Die]) -> Character? {
    
    let game = gm
    
    print("game.dir8toClose", game.dir8toClose, gm.gameName)
    
    if game.dir8toClose == 1 {
      return slideUpToCloseIn(game, cyce, dyce)
    }
    if game.dir8toClose == 4 {
      return slideRightToCloseIn(game, cyce, dyce)
    }
    if game.dir8toClose == 16 {
      return slideDownToCloseIn(game, cyce, dyce)
    }
    if game.dir8toClose == 64 {
      return slideLeftToCloseIn(game, cyce, dyce)
    }
    print("wrd0dir", game.mixFig)
    if game.dir8toClose == 0 && game.mixFig != 0 {
      bg(.weird)
      print("2fixok")
      readRegionsIn(cyce)
      updateArrowsFor(dyce)
      DispatchQueue.main.asyncAfter(
      deadline: .now() + 0.20924) {
        self.slideNextDieIn(cyce, dyce)
      }
    }
    
    return nil
  }
}

