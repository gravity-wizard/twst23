//
//  GridNeg.swift
//  two4
//
//  Created by G on 10/13/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import SwiftUI

extension ChildVC {
  func buildGridNegativeWithDice(game: Game) {
    nsGrid.tag = 0 - psGrid.tag
    assert( psCice.count > 0 )
    let numOspc = game.ecHorizontal * game.ecVertical
    
    nsCice = []; dice = []
    for i in 0..<numOspc {
      let row = (i % game.ecVertical) + 1
      let column = (i / game.ecVertical) + 1
      let zdim = 0 - 1 // negativeZ
      let llz = llzFrom(xyz: [column, row, zdim])
      
      if (seekCieLL(   // copy positive Cice
        llz, in: psCice) == nil) { continue }
      
      let d = Die(hm: llz) ///~~~~~~~~~~~~~ die
//      let d = Die(coder: NSCoder())! ///~~~~~~~~~~~~~ die
      d.hm = llz
      
      
      let c = Cie(hm: llz) ///~~~~~~~~~~~~~ cie
      c.zdim = zdim
      c.xyzArr = [column, row, zdim]
      //      c.hm = llz
      d.dillz = c.hm
      c.cirow = row; d.dirow = row
      c.cicol = column; d.dicol = column
      d.assignDie(target: self)
      d.dieInitStyle(dex: dice.count)
      dice.append(d) /// +++++++++++++++ die
      c.assignCie(target: self)
      c.cieInitStyleNeg(dex: nsCice.count)
      nsCice.append(c) /// +++++++++++++ cie neg
      d.dieFinishStlyeFor(game: game)
    }
  }}

extension ChildVC {
  func rotateGridNegative() {
    
    nsGrid.pvbgc = hidC0LR4mag
    nsGrid.bgc(nsGrid.pvbgc!)
    
    for c in nsCice {
      c.ciLo(.ciNeg4v, vw: nsGrid)
    }
  }}

extension ChildVC { // makeSquareCie
  func displayGridNegative(mkSqrCi: Bool) {
    
    psGrid.zbgc( .norm, .clear )
    var numHigh = CGFloat(gm.ecVertical)
    var numWide = CGFloat(gm.ecHorizontal)
    let most = max(numHigh, numWide) // + 1.0
    if mkSqrCi { numWide = most
      numHigh = most
    }
    for c in nsCice {
      // aquire
      let col = CGFloat(c.cicol)
      let row = CGFloat(c.cirow)
      // size space width & height
      let sw = nsGrid.frame.width / numWide
      let sh = nsGrid.frame.height / numHigh
      //      let av = (sh + sw)/2
      
      if mkSqrCi {
        assert(sw == sh)
        //        sh = av; sw = av
        //        nsGrid.frame.size.width = (sw * numWide)
        //        nsGrid.frame.size.height = (sh * numHigh)
      }
      c.frame.size.width  = sw.pwr(cisf)
      c.frame.size.height = sh.pwr(cisf)
      
      let d = seekDi(dex: c.cidex, dyce: dice)
      d.ara.frame.size.width  = c.scaleWidth(arsf)
      d.ara.frame.size.height = c.scaleHeight(arsf)
      d.frame.size.width  = d.ara.scaleWidth(disf)
      d.frame.size.height = d.ara.scaleHeight(disf)
      
      // center & tag first use of label
      var cx = ((col-1) + 0.5) * sw // + grid0.x
      let cy = ((row-1) + 0.5) * sh // + grid0.y
      if gm.flipX {
        cx = view.frame.width - cx
      }
      c.center.x = cx
      c.center.y = cy
      d.center.x = cx
      d.center.y = cy
      d.ara.center.x = cx
      d.ara.center.y = cy
      d.ara.tag = 0 - (d.tag + G0base.aura.rawValue) // makeNegative
      d.dillz = c.hm
      // style
      c.ciLo(.ciNeg0i, vw: nsGrid)
            d.diLook(.diNeg0i)
      // add
      nsGrid.addSubview(c)
      nsGrid.addSubview(c.lbl)
      if zck(.dbug) {
        nsGrid.addSubview(c.lbl)
      }
      nsGrid.addSubview(d.ara)
      nsGrid.addSubview(d)
      nsGrid.bringSubviewToFront(d)
      
      c.lbl.frame = c.frame
      c.lbl.center = c.center
      
    }
  }}

extension ChildVC { // makeSquareCie
  func displayGridPositive(mkSqrCi: Bool) {
    assert(nsCice.count > 0)
    psGrid.zbgc( .norm, .clear )
    
    let scaler: CGFloat = g0isPad ? gm.scalePad : gm.scalePhone
    
    psGrid.swell(scaler)
    
    
    var numHigh = CGFloat(gm.ecVertical)
    var numWide = CGFloat(gm.ecHorizontal)
    let most = max(numHigh, numWide) // + 1.0
    if mkSqrCi { numWide = most
      numHigh = most
    }
    for c in psCice {
      // aquire
      let col = CGFloat(c.cicol)
      let row = CGFloat(c.cirow)
      // size space width & height
      let sw = psGrid.frame.width  / numWide
      let sh = psGrid.frame.height / numHigh
      //      let av = (sh + sw)/2
      
      if mkSqrCi {
        assert(sw == sh)
        //        sh = av; sw = av
        //        nsGrid.frame.size.width = (sw * numWide)
        //        nsGrid.frame.size.height = (sh * numHigh)
      }
      c.frame.size.width  = sw.pwr(cisf)
      c.frame.size.height = sh.pwr(cisf)
      
      let d = seekDi(dex: c.cidex, dyce: dice)
      d.ara.frame.size.width = c.scaleWidth(arsf)
      d.ara.frame.size.height = c.scaleHeight(arsf)
      
//      d.ara.layoutCustomGradient()
//      let sctr = u5now().tile
      
//      d.ara.layoutCustomWood(
//        grain: u5vLightColors ? gm.darkGrain : gm.liteGrain)
      
      d.ara.backgroundColor =
        u5vLightColors ? CCBLU.beige.__uiColor() : .clear // CCBLU.brownSugar.__uiColor()
      
      
      d.frame.size.width = d.ara.scaleWidth(disf)
      d.frame.size.height = d.ara.scaleHeight(disf)
      
      // center & tag first use of label
      var cx = ((col-1) + 0.5) * sw // + grid0.x
      let cy = ((row-1) + 0.5) * sh // + grid0.y
      if gm.flipX {
        cx = view.frame.width - cx
      }
      c.center.x = cx
      c.center.y = cy
      d.center.x = cx
      d.center.y = cy
      d.ara.center.x = cx
      d.ara.center.y = cy
      d.ara.tag = 0 + (d.tag + G0base.aura.rawValue)
      d.dillz = c.hm
      // style
//            c.ciLo(.ciPos0i, vw: grid)
            d.diLook(.diPos0i)
      // add
      psGrid.addSubview(c)
      psGrid.addSubview(c.lbl)
      if zck(.dbug) {
        psGrid.addSubview(c.lbl)
      }
      psGrid.addSubview(d.ara)
      psGrid.addSubview(d)
      psGrid.bringSubviewToFront(d)
      
      c.lbl.frame = c.frame
      c.lbl.center = c.center
//      psGrid.isUserInteractionEnabled = true
//      d.isUserInteractionEnabled = true
//      d.ara.isUserInteractionEnabled = true
      
    }
  }}
