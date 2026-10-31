//
//  restart_qx.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import SwiftUI

extension ChildVC {
  func restartConfiguredGames() {
    
    gm.slids = gm.slids0
//    psGrid.swell(gm.scaler)
    gm.gameRect = self.psGrid.frame// updateModel

//    buildGridPositive(game: gm)
    psCice = ciceFor(game: gm, polarity: .pos)
    nsCice = ciceFor(game: gm, polarity: .neg)
  
    buildGridNegativeWithDice(game: gm)
    
    displayGridNegative(mkSqrCi: true)
    displayGridPositive(mkSqrCi: true)

    if (skpROTT == 1) { return Void() }
    
//    rotateGridNegative()
    rotateGridPositive(game: gm)

    if gm.twistDice {
      rotate(dyce: dice)
    }
    
    if (skpHOME == 1) { return Void() }
    homeDice(whare: ebHomeWhereM0D,
             cyce: psCice, dyce: dice)
    
    
    if (skpHOLE == 1) { return Void() }
    makeHoles(cyce: psCice, dyce: dice)
    for c in psCice {
      if c.ciax == dash {
        gm.dashDex0 = c.cidex
//        gm.dashLLz = c.hm
        print("gm.dashDex0", gm.dashDex0!)
        // last cie should be dash
        
      }
    }
    _ = seekSel(cyce: nsCice)
    gm.trgt = seekSel(cyce: psCice).last
    gm.plck = seekSel(dyce:  dice).first
    self.addArrowsTo(dyce: dice, game: gm)
    
//    restore(gm, psCice + nsCice, dice)
    //    restore(gm_rp, psCice_rp + nsCice_rp, dice_rp)
    //        etvs[0].text = ""
    //        etvs[1].text = ""
    psGrid.shiftSubviewsRightFor(game: gm)
    show_moverLabel_skk()
    show_timerLabel_skk()
    show(stats: ShowStat.allCases)
    
    if gm is Game4x6 {
      psGrid.shiftSubviewsRightFor(game: gm)
    }
  }
}


