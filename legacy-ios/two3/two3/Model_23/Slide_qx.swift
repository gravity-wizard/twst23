//
//  Slide_qx.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//

//
//  Slide.swift
//  two4
//
//  Created by G on 10/23/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit

class Slide: NSObject {
  
  var dihm = ""
  var from = ""
  var cihm = ""
  
  init(di:String, rm:String, ci:String) {
    self.dihm = di
    self.from = rm
    self.cihm = ci
    super.init()
  }
}
extension ChildVC{
  func ciceFromAXs(arr:[Character],_ cyce: [Cie]) -> [Cie] {
    
    print("f,ciceAXS", arr)
    
    var res:[Cie] = []
    
    for ax in arr {
      print("ax", ax)
      let cyc = seekCiceAX(ax, cyce)
      res += cyc
    }
    //TODO: multiples 4now only1
    print("assert(res.count == ", arr.count)
    return res
  }
  
  //    fileprivate
  func seekEmptyLLzIn(_ cyce: [Cie]) -> [String] {
    var res:[String] = []
    for c in cyce {
      if c.ciax != dash { continue }
      //            if c.tts != [t0t] { continue }
      res.append(c.hm)
    }
    return res
  } // ops ===> opportunities
}
extension ChildVC {
  func loadDie_ax(_ die: Die, to trgt: Cie) {
    die.axTo = trgt.ciax
  }
  func loadDie_LLz(_ die: Die, to trgt: Cie, game: Game) {
    //        die.ax = die.dillz.axFromLLz(
    //            wide: game.ecHorizontal)
    //        die.ttr = String(die.ax)
    die.dieFinishStlyeFor(game: game)
    
    die.axTo = trgt.ciax
    die.toLLz = trgt.hm
  }
  func slidePlucked(
    _ plck: Die,
    to trgt: Cie,
    _ cyce: [Cie],
    _ dyce: [Die]) {
    
//    let cyce = nsCice + psCice
    loadDie_ax(plck, to: trgt)
    let fromCie = seekCi_ax(plck.ax, cyce)
    
    plck.isPrimary = true
    if #available(iOS 10.0, *) {
      animateSlide(plck, 1, cyce, dyce)
    } else {
      // Fallback on earlier versions
    }
    
    //        return
    plck.isSelected = false
    trgt.isSelected = false
    plck.diLook(.diSel)
    trgt.ciLo(.ciSel, vw: psGrid)
    view.bringSubviewToFront(plck.ara)
    view.bringSubviewToFront(plck)
    
    gm.plck = nil
    gm.trgt = nil
    fromCie.isEnabled = true
    trgt.isEnabled = gm.okToStackDice
  }

  
  
}
extension ChildVC {
  func slideLoaded(
    die: Die,
    _ cyce:[Cie],
    _ dyce: [Die],
    f:String=#function)
  {
    let cyce = psCice // + nsCice
    let toCie = seekCi_ax(die.axTo, cyce)
    let frmCi = seekCi_ax(die.ax,   cyce)
    die.isSelected = true
    frmCi.isSelected = true
    toCie.isSelected = true
    die.diLook(.diSel)
    toCie.ciLo(.ciSel, vw: psGrid)
    frmCi.ciLo(.ciSel, vw: psGrid)
    
    assert(toCie.ciax == dash)
    assert(frmCi.tts.count == 1)
    print(f, die.ax, "from", frmCi.hm, frmCi.ciax)
    print(f, die.ax, "to", toCie.ciax, toCie.hm)
    
    if toCie.ciax == frmCi.ciax {
      toCie.ciax = dash } // restoration
    assert(toCie.ciax == dash) // isEmpty
    
    view.bringSubviewToFront(die.ara)
    self.view.bringSubviewToFront(die)
    
    var speed: Double = 22
    if die.isPrimary { speed = 1 }
    
    if #available(iOS 10.0, *) {
      animateSlide(die, speed, cyce, dyce)
    } else {
      // Fallback on earlier versions
    }
    
  }
  func completeSlide(
    _ d: Die,
    _ cyce: [Cie],
    _ dyce: [Die]) {
//    let cyce = psCice // + nsCice
    let toCie = seekCi_ax(d.axTo, cyce)
    let frmCi = seekCi_ax(d.ax,   cyce)
    //        die.slids += 1
    
    d.isSelected = false
    frmCi.isSelected = false
    toCie.isSelected = false
    
    if d.isPrimary {
      gm.dwarp = gm.warp0
      d.isPrimary = false
      gm.dir8toClose = 0-1
      
      let slide =
        Slide(di: d.hm,
              rm: frmCi.hm,
              ci: toCie.hm) // breakHere to stepShuffle
      gm.h1slides.append(slide)
    }
    frmCi.tts = [t0t] /// critical
    frmCi.ciax = dash
    d.center = toCie.center
    d.ara.center = d.center
    d.dillz = toCie.hm
    
    if d.dillz == d.hm {
      d.slids = 0 // startOver
    } else { d.slids += 1 }
    
    d.h1z.append(d.dillz) // logSlide
   
    d.diLook(.diSel)
    toCie.ciLo(.ciSel, vw: psGrid)
    frmCi.ciLo(.ciSel, vw: psGrid)
    toCie.ciax = d.ax
    toCie.tts = [d.tt]
    assert(toCie.tts.count == 1)
    
    psGrid.bringSubviewToFront(d.ara)
    psGrid.bringSubviewToFront(d)
   // die above ara
    
    
    readRegionsIn(cyce)
    //        readRegionsIn(nsCice)
    updateArrowsFor(dyce)
    
    if d.isPlucked { // sequenceComplete
      d.isPlucked = false
      gm.dir8toClose = 0-1
      
      let slide =
        Slide(di: d.hm,
              rm: frmCi.hm,
              ci: toCie.hm)
      gm.h1slides.append(slide)
      
    }
    if #available(iOS 10.0, *) {
      gm.dir8toClose > 0 ?
        plugEmptyCieIn(cyce, dyce) // keepPlugging
        : vcPostSlide(cyce, dyce)
    } else {
      // Fallback on earlier versions
    } // plugComplete
  }
}
@available(iOS 10.0, *)
extension ChildVC {
  func vcPostSlide(
    _ cyce: [Cie],
    _ dyce: [Die]) {

    if disableSHUFFLE
    && gm.state == .none {
      gm.mixed = .last
    }
    if gm.mixed == .none {
      gm.mixed = .some
      gm.state = .mixing
      gm.mixFig = gm.mixFig0
      print("shuffle on first tap")
    }
    if gm.slids < gm.slidsMax {
      print("game.slids", gm.slids)
      plugEmptyCieIn(cyce, dyce)
      return
    }
    // last
    if psCice[gm.dashDex0!].ciax != dash {
      if gm.mixFig != 0 { gm.slids -= 1 }
      slideNextDieIn(cyce, dyce)
    } else { gm.mixFig = 0 }
    
    if gm.state == .fixing {
      let wasCount = gm.gameMove
      updateMover(to: wasCount + 1)
    }
    
    if updateSolution() {
      gm.mixFig = 0
      gm.fixed = .done
      gm.mixed = .none
      gm.state = .solved
      gm.gameTime = pauseTimer()

      print(gm.gameName, "solved", gm.solution, gm.timeText, gm.moveText)
      psGrid.backgroundColor = stateColor(gm.state)
    }
    if gm.mixed == .last {
      gm.mixed = .done
      gm.state = .fixing

      _ = updateTimer(to: 0)
      _ = startTimer(at: nil)
      zckRestart(nil, game: gm)
      
      if gm is Game_X_ {
        NotificationCenter.default.post(
          name: .truGameReady,
          object: nil)
      } else {
        NotificationCenter.default.post(
          name: .notGameReady,
          object: nil)
      }
    }
  }
  //    https://www.swiftbysundell.com/basics/animations/
  //    https://useyourloaf.com/blog/quick-guide-to-property-animators/
  func animateSlide(
    _ die: Die,
    _ speed: Double,
    _ cyce:[Cie],
    _ dyce: [Die])
  {
    let s7 = speed
    let cyce = psCice // + nsCice
    let toCie = seekCi_ax(die.axTo, cyce)
    //        let frmCi = seekCiAX(die.ax,   cyce)
    
    let diAnimator = UIViewPropertyAnimator(
    duration: 1/gm.dwarp/s7, curve: .linear) {}
    
    diAnimator.addAnimations {
      die.center = toCie.center
      die.ara.center = die.center
    }
    diAnimator.addCompletion { position in
      if position == .end {
        //                print("First completion")
        self.completeSlide(die, cyce, dyce)
      }
    }
    diAnimator.addCompletion { position in
      if position == .start {
        //                print("start diAnimation")
      }
    }
    diAnimator.startAnimation()
  }
}
extension ChildVC {
  func relocateLoaded(die: Die,
                      _ cyce:[Cie],
                      _ dyce: [Die],
                      f:String=#function) {
    let cyce = psCice + nsCice
    let toCie = seekCie(llz: die.toLLz, in: cyce)
    let frmCi = seekCie(llz: die.dillz, in: cyce)
    
    die.relocateTo(toCie, frmCi)
    view.bringSubviewToFront(die.ara)
    view.bringSubviewToFront(die)
    //         readRegionsIn(psCice)
    //         updateArrowsFor(dice)
  }
}
func stateColor(_ state: Game.STATE) -> UIColor? {
  if state != .solved { gui("wrd undefined") }
  
  return disableSHUFFLE ? UIColor.magenta : nil
}
